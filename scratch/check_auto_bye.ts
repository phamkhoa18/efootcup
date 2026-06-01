import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    status: String,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const lbR1Matches = await Match.find({ tournament: new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13"), round: 101 }).lean();
    
    let scheduled = 0;
    let bye = 0;
    for (const m of lbR1Matches) {
        if (m.status === "bye") bye++;
        else scheduled++;
    }
    console.log(`LB R1 matches: ${lbR1Matches.length}. Scheduled: ${scheduled}, BYE: ${bye}`);
    process.exit(0);
}

run();
