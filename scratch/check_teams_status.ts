import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

const TeamSchema = new mongoose.Schema({
    name: String,
    status: String,
    tournament: mongoose.Schema.Types.ObjectId,
}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    const team = await Team.findOne({ tournament: new mongoose.Types.ObjectId("6a1d19a6eecd25def4349f13") });
    console.log(team);
    process.exit(0);
}

run();
