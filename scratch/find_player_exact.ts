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
    bracketPosition: Object,
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    
    const id = new mongoose.Types.ObjectId("69aed2a58efd097b8516a3ac"); // Hoàng Tuấn Giáp
    const matches = await Match.find({ $or: [{homeTeam: id}, {awayTeam: id}] }).sort({ round: 1 });
    for (const m of matches) {
        console.log(`Bracket: ${m.bracketType}, Round: ${m.round}, Match: ${m.matchNumber}, PosY: ${m.bracketPosition?.y}`);
    }
    
    process.exit(0);
}

run();
