import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    matchNumber: Number,
    homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    status: String,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const Team = mongoose.models.Team || mongoose.model("Team", new mongoose.Schema({ name: String }, {strict: false}));

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    console.log("--- LB R1 (Round 101) ---");
    const lbr1 = await Match.find({ tournament: id, bracketType: "loser", round: 101 }).populate('homeTeam', 'name').populate('awayTeam', 'name').limit(10);
    for (const m of lbr1) {
        console.log(`Match ${m.matchNumber} (${m.bracketPosition?.x}, ${m.bracketPosition?.y}): [${m.homeTeam?.name || 'TBD'}] vs [${m.awayTeam?.name || 'TBD'}] - ${m.status}`);
    }

    process.exit(0);
}

run();
