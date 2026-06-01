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
    nextMatch: mongoose.Schema.Types.ObjectId,
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function cascadeAdvance(matchId: string, winnerId: string, depth = 0) {
    if (depth > 20) return;
    const match = await Match.findById(matchId);
    if (!match || !match.nextMatch) return;

    const siblings = await Match.find({
        tournament: match.tournament,
        round: match.round,
        nextMatch: match.nextMatch,
    }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

    const idx = siblings.findIndex((m: any) => m._id.toString() === match._id.toString());
    const slot = idx === 0 ? "homeTeam" : "awayTeam";
    
    const nextMatch = await Match.findById(match.nextMatch);
    if (nextMatch) {
        nextMatch[slot] = winnerId;
        await nextMatch.save();
        console.log(`  -> Advanced ${winnerId} to next match (${slot})`);
    }
}

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    let resolvedAny = true;
    while (resolvedAny) {
        resolvedAny = false;
        
        // Find all matches that have 1 team and 1 null, and their round is > 1.
        // Wait, how do we know the null slot is dead?
        // Because in SE, if a slot is null and it's from a previous round, the previous round must be fully completed!
        // Is the previous round fully completed?
        // If the tournament just started, ALL R1 matches are completed (either real matches or BYEs)!
        // Actually, if it's Single Elim, real matches are NOT completed yet!
        // But BYE matches in R1 are "bye"!
        // What about double ghosts? R1 skipped creating double ghosts.
        // So if a match has NO previous match for a slot, it's a dead slot!
        
        const matches = await Match.find({ tournament: id, status: "scheduled" });
        for (const match of matches) {
            let homeDead = false;
            let awayDead = false;
            
            if (!match.homeTeam) {
                // Look for previous match
                const prev = await Match.find({ tournament: id, nextMatch: match._id }).sort({"bracketPosition.y": 1});
                if (prev.length === 0) homeDead = true;
                else if (prev.length > 0 && (!prev[0] || prev[0].status === "bye" && !prev[0].winner)) homeDead = true;
            }
            if (!match.awayTeam) {
                const prev = await Match.find({ tournament: id, nextMatch: match._id }).sort({"bracketPosition.y": 1});
                if (prev.length === 0) awayDead = true; // Wait! prev finds ALL siblings.
                else if (prev.length > 1 && (!prev[1] || prev[1].status === "bye" && !prev[1].winner)) awayDead = true;
                // If prev.length == 1, it means the other sibling was skipped! So it's dead!
                else if (prev.length === 1) awayDead = true;
            }
            
            if (homeDead && awayDead) {
                match.status = "bye";
                await match.save();
                resolvedAny = true;
                console.log(`Match ${match.round}-${match.bracketPosition?.y} double dead -> bye`);
            } else if (homeDead && match.awayTeam) {
                match.status = "walkover";
                match.winner = match.awayTeam;
                await match.save();
                await cascadeAdvance(match._id.toString(), match.awayTeam.toString());
                resolvedAny = true;
                console.log(`Match ${match.round}-${match.bracketPosition?.y} home dead -> walkover for away`);
            } else if (awayDead && match.homeTeam) {
                match.status = "walkover";
                match.winner = match.homeTeam;
                await match.save();
                await cascadeAdvance(match._id.toString(), match.homeTeam.toString());
                resolvedAny = true;
                console.log(`Match ${match.round}-${match.bracketPosition?.y} away dead -> walkover for home`);
            }
        }
    }
    
    console.log("Done fixing SE bracket!");
    process.exit(0);
}

run();
