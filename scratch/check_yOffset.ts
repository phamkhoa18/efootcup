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
    const lr2_1 = await Match.findOne({ tournament: id, round: 102, matchNumber: 1 }).lean();
    const lr2_2 = await Match.findOne({ tournament: id, round: 102, matchNumber: 2 }).lean();
    const lr3_1 = await Match.findOne({ tournament: id, round: 103, matchNumber: 1 }).lean();
    
    console.log(`LR2 Match 1 y: ${lr2_1?.bracketPosition?.y}`);
    console.log(`LR2 Match 2 y: ${lr2_2?.bracketPosition?.y}`);
    console.log(`LR3 Match 1 y: ${lr3_1?.bracketPosition?.y}`);
    
    process.exit(0);
}

run();
