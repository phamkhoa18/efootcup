/**
 * 🔧 RESTORE-FROM-NOTIFICATIONS
 * 
 * Phục hồi giải đấu bị mất bracket bằng cách truy vết từ notifications.
 * 
 * Logic:
 *   1. Parse tất cả notifications có kết quả trận đấu → extract shortName + score
 *   2. Map shortName → teamId
 *   3. Xác định đội thắng từ score (single_elimination)
 *   4. Build danh sách: eliminated teams vs surviving teams  
 *   5. Tạo bracket mới cho surviving teams
 * 
 * Modes:
 *   npx tsx scripts/restore-from-notifications.ts                    # Step 1: Analyze only
 *   npx tsx scripts/restore-from-notifications.ts --apply            # Step 2: Apply recovery
 *   npx tsx scripts/restore-from-notifications.ts --export           # Export data to JSON
 * 
 * Environment:
 *   MONGODB_URI="mongodb://..." npx tsx scripts/restore-from-notifications.ts
 *   TOURNAMENT_ID="..." override tournament ID (default: prompt-based)
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const IS_APPLY = process.argv.includes("--apply");
const IS_EXPORT = process.argv.includes("--export");

// Allow override via env or default
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || "";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
interface RecoveredMatch {
    homeShortName: string;
    awayShortName: string;
    homeScore: number;
    awayScore: number;
    winnerId: string | null;
    loserId: string | null;
    winnerShortName: string;
    loserShortName: string;
    date: Date;
    notificationId: string;
    confidence: "high" | "medium" | "conflict";
}

interface TeamInfo {
    _id: string;
    name: string;
    shortName: string;
    status: string;
    stats: any;
    captainId: string;
}

async function main() {
    console.log("═".repeat(70));
    console.log("  🔧 RESTORE-FROM-NOTIFICATIONS");
    console.log("  Mode: " + (IS_APPLY ? "⚡ APPLY" : IS_EXPORT ? "📦 EXPORT" : "🔍 ANALYZE"));
    console.log("═".repeat(70));

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    const db = mongoose.connection.db!;

    // ═══ STEP 0: Determine Tournament ═══
    let tournamentId = TOURNAMENT_ID;
    if (!tournamentId) {
        // List ongoing tournaments
        const tournaments = await db.collection("tournaments").find({
            status: { $in: ["ongoing", "completed"] }
        }).sort({ updatedAt: -1 }).limit(10).toArray();

        if (tournaments.length === 0) {
            console.error("❌ Không tìm thấy giải đấu nào đang diễn ra.");
            process.exit(1);
        }

        console.log("📋 Giải đấu đang diễn ra:");
        tournaments.forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.title} (${t._id}) - ${t.status} - ${t.currentTeams} teams`);
        });
        console.log(`\n⚠️ Vui lòng set TOURNAMENT_ID env hoặc chỉnh biến TOURNAMENT_ID trong script.`);
        console.log(`   Ví dụ: TOURNAMENT_ID="${tournaments[0]._id}" npx tsx scripts/restore-from-notifications.ts`);
        await mongoose.disconnect();
        return;
    }

    const tOid = new mongoose.Types.ObjectId(tournamentId);
    const tournament = await db.collection("tournaments").findOne({ _id: tOid });
    if (!tournament) {
        console.error(`❌ Không tìm thấy giải đấu ID: ${tournamentId}`);
        process.exit(1);
    }
    console.log(`📋 Giải đấu: ${tournament.title}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Format: ${tournament.format}`);
    console.log(`   Teams: ${tournament.currentTeams}/${tournament.maxTeams}`);

    // ═══ STEP 1: Load all teams ═══
    console.log("\n" + "─".repeat(70));
    console.log("📊 STEP 1: Loading teams...");
    console.log("─".repeat(70));

    const allTeams = await db.collection("teams").find({ tournament: tOid }).toArray();
    const teamByShortName = new Map<string, any>();
    const teamById = new Map<string, any>();
    const nameConflicts = new Map<string, any[]>(); // shortName → multiple teams

    for (const t of allTeams) {
        const key = (t.shortName || "").toUpperCase().trim();
        teamById.set(t._id.toString(), t);
        
        if (key) {
            if (teamByShortName.has(key)) {
                // Conflict: multiple teams with same shortName
                if (!nameConflicts.has(key)) {
                    nameConflicts.set(key, [teamByShortName.get(key)]);
                }
                nameConflicts.get(key)!.push(t);
            } else {
                teamByShortName.set(key, t);
            }
        }
    }

    console.log(`   Total teams: ${allTeams.length}`);
    console.log(`   Unique shortNames: ${teamByShortName.size}`);
    if (nameConflicts.size > 0) {
        console.log(`   ⚠️ ShortName conflicts: ${nameConflicts.size}`);
        for (const [name, teams] of nameConflicts) {
            console.log(`      "${name}" → ${teams.map((t: any) => t._id).join(", ")}`);
        }
    }

    // Also build lookup by fullName for fallback
    const teamByName = new Map<string, any>();
    for (const t of allTeams) {
        const key = (t.name || "").trim().toLowerCase();
        if (key) teamByName.set(key, t);
    }

    // ═══ STEP 2: Parse Notifications ═══
    console.log("\n" + "─".repeat(70));
    console.log("📨 STEP 2: Parsing notifications...");
    console.log("─".repeat(70));

    // Multiple notification patterns:
    // Pattern 1: "Người chơi đã gửi kết quả trận đấu: {home} {hs} - {as} {away} trong giải..."
    // Pattern 2: Manager notification when updating result
    const notifications = await db.collection("notifications").find({
        type: "tournament",
        $or: [
            { message: { $regex: tournament.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { link: { $regex: tournamentId } },
            ...(tournament.slug ? [{ link: { $regex: tournament.slug } }] : []),
        ]
    }).sort({ createdAt: 1 }).toArray();

    console.log(`   Found ${notifications.length} notifications for this tournament`);

    // Parse results
    const resultPattern = /kết quả trận đấu:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s+trong giải/i;
    const allRecovered: RecoveredMatch[] = [];

    for (const notif of notifications) {
        if (!notif.message) continue;
        const match = notif.message.match(resultPattern);
        if (!match) continue;

        const [, homeShortName, homeScoreStr, awayScoreStr, awayShortName] = match;
        const homeScore = parseInt(homeScoreStr);
        const awayScore = parseInt(awayScoreStr);

        const hKey = homeShortName.trim().toUpperCase();
        const aKey = awayShortName.trim().toUpperCase();
        const homeTeam = teamByShortName.get(hKey);
        const awayTeam = teamByShortName.get(aKey);

        let winnerId: string | null = null;
        let loserId: string | null = null;
        let winnerName = "";
        let loserName = "";

        if (homeTeam && awayTeam) {
            if (homeScore > awayScore) {
                winnerId = homeTeam._id.toString();
                loserId = awayTeam._id.toString();
                winnerName = hKey;
                loserName = aKey;
            } else if (awayScore > homeScore) {
                winnerId = awayTeam._id.toString();
                loserId = homeTeam._id.toString();
                winnerName = aKey;
                loserName = hKey;
            }
            // Draw in single elimination shouldn't happen, but record anyway
        }

        allRecovered.push({
            homeShortName: hKey,
            awayShortName: aKey,
            homeScore,
            awayScore,
            winnerId,
            loserId,
            winnerShortName: winnerName,
            loserShortName: loserName,
            date: notif.createdAt,
            notificationId: notif._id.toString(),
            confidence: (homeTeam && awayTeam) ? "high" : "medium",
        });
    }

    console.log(`   Parsed ${allRecovered.length} match results from notifications\n`);

    // ═══ STEP 3: Deduplicate & Resolve Conflicts ═══
    console.log("─".repeat(70));
    console.log("🔍 STEP 3: Deduplicating matchups...");
    console.log("─".repeat(70));

    // Group by matchup (sorted pair of shortNames)
    const matchupMap = new Map<string, RecoveredMatch[]>();
    for (const r of allRecovered) {
        const key = [r.homeShortName, r.awayShortName].sort().join(" vs ");
        if (!matchupMap.has(key)) matchupMap.set(key, []);
        matchupMap.get(key)!.push(r);
    }

    const uniqueMatchups: RecoveredMatch[] = [];
    const conflicts: { key: string; submissions: RecoveredMatch[] }[] = [];
    const unmapped: RecoveredMatch[] = [];

    for (const [key, submissions] of matchupMap) {
        // Check if all submissions agree on the winner
        const winners = new Set(submissions.map(s => s.winnerId).filter(Boolean));
        
        if (winners.size === 1) {
            // All agree → take latest submission
            const latest = submissions[submissions.length - 1];
            latest.confidence = "high";
            uniqueMatchups.push(latest);
        } else if (winners.size === 0) {
            // No winner determined (draws or unmapped teams)
            unmapped.push(submissions[0]);
        } else {
            // Conflicting results!
            submissions.forEach(s => s.confidence = "conflict");
            conflicts.push({ key, submissions });
            // Still take the LATEST submission as "most likely correct" 
            // (VĐV may have re-submitted with correct score)
            const latest = submissions[submissions.length - 1];
            latest.confidence = "conflict";
            uniqueMatchups.push(latest);
        }
    }

    console.log(`   Unique matchups: ${uniqueMatchups.length}`);
    console.log(`   Conflicts: ${conflicts.length}`);
    console.log(`   Unmapped: ${unmapped.length}`);

    // ═══ STEP 4: Determine Surviving Teams ═══
    console.log("\n" + "─".repeat(70));
    console.log("📊 STEP 4: Determining surviving teams...");
    console.log("─".repeat(70));

    const confirmEliminated = new Set<string>();
    const confirmWon = new Set<string>(); // at least 1 win recorded

    for (const m of uniqueMatchups) {
        if (m.loserId) confirmEliminated.add(m.loserId);
        if (m.winnerId) confirmWon.add(m.winnerId);
    }

    // Surviving = all teams MINUS eliminated
    // Exception: a team that won AND later lost is still eliminated
    const surviving = new Set<string>();
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!confirmEliminated.has(id)) {
            surviving.add(id);
        }
    }

    // Stats for context
    const teamsWithStats = allTeams.filter(t => 
        t.stats && (t.stats.played > 0 || t.stats.wins > 0)
    );

    console.log(`   Confirmed eliminated (from notifications): ${confirmEliminated.size}`);
    console.log(`   Survived (never lost in notifications): ${surviving.size}`);
    console.log(`   Teams with remaining stats: ${teamsWithStats.length}`);
    console.log(`   Teams that won at least 1 match: ${confirmWon.size}`);

    // Cross-reference: teams that have stats.losses > 0 should also be eliminated
    let statsBasedEliminations = 0;
    for (const t of allTeams) {
        const id = t._id.toString();
        if (t.stats?.losses > 0 && !confirmEliminated.has(id) && surviving.has(id)) {
            // Team has losses in stats but wasn't found in notifications → also eliminated
            confirmEliminated.add(id);
            surviving.delete(id);
            statsBasedEliminations++;
        }
    }
    if (statsBasedEliminations > 0) {
        console.log(`   Additional eliminations from team stats: ${statsBasedEliminations}`);
        console.log(`   Final surviving: ${surviving.size}`);
    }

    // ═══ STEP 5: Summary & Report ═══
    console.log("\n" + "═".repeat(70));
    console.log("📋 RECOVERY SUMMARY");
    console.log("═".repeat(70));

    console.log(`\n   Total teams in tournament: ${allTeams.length}`);
    console.log(`   Match results recovered: ${uniqueMatchups.length}`);
    console.log(`   Confirmed eliminated: ${confirmEliminated.size}`);
    console.log(`   Surviving teams: ${surviving.size}`);

    // Print eliminated teams
    if (confirmEliminated.size > 0) {
        console.log(`\n   ❌ Eliminated teams (${confirmEliminated.size}):`);
        const elimTeams = [...confirmEliminated]
            .map(id => teamById.get(id))
            .filter(Boolean)
            .sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));
        
        for (const t of elimTeams) {
            console.log(`      ${(t.shortName || t.name).padEnd(15)} ${t.name}`);
        }
    }

    // Print surviving teams  
    console.log(`\n   ✅ Surviving teams (${surviving.size}):`);
    const survTeams = [...surviving]
        .map(id => teamById.get(id))
        .filter(Boolean)
        .sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));
    
    for (const t of survTeams) {
        const wonCount = uniqueMatchups.filter(m => m.winnerId === t._id.toString()).length;
        const statsInfo = t.stats?.played > 0 
            ? `W:${t.stats.wins} L:${t.stats.losses} P:${t.stats.played}` 
            : "";
        console.log(`      ${(t.shortName || t.name).padEnd(15)} ${t.name.padEnd(30)} Wins(notif): ${wonCount} ${statsInfo}`);
    }

    // Print conflicts
    if (conflicts.length > 0) {
        console.log(`\n   ⚠️ CONFLICTS (${conflicts.length}) — Need manual review:`);
        for (const c of conflicts) {
            console.log(`\n   Matchup: ${c.key}`);
            for (const s of c.submissions) {
                const date = new Date(s.date).toLocaleString("vi-VN");
                console.log(`      ${s.homeShortName} ${s.homeScore}-${s.awayScore} ${s.awayShortName} | Winner: ${s.winnerShortName || "?"} | ${date}`);
            }
        }
    }

    // Print unmapped
    if (unmapped.length > 0) {
        console.log(`\n   ❓ UNMAPPED (couldn't find teams):`);
        for (const u of unmapped) {
            console.log(`      ${u.homeShortName} ${u.homeScore}-${u.awayScore} ${u.awayShortName}`);
        }
    }

    // ═══ EXPORT ═══
    if (IS_EXPORT) {
        const exportData = {
            tournamentId,
            tournamentTitle: tournament.title,
            exportedAt: new Date().toISOString(),
            summary: {
                totalTeams: allTeams.length,
                recovered: uniqueMatchups.length,
                eliminated: confirmEliminated.size,
                surviving: surviving.size,
                conflicts: conflicts.length,
            },
            matchResults: uniqueMatchups.map(m => ({
                home: m.homeShortName,
                away: m.awayShortName,
                score: `${m.homeScore}-${m.awayScore}`,
                winner: m.winnerShortName,
                loser: m.loserShortName,
                winnerId: m.winnerId,
                loserId: m.loserId,
                confidence: m.confidence,
                date: m.date,
            })),
            eliminatedTeamIds: [...confirmEliminated],
            survivingTeamIds: [...surviving],
            survivingTeams: survTeams.map((t: any) => ({
                id: t._id.toString(),
                name: t.name,
                shortName: t.shortName,
            })),
            conflicts: conflicts.map(c => ({
                matchup: c.key,
                submissions: c.submissions.map(s => ({
                    home: s.homeShortName,
                    away: s.awayShortName,
                    score: `${s.homeScore}-${s.awayScore}`,
                    winner: s.winnerShortName,
                    date: s.date,
                })),
            })),
        };

        const filename = `recovery_data_${tournamentId}_${Date.now()}.json`;
        await fs.writeFile(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n   📦 Data exported to: ${filename}`);
    }

    // ═══ APPLY ═══
    if (!IS_APPLY) {
        console.log(`\n   ⏸ DRY RUN MODE. Không thay đổi gì cả.`);
        console.log(`   Để áp dụng, chạy: npx tsx scripts/restore-from-notifications.ts --apply`);
        console.log(`   Để export JSON: npx tsx scripts/restore-from-notifications.ts --export`);
        await mongoose.disconnect();
        return;
    }

    // ═══ APPLY MODE ═══
    console.log("\n" + "═".repeat(70));
    console.log("⚡ APPLYING RECOVERY...");
    console.log("═".repeat(70));

    // Step A: Delete current matches (the bad bracket)
    console.log("\n🗑️ Deleting current (bad) bracket...");
    const deleted = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${deleted.deletedCount} matches`);

    // Step B: Mark eliminated teams
    console.log("\n📝 Updating team statuses...");
    let activatedCount = 0;
    let eliminatedCount = 0;

    for (const t of allTeams) {
        const id = t._id.toString();
        if (surviving.has(id)) {
            await db.collection("teams").updateOne(
                { _id: t._id },
                { $set: { 
                    status: "active",
                    "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0,
                    "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.goalDifference": 0,
                    "stats.points": 0, "stats.form": []
                }}
            );
            activatedCount++;
        } else {
            await db.collection("teams").updateOne(
                { _id: t._id },
                { $set: { status: "eliminated" } }
            );
            eliminatedCount++;
        }
    }
    console.log(`   Active: ${activatedCount}, Eliminated: ${eliminatedCount}`);

    // Step C: Generate new bracket for surviving teams
    console.log("\n🏗️ Generating new bracket...");

    const N = surviving.size;
    let S = 2; while (S < N) S *= 2;
    const totalRounds = Math.log2(S);
    const byes = S - N;

    console.log(`   Teams: ${N}, Bracket size: ${S}, Rounds: ${totalRounds}, Byes: ${byes}`);

    // Order teams: shuffle randomly  
    const survivingIds = [...surviving];
    for (let i = survivingIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [survivingIds[i], survivingIds[j]] = [survivingIds[j], survivingIds[i]];
    }

    // Seed order
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const ns = order.length * 2;
            order = order.flatMap(s => [s, ns + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Place teams in slots
    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const si = seedOrder.indexOf(i + 1);
        teamSlots[si] = survivingIds[i];
    }

    // Round names
    const getRN = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        return `Vòng ${size / Math.pow(2, r - 1)}`;
    };

    const mMap = new Map<number, Map<number, any>>();

    // R2+ matches
    for (let r = 2; r <= totalRounds; r++) {
        mMap.set(r, new Map());
        const cnt = S / Math.pow(2, r);
        for (let i = 0; i < cnt; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r, roundName: getRN(r, totalRounds, S),
                matchNumber: i + 1, homeTeam: null, awayTeam: null,
                homeScore: null, awayScore: null, winner: null,
                status: "scheduled", bracketPosition: { x: r - 1, y: i },
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // R1 matches
    mMap.set(1, new Map());
    let cReal = 0, cBye = 0;
    for (let i = 0; i < S / 2; i++) {
        const aId = teamSlots[i * 2], bId = teamSlots[i * 2 + 1];
        const ni = Math.floor(i / 2), side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2 = mMap.get(2)!.get(ni);

        if (aId && bId) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: new mongoose.Types.ObjectId(aId),
                awayTeam: new mongoose.Types.ObjectId(bId),
                homeScore: null, awayScore: null, winner: null,
                status: "scheduled", bracketPosition: { x: 0, y: i },
                nextMatch: r2._id, leg: 1, events: [], resultSubmissions: [],
                screenshots: [], createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
            cReal++;
        } else if (aId || bId) {
            const byeOid = new mongoose.Types.ObjectId((aId || bId)!);
            await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1, totalRounds, S),
                matchNumber: i + 1, homeTeam: byeOid, awayTeam: null,
                homeScore: 0, awayScore: 0, winner: byeOid,
                status: "bye", bracketPosition: { x: 0, y: i },
                nextMatch: r2._id, leg: 1, events: [], resultSubmissions: [],
                screenshots: [], createdAt: new Date(), updatedAt: new Date(),
            });
            cBye++;
            await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: byeOid } });
        }
    }

    // Link R2+ nextMatch
    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            if (r < totalRounds) {
                const nm = mMap.get(r + 1)!.get(Math.floor(idx / 2));
                await db.collection("matches").updateOne({ _id: m._id }, { $set: { nextMatch: nm._id } });
            }
        }
    }

    const totalMatches = cReal + cBye + Array.from(mMap.entries())
        .filter(([r]) => r >= 2).reduce((s, [, m]) => s + m.size, 0);

    console.log(`   Created ${totalMatches} matches (${cReal} real R1 + ${cBye} byes)`);

    // ═══ FINAL SUMMARY ═══
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: { $ne: "bye" } });

    console.log("\n" + "═".repeat(70));
    console.log("  ✅ RECOVERY COMPLETE!");
    console.log("═".repeat(70));
    console.log(`   Recovered from: ${uniqueMatchups.length} notification records`);
    console.log(`   Surviving teams in new bracket: ${N}`);
    console.log(`   Eliminated teams: ${confirmEliminated.size}`);
    console.log(`   New bracket: ${S} size, ${totalRounds} rounds`);
    console.log(`   Active matches: ${fc}`);
    console.log(`\n   📌 NEXT STEPS:`);
    console.log(`   1. Kiểm tra bracket mới trên trang manager`);
    console.log(`   2. Xác nhận danh sách eliminated teams`);
    console.log(`   3. Thông báo VĐV tiếp tục thi đấu`);
    console.log("═".repeat(70));

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
