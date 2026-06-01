import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    loserDropsToMatch: mongoose.Schema.Types.ObjectId,
    status: String,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const wbR1Matches = await Match.find({ tournament: new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13"), round: 1 }).lean();
    console.log(`WB R1 has ${wbR1Matches.length} matches.`);
    
    let byeDrops = 0;
    let normalDrops = 0;
    for (const m of wbR1Matches) {
        if (m.status === "bye") byeDrops++;
        else normalDrops++;
    }
    console.log(`BYE drops: ${byeDrops}, Normal drops: ${normalDrops}`);
    process.exit(0);
}

run();
