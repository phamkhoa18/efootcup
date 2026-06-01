import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const TournamentSchema = new mongoose.Schema({ name: String, format: String }, { strict: false });
const MatchSchema = new mongoose.Schema({ tournament: mongoose.Schema.Types.ObjectId, round: Number, bracketType: String }, { strict: false });
const Tournament = mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const tournaments = await Tournament.find({ format: "double_elimination" }).lean();
    for (const t of tournaments) {
        console.log(`Tournament: ${t._id} - ${t.name}`);
        const lbMatches = await Match.find({ tournament: t._id, bracketType: "loser" }).lean();
        const rounds: Record<number, number> = {};
        lbMatches.forEach(m => {
            rounds[m.round] = (rounds[m.round] || 0) + 1;
        });
        console.log("  LB Rounds:", rounds);
    }
    process.exit(0);
}

run();
