import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    const lr1 = await Match.countDocuments({ tournament: id, round: 101 });
    const lr2 = await Match.countDocuments({ tournament: id, round: 102 });
    const lr3 = await Match.countDocuments({ tournament: id, round: 103 });
    
    console.log("LR1 count:", lr1);
    console.log("LR2 count:", lr2);
    console.log("LR3 count:", lr3);
    
    process.exit(0);
}

run();
