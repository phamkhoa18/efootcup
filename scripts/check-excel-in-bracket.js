require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");

const TeamSchema = new mongoose.Schema({ tournament: mongoose.Schema.Types.ObjectId, player1: String }, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const RegSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: mongoose.Schema.Types.ObjectId, status: String
}, { strict: false });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const UserSchema = new mongoose.Schema({ efvId: Number, name: String }, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const workbook = xlsx.readFile(EXCEL_PATH);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const excelPlayers = new Map();
    for (const row of data) {
        const efvId = row["EFV ID"] || row["EFVID"] || row["EFV_ID"] || row["efvId"];
        const name = row["Name"] || row["Tên"] || row["Player"];
        if (efvId) excelPlayers.set(Number(efvId), name);
    }

    const regs = await Registration.find({ tournament: TOURNAMENT_ID }).populate('user');
    const teamEfvMap = new Map();
    for (const r of regs) {
        if (r.team && r.user && r.user.efvId) {
            teamEfvMap.set(r.team.toString(), r.user.efvId);
        }
    }

    const matches = await Match.find({ tournament: TOURNAMENT_ID });
    const teamsInMatches = new Set();
    for (const m of matches) {
        if (m.homeTeam) teamsInMatches.add(m.homeTeam.toString());
        if (m.awayTeam) teamsInMatches.add(m.awayTeam.toString());
    }

    let missing = "";
    for (const [efvId, name] of excelPlayers.entries()) {
        let foundTeamId = null;
        for (const [teamId, tEfv] of teamEfvMap.entries()) {
            if (tEfv === efvId) {
                foundTeamId = teamId; break;
            }
        }

        if (!foundTeamId) {
            missing += `EFV ${efvId} (${name}) is not in DB Registration!\n`;
        } else if (!teamsInMatches.has(foundTeamId)) {
            missing += `EFV ${efvId} (${name}) is in DB (Team ${foundTeamId}) but MISSING FROM BRACKET MATCHES!\n`;
        }
    }

    fs.writeFileSync("check_excel_in_bracket.log", missing || "All Excel players are in bracket matches!", "utf-8");
    process.exit(0);
}
check();
