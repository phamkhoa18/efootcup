import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    status: String,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const wbr1_byes = await Match.countDocuments({ tournament: id, round: 1, status: "bye" });
    const wbr1_total = await Match.countDocuments({ tournament: id, round: 1 });
    console.log(`WB R1 Byes: ${wbr1_byes} / ${wbr1_total}`);
    
    process.exit(0);
}

run();
