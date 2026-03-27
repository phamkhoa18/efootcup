/**
 * 🔍 Script trích xuất thông tin matchups cũ từ Notifications + Screenshots
 * 
 * Notifications khi VĐV gửi kết quả có format:
 *   "Người chơi đã gửi kết quả trận đấu: TeamA 2 - 1 TeamB trong giải ..."
 * → Chứa TÊN ĐỘI + TỈ SỐ!
 * 
 * Screenshots file name format: {userId}_{timestamp}.{ext}
 * → Có thể map userId → team → biết ai đấu
 * 
 * Chạy trên server production:
 *   MONGODB_URI="mongodb://..." npx tsx scripts/recover-matchups.ts
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

async function recover() {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db!;

    // 1. Get tournament info
    const tournament = await db.collection("tournaments").findOne({
        _id: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    });
    if (!tournament) {
        console.error("❌ Tournament not found!");
        process.exit(1);
    }
    console.log(`📋 Tournament: ${tournament.title}\n`);

    // 2. Build team lookup (teams still exist!)
    const teams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).toArray();

    const teamById = new Map(teams.map(t => [t._id.toString(), t]));
    console.log(`👥 Teams loaded: ${teams.length}\n`);

    // 3. Build user → team lookup via Registrations
    const registrations = await db.collection("registrations").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
        status: "approved"
    }).toArray();

    const userToTeam = new Map<string, any>();
    const teamToUser = new Map<string, any>();
    for (const reg of registrations) {
        if (reg.user && reg.team) {
            userToTeam.set(reg.user.toString(), {
                teamId: reg.team.toString(),
                team: teamById.get(reg.team.toString()),
                playerName: reg.playerName,
                gamerId: reg.gamerId,
            });
            teamToUser.set(reg.team.toString(), {
                userId: reg.user.toString(),
                playerName: reg.playerName,
            });
        }
    }

    // ========================================
    // METHOD 1: Extract from Notifications
    // ========================================
    console.log("=" .repeat(70));
    console.log("📋 METHOD 1: MATCH RESULTS FROM NOTIFICATIONS");
    console.log("=" .repeat(70));

    const notifications = await db.collection("notifications").find({
        type: "tournament",
        $or: [
            { message: { $regex: tournament.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { link: { $regex: TOURNAMENT_ID } },
            { link: { $regex: tournament.slug || "" } },
        ]
    }).sort({ createdAt: 1 }).toArray();

    console.log(`  Found ${notifications.length} notifications for this tournament\n`);

    // Parse results from notification messages
    // Pattern: "Người chơi đã gửi kết quả trận đấu: TeamA 2 - 1 TeamB trong giải..."
    const resultPattern = /kết quả trận đấu:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s+trong giải/i;
    const recoveredResults: any[] = [];

    for (const notif of notifications) {
        if (!notif.message) continue;

        const match = notif.message.match(resultPattern);
        if (match) {
            const [, homeTeamName, homeScore, awayScore, awayTeamName] = match;
            recoveredResults.push({
                homeTeam: homeTeamName.trim(),
                awayTeam: awayTeamName.trim(),
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                date: notif.createdAt,
                notificationId: notif._id.toString(),
            });
        }
    }

    if (recoveredResults.length > 0) {
        console.log(`  🎉 RECOVERED ${recoveredResults.length} MATCH RESULTS!\n`);
        console.log("  #  | Home Team              | Score | Away Team              | Date");
        console.log("  " + "-".repeat(90));
        recoveredResults.forEach((r, i) => {
            const date = r.date ? new Date(r.date).toLocaleDateString("vi-VN") : "?";
            console.log(`  ${String(i + 1).padStart(2)} | ${r.homeTeam.padEnd(22)} | ${r.homeScore} - ${r.awayScore} | ${r.awayTeam.padEnd(22)} | ${date}`);
        });
    } else {
        console.log("  ❌ No match results found in notifications.");
        console.log("     Trying broader search...\n");

        // Try broader search
        const allTournamentNotifs = notifications.filter(n =>
            n.message && (
                n.message.includes("kết quả") ||
                n.message.includes("trận đấu") ||
                n.message.includes("cập nhật")
            )
        );
        if (allTournamentNotifs.length > 0) {
            console.log(`  Found ${allTournamentNotifs.length} match-related notifications:`);
            allTournamentNotifs.forEach((n, i) => {
                console.log(`    ${i + 1}. [${n.createdAt}] ${n.title}: ${n.message}`);
            });
        }
    }

    // ========================================
    // METHOD 2: Teams with remaining stats
    // ========================================
    console.log("\n\n" + "=" .repeat(70));
    console.log("📊 METHOD 2: TEAMS WITH REMAINING STATS");
    console.log("=" .repeat(70));

    const teamsWithStats = teams.filter(t => t.stats && (t.stats.played > 0 || t.stats.wins > 0));

    if (teamsWithStats.length > 0) {
        console.log(`\n  Found ${teamsWithStats.length} teams with stats from before regeneration:\n`);
        console.log("  Team Name                    | Status     | P  | W  | D  | L  | GF | GA | GD  | Pts");
        console.log("  " + "-".repeat(95));
        teamsWithStats.sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0));
        teamsWithStats.forEach(t => {
            const s = t.stats;
            const player = teamToUser.get(t._id.toString());
            const name = (`${t.shortName || t.name}`).substring(0, 28).padEnd(28);
            const status = (t.status || "?").padEnd(10);
            console.log(`  ${name} | ${status} | ${String(s.played || 0).padStart(2)} | ${String(s.wins || 0).padStart(2)} | ${String(s.draws || 0).padStart(2)} | ${String(s.losses || 0).padStart(2)} | ${String(s.goalsFor || 0).padStart(2)} | ${String(s.goalsAgainst || 0).padStart(2)} | ${String((s.goalsFor || 0) - (s.goalsAgainst || 0)).padStart(3)} | ${String(s.points || 0).padStart(3)}`);
        });
        console.log(`\n  💡 NOTE: Teams that were 'eliminated' had stats RESET to 0 by the regeneration.`);
        console.log(`     Only 'active' teams (who hadn't been eliminated yet) may still have accurate stats.`);
    } else {
        console.log("  ❌ No teams have remaining stats (all were reset).");
    }

    // ========================================
    // METHOD 3: Screenshot files on disk
    // ========================================
    console.log("\n\n" + "=" .repeat(70));
    console.log("📸 METHOD 3: SCREENSHOT FILES ON DISK");
    console.log("=" .repeat(70));
    console.log("  Screenshots are saved at: <project>/uploads/screenshots/");
    console.log("  Filename format: {userId}_{timestamp}.{ext}\n");

    // Can't actually read files on production from this script context normally,
    // but we can list what we know
    const fs = await import("fs/promises");
    const pathMod = await import("path");

    try {
        const screenshotDir = pathMod.join(process.cwd(), "uploads", "screenshots");
        const files = await fs.readdir(screenshotDir);
        console.log(`  Found ${files.length} screenshot files!\n`);

        // Group by userId
        const filesByUser = new Map<string, string[]>();
        for (const f of files) {
            const parts = f.split("_");
            if (parts.length >= 2) {
                const userId = parts[0];
                if (!filesByUser.has(userId)) filesByUser.set(userId, []);
                filesByUser.get(userId)!.push(f);
            }
        }

        console.log("  Screenshots grouped by player:\n");
        for (const [userId, userFiles] of filesByUser) {
            const teamInfo = userToTeam.get(userId);
            const playerName = teamInfo?.playerName || teamInfo?.team?.shortName || "Unknown";
            const teamName = teamInfo?.team?.name || teamInfo?.team?.shortName || "?";
            console.log(`    VĐV: ${playerName} (Team: ${teamName})`);
            console.log(`    Files: ${userFiles.length}`);
            userFiles.forEach(f => console.log(`      - ${f}`));
            console.log();
        }
    } catch (e: any) {
        if (e.code === "ENOENT") {
            console.log("  ⚠️ uploads/screenshots/ directory not found locally.");
            console.log("  → Run this script ON THE SERVER to check production files.");
        } else {
            console.log(`  ⚠️ Error: ${e.message}`);
        }
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n" + "=" .repeat(70));
    console.log("📋 RECOVERY SUMMARY");
    console.log("=" .repeat(70));
    console.log(`  Total teams: ${teams.length}`);
    console.log(`  Recovered results from notifications: ${recoveredResults.length}`);
    console.log(`  Teams with remaining stats: ${teamsWithStats.length}`);
    console.log();

    if (recoveredResults.length > 0) {
        // Deduplicate results (same matchup may have multiple submissions)
        const uniqueMatchups = new Map<string, any>();
        for (const r of recoveredResults) {
            const key = [r.homeTeam, r.awayTeam].sort().join(" vs ");
            if (!uniqueMatchups.has(key)) {
                uniqueMatchups.set(key, r);
            }
        }
        console.log(`  Unique matchups found: ${uniqueMatchups.size}`);
        console.log("\n  These matchups prove which VĐV faced each other:");
        let i = 1;
        for (const [key, r] of uniqueMatchups) {
            console.log(`    ${i++}. ${r.homeTeam} ${r.homeScore}-${r.awayScore} ${r.awayTeam}`);
        }
    }

    console.log("\n  📌 NEXT STEPS:");
    console.log("  1. Copy this output and share with the tournament manager");
    console.log("  2. Cross-reference with VĐV group chat / screenshots");
    console.log("  3. Use recovered data to manually re-enter results");

    await mongoose.disconnect();
    console.log("\n✅ Done.");
}

recover().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
