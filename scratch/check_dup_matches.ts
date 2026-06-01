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
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const matches = await Match.find({ tournament: id, bracketType: "loser" }).lean();
    
    const posMap = new Map();
    let dups = 0;
    matches.forEach(m => {
        const key = `${m.round}-${m.bracketPosition?.y}`;
        if (posMap.has(key)) {
            console.log(`Duplicate found! Round ${m.round}, Pos Y: ${m.bracketPosition?.y}`);
            dups++;
        }
        posMap.set(key, true);
    });
    
    console.log(`Total Loser Matches: ${matches.length}, Duplicates: ${dups}`);
    process.exit(0);
}

run();
