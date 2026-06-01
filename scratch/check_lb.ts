import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    roundName: String,
    matchNumber: Number,
    bracketType: String,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const lbMatches = await Match.find({ tournament: new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13"), bracketType: "loser" }).sort({ round: 1, matchNumber: 1 }).lean();
    
    const rounds: Record<number, number> = {};
    lbMatches.forEach(m => {
        rounds[m.round] = (rounds[m.round] || 0) + 1;
    });
    
    console.log("Matches per LB round:");
    console.log(rounds);
    process.exit(0);
}

run();
