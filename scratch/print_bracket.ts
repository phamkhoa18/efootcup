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
    homeScore: Number,
    awayScore: Number,
    winner: mongoose.Schema.Types.ObjectId,
    status: String,
    nextMatch: mongoose.Schema.Types.ObjectId,
    loserDropsToMatch: mongoose.Schema.Types.ObjectId,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const Team = mongoose.models.Team || mongoose.model("Team", new mongoose.Schema({ name: String }, {strict: false}));

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    // Check LB R2
    console.log("--- LB R2 (Round 102) ---");
    const lbr2 = await Match.find({ tournament: id, bracketType: "loser", round: 102 }).populate('homeTeam', 'name').populate('awayTeam', 'name').limit(5);
    for (const m of lbr2) {
        console.log(`Match ${m.matchNumber} (${m.bracketPosition?.x}, ${m.bracketPosition?.y}): [${m.homeTeam?.name || 'TBD'}] vs [${m.awayTeam?.name || 'TBD'}]`);
    }

    console.log("--- LB R3 (Round 103) ---");
    const lbr3 = await Match.find({ tournament: id, bracketType: "loser", round: 103 }).populate('homeTeam', 'name').populate('awayTeam', 'name').limit(5);
    for (const m of lbr3) {
        console.log(`Match ${m.matchNumber} (${m.bracketPosition?.x}, ${m.bracketPosition?.y}): [${m.homeTeam?.name || 'TBD'}] vs [${m.awayTeam?.name || 'TBD'}]`);
    }

    console.log("--- LB R4 (Round 104) ---");
    const lbr4 = await Match.find({ tournament: id, bracketType: "loser", round: 104 }).populate('homeTeam', 'name').populate('awayTeam', 'name').limit(5);
    for (const m of lbr4) {
        console.log(`Match ${m.matchNumber} (${m.bracketPosition?.x}, ${m.bracketPosition?.y}): [${m.homeTeam?.name || 'TBD'}] vs [${m.awayTeam?.name || 'TBD'}]`);
    }
    
    process.exit(0);
}

run();
