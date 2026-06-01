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
    const lr2Matches = await Match.find({ tournament: id, round: 102 }).lean();
    
    const ySet = new Set();
    const duplicates = [];
    for (const m of lr2Matches) {
        const y = m.bracketPosition?.y;
        if (ySet.has(y)) {
            duplicates.push(`Match ${m.matchNumber} has duplicate y=${y}`);
        }
        ySet.add(y);
    }
    
    console.log(`Found ${duplicates.length} duplicates.`);
    if (duplicates.length > 0) console.log(duplicates.slice(0, 10));
    
    process.exit(0);
}

run();
