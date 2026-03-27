/**
 * 🔧 RESTORE TOURNAMENT - Full Diagnostic & Recovery Export
 * 
 * Filters:
 * - Only data from 25/03/2026 onwards (this is Season 2 tournament)
 * - Only for tournament 69bd4c8ad4d24902b39db3d5
 * 
 * Outputs EVERYTHING to recovery_log.txt for review
 * 
 * Run on server:
 *   MONGODB_URI="mongodb://..." npx tsx scripts/restore-tournament.ts 2>&1 | tee recovery_log.txt
 * 
 * Or simply:
 *   MONGODB_URI="mongodb://..." npx tsx scripts/restore-tournament.ts
 *   (log file is auto-generated)
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

// ⚠️ FILTER: Only data from this date onwards (tournament start date)
const TOURNAMENT_START = new Date("2026-03-25T00:00:00+07:00");
const TOURNAMENT_START_MS = TOURNAMENT_START.getTime(); // for screenshot filename timestamps

// Log to both console and file
const logLines: string[] = [];
function log(msg: string = "") {
    console.log(msg);
    logLines.push(msg);
}

async function restore() {
    log("=".repeat(80));
    log("🔧 TOURNAMENT RECOVERY DIAGNOSTIC LOG");
    log(`   Generated: ${new Date().toISOString()}`);
    log(`   Tournament ID: ${TOURNAMENT_ID}`);
    log(`   Data filter: >= ${TOURNAMENT_START.toLocaleDateString("vi-VN")} (${TOURNAMENT_START.toISOString()})`);
    log("=".repeat(80));

    log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    log("✅ Connected!");
    log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`);

    const db = mongoose.connection.db!;

    // ════════════════════════════════════════════════════════════════
    // SECTION 1: TOURNAMENT INFO
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 1: TOURNAMENT INFO");
    log("═".repeat(80));

    const tournament = await db.collection("tournaments").findOne({
        _id: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    });
    if (!tournament) { log("❌ Not found!"); process.exit(1); }

    log(`  Title:        ${tournament.title}`);
    log(`  Slug:         ${tournament.slug}`);
    log(`  Format:       ${tournament.format}`);
    log(`  Status:       ${tournament.status}`);
    log(`  Max Teams:    ${tournament.maxTeams}`);
    log(`  Current:      ${tournament.currentTeams}`);
    log(`  Created:      ${tournament.createdAt}`);
    log(`  Updated:      ${tournament.updatedAt}`);
    log(`  CreatedBy:    ${tournament.createdBy}`);

    // ════════════════════════════════════════════════════════════════
    // SECTION 2: ALL TEAMS (full detail)
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 2: ALL TEAMS");
    log("═".repeat(80));

    const teams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).sort({ createdAt: 1 }).toArray();

    const teamById = new Map<string, any>();
    const shortNameToTeams = new Map<string, any[]>();

    for (const t of teams) {
        teamById.set(t._id.toString(), t);
        const sn = t.shortName || t.name;
        if (!shortNameToTeams.has(sn)) shortNameToTeams.set(sn, []);
        shortNameToTeams.get(sn)!.push(t);
    }

    log(`\n  Total teams: ${teams.length}`);
    log(`  Unique shortNames: ${Array.from(shortNameToTeams.entries()).filter(([, v]) => v.length === 1).length}`);
    
    const ambiguousEntries = Array.from(shortNameToTeams.entries()).filter(([, v]) => v.length > 1);
    log(`  Ambiguous shortNames: ${ambiguousEntries.length}`);

    log(`\n  ${"#".padStart(4)} | ${"TeamID".padEnd(26)} | ${"ShortName".padEnd(20)} | ${"Full Name".padEnd(30)} | ${"Status".padEnd(10)} | P  | W  | D  | L  | GF | GA | Pts`);
    log("  " + "-".repeat(150));

    teams.forEach((t, i) => {
        const s = t.stats || {};
        log(`  ${String(i + 1).padStart(4)} | ${t._id.toString().padEnd(26)} | ${(t.shortName || "").padEnd(20)} | ${(t.name || "").substring(0, 30).padEnd(30)} | ${(t.status || "?").padEnd(10)} | ${String(s.played || 0).padStart(2)} | ${String(s.wins || 0).padStart(2)} | ${String(s.draws || 0).padStart(2)} | ${String(s.losses || 0).padStart(2)} | ${String(s.goalsFor || 0).padStart(2)} | ${String(s.goalsAgainst || 0).padStart(2)} | ${String(s.points || 0).padStart(3)}`);
    });

    // ════════════════════════════════════════════════════════════════
    // SECTION 3: AMBIGUOUS NAMES DETAIL
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 3: AMBIGUOUS SHORT NAMES");
    log("═".repeat(80));

    for (const [name, ts] of ambiguousEntries) {
        log(`\n  ShortName: "${name}" → ${ts.length} teams:`);
        for (const t of ts) {
            const s = t.stats || {};
            log(`    - ID: ${t._id.toString()} | Name: ${t.name} | Status: ${t.status} | Captain: ${t.captain} | P:${s.played || 0} W:${s.wins || 0} GF:${s.goalsFor || 0} GA:${s.goalsAgainst || 0}`);
        }
    }

    // ════════════════════════════════════════════════════════════════
    // SECTION 4: CURRENT MATCHES (the wrong bracket)
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 4: CURRENT MATCHES (new/wrong bracket)");
    log("═".repeat(80));

    const currentMatches = await db.collection("matches").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).sort({ round: 1, matchNumber: 1 }).toArray();

    log(`\n  Total current matches: ${currentMatches.length}`);
    const statusMap: Record<string, number> = {};
    currentMatches.forEach(m => { statusMap[m.status] = (statusMap[m.status] || 0) + 1; });
    Object.entries(statusMap).forEach(([s, c]) => log(`    ${s}: ${c}`));

    if (currentMatches.length > 0) {
        const first = currentMatches[0];
        const last = currentMatches[currentMatches.length - 1];
        log(`  Created range: ${first.createdAt} → ${last.createdAt}`);
        log(`  Rounds: ${Math.min(...currentMatches.map(m => m.round))} → ${Math.max(...currentMatches.map(m => m.round))}`);
    }

    // ════════════════════════════════════════════════════════════════
    // SECTION 5: NOTIFICATIONS → MATCH RESULTS (filtered by date)
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 5: MATCH RESULTS FROM NOTIFICATIONS");
    log(`  (filtered: >= ${TOURNAMENT_START.toLocaleDateString("vi-VN")})`);
    log("═".repeat(80));

    const allNotifications = await db.collection("notifications").find({
        type: "tournament",
        createdAt: { $gte: TOURNAMENT_START },
        $or: [
            { message: { $regex: tournament.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { link: { $regex: TOURNAMENT_ID } },
        ]
    }).sort({ createdAt: 1 }).toArray();

    log(`\n  Notifications found (after date filter): ${allNotifications.length}`);

    const resultPattern = /kết quả trận đấu:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s+trong giải/i;

    interface ParsedNotif {
        notifId: string;
        homeShort: string;
        awayShort: string;
        homeScore: number;
        awayScore: number;
        date: Date;
        recipient: string;
        fullMessage: string;
    }

    const parsed: ParsedNotif[] = [];

    for (const n of allNotifications) {
        if (!n.message) continue;
        const m = n.message.match(resultPattern);
        if (!m) continue;
        parsed.push({
            notifId: n._id.toString(),
            homeShort: m[1].trim(),
            awayShort: m[4].trim(),
            homeScore: parseInt(m[2]),
            awayScore: parseInt(m[3]),
            date: n.createdAt,
            recipient: n.recipient?.toString() || "",
            fullMessage: n.message,
        });
    }

    log(`  Match result notifications: ${parsed.length}`);

    // Print ALL parsed results
    log(`\n  ${"#".padStart(4)} | ${"Date".padEnd(12)} | ${"Home Team".padEnd(25)} | Score | ${"Away Team".padEnd(25)} | NotifID`);
    log("  " + "-".repeat(110));

    parsed.forEach((r, i) => {
        const d = new Date(r.date).toLocaleDateString("vi-VN") + " " + new Date(r.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        log(`  ${String(i + 1).padStart(4)} | ${d.padEnd(12)} | ${r.homeShort.padEnd(25)} | ${r.homeScore}-${r.awayScore}   | ${r.awayShort.padEnd(25)} | ${r.notifId}`);
    });

    // Deduplicate
    const dedupMap = new Map<string, { result: ParsedNotif; count: number }>();
    for (const r of parsed) {
        const k1 = `${r.homeShort}|${r.awayShort}|${r.homeScore}|${r.awayScore}`;
        const k2 = `${r.awayShort}|${r.homeShort}|${r.awayScore}|${r.homeScore}`;
        if (dedupMap.has(k1)) { dedupMap.get(k1)!.count++; }
        else if (dedupMap.has(k2)) { dedupMap.get(k2)!.count++; }
        else { dedupMap.set(k1, { result: r, count: 1 }); }
    }

    log(`\n  After dedup: ${dedupMap.size} unique match results`);
    log(`\n  ${"#".padStart(4)} | Dup | ${"Home".padEnd(25)} | Score | ${"Away".padEnd(25)} | Date`);
    log("  " + "-".repeat(95));

    let idx = 0;
    for (const [, { result: r, count }] of dedupMap) {
        idx++;
        const d = new Date(r.date).toLocaleDateString("vi-VN");
        log(`  ${String(idx).padStart(4)} | x${String(count).padEnd(2)} | ${r.homeShort.padEnd(25)} | ${r.homeScore}-${r.awayScore}   | ${r.awayShort.padEnd(25)} | ${d}`);
    }

    // ════════════════════════════════════════════════════════════════
    // SECTION 6: SMART DISAMBIGUATION
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 6: SMART DISAMBIGUATION (Stats Cross-Reference)");
    log("═".repeat(80));

    // Compute expected stats from notifications per shortName
    const notifStats = new Map<string, { gf: number; ga: number; w: number; l: number; d: number; p: number }>();

    for (const [, { result: r }] of dedupMap) {
        // Home
        if (!notifStats.has(r.homeShort)) notifStats.set(r.homeShort, { gf: 0, ga: 0, w: 0, l: 0, d: 0, p: 0 });
        const hs = notifStats.get(r.homeShort)!;
        hs.gf += r.homeScore; hs.ga += r.awayScore; hs.p++;
        if (r.homeScore > r.awayScore) hs.w++; else if (r.homeScore < r.awayScore) hs.l++; else hs.d++;

        // Away
        if (!notifStats.has(r.awayShort)) notifStats.set(r.awayShort, { gf: 0, ga: 0, w: 0, l: 0, d: 0, p: 0 });
        const as = notifStats.get(r.awayShort)!;
        as.gf += r.awayScore; as.ga += r.homeScore; as.p++;
        if (r.awayScore > r.homeScore) as.w++; else if (r.awayScore < r.homeScore) as.l++; else as.d++;
    }

    const resolved = new Map<string, string>(); // shortName → teamId
    let exact = 0, matched = 0, unresolved = 0;

    for (const [shortName, candidates] of shortNameToTeams) {
        if (candidates.length === 1) {
            resolved.set(shortName, candidates[0]._id.toString());
            exact++;
            continue;
        }

        const ns = notifStats.get(shortName);
        if (!ns || ns.p === 0) continue; // not in any notifications

        let bestMatch: any = null, bestScore = -1;
        for (const c of candidates) {
            const s = c.stats;
            if (!s || s.played === 0) continue;
            let score = 0;
            if (s.played === ns.p) score += 10; else if (Math.abs(s.played - ns.p) <= 1) score += 5;
            if (s.goalsFor === ns.gf) score += 10; else if (Math.abs(s.goalsFor - ns.gf) <= 1) score += 5;
            if (s.goalsAgainst === ns.ga) score += 10; else if (Math.abs(s.goalsAgainst - ns.ga) <= 1) score += 5;
            if (s.wins === ns.w) score += 8;
            if (s.losses === ns.l) score += 8;
            if (score > bestScore) { bestScore = score; bestMatch = c; }
        }

        if (bestMatch && bestScore >= 20) {
            resolved.set(shortName, bestMatch._id.toString());
            matched++;
            log(`  ✅ "${shortName}" → ${bestMatch.name} (${bestMatch._id}) [score:${bestScore}/46]`);
            log(`     Notif: P=${ns.p} GF=${ns.gf} GA=${ns.ga} W=${ns.w} L=${ns.l}`);
            log(`     DB:    P=${bestMatch.stats.played} GF=${bestMatch.stats.goalsFor} GA=${bestMatch.stats.goalsAgainst} W=${bestMatch.stats.wins} L=${bestMatch.stats.losses}`);
        } else {
            unresolved++;
            log(`  ⚠️ "${shortName}" → UNRESOLVED (best:${bestScore}/46)`);
            log(`     Notif: P=${ns.p} GF=${ns.gf} GA=${ns.ga} W=${ns.w} L=${ns.l}`);
            for (const c of candidates) {
                const s = c.stats || {};
                log(`     → ${c.name} (${c._id}) st:${c.status} P:${s.played||0} GF:${s.goalsFor||0} GA:${s.goalsAgainst||0} W:${s.wins||0}`);
            }
        }
    }

    log(`\n  Resolution: Exact=${exact} | Stats-Matched=${matched} | Unresolved=${unresolved}`);

    // ════════════════════════════════════════════════════════════════
    // SECTION 7: SCREENSHOT FILES (filtered by date)
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 7: SCREENSHOT FILES");
    log(`  (filtered: timestamp >= ${TOURNAMENT_START_MS} = ${TOURNAMENT_START.toLocaleDateString("vi-VN")})`);
    log("═".repeat(80));

    // Build registration lookup: userId → team/player info
    const registrations = await db.collection("registrations").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
        status: "approved"
    }).toArray();

    const userToReg = new Map<string, any>();
    for (const reg of registrations) {
        if (reg.user) userToReg.set(reg.user.toString(), reg);
    }

    try {
        const screenshotDir = path.join(process.cwd(), "uploads", "screenshots");
        const allFiles = await fs.readdir(screenshotDir);

        // Filter by timestamp in filename
        const filteredFiles = allFiles.filter(f => {
            const parts = f.split("_");
            if (parts.length < 2) return false;
            const tsStr = parts[1].split(".")[0]; // remove extension
            const ts = parseInt(tsStr);
            return ts >= TOURNAMENT_START_MS;
        });

        log(`\n  Total screenshot files: ${allFiles.length}`);
        log(`  After date filter (>= 25/03/2026): ${filteredFiles.length}`);

        // Group by userId
        const byUser = new Map<string, string[]>();
        for (const f of filteredFiles) {
            const userId = f.split("_")[0];
            if (!byUser.has(userId)) byUser.set(userId, []);
            byUser.get(userId)!.push(f);
        }

        log(`  Unique users with screenshots: ${byUser.size}`);
        log(`\n  ${"#".padStart(4)} | ${"UserID".padEnd(26)} | ${"Player Name".padEnd(25)} | ${"Team".padEnd(25)} | ${"TeamID".padEnd(26)} | Files`);
        log("  " + "-".repeat(145));

        let sIdx = 0;
        for (const [userId, files] of byUser) {
            sIdx++;
            const reg = userToReg.get(userId);
            const team = reg?.team ? teamById.get(reg.team.toString()) : null;
            const playerName = reg?.playerName || "Unknown";
            const teamName = team?.shortName || team?.name || reg?.teamName || "?";
            const teamId = team?._id?.toString() || "?";

            log(`  ${String(sIdx).padStart(4)} | ${userId.padEnd(26)} | ${playerName.substring(0, 25).padEnd(25)} | ${teamName.substring(0, 25).padEnd(25)} | ${teamId.padEnd(26)} | ${files.length}`);

            // List files with timestamps
            for (const f of files) {
                const ts = parseInt(f.split("_")[1].split(".")[0]);
                const date = new Date(ts);
                log(`         ${f}  →  ${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN")}`);
            }
        }
    } catch (e: any) {
        if (e.code === "ENOENT") {
            log("  ⚠️ uploads/screenshots/ not found — run this ON THE SERVER");
        } else {
            log(`  ⚠️ Error: ${e.message}`);
        }
    }

    // ════════════════════════════════════════════════════════════════
    // SECTION 8: FINAL RESOLVED MATCHES
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 8: FINAL RESOLVED MATCHES");
    log("═".repeat(80));

    let rIdx = 0, resolvedCount = 0, unresolvedCount = 0;
    log(`\n  ${"#".padStart(4)} | Conf   | ${"HomeID".padEnd(26)} | ${"Home Name".padEnd(22)} | Score | ${"Away Name".padEnd(22)} | ${"AwayID".padEnd(26)} | Dup | Date`);
    log("  " + "-".repeat(170));

    for (const [, { result: r, count }] of dedupMap) {
        rIdx++;
        const homeId = resolved.get(r.homeShort);
        const awayId = resolved.get(r.awayShort);
        const homeTeam = homeId ? teamById.get(homeId) : null;
        const awayTeam = awayId ? teamById.get(awayId) : null;

        const conf = (homeId && awayId) ? "✅" : (!homeId && !awayId) ? "❌" : "🔶";
        if (homeId && awayId) resolvedCount++; else unresolvedCount++;

        const d = new Date(r.date).toLocaleDateString("vi-VN");
        log(`  ${String(rIdx).padStart(4)} | ${conf}     | ${(homeId || "???").padEnd(26)} | ${(homeTeam?.name || r.homeShort).substring(0, 22).padEnd(22)} | ${r.homeScore}-${r.awayScore}   | ${(awayTeam?.name || r.awayShort).substring(0, 22).padEnd(22)} | ${(awayId || "???").padEnd(26)} | x${count}  | ${d}`);
    }

    log(`\n  Resolved: ${resolvedCount} | Unresolved: ${unresolvedCount} | Total: ${dedupMap.size}`);

    // ════════════════════════════════════════════════════════════════
    // SECTION 9: SUMMARY
    // ════════════════════════════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  SECTION 9: RECOVERY SUMMARY");
    log("═".repeat(80));

    const expectedTotal = teams.length - 1; // single elimination
    log(`\n  Tournament: ${tournament.title}`);
    log(`  Format: ${tournament.format}`);
    log(`  Total teams: ${teams.length}`);
    log(`  Expected total matches: ${expectedTotal}`);
    log(`  Recovered unique matchups: ${dedupMap.size}`);
    log(`  Fully resolved (both teams ID'd): ${resolvedCount}`);
    log(`  Unresolved: ${unresolvedCount}`);
    log(`  Recovery rate: ${(dedupMap.size / expectedTotal * 100).toFixed(1)}%`);
    log(`  Name resolution: Exact=${exact} Stats=${matched} Ambiguous=${unresolved}`);

    // Write log file
    const logContent = logLines.join("\n");
    const logPath = "recovery_log.txt";
    await fs.writeFile(logPath, logContent, "utf-8");
    console.log(`\n📁 Log written to: ${logPath} (${logLines.length} lines)`);

    // Also write JSON for programmatic use
    const jsonData = {
        tournamentId: TOURNAMENT_ID,
        tournamentTitle: tournament.title,
        format: tournament.format,
        totalTeams: teams.length,
        resolvedMatches: Array.from(dedupMap.values()).map(({ result: r, count }) => ({
            homeShort: r.homeShort,
            awayShort: r.awayShort,
            homeScore: r.homeScore,
            awayScore: r.awayScore,
            homeTeamId: resolved.get(r.homeShort) || null,
            awayTeamId: resolved.get(r.awayShort) || null,
            sources: count,
            date: r.date,
        })),
    };
    await fs.writeFile("tournament_recovery_data.json", JSON.stringify(jsonData, null, 2));
    console.log(`📁 JSON written to: tournament_recovery_data.json`);

    await mongoose.disconnect();
    console.log("\n✅ Done.");
}

restore().catch(err => { console.error("❌", err); process.exit(1); });
