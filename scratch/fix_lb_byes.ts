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
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    // Find all WB R1 matches that were BYEs
    const wbR1Byes = await Match.find({ tournament: id, round: 1, bracketType: "winner", status: "bye" }).lean();
    console.log(`Found ${wbR1Byes.length} WB R1 BYEs.`);
    
    let updatedCount = 0;
    
    // For each BYE match, the "loser" slot in LB R1 is dead.
    // If an LB R1 match has ONE real team and ONE dead slot, the real team should auto-advance!
    // But wait: LB R1 takes TWO losers from WB R1.
    // If BOTH WB R1 matches were BYEs, then BOTH slots in LB R1 are dead. Then the LB R1 match ITSELF is a BYE!
    
    // Let's just find all LB R1 matches
    const lbR1Matches = await Match.find({ tournament: id, round: 101, bracketType: "loser" });
    
    for (const lbMatch of lbR1Matches) {
        // Who drops into this match?
        // In generateDoubleElimination:
        // match idx 0,1 -> LB match 0
        // match idx 2,3 -> LB match 1
        // So LB match i receives drops from WB matches 2*i and 2*i + 1.
        
        // Let's find the WB matches that drop to this LB match
        const sourceWB = await Match.find({ loserDropsToMatch: lbMatch._id }).lean();
        
        const source1 = sourceWB[0];
        const source2 = sourceWB[1];
        
        const isSource1Dead = source1 && source1.status === "bye";
        const isSource2Dead = source2 && source2.status === "bye";
        
        if (isSource1Dead && isSource2Dead) {
            // Both are dead. LB match is a BYE.
            lbMatch.status = "bye";
            await lbMatch.save();
            updatedCount++;
            
            // The next match in LB should receive a "dead" slot too!
            // This cascades!
            // But let's just mark this one as BYE for now.
        } else if (isSource1Dead || isSource2Dead) {
            // One is dead, one is alive.
            // If the alive one already has a loser, that loser should advance.
            // If the alive one hasn't been played yet, the LB match must wait for the loser!
            // BUT wait! If the LB match waits for the loser, then once the loser arrives, they should AUTO-ADVANCE!
            // How do we represent this?
            // We can just mark the "dead" slot as "BYE" or something, but we don't have a team ID for it.
            // Actually, if we mark the status as "bye", it means both advance? No.
        }
    }
    
    console.log(`Updated ${updatedCount} LB R1 matches.`);
    process.exit(0);
}

run();
