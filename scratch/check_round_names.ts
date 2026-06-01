import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    roundName: String,
    bracketType: String,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const matches = await Match.find({ tournament: id, bracketType: "loser" }).lean();
    
    const map = new Map();
    matches.forEach(m => {
        if (!map.has(m.round)) map.set(m.round, m.roundName);
        else if (map.get(m.round) !== m.roundName) console.log(`Conflict in round ${m.round}: ${map.get(m.round)} vs ${m.roundName}`);
    });
    
    for (const [r, rn] of map.entries()) {
        console.log(`Round ${r}: ${rn}`);
    }
    
    process.exit(0);
}

run();
