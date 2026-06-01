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
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    const m1 = await Match.findOne({ tournament: id, round: 101, "bracketPosition.y": 0 }).lean();
    const m2 = await Match.findOne({ tournament: id, round: 101, "bracketPosition.y": 1 }).lean();
    const next1 = await Match.findById(m1?.nextMatch).lean();
    const next2 = await Match.findById(m2?.nextMatch).lean();

    console.log(`LR1 Match y=0: nextMatch=${m1?.nextMatch}, nextMatch y=${next1?.bracketPosition?.y}`);
    console.log(`LR1 Match y=1: nextMatch=${m2?.nextMatch}, nextMatch y=${next2?.bracketPosition?.y}`);
    process.exit(0);
}

run();
