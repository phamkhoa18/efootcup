import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
}

// Minimal schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    gamerId: String,
    efvId: Number
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const TournamentSchema = new mongoose.Schema({
    title: String,
    currentTeams: Number,
    maxTeams: Number,
});
const Tournament = mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);

const TeamSchema = new mongoose.Schema({
    name: String,
    shortName: String,
    tournament: mongoose.Schema.Types.ObjectId,
    captain: mongoose.Schema.Types.ObjectId,
    members: Array
});
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const RegistrationSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    user: mongoose.Schema.Types.ObjectId,
    team: mongoose.Schema.Types.ObjectId,
    teamName: String,
    teamShortName: String,
    playerName: String,
    gamerId: String,
    phone: String,
    email: String,
    status: String,
    paymentStatus: String,
    approvedAt: Date
});
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);

async function run() {
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to MongoDB");

    const tournamentId = "6a1d19a6eecd25def4349f13";
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
        console.error("Tournament not found");
        process.exit(1);
    }

    console.log(`Found tournament: ${tournament.title}`);

    // Fetch 300 users who are NOT already registered
    const registeredUsers = await Registration.find({ tournament: tournamentId }).distinct("user");
    
    const usersToRegister = await User.find({ _id: { $nin: registeredUsers } })
        .limit(300)
        .lean();

    console.log(`Found ${usersToRegister.length} users to register`);

    let registeredCount = 0;
    for (const user of usersToRegister) {
        try {
            const teamName = `Team ${user.name || "Unknown"}`.substring(0, 30);
            const teamShort = `T${registeredCount}`.substring(0, 4);

            const team = await Team.create({
                name: teamName,
                shortName: teamShort,
                tournament: tournamentId,
                captain: user._id,
                members: [{ user: user._id, role: "captain", joinedAt: new Date() }]
            });

            await Registration.create({
                tournament: tournamentId,
                user: user._id,
                team: team._id,
                teamName: teamName,
                teamShortName: teamShort,
                playerName: user.name || "Unknown",
                gamerId: user.gamerId || user.efvId?.toString() || `GAMER-${Date.now()}`,
                phone: user.phone || "0123456789",
                email: user.email || `user${user._id}@example.com`,
                status: "approved",
                paymentStatus: "paid",
                approvedAt: new Date()
            });

            registeredCount++;
        } catch (e) {
            console.error(`Error registering user ${user._id}:`, e);
        }
    }

    // Update tournament currentTeams
    const newCount = await Registration.countDocuments({ tournament: tournamentId, status: "approved" });
    await Tournament.findByIdAndUpdate(tournamentId, { currentTeams: newCount, maxTeams: Math.max(tournament.maxTeams, newCount) });

    console.log(`Successfully registered ${registeredCount} users. Tournament now has ${newCount} teams.`);
    process.exit(0);
}

run();
