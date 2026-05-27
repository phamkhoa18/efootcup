const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;

    // Find all 2v2 tournaments
    const tournaments = await db.collection("tournaments").find({ teamSize: 2 }).toArray();
    console.log(`Found ${tournaments.length} 2v2 tournaments\n`);

    let totalBadTeams = 0;

    for (const t of tournaments) {
        const teams = await db.collection("teams").find({ tournament: t._id }).toArray();
        const badTeams = teams.filter(team => !team.members || team.members.length < 2);
        
        if (badTeams.length > 0) {
            totalBadTeams += badTeams.length;
            console.log(`❌ ${t.title} (${t._id})`);
            console.log(`   Status: ${t.status} | EFV Awarded: ${t.efvPointsAwarded} | Teams: ${teams.length} | Missing player2: ${badTeams.length}`);
            
            for (const bt of badTeams) {
                const reg = await db.collection("registrations").findOne({ team: bt._id });
                const hasP2 = reg && reg.player2User;
                console.log(`   - ${bt.name}: members=${bt.members?.length || 0}, reg.player2User=${hasP2 ? '✅' : '❌'} ${reg?.player2Name || ''}`);
            }
            console.log("");
        } else {
            console.log(`✅ ${t.title} (${t._id}) — ${teams.length} teams, all OK`);
        }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total 2v2 tournaments: ${tournaments.length}`);
    console.log(`Total teams missing player2 in members: ${totalBadTeams}`);

    process.exit(0);
}
run();
