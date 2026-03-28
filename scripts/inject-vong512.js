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

async function injectVong512() {
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

    // BRANCH A (The one we previously modified, we will overwrite its children to be BYEs)
    const m2A = await Match.findById("69c78777c1f1fdf12f3d0b86");
    const childA = await Match.find({ nextMatch: m2A._id, round: 1 }).sort({ _id: 1 });

    // Ensure we have two children
    if (childA.length === 2) {
        // M1 child 1: BYE for missingTeams[0]
        childA[0].homeTeam = missingTeams[0]._id;
        childA[0].awayTeam = null;
        childA[0].status = 'bye';
        childA[0].winner = missingTeams[0]._id;
        childA[0].homeScore = 0; childA[0].awayScore = 0;
        await childA[0].save();

        // M1 child 2: BYE for missingTeams[1]
        childA[1].homeTeam = missingTeams[1]._id;
        childA[1].awayTeam = null;
        childA[1].status = 'bye';
        childA[1].winner = missingTeams[1]._id;
        childA[1].homeScore = 0; childA[1].awayScore = 0;
        await childA[1].save();

        // M2 A: Scheduled (Missing[0] vs Missing[1])
        m2A.homeTeam = missingTeams[0]._id;
        m2A.awayTeam = missingTeams[1]._id;
        m2A.status = 'scheduled';
        m2A.winner = null;
        m2A.homeScore = null; m2A.awayScore = null;
        await m2A.save();
        log("Branch A successfully shifted to Vong 512!");
    }

    // BRANCH B (A new dead branch: 69c78777c1f1fdf12f3d0b89)
    const m2B = await Match.findById("69c78777c1f1fdf12f3d0b89");
    const childB = await Match.find({ nextMatch: m2B._id, round: 1 }).sort({ _id: 1 });

    if (childB.length === 2) {
        // M1 child 1: BYE for missingTeams[2]
        childB[0].homeTeam = missingTeams[2]._id;
        childB[0].awayTeam = null;
        childB[0].status = 'bye';
        childB[0].winner = missingTeams[2]._id;
        childB[0].homeScore = 0; childB[0].awayScore = 0;
        await childB[0].save();

        // M1 child 2: BYE for missingTeams[3]
        childB[1].homeTeam = missingTeams[3]._id;
        childB[1].awayTeam = null;
        childB[1].status = 'bye';
        childB[1].winner = missingTeams[3]._id;
        childB[1].homeScore = 0; childB[1].awayScore = 0;
        await childB[1].save();

        // M2 B: Scheduled (Missing[2] vs Missing[3])
        let oldWinnerToScrub = m2B.winner; // This was the ghost who "won" Branch B
        m2B.homeTeam = missingTeams[2]._id;
        m2B.awayTeam = missingTeams[3]._id;
        m2B.status = 'scheduled';
        m2B.winner = null;
        m2B.homeScore = null; m2B.awayScore = null;
        await m2B.save();

        // Clean up Branch B upwards!
        let currentMatchId = m2B.nextMatch;
        while (currentMatchId) {
            const m = await Match.findById(currentMatchId);
            if (!m) break;
            log(`Cleaning Branch B Round ${m.round} Match ${m._id}...`);
            let previousWinner = m.winner;
            
            m.status = 'scheduled';
            m.winner = null;
            m.homeScore = null; m.awayScore = null;

            if (oldWinnerToScrub) {
                if (m.homeTeam && m.homeTeam.toString() === oldWinnerToScrub.toString()) m.homeTeam = null;
                if (m.awayTeam && m.awayTeam.toString() === oldWinnerToScrub.toString()) m.awayTeam = null;
            }
            await m.save();

            if (m.nextMatch) {
                oldWinnerToScrub = previousWinner;
                currentMatchId = m.nextMatch;
                const nextM = await Match.findById(m.nextMatch);
                if (nextM && nextM.status === 'scheduled') {
                     if (oldWinnerToScrub) {
                         if (nextM.homeTeam && nextM.homeTeam.toString() === oldWinnerToScrub.toString()) nextM.homeTeam = null;
                         if (nextM.awayTeam && nextM.awayTeam.toString() === oldWinnerToScrub.toString()) nextM.awayTeam = null;
                         await nextM.save();
                     }
                     break;
                }
            } else {
                break;
            }
        }
        log("Branch B successfully shifted to Vong 512 and cleaned upward!");
    }

    fs.writeFileSync("vong512_log.txt", out);
    process.exit(0);
}
injectVong512();
