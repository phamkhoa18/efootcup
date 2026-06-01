import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    roundName: String,
    status: String,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    // Check if there's any weird duplication in matches
    const totalWb = await Match.countDocuments({ tournament: id, bracketType: "winner" });
    const totalLb = await Match.countDocuments({ tournament: id, bracketType: "loser" });
    const totalGf = await Match.countDocuments({ tournament: id, bracketType: "grand_final" });
    
    console.log(`WB Total: ${totalWb}, LB Total: ${totalLb}, GF Total: ${totalGf}`);
    
    process.exit(0);
}

run();
