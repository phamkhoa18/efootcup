import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const TeamSchema = new mongoose.Schema({ name: String }, {strict: false});
const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    bracketPosition: Object,
    bracketType: String
}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    
    const team = await Team.findOne({ name: /Hoàng Tuấn Giáp/i });
    if (team) {
        console.log(`Found Team: ${team._id}`);
        const match = await Match.findOne({ $or: [{homeTeam: team._id}, {awayTeam: team._id}], bracketType: "loser", round: 102 });
        if (match) {
            console.log(`Found in LB R2! Match Number: ${match.matchNumber}, Pos Y: ${match.bracketPosition?.y}`);
        } else {
            console.log("Not found in LB R2");
        }
    } else {
        console.log("Team not found");
    }
    
    process.exit(0);
}

run();
