import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    matchNumber: Number,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    const lr2Matches = await Match.find({ tournament: id, round: 102 }).sort({ matchNumber: 1 }).limit(2).lean();
    const lr3Matches = await Match.find({ tournament: id, round: 103 }).sort({ matchNumber: 1 }).limit(1).lean();
    
    console.log(`LR2 M1 y: ${lr2Matches[0]?.bracketPosition?.y}`);
    console.log(`LR2 M2 y: ${lr2Matches[1]?.bracketPosition?.y}`);
    console.log(`LR3 M1 y: ${lr3Matches[0]?.bracketPosition?.y}`);
    
    process.exit(0);
}

run();
