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
    homeScore: Number,
    awayScore: Number,
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
    
    // Process round by round up to round 5 (we don't need to do the whole thing, just enough to see drops)
    for (let r = 1; r <= 5; r++) {
        console.log(`Processing WB Round ${r}...`);
        const matches = await Match.find({ 
            tournament: id, 
            bracketType: "winner", 
            round: r,
            status: { $in: ["scheduled", "live"] }
        }).sort({ matchNumber: 1 });
        
        for (const match of matches) {
            if (!match.homeTeam || !match.awayTeam) continue; // Skip if waiting for teams
            
            // Randomly pick winner (let's say homeTeam always wins 2-1 for predictability)
            match.homeScore = 2;
            match.awayScore = 1;
            match.winner = match.homeTeam;
            match.status = "completed";
            await match.save();
            
            const winnerId = match.homeTeam;
            const loserId = match.awayTeam;
            
            // Advance winner
            if (match.nextMatch) {
                const nextMatch = await Match.findById(match.nextMatch);
                if (nextMatch) {
                    const slot = await findSlotInNextMatch(match, id);
                    nextMatch[slot] = winnerId;
                    
                    if ((nextMatch.status === 'walkover' || nextMatch.status === 'bye') && nextMatch.homeTeam && nextMatch.awayTeam) {
                        nextMatch.status = 'scheduled';
                        nextMatch.winner = null;
                        nextMatch.homeScore = null;
                        nextMatch.awayScore = null;
                    }
                    await nextMatch.save();
                }
            }
            
            // Drop loser
            if (match.loserDropsToMatch) {
                const lbMatch = await Match.findById(match.loserDropsToMatch);
                if (lbMatch) {
                    if (match.round === 1) {
                        const posY = match.bracketPosition?.y ?? 0;
                        const side = posY % 2 === 0 ? "homeTeam" : "awayTeam";
                        lbMatch[side] = loserId;
                    } else {
                        lbMatch.awayTeam = loserId;
                    }
                    
                    if ((lbMatch.status === 'walkover' || lbMatch.status === 'bye') && lbMatch.homeTeam && lbMatch.awayTeam) {
                        lbMatch.status = 'scheduled';
                        lbMatch.winner = null;
                        lbMatch.homeScore = null;
                        lbMatch.awayScore = null;
                    }
                    await lbMatch.save();
                }
            }
        }
    }
    
    console.log("Finished simulating WB matches!");
    process.exit(0);
}

run();
