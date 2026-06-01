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
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    const lr1Matches = await Match.find({ tournament: id, round: 101 }).sort({ matchNumber: 1 }).limit(4).lean();
    
    for (const m of lr1Matches) {
        const next = await Match.findById(m.nextMatch).lean();
        console.log(`LR1 Match ${m.matchNumber} points to LR2 Match ${next?.matchNumber}`);
    }
    
    process.exit(0);
}

run();
