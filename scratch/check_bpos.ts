import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    for (let r = 101; r <= 106; r++) {
        const matches = await Match.find({ tournament: id, bracketType: "loser", round: r }).sort({ "bracketPosition.y": 1 }).lean();
        console.log(`LB R${r-100}: ${matches.length} matches`);
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].bracketPosition?.y !== i) {
                console.log(`Mismatch in R${r-100}! Expected ${i}, got ${matches[i].bracketPosition?.y}`);
            }
        }
    }
    
    process.exit(0);
}

run();
