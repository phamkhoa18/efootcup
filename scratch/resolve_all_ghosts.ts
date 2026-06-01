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
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    winner: mongoose.Schema.Types.ObjectId,
    status: String,
    nextMatch: mongoose.Schema.Types.ObjectId,
    loserDropsToMatch: mongoose.Schema.Types.ObjectId,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function findSlotInNextMatch(currentMatch: any, id: any) {
    const siblings = await Match.find({
        tournament: id,
        round: currentMatch.round,
        nextMatch: currentMatch.nextMatch,
    }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

    const idx = siblings.findIndex(m => m._id.toString() === currentMatch._id.toString());
    return idx === 0 ? "homeTeam" : "awayTeam";
}

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    let resolvedAny = true;
    while (resolvedAny) {
        resolvedAny = false;
        const matches = await Match.find({ 
            tournament: id, 
            status: { $in: ["scheduled", "live"] }
        });
        
        for (const m of matches) {
            // A match is a "ghost vs team" if one slot is filled and the other is fundamentally dead.
            // But how do we know if it's dead or just waiting?
            // In our simulation, all WB matches up to round 5 were played.
            // If it's a "ghost vs team", it usually means the ghost side comes from a BYE.
            // Since we already ran fix_lb_stuck for R1, let's just resolve ANY match where one team is present and the other is null, AND the round is LB R1 or LB R2.
            // Wait, no. If it's LB R2, homeTeam is from LB R1 (which might be double-dead ghost).
            // Let's just find matches where both slots are from rounds that have completely finished.
            // It's easier: just look at the dead slots from WB R1!
        }
    }
    
    process.exit(0);
}

// Just resolve all matches in LB that have 1 team and 1 null
