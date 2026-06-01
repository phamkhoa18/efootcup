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
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const Team = mongoose.models.Team || mongoose.model("Team", new mongoose.Schema({ name: String }, {strict: false}));

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const m23 = await Match.findOne({ tournament: id, round: 102, "bracketPosition.y": 22 }).populate('homeTeam', 'name').populate('awayTeam', 'name');
    const m24 = await Match.findOne({ tournament: id, round: 102, "bracketPosition.y": 23 }).populate('homeTeam', 'name').populate('awayTeam', 'name');
    
    console.log(`LB R2 Match 23: [${m23?.homeTeam?.name || 'TBD'}] vs [${m23?.awayTeam?.name || 'TBD'}] - status: ${m23?.status}`);
    console.log(`LB R2 Match 24: [${m24?.homeTeam?.name || 'TBD'}] vs [${m24?.awayTeam?.name || 'TBD'}] - status: ${m24?.status}`);
    
    process.exit(0);
}

run();
