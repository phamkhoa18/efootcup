import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    // Simulate what the bracket API returns
    const matches = await Match.find({ tournament: id })
            .populate("homeTeam", "name shortName logo efvId player1 player2 player2EfvId seed captain")
            .populate("awayTeam", "name shortName logo efvId player1 player2 player2EfvId seed captain")
            .populate("winner", "name shortName")
            .populate("p1", "name ingame")
            .populate("p2", "name ingame")
            .sort({ round: 1, matchNumber: 1 })
            .lean();
            
    const lr1 = matches.filter(m => m.round === 101);
    const lr2 = matches.filter(m => m.round === 102);
    const lr3 = matches.filter(m => m.round === 103);
    
    console.log("API LR1 count:", lr1.length);
    console.log("API LR2 count:", lr2.length);
    console.log("API LR3 count:", lr3.length);
    
    process.exit(0);
}

run();
