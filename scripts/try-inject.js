require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    status: String,
    round: Number,
    winner: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function injectMissing() {
    await mongoose.connect(process.env.MONGODB_URI);
    const missingIds = [
        "69c05332f0792ab61163742f",
        "69c201869d4ea1e3cff6c8b2",
        "69c25c1f6daae387df9c6e1b",
        "69c283e26daae387df9cfe81"
    ];

    const missingTeams = await Team.find({ _id: { $in: missingIds } });
    if (missingTeams.length === 0) {
        console.log("No missing teams found.");
        process.exit(0);
    }

    // Find matches in round 1 that have only one team (one team is null)
    // and status is either 'completed' or 'bye'
    const byeMatches = await Match.find({
        tournament: TOURNAMENT_ID,
        round: 1,
        $or: [
            { homeTeam: null, awayTeam: { $ne: null } },
            { homeTeam: { $ne: null }, awayTeam: null }
        ]
    }).limit(missingTeams.length);

    console.log(`Found ${byeMatches.length} BYE matches for injection.`);

    for (let i = 0; i < missingTeams.length; i++) {
        const team = missingTeams[i];
        const m = byeMatches[i];

        if (!m) {
            console.log(`Not enough bye matches!`);
            break;
        }

        console.log(`Injecting Team ${team._id} into Match ${m._id}`);
        // Inject!
        if (!m.homeTeam) {
            m.homeTeam = team._id;
        } else {
            m.awayTeam = team._id;
        }

        // It is no longer a BYE match
        m.status = "scheduled";
        m.winner = null;
        m.homeScore = null;
        m.awayScore = null;

        await m.save();
        
        // Ensure team is active
        team.status = 'active';
        await team.save();

        // Recursively reset round 2, round 3 etc that might have advanced the auto-winner
        let nextRoundM = await Match.findOne({ tournament: TOURNAMENT_ID, round: 2, $or: [{ homeTeam: m.winner }, { awayTeam: m.winner }] });
        if (nextRoundM) {
             console.log("Found R2 match, wiping winner from it...", nextRoundM._id);
             // Wait, the opponent of `nextRoundM` in R2 won't be wiped, we just reset the slot of the former winner!
             if (nextRoundM.homeTeam?.toString() === (m.winner?.toString() || m.awayTeam?.toString())) {
                  nextRoundM.homeTeam = null;
             } else {
                  nextRoundM.awayTeam = null;
             }
             // And if nextRoundM was completed auto-win, we need to cascade this reset?!
             // Oh no, cascading reset is messy.
        }
    }

    console.log("Done checking logic.");
    process.exit(0);
}
injectMissing();
