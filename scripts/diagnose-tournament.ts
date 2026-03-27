/**
 * Script chẩn đoán giải đấu 69bd4c8ad4d24902b39db3d5
 * 
 * Chạy trên server production:
 *   MONGODB_URI="mongodb://..." npx tsx scripts/diagnose-tournament.ts
 * 
 * Hoặc local (nếu kết nối production DB):
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/diagnose-tournament.ts
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

async function diagnose() {
    console.log("🔌 Connecting to MongoDB...");
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`);
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db!;

    // 1. Tournament info
    console.log("=" .repeat(60));
    console.log("📋 TOURNAMENT INFO");
    console.log("=" .repeat(60));
    const tournament = await db.collection("tournaments").findOne({ 
        _id: new mongoose.Types.ObjectId(TOURNAMENT_ID) 
    });
    if (!tournament) {
        console.log("❌ Tournament not found!");
        process.exit(1);
    }
    console.log(`  Title: ${tournament.title}`);
    console.log(`  Status: ${tournament.status}`);
    console.log(`  Format: ${tournament.format}`);
    console.log(`  Max Teams: ${tournament.maxTeams}`);
    console.log(`  Current Teams: ${tournament.currentTeams}`);
    console.log(`  Created: ${tournament.createdAt}`);
    console.log(`  Updated: ${tournament.updatedAt}`);

    // 2. Teams status
    console.log("\n" + "=" .repeat(60));
    console.log("👥 TEAMS STATUS");
    console.log("=" .repeat(60));
    const teams = await db.collection("teams").find({ 
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID) 
    }).sort({ "stats.played": -1 }).toArray();
    
    console.log(`  Total teams: ${teams.length}`);
    
    const activeTeams = teams.filter(t => t.status === "active");
    const eliminatedTeams = teams.filter(t => t.status === "eliminated");
    const otherTeams = teams.filter(t => t.status !== "active" && t.status !== "eliminated");
    
    console.log(`  Active: ${activeTeams.length}`);
    console.log(`  Eliminated: ${eliminatedTeams.length}`);
    console.log(`  Other: ${otherTeams.length}`);

    // Teams with stats (might still have old stats if not reset)
    const teamsWithStats = teams.filter(t => t.stats && (t.stats.played > 0 || t.stats.wins > 0));
    console.log(`\n  📊 Teams with remaining stats: ${teamsWithStats.length}`);
    if (teamsWithStats.length > 0) {
        console.log("  (These teams may still have stats from BEFORE the regeneration!)");
        console.log("  ---------------------------------------------------------");
        teamsWithStats.forEach(t => {
            console.log(`    ${t.name} (${t.shortName || ''}) - P:${t.stats.played} W:${t.stats.wins} D:${t.stats.draws} L:${t.stats.losses} GF:${t.stats.goalsFor} GA:${t.stats.goalsAgainst} Pts:${t.stats.points}`);
        });
    }

    // 3. Current matches (the NEW bracket)
    console.log("\n" + "=" .repeat(60));
    console.log("⚽ CURRENT MATCHES (new bracket)");
    console.log("=" .repeat(60));
    const matches = await db.collection("matches").find({ 
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID) 
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
    console.log(`  Total matches: ${matches.length}`);
    
    const statusCounts: Record<string, number> = {};
    matches.forEach(m => {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
    });

    const completedNew = matches.filter(m => m.status === "completed");
    if (completedNew.length > 0) {
        console.log(`\n  ⚠️ ${completedNew.length} matches already completed in NEW bracket!`);
    }

    // Check when matches were created (to distinguish old vs new)
    if (matches.length > 0) {
        const newest = matches.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
        const oldest = matches.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
        console.log(`\n  Matches created between: ${oldest.createdAt} → ${newest.createdAt}`);
    }

    // 4. Check Notifications (may contain old match info!)
    console.log("\n" + "=" .repeat(60));
    console.log("🔔 NOTIFICATIONS (may have traces of old matches)");
    console.log("=" .repeat(60));
    
    const notifications = await db.collection("notifications").find({
        type: "tournament",
        $or: [
            { message: { $regex: tournament.title, $options: "i" } },
            { link: { $regex: TOURNAMENT_ID } },
        ]
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`  Found ${notifications.length} tournament notifications`);
    if (notifications.length > 0) {
        console.log("  Latest 10:");
        notifications.slice(0, 10).forEach(n => {
            console.log(`    [${n.createdAt}] ${n.title}: ${n.message?.substring(0, 80)}...`);
        });
    }

    // 5. Check if MongoDB has oplog (replica set = possible recovery)
    console.log("\n" + "=" .repeat(60));
    console.log("🔍 OPLOG CHECK (possible data recovery)");
    console.log("=" .repeat(60));
    
    try {
        const adminDb = mongoose.connection.db!.admin();
        const serverStatus = await adminDb.command({ replSetGetStatus: 1 });
        console.log("  ✅ Replica Set FOUND! Oplog may contain deleted matches!");
        console.log(`  Set name: ${serverStatus.set}`);
        console.log(`  Members: ${serverStatus.members?.length}`);
        
        // Try to read oplog for deleted matches
        const localDb = (mongoose.connection as any).client.db("local");
        const oplog = localDb.collection("oplog.rs");
        
        const deletedOps = await oplog.find({
            ns: /matches/,
            op: "d", // delete operation
            "o._id": { $exists: true },
            ts: { $gte: new mongoose.mongo.Timestamp({ t: Math.floor(Date.now() / 1000) - 86400 * 7, i: 0 }) } // last 7 days
        }).limit(5).toArray();
        
        if (deletedOps.length > 0) {
            console.log(`\n  🎉 Found ${deletedOps.length}+ deleted match records in oplog!`);
            console.log("  → DATA RECOVERY IS POSSIBLE!");
        }
    } catch (e: any) {
        if (e.message?.includes("not running with --replSet") || e.codeName === "NoReplicationEnabled") {
            console.log("  ❌ No replica set. Oplog recovery NOT available.");
        } else {
            console.log(`  ⚠️ Could not check oplog: ${e.message}`);
        }
    }

    // 6. Check Registrations (to know full player list with order)
    console.log("\n" + "=" .repeat(60));
    console.log("📝 REGISTRATIONS");
    console.log("=" .repeat(60));
    
    const registrations = await db.collection("registrations").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
        status: "approved"
    }).sort({ approvedAt: 1, createdAt: 1 }).toArray();
    
    console.log(`  Approved registrations: ${registrations.length}`);

    // 7. Summary + Recommendation
    console.log("\n" + "=" .repeat(60));
    console.log("📋 SUMMARY & RECOMMENDATIONS");
    console.log("=" .repeat(60));
    console.log(`  Tournament: ${tournament.title}`);
    console.log(`  Teams: ${teams.length} total`);
    console.log(`  Teams with old stats: ${teamsWithStats.length}`);
    console.log(`  Current matches: ${matches.length}`);
    console.log(`  Completed (new): ${completedNew.length}`);
    
    if (teamsWithStats.length > 0) {
        console.log("\n  💡 Some teams still have stats from before the regeneration.");
        console.log("     This means the stats WERE NOT fully reset.");
        console.log("     These stats can help verify match results.");
    }
    
    console.log("\n  📌 NEXT STEPS:");
    console.log("  1. If oplog available → run recovery script");
    console.log("  2. If no oplog → collect matchup info from VĐV/group chat");  
    console.log("  3. Use seeding feature to recreate bracket in correct order");
    console.log("  4. Re-enter completed match results manually");

    await mongoose.disconnect();
    console.log("\n✅ Done.");
}

diagnose().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
