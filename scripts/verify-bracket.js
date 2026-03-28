require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    status: String, player1: String
}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    status: String,
    round: Number
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function verifyInBracket() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const activeTeams = await Team.find({ tournament: TOURNAMENT_ID, status: 'alive' }).lean(); // wait, rebuild changed it to 'active'. Let's check both
        const aliveTeams2 = await Team.find({ tournament: TOURNAMENT_ID, status: 'active' }).lean();
        
        const allActive = [...activeTeams, ...aliveTeams2];
        log(`Total active/alive teams in DB: ${allActive.length}`);
        
        const activeTeamIds = new Set(allActive.map(t => t._id.toString()));

        // Also let's check the eliminated ones just in case
        const elimTeams = await Team.find({ tournament: TOURNAMENT_ID, status: 'eliminated' }).lean();
        log(`Total eliminated teams in DB: ${elimTeams.length}`);

        const matches = await Match.find({ tournament: TOURNAMENT_ID }).lean();
        log(`Total matches in bracket: ${matches.length}`);

        const teamsInMatches = new Set();
        matches.forEach(m => {
             if (m.homeTeam) teamsInMatches.add(m.homeTeam.toString());
             if (m.awayTeam) teamsInMatches.add(m.awayTeam.toString());
        });

        const missingTeams = [];
        for (const team of allActive) {
            if (!teamsInMatches.has(team._id.toString())) {
                missingTeams.push(team);
            }
        }

        if (missingTeams.length > 0) {
            log("\n❌ ACTIVE TEAMS MISSING FROM BRACKET:");
            missingTeams.forEach(t => log(`   - Team ID: ${t._id} | Player1: ${t.player1}`));
        } else {
            log("\n✅ All active teams are assigned to at least one match in the bracket.");
        }

        fs.writeFileSync("verify_bracket.log", out, "utf-8");
        process.exit(0);

    } catch (err) { 
        console.error("❌ ERROR:", err); 
        fs.writeFileSync("verify_bracket.log", out + "\nERROR: " + err.message, "utf-8");
        process.exit(1); 
    }
}
verifyInBracket();
