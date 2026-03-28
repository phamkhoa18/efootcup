require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({ status: String }, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    round: Number,
    nextMatch: mongoose.Schema.Types.ObjectId,
    status: String,
    winner: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function findAllPerfectSpots() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };
    
    await mongoose.connect(process.env.MONGODB_URI);

    const r2Matches = await Match.find({ tournament: TOURNAMENT_ID, round: 2 }).lean();
    let foundCount = 0;
    
    for (const m2 of r2Matches) {
        if (!m2.homeTeam || !m2.awayTeam) continue; // Not a fully ghosted match or it's a BYE
        
        const ht = await Team.findById(m2.homeTeam).lean();
        const at = await Team.findById(m2.awayTeam).lean();
        
        // Find if BOTH are eliminated!
        if (ht && ht.status === "eliminated" && at && at.status === "eliminated") {
            const childMatches = await Match.find({ nextMatch: m2._id, round: 1 }).lean();
            if (childMatches.length === 2) {
                log(`\nFound Dead R2 Match: ${m2._id}`);
                
                // Track where this ghost branch eventually hits an active player
                let currentMatch = m2;
                let depth = 2;
                while (currentMatch.nextMatch) {
                    const next = await Match.findById(currentMatch.nextMatch).lean();
                    depth++;
                    const nextHt = next.homeTeam ? await Team.findById(next.homeTeam).lean() : null;
                    const nextAt = next.awayTeam ? await Team.findById(next.awayTeam).lean() : null;
                    
                    const isHtActive = nextHt && nextHt.status === 'active';
                    const isAtActive = nextAt && nextAt.status === 'active';
                    
                    if (isHtActive || isAtActive) {
                        log(`--> Merges with ACTIVE player at Round ${depth} (Match ${next._id})! Active team is ${isHtActive ? nextHt._id : nextAt._id}`);
                        break;
                    }
                    currentMatch = next;
                }
                foundCount++;
            }
        }
    }
    log(`\nTotal Dead R2 Branches: ${foundCount}`);
    fs.writeFileSync("all_perfect_spots.log", out);
    process.exit(0);
}
findAllPerfectSpots();
