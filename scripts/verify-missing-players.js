require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");

const TeamSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    status: String, player1: String, seed: Number
}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const RegSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: mongoose.Schema.Types.ObjectId, status: String
}, { strict: false });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegSchema);

const UserSchema = new mongoose.Schema({ efvId: Number, name: String }, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function verify() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };

    try {
        log("⏳ Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);

        log(`⏳ Reading Excel...`);
        const workbook = xlsx.readFile(EXCEL_PATH);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const excelPlayers = new Map();
        for (const row of data) {
            const efvId = row["EFV ID"] || row["EFVID"] || row["EFV_ID"] || row["efvId"];
            const playerName = row["Name"] || row["Tên"] || row["Player"] || "Unknown";
            if (efvId) {
                excelPlayers.set(Number(efvId), playerName);
            }
        }
        log(`✅ Excel has ${excelPlayers.size} players.`);

        const registrations = await Registration.find({ tournament: TOURNAMENT_ID, status: 'approved' }).populate('user');
        const teamEfvMap = new Map();
        const efvUserMap = new Map();
        for (const r of registrations) {
            if (r.team && r.user && r.user.efvId) {
                 teamEfvMap.set(r.team.toString(), r.user.efvId);
                 efvUserMap.set(r.user.efvId, r.user.name);
            }
        }
        
        const allTeams = await Team.find({ tournament: TOURNAMENT_ID });
        const dbEfvTeamMap = new Map();
        allTeams.forEach(t => {
            const efvId = teamEfvMap.get(t._id.toString());
            if (efvId) dbEfvTeamMap.set(efvId, t);
        });

        log(`✅ Database has ${dbEfvTeamMap.size} teams mapped to EFV IDs.`);

        const missingFromDb = [];
        const missingFromActive = [];

        for (const [efvId, name] of excelPlayers.entries()) {
            const team = dbEfvTeamMap.get(efvId);
            if (!team) {
                missingFromDb.push({ efvId, name });
            } else if (team.status !== 'active') {
                missingFromActive.push({ efvId, name, status: team.status });
            }
        }

        if (missingFromDb.length > 0) {
            log("\n❌ EXCEL PLAYERS MISSING FROM TOURNAMENT (No Team or Reg found):");
            missingFromDb.forEach(p => log(`   - EFV ID: ${p.efvId} | Name: ${p.name}`));
        } else {
            log("\n✅ All Excel players are present in the tournament database.");
        }

        if (missingFromActive.length > 0) {
            log("\n⚠️ EXCEL PLAYERS PRESENT BUT NOT 'ACTIVE' IN BRACKET:");
            missingFromActive.forEach(p => log(`   - EFV ID: ${p.efvId} | Name: ${p.name} | Curr Status: ${p.status}`));
        } else {
            log("\n✅ All Excel players are marked as 'active' in the bracket.");
        }

        fs.writeFileSync("verify_output.log", out, "utf-8");
        process.exit(0);

    } catch (err) { 
        console.error("❌ ERROR:", err); 
        fs.writeFileSync("verify_output.log", out + "\nERROR: " + err.message, "utf-8");
        process.exit(1); 
    }
}
verify();
