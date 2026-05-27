const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;

    const tournamentId = "69ce29759dcff66e7384cdf9";

    // Get all teams with < 2 members
    const teams = await db.collection("teams").find({ 
        tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const badTeams = teams.filter(t => !t.members || t.members.length < 2);
    
    console.log("=== TEAMS WITH < 2 MEMBERS ===\n");
    
    for (const team of badTeams) {
        // Find the registration for this team
        const reg = await db.collection("registrations").findOne({ 
            team: team._id 
        });
        
        console.log(`Team: ${team.name}`);
        console.log(`  Team ID: ${team._id}`);
        console.log(`  Members count: ${team.members ? team.members.length : 0}`);
        console.log(`  Captain: ${team.captain}`);
        
        if (reg) {
            console.log(`  Registration ID: ${reg._id}`);
            console.log(`  Player 1 (user): ${reg.user}`);
            console.log(`  Player 2 (player2User): ${reg.player2User}`);
            console.log(`  Player 2 Name: ${reg.player2Name}`);
            console.log(`  Player 2 GamerId: ${reg.player2GamerId}`);
        } else {
            console.log(`  ❌ No registration found for this team!`);
        }
        console.log("");
    }

    // Also check: how many registrations have player2User set?
    const allRegs = await db.collection("registrations").find({ 
        tournament: new mongoose.Types.ObjectId(tournamentId),
        status: "approved"
    }).toArray();
    
    const withP2 = allRegs.filter(r => r.player2User);
    const withoutP2 = allRegs.filter(r => !r.player2User);
    
    console.log("=== REGISTRATION STATS ===");
    console.log("Total approved registrations:", allRegs.length);
    console.log("With player2User:", withP2.length);
    console.log("Without player2User:", withoutP2.length);
    
    // Check which ones without player2User still have player2Name
    const noP2UserButHasName = withoutP2.filter(r => r.player2Name);
    console.log("Without player2User but has player2Name:", noP2UserButHasName.length);
    if (noP2UserButHasName.length > 0) {
        noP2UserButHasName.forEach(r => {
            console.log(`  - ${r.teamName}: player2Name=${r.player2Name}, player2GamerId=${r.player2GamerId}`);
        });
    }

    process.exit(0);
}
run();
