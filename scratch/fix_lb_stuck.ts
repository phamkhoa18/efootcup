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
    awayTeam: mongoose.Schema.Types.ObjectId,
    nextMatch: mongoose.Schema.Types.ObjectId,
    winner: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    matchNumber: Number,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function cascadeAdvance(matchId: string, winnerId: string, depth = 0) {
    if (depth > 10) return;
    const match = await Match.findById(matchId);
    if (!match) return;

    if (match.status === "bye") {
        // This match is also a BYE. We should advance its "winner" too...
        // But BYE matches shouldn't have a winner, they just pass "nobody" to the next round.
        // Wait, if an LB match is a BYE, it passes "nobody" to the next round.
        // The next round match will receive "nobody".
        // Let's just focus on advancing REAL teams.
        return;
    }

    // Determine which slot this team should go to
    // For LB R2 (drop round), the LB winner goes to homeTeam
    // For LB R3 (internal round), LB winner goes to homeTeam or awayTeam depending on y
    const bY = match.bracketPosition?.y ?? 0;
    
    // In our backend logic: 
    // const side = (lbR % 2 === 0) ? (idx % 2 === 0 ? "homeTeam" : "awayTeam") : "homeTeam";
    // wait, nextMatch logic in brackets route:
    // nextIdx = Math.floor(idx / 2)
    // side = (lbR % 2 === 0) ? (idx % 2 === 0 ? "homeTeam" : "awayTeam") : "homeTeam";
    // Actually we can just find which slot is empty! But be careful.
    
    // Let's just use the logic from /matches API:
    const siblings = await Match.find({
        tournament: match.tournament,
        round: match.round,
        nextMatch: match.nextMatch,
    }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

    const idx = siblings.findIndex(m => m._id.toString() === match._id.toString());
    const slot = idx === 0 ? "homeTeam" : "awayTeam";
    
    const nextMatch = await Match.findById(match.nextMatch);
    if (nextMatch) {
        // Special logic: if it's a 1:1 mapping (drop round), the winner ALWAYS goes to homeTeam
        // Let's just check the round number!
        const lbR = match.round - 100; // e.g. 101 -> 1
        const side = (lbR % 2 === 1) ? "homeTeam" : (idx % 2 === 0 ? "homeTeam" : "awayTeam");
        
        nextMatch[side] = winnerId;
        await nextMatch.save();
        console.log(`  -> Advanced ${winnerId} to Match ${nextMatch.matchNumber} (${side})`);
    }
}

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    // Find all WB R1 BYEs
    const wbR1Byes = await Match.find({ tournament: id, round: 1, bracketType: "winner", status: "bye" }).lean();
    console.log(`Found ${wbR1Byes.length} WB R1 BYEs.`);
    
    // Map of dead LB slots
    const deadLBSlots = new Map<string, string>(); // matchId -> 'homeTeam' | 'awayTeam'
    
    for (const m of wbR1Byes) {
        if (m.loserDropsToMatch) {
            const posY = m.bracketPosition?.y ?? 0;
            const side = posY % 2 === 0 ? "homeTeam" : "awayTeam";
            deadLBSlots.set(`${m.loserDropsToMatch}_${side}`, "dead");
        }
    }
    
    const lbR1Matches = await Match.find({ tournament: id, round: 101, bracketType: "loser" });
    
    for (const lbMatch of lbR1Matches) {
        const homeDead = deadLBSlots.has(`${lbMatch._id}_homeTeam`);
        const awayDead = deadLBSlots.has(`${lbMatch._id}_awayTeam`);
        
        if (homeDead && awayDead) {
            lbMatch.status = "bye";
            await lbMatch.save();
            console.log(`Match ${lbMatch.matchNumber} is double-dead -> BYE`);
        } else if (homeDead && lbMatch.awayTeam && lbMatch.status !== "completed") {
            // Home is dead, away has a real team. Away automatically wins!
            lbMatch.winner = lbMatch.awayTeam;
            lbMatch.status = "completed";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            console.log(`Match ${lbMatch.matchNumber} auto-win for Away: ${lbMatch.awayTeam}`);
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.awayTeam.toString());
        } else if (awayDead && lbMatch.homeTeam && lbMatch.status !== "completed") {
            // Away is dead, home has a real team. Home automatically wins!
            lbMatch.winner = lbMatch.homeTeam;
            lbMatch.status = "completed";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            console.log(`Match ${lbMatch.matchNumber} auto-win for Home: ${lbMatch.homeTeam}`);
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.homeTeam.toString());
        }
    }
    
    console.log(`Done resolving LB R1 BYEs.`);
    process.exit(0);
}

run();
