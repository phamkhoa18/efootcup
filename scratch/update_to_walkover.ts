import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    status: String,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    winner: mongoose.Schema.Types.ObjectId,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const lbR1Matches = await Match.find({ tournament: id, round: 101, bracketType: "loser", status: "completed" });
    let updated = 0;
    for (const m of lbR1Matches) {
        if (!m.homeTeam || !m.awayTeam) {
            m.status = "walkover";
            await m.save();
            updated++;
        }
    }
    console.log(`Updated ${updated} matches to walkover!`);
    
    process.exit(0);
}

run();
