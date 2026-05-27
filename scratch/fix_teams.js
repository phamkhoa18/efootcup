const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;

    const tournamentId = "69ce29759dcff66e7384cdf9";

    // Get all teams with < 2 members for this tournament
    const teams = await db.collection("teams").find({ 
        tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const badTeams = teams.filter(t => !t.members || t.members.length < 2);
    
    console.log(`Found ${badTeams.length} teams with < 2 members. Fixing...\n`);
    
    let fixed = 0;
    for (const team of badTeams) {
        // Find the registration
        const reg = await db.collection("registrations").findOne({ team: team._id });
        if (!reg || !reg.player2User) {
            console.log(`  ❌ ${team.name}: No registration or no player2User, skipping`);
            continue;
        }

        // Add player2 to team members
        await db.collection("teams").updateOne(
            { _id: team._id },
            { 
                $push: { 
                    members: { 
                        user: reg.player2User, 
                        role: "player", 
                        joinedAt: new Date() 
                    } 
                } 
            }
        );
        
        fixed++;
        console.log(`  ✅ ${team.name}: Added player2 (${reg.player2Name}) to members`);
    }
    
    console.log(`\nFixed ${fixed}/${badTeams.length} teams.`);

    // Verify
    const verifyTeams = await db.collection("teams").find({ 
        tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    const stillBad = verifyTeams.filter(t => !t.members || t.members.length < 2);
    console.log(`\nVerification: ${stillBad.length} teams still have < 2 members`);

    process.exit(0);
}
run();
