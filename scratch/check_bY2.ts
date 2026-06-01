import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    matchNumber: Number,
    nextMatch: mongoose.Schema.Types.ObjectId,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    const lr1Matches = await Match.find({ tournament: id, round: 101 }).lean();
    const lr2Matches = await Match.find({ tournament: id, round: 102 }).lean();
    
    console.log("LR1 count:", lr1Matches.length);
    console.log("LR2 count:", lr2Matches.length);
    
    let allStraight = true;
    for (const m of lr1Matches) {
        if (!m.nextMatch) continue;
        const next = lr2Matches.find(x => x._id.toString() === m.nextMatch.toString());
        if (!next) {
            console.log(`Match ${m.matchNumber} has nextMatch ${m.nextMatch} but NOT FOUND in LR2!`);
            continue;
        }
        if (m.bracketPosition?.y !== next.bracketPosition?.y) {
            console.log(`Match ${m.matchNumber} (y=${m.bracketPosition?.y}) -> nextMatch ${next.matchNumber} (y=${next.bracketPosition?.y})`);
            allStraight = false;
        }
    }
    console.log("All LR1->LR2 straight?", allStraight);
    process.exit(0);
}

run();
