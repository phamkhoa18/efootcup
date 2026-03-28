require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({ status: String }, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    round: Number,
    nextMatch: mongoose.Schema.Types.ObjectId,
    status: String,
    winner: mongoose.Schema.Types.ObjectId,
    homeScore: Number,
    awayScore: Number
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function injectAndClean() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };
    
    await mongoose.connect(process.env.MONGODB_URI);

    const missingIds = [
        "69c05332f0792ab61163742f",
        "69c201869d4ea1e3cff6c8b2",
        "69c25c1f6daae387df9c6e1b",
        "69c283e26daae387df9cfe81"
    ];

    const missingTeams = await Team.find({ _id: { $in: missingIds } });
    for (const t of missingTeams) {
        t.status = 'active';
        await t.save();
    }

    // Our target root: Round 2 Match `69c78777c1f1fdf12f3d0b86`
    // Child 1: `69c78777c1f1fdf12f3d0d87`
    // Child 2: `69c78777c1f1fdf12f3d0d88`
    
    const m2 = await Match.findById("69c78777c1f1fdf12f3d0b86");
    const m1_1 = await Match.findById("69c78777c1f1fdf12f3d0d87");
    const m1_2 = await Match.findById("69c78777c1f1fdf12f3d0d88");

    if (!m2 || !m1_1 || !m1_2) {
        log("Match IDs not found. Aborting.");
        process.exit(1);
    }

    log(`Injecting missing teams into M1_1 and M1_2...`);
    // Inject M1_1
    m1_1.homeTeam = missingTeams[0]._id;
    m1_1.awayTeam = missingTeams[1]._id;
    m1_1.status = 'scheduled';
    m1_1.winner = null;
    m1_1.homeScore = null;
    m1_1.awayScore = null;
    await m1_1.save();

    // Inject M1_2
    m1_2.homeTeam = missingTeams[2]._id;
    m1_2.awayTeam = missingTeams[3]._id;
    m1_2.status = 'scheduled';
    m1_2.winner = null;
    m1_2.homeScore = null;
    m1_2.awayScore = null;
    await m1_2.save();

    // Now cascade the cleanup starting from M2
    let currentMatchId = m2._id;
    let oldWinnerToScrub = m2.winner; // we need to remove this winner from next match

    while (currentMatchId) {
        const m = await Match.findById(currentMatchId);
        if (!m) break;

        log(`Cleaning Round ${m.round} Match ${m._id}...`);
        
        let previousWinner = m.winner;
        let wasCompleted = (m.status === 'completed' || m.status === 'bye');

        // Reset this match
        m.status = 'scheduled';
        m.winner = null;
        m.homeScore = null;
        m.awayScore = null;

        // Clean out the slots coming from below
        if (m.round === 2) {
            m.homeTeam = null; 
            m.awayTeam = null;
        } else {
            // For round 3+, we scrub the specific side that had the ghost winner
            if (oldWinnerToScrub) {
                if (m.homeTeam && m.homeTeam.toString() === oldWinnerToScrub.toString()) {
                    m.homeTeam = null;
                }
                if (m.awayTeam && m.awayTeam.toString() === oldWinnerToScrub.toString()) {
                    m.awayTeam = null;
                }
            }
        }

        await m.save();

        if (m.nextMatch) {
            oldWinnerToScrub = previousWinner;
            currentMatchId = m.nextMatch;

            // Optional: If the parent match was already 'scheduled' and we just removed a slot, 
            // should we keep cascading? 
            // If parent match was 'scheduled', its winner is ALREADY null. 
            // So scrubing the slot is enough, we don't need to wipe its 'winner' because it is null.
            const nextM = await Match.findById(m.nextMatch);
            if (nextM && nextM.status === 'scheduled') {
                 log(`Parent match ${nextM._id} (Round ${nextM.round}) is already scheduled.`);
                 // Just scrub the slot
                 if (oldWinnerToScrub) {
                     if (nextM.homeTeam && nextM.homeTeam.toString() === oldWinnerToScrub.toString()) nextM.homeTeam = null;
                     if (nextM.awayTeam && nextM.awayTeam.toString() === oldWinnerToScrub.toString()) nextM.awayTeam = null;
                     await nextM.save();
                 }
                 log(`Cascade finished!`);
                 break;
            }
        } else {
            break;
        }
    }

    log("Injection and Cleanup Successful!");
    fs.writeFileSync("inject_log.txt", out);
    process.exit(0);
}
injectAndClean();
