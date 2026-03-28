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

async function findPerfectSpot() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };
    
    await mongoose.connect(process.env.MONGODB_URI);

    // Find all round 2 matches
    const r2Matches = await Match.find({ tournament: TOURNAMENT_ID, round: 2 }).lean();
    
    for (const m2 of r2Matches) {
        if (!m2.homeTeam || !m2.awayTeam) continue;
        
        const ht = await Team.findById(m2.homeTeam).lean();
        const at = await Team.findById(m2.awayTeam).lean();
        
        if (ht && ht.status === "eliminated" && at && at.status === "eliminated") {
            // Found a ghost vs ghost in Round 2!
            // That means its children in Round 1 are also ghosts.
            const childMatches = await Match.find({ nextMatch: m2._id, round: 1 }).lean();
            if (childMatches.length === 2) {
                log(`Found Perfect R2 Match: ${m2._id}`);
                log(`Child 1: ${childMatches[0]._id} (Teams: ${childMatches[0].homeTeam} vs ${childMatches[0].awayTeam})`);
                log(`Child 2: ${childMatches[1]._id} (Teams: ${childMatches[1].homeTeam} vs ${childMatches[1].awayTeam})`);
                
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
                
                fs.writeFileSync("perfect_spot.log", out);
                process.exit(0);
            }
        }
    }
    log("No perfect spot found.");
    fs.writeFileSync("perfect_spot.log", out);
    process.exit(0);
}
findPerfectSpot();
