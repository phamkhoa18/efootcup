import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    matchNumber: Number,
    nextMatch: mongoose.Schema.Types.ObjectId,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const lbMatches = await Match.find({ tournament: new mongoose.Types.ObjectId("6a1c69777b0f1e115daa3a32"), bracketType: "loser" }).lean();
    for (const m of lbMatches) {
        console.log(`Round ${m.round}, Match ${m.matchNumber}, nextMatch: ${m.nextMatch}`);
    }
    process.exit(0);
}

run();
