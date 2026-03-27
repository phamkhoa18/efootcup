/**
 * 🔧 ULTIMATE TOURNAMENT RESTORATION
 * 
 * Strategy: Cross-reference notification timestamps with screenshot timestamps
 * to identify EXACTLY which teams played in each match.
 * 
 * Algorithm:
 * 1. Parse score notifications (match results)
 * 2. For each notification timestamp, find screenshots uploaded within ±5 minutes
 * 3. Map screenshot userId → registration → teamId
 * 4. Match the team's shortName to home/away in the notification → EXACT team identification
 * 5. Also check "match update" notifications sent to player captains (same timeframe)
 * 
 * Run:
 *   cd /root/apps/efootcup
 *   npx tsx scripts/restore-tournament-v2.ts
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const TOURNAMENT_START = new Date("2026-03-25T00:00:00+07:00");
const TOURNAMENT_START_MS = TOURNAMENT_START.getTime();
const TIME_WINDOW_MS = 5 * 60 * 1000; // ±5 minutes for screenshot correlation

const logLines: string[] = [];
function log(msg: string = "") { console.log(msg); logLines.push(msg); }

interface MatchResult {
    homeShort: string;
    awayShort: string;
    homeScore: number;
    awayScore: number;
    timestamp: Date;
    notifId: string;
    // Resolved fields
    homeTeamId?: string;
    awayTeamId?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    confidence: "exact" | "screenshot" | "captain_notif" | "stats" | "unresolved";
    resolveMethod?: string;
}

async function restore() {
    log("=".repeat(80));
    log("🔧 ULTIMATE TOURNAMENT RESTORATION v2");
    log(`   Generated: ${new Date().toISOString()}`);
    log(`   Strategy: Screenshot Time Correlation + Captain Notification Matching`);
    log("=".repeat(80));

    await mongoose.connect(MONGODB_URI);
    log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db!;

    // ══════════════════════════════════════════
    // LOAD ALL DATA
    // ══════════════════════════════════════════
    
    // Tournament
    const tournament = await db.collection("tournaments").findOne({
        _id: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    });
    if (!tournament) { log("❌ Tournament not found!"); process.exit(1); }
    log(`📋 ${tournament.title} | ${tournament.format} | ${tournament.currentTeams} teams`);

    // Teams
    const teams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).toArray();

    const teamById = new Map<string, any>();
    const teamsByCaptain = new Map<string, any>(); // captainId → team
    const shortNameToTeams = new Map<string, any[]>();

    for (const t of teams) {
        teamById.set(t._id.toString(), t);
        if (t.captain) teamsByCaptain.set(t.captain.toString(), t);
        const sn = t.shortName || t.name;
        if (!shortNameToTeams.has(sn)) shortNameToTeams.set(sn, []);
        shortNameToTeams.get(sn)!.push(t);
    }

    log(`   Teams: ${teams.length} | Unique shortNames: ${Array.from(shortNameToTeams.entries()).filter(([,v]) => v.length === 1).length}`);

    // Registrations: userId → team mapping
    const registrations = await db.collection("registrations").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
        status: "approved"
    }).toArray();

    const userToTeam = new Map<string, any>(); // userId → team
    for (const reg of registrations) {
        if (reg.user && reg.team) {
            const team = teamById.get(reg.team.toString());
            if (team) userToTeam.set(reg.user.toString(), team);
        }
    }
    log(`   Registrations mapped: ${userToTeam.size}`);

    // All notifications (for captain matching)
    const allNotifications = await db.collection("notifications").find({
        type: "tournament",
        createdAt: { $gte: TOURNAMENT_START },
        $or: [
            { message: { $regex: tournament.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { link: { $regex: TOURNAMENT_ID } },
        ]
    }).sort({ createdAt: 1 }).toArray();

    log(`   Total notifications: ${allNotifications.length}`);

    // Parse score notifications (to manager)
    const resultPattern = /kết quả trận đấu:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s+trong giải/i;

    const scoreNotifs: MatchResult[] = [];
    for (const n of allNotifications) {
        if (!n.message) continue;
        const m = n.message.match(resultPattern);
        if (!m) continue;
        scoreNotifs.push({
            homeShort: m[1].trim(),
            awayShort: m[4].trim(),
            homeScore: parseInt(m[2]),
            awayScore: parseInt(m[3]),
            timestamp: n.createdAt,
            notifId: n._id.toString(),
            confidence: "unresolved",
        });
    }

    // Dedup
    const dedupMap = new Map<string, MatchResult & { count: number }>();
    for (const r of scoreNotifs) {
        const k1 = `${r.homeShort}|${r.awayShort}|${r.homeScore}|${r.awayScore}`;
        const k2 = `${r.awayShort}|${r.homeShort}|${r.awayScore}|${r.homeScore}`;
        if (dedupMap.has(k1)) { dedupMap.get(k1)!.count++; }
        else if (dedupMap.has(k2)) { dedupMap.get(k2)!.count++; }
        else { dedupMap.set(k1, { ...r, count: 1 }); }
    }
    log(`   Score notifications: ${scoreNotifs.length} → ${dedupMap.size} unique matches`);

    // Captain update notifications (non-score, sent to players)
    const captainNotifs = allNotifications.filter(n => {
        if (!n.message) return false;
        return n.message.includes("cập nhật mới") || n.message.includes("update");
    });
    log(`   Captain update notifications: ${captainNotifs.length}`);

    // Screenshot files
    let screenshotsByTimestamp: { userId: string; timestamp: number; file: string }[] = [];
    try {
        const screenshotDir = path.join(process.cwd(), "uploads", "screenshots");
        const allFiles = await fs.readdir(screenshotDir);
        for (const f of allFiles) {
            const parts = f.split("_");
            if (parts.length < 2) continue;
            const userId = parts[0];
            const ts = parseInt(parts[1].split(".")[0]);
            if (ts >= TOURNAMENT_START_MS) {
                screenshotsByTimestamp.push({ userId, timestamp: ts, file: f });
            }
        }
        screenshotsByTimestamp.sort((a, b) => a.timestamp - b.timestamp);
        log(`   Screenshots (after date filter): ${screenshotsByTimestamp.length}`);
    } catch (e: any) {
        log(`   ⚠️ Screenshots: ${e.message}`);
    }

    // ══════════════════════════════════════════
    // RESOLUTION ENGINE
    // ══════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  RESOLUTION ENGINE");
    log("═".repeat(80));

    let resolvedBoth = 0, resolvedOne = 0, unresolved = 0;
    const resolvedMatches: (MatchResult & { count: number })[] = [];

    for (const [, match] of dedupMap) {
        const ts = new Date(match.timestamp).getTime();
        let homeId: string | undefined;
        let awayId: string | undefined;
        let homeResolved = false;
        let awayResolved = false;
        let method = "";

        // ── METHOD 1: Unique ShortName (direct match) ──
        const homeCandidates = shortNameToTeams.get(match.homeShort) || [];
        const awayCandidates = shortNameToTeams.get(match.awayShort) || [];

        if (homeCandidates.length === 1) {
            homeId = homeCandidates[0]._id.toString();
            homeResolved = true;
            method += "H:unique ";
        }
        if (awayCandidates.length === 1) {
            awayId = awayCandidates[0]._id.toString();
            awayResolved = true;
            method += "A:unique ";
        }

        // ── METHOD 2: Screenshot Time Correlation ──
        if (!homeResolved || !awayResolved) {
            // Find screenshots within ±5 min of this notification
            const nearbyScreenshots = screenshotsByTimestamp.filter(s =>
                Math.abs(s.timestamp - ts) <= TIME_WINDOW_MS
            );

            // Group by userId
            const usersInWindow = new Map<string, number>(); // userId → count
            for (const s of nearbyScreenshots) {
                usersInWindow.set(s.userId, (usersInWindow.get(s.userId) || 0) + 1);
            }

            for (const [userId] of usersInWindow) {
                const team = userToTeam.get(userId);
                if (!team) continue;
                const teamShort = team.shortName || team.name;
                const teamId = team._id.toString();

                if (!homeResolved && teamShort === match.homeShort) {
                    homeId = teamId;
                    homeResolved = true;
                    method += `H:screenshot(${userId.slice(-4)}) `;
                } else if (!awayResolved && teamShort === match.awayShort) {
                    awayId = teamId;
                    awayResolved = true;
                    method += `A:screenshot(${userId.slice(-4)}) `;
                }
            }
        }

        // ── METHOD 3: Captain Notification Matching ──
        if (!homeResolved || !awayResolved) {
            // Find captain update notifications within ±3 min
            const nearbyCaptainNotifs = captainNotifs.filter(n => {
                const captainTs = new Date(n.createdAt).getTime();
                return Math.abs(captainTs - ts) <= 3 * 60 * 1000;
            });

            for (const cn of nearbyCaptainNotifs) {
                const captainId = cn.recipient?.toString();
                if (!captainId) continue;
                const team = teamsByCaptain.get(captainId);
                if (!team) continue;
                const teamShort = team.shortName || team.name;
                const teamId = team._id.toString();

                if (!homeResolved && teamShort === match.homeShort) {
                    homeId = teamId;
                    homeResolved = true;
                    method += `H:captain(${captainId.slice(-4)}) `;
                } else if (!awayResolved && teamShort === match.awayShort) {
                    awayId = teamId;
                    awayResolved = true;
                    method += `A:captain(${captainId.slice(-4)}) `;
                }
            }
        }

        // ── METHOD 4: Stats Cross-Reference ──
        if (!homeResolved && homeCandidates.length > 1) {
            // Try to find by matching accumulated stats
            for (const c of homeCandidates) {
                if (c.stats && c.stats.played > 0 && !homeResolved) {
                    // Check if this candidate's stats align with notification data
                    // Simple heuristic: if only ONE candidate has non-zero stats matching the result
                    const hasGoals = c.stats.goalsFor >= match.homeScore;
                    const hasGA = c.stats.goalsAgainst >= match.awayScore;
                    if (hasGoals && hasGA) {
                        // Check if unique among candidates with stats
                        const withStats = homeCandidates.filter(x => x.stats?.played > 0);
                        if (withStats.length === 1) {
                            homeId = c._id.toString();
                            homeResolved = true;
                            method += "H:stats_unique ";
                        }
                    }
                }
            }
        }
        if (!awayResolved && awayCandidates.length > 1) {
            for (const c of awayCandidates) {
                if (c.stats && c.stats.played > 0 && !awayResolved) {
                    const withStats = awayCandidates.filter(x => x.stats?.played > 0);
                    if (withStats.length === 1) {
                        awayId = c._id.toString();
                        awayResolved = true;
                        method += "A:stats_unique ";
                    }
                }
            }
        }

        // Set result
        match.homeTeamId = homeId;
        match.awayTeamId = awayId;
        match.homeTeamName = homeId ? teamById.get(homeId)?.name : undefined;
        match.awayTeamName = awayId ? teamById.get(awayId)?.name : undefined;
        match.resolveMethod = method.trim();

        if (homeResolved && awayResolved) {
            match.confidence = "exact";
            resolvedBoth++;
        } else if (homeResolved || awayResolved) {
            match.confidence = "screenshot";
            resolvedOne++;
        } else {
            match.confidence = "unresolved";
            unresolved++;
        }

        resolvedMatches.push(match);
    }

    // ══════════════════════════════════════════
    // RESULTS
    // ══════════════════════════════════════════
    log(`\n📊 RESOLUTION RESULTS:`);
    log(`   Both teams resolved: ${resolvedBoth}/${dedupMap.size} (${(resolvedBoth / dedupMap.size * 100).toFixed(1)}%)`);
    log(`   One team resolved:   ${resolvedOne}/${dedupMap.size}`);
    log(`   Unresolved:          ${unresolved}/${dedupMap.size}`);
    log(`   Total recovery rate: ${((resolvedBoth + resolvedOne) / dedupMap.size * 100).toFixed(1)}%`);

    // Print resolved matches
    log("\n" + "═".repeat(80));
    log("  FULLY RESOLVED MATCHES (both teams identified)");
    log("═".repeat(80));
    log(`\n  ${"#".padStart(3)} | ${"Home Team".padEnd(28)} | Score | ${"Away Team".padEnd(28)} | Method`);
    log("  " + "-".repeat(110));

    let idx = 0;
    const fullyResolved = resolvedMatches.filter(m => m.confidence === "exact");
    for (const m of fullyResolved) {
        idx++;
        log(`  ${String(idx).padStart(3)} | ${(m.homeTeamName || m.homeShort).substring(0, 28).padEnd(28)} | ${m.homeScore}-${m.awayScore}   | ${(m.awayTeamName || m.awayShort).substring(0, 28).padEnd(28)} | ${m.resolveMethod}`);
    }

    // Print partially resolved
    log("\n" + "═".repeat(80));
    log("  PARTIALLY RESOLVED (one team identified)");
    log("═".repeat(80));
    idx = 0;
    const partiallyResolved = resolvedMatches.filter(m => m.confidence === "screenshot");
    for (const m of partiallyResolved) {
        idx++;
        const homeName = m.homeTeamId ? (m.homeTeamName || "?") : `[? ${m.homeShort}]`;
        const awayName = m.awayTeamId ? (m.awayTeamName || "?") : `[? ${m.awayShort}]`;
        log(`  ${String(idx).padStart(3)} | ${homeName.substring(0, 28).padEnd(28)} | ${m.homeScore}-${m.awayScore}   | ${awayName.substring(0, 28).padEnd(28)} | ${m.resolveMethod}`);
    }

    // ══════════════════════════════════════════
    // TEAM ELIMINATION MAP
    // ══════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  TEAM STATUS RECONSTRUCTION");
    log("═".repeat(80));

    // From resolved matches, determine who won and who was eliminated
    const teamWins = new Map<string, number>();
    const teamLosses = new Map<string, string[]>(); // teamId → [matchDescriptions]
    const eliminatedTeams = new Set<string>();
    const activeTeams = new Set<string>();

    for (const m of fullyResolved) {
        if (!m.homeTeamId || !m.awayTeamId) continue;

        if (m.homeScore > m.awayScore) {
            // Home won
            teamWins.set(m.homeTeamId, (teamWins.get(m.homeTeamId) || 0) + 1);
            eliminatedTeams.add(m.awayTeamId);
            if (!teamLosses.has(m.awayTeamId)) teamLosses.set(m.awayTeamId, []);
            teamLosses.get(m.awayTeamId)!.push(`Lost to ${m.homeTeamName} ${m.awayScore}-${m.homeScore}`);
        } else if (m.awayScore > m.homeScore) {
            // Away won
            teamWins.set(m.awayTeamId, (teamWins.get(m.awayTeamId) || 0) + 1);
            eliminatedTeams.add(m.homeTeamId);
            if (!teamLosses.has(m.homeTeamId)) teamLosses.set(m.homeTeamId, []);
            teamLosses.get(m.homeTeamId)!.push(`Lost to ${m.awayTeamName} ${m.homeScore}-${m.awayScore}`);
        }
    }

    // Teams still active = teams with stats > 0 in DB that are NOT in eliminatedTeams
    const teamsWithStats = teams.filter(t => t.stats && t.stats.played > 0);
    for (const t of teamsWithStats) {
        if (!eliminatedTeams.has(t._id.toString())) {
            activeTeams.add(t._id.toString());
        }
    }

    log(`\n   Teams with active stats: ${teamsWithStats.length}`);
    log(`   Confirmed eliminated (from resolved matches): ${eliminatedTeams.size}`);
    log(`   Confirmed still active: ${activeTeams.size}`);

    // Win count distribution
    const winDistribution = new Map<number, number>();
    for (const [, w] of teamWins) {
        winDistribution.set(w, (winDistribution.get(w) || 0) + 1);
    }
    log(`   Win distribution:`);
    for (const [wins, count] of Array.from(winDistribution.entries()).sort((a, b) => b[0] - a[0])) {
        log(`     ${wins} wins: ${count} teams (Round ${wins + 1})`);
    }

    // ══════════════════════════════════════════
    // EXPORT FOR APPLY SCRIPT
    // ══════════════════════════════════════════
    const exportData = {
        generated: new Date().toISOString(),
        tournament: {
            id: TOURNAMENT_ID,
            title: tournament.title,
            format: tournament.format,
            totalTeams: teams.length,
        },
        summary: {
            totalNotifMatches: dedupMap.size,
            fullyResolved: resolvedBoth,
            partiallyResolved: resolvedOne,
            unresolved,
            confirmedEliminated: eliminatedTeams.size,
            confirmedActive: activeTeams.size,
        },
        matches: resolvedMatches.map(m => ({
            homeShort: m.homeShort,
            awayShort: m.awayShort,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            homeTeamId: m.homeTeamId || null,
            awayTeamId: m.awayTeamId || null,
            homeTeamName: m.homeTeamName || null,
            awayTeamName: m.awayTeamName || null,
            confidence: m.confidence,
            method: m.resolveMethod,
            date: m.timestamp,
            duplicates: m.count,
        })),
        eliminatedTeamIds: Array.from(eliminatedTeams),
        activeTeamIds: Array.from(activeTeams),
    };

    await fs.writeFile("tournament_recovery_v2.json", JSON.stringify(exportData, null, 2));
    await fs.writeFile("recovery_log_v2.txt", logLines.join("\n"), "utf-8");

    log(`\n📁 Exported: tournament_recovery_v2.json`);
    log(`📁 Log: recovery_log_v2.txt`);

    // ══════════════════════════════════════════
    // RESTORATION PLAN
    // ══════════════════════════════════════════
    log("\n" + "═".repeat(80));
    log("  📋 RESTORATION PLAN");
    log("═".repeat(80));
    log(`
  Current state:
    - ${teams.length} teams, all status "active" (wrongly reset)
    - 1023 wrong matches (new bracket: 458 byes + 565 scheduled)
  
  What we can restore:
    - ${resolvedBoth} fully resolved matches → can recreate exact matchups
    - ${eliminatedTeams.size} teams confirmed eliminated
    - ${activeTeams.size} teams confirmed still active
  
  Recommended approach:
    1. DELETE current wrong bracket (all 1023 matches)
    2. For fully resolved matches:
       → Create Match documents with correct homeTeam/awayTeam
       → Set status: "completed" with correct scores  
       → Set winner field
    3. Set eliminated teams' status back to "eliminated"
    4. Create NEW bracket for remaining active teams (continue tournament)
    
  ⚠️ Unresolved matches (${unresolved}): 
    → These matches HAPPENED but we can't identify exact teams
    → Manager must manually verify or re-enter
    `);

    await mongoose.disconnect();
    log("\n✅ Done.");
}

restore().catch(err => { console.error("❌", err); process.exit(1); });
