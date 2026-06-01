import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const TeamSchema = new mongoose.Schema({
    name: String,
    tournament: mongoose.Schema.Types.ObjectId,
    status: String,
});
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    
    const tournamentId = "6a1d19a6eecd25def4349f13";
    const teamsCount = await Team.countDocuments({ tournament: tournamentId, status: "active" });
    const allTeams = await Team.countDocuments({ tournament: tournamentId });
    console.log(`Active teams: ${teamsCount}`);
    console.log(`Total teams: ${allTeams}`);
    
    process.exit(0);
}

run();
