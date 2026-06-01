import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.processEnv?.MONGODB_URI || process.env.MONGODB_URI;

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketType: String,
    roundName: String,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const id = new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13");
    
    const matches = await Match.find({ tournament: id, bracketType: "winner" }).lean();
    
    const typeRoundMap: Record<string, any[]> = {};
    matches.forEach((m: any) => {
        const rn = m.roundName || `Vòng ${m.round}`;
        if (!typeRoundMap[rn]) typeRoundMap[rn] = [];
        typeRoundMap[rn].push(m);
    });

    const displayRds = Object.entries(typeRoundMap)
        .sort(([, a], [, b]) => (a[0]?.round ?? 0) - (b[0]?.round ?? 0))
        .map(([name, rm]) => ({ name, matches: rm }))
        .filter(r => r.matches.length > 0);
        
    displayRds.forEach((rd, i) => {
        console.log(`Col ${i+1} (${rd.name}): ${rd.matches.length} matches`);
    });
    
    process.exit(0);
}

run();
