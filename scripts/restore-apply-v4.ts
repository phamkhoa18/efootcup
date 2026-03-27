/**
 * 🔧 RESTORE-APPLY-V4: Precise bracket restoration
 * 
 * This script replicates the EXACT generateSingleElimination logic from the API,
 * but with strategically ordered teams so known opponents face each other.
 * 
 * PHASE 1: Build slot assignments from recovery match chains
 * PHASE 2: Create bracket (EXACT same code as API)
 * PHASE 3: Apply results + resultSubmissions + screenshots to completed matches
 * PHASE 4: Advance winners through the bracket
 * 
 * npx tsx scripts/restore-apply-v4.ts           # dry run
 * npx tsx scripts/restore-apply-v4.ts --apply    # execute
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log("=".repeat(80));
    console.log(`🔧 RESTORE-APPLY-V4 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("=".repeat(80));

    // ── Load recovery data ──
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch { console.error("❌ Cannot read tournament_recovery_v2.json!"); process.exit(1); }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));
    console.log(`   Fully resolved: ${fullyResolved.length} | Partially: ${partiallyResolved.length}`);

    // ── Connect ──
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // ── Load data ──
    const allTeams = await db.collection("teams").find({ tournament: tOid }).toArray();
    const teamById = new Map(allTeams.map(t => [t._id.toString(), t]));
    console.log(`   Teams: ${allTeams.length}`);

    const registrations = await db.collection("registrations").find({ tournament: tOid, status: "approved" }).toArray();
    const teamToCaptain = new Map<string, string>();
    for (const reg of registrations) {
        if (reg.user && reg.team) teamToCaptain.set(reg.team.toString(), reg.user.toString());
    }

    // Screenshots
    const userScreenshots = new Map<string, { file: string; ts: number }[]>();
    try {
        const sDir = path.join(process.cwd(), "uploads", "screenshots");
        for (const f of await fs.readdir(sDir)) {
            const p = f.split("_"); if (p.length < 2) continue;
            const ts = parseInt(p[1].split(".")[0]); if (isNaN(ts)) continue;
            if (!userScreenshots.has(p[0])) userScreenshots.set(p[0], []);
            userScreenshots.get(p[0])!.push({ file: `/uploads/screenshots/${f}`, ts });
        }
    } catch {}

    // ══════════════════════════════════════════════════════════════
    // PHASE 1: Build slot assignments from match chains
    // ══════════════════════════════════════════════════════════════
    console.log("\n📐 PHASE 1: Building slot assignments...");

    // Build win chains: winnerId → [{oppId, date, match_data}]
    const teamWins = new Map<string, any[]>();
    for (const m of fullyResolved) {
        const wId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins.has(wId)) teamWins.set(wId, []);
        teamWins.get(wId)!.push({ oppId: lId, match: m, date: new Date(m.date) });
    }
    for (const [, w] of teamWins) w.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // Build subtrees: returns flat array of team IDs in bracket slot order
    // Adjacent pairs = R1 opponents; adjacent groups of 4 = R2 groups; etc.
    const visited = new Set<string>();

    function buildSlots(teamId: string): string[] {
        if (visited.has(teamId)) return [teamId];
        visited.add(teamId);

        const wins = teamWins.get(teamId) || [];
        if (wins.length === 0) return [teamId];

        let slots = [teamId];

        for (const win of wins) {
            if (visited.has(win.oppId)) continue;

            const oppSlots = buildSlots(win.oppId);

            // Both sides must be same power-of-2 size
            const maxLen = Math.max(slots.length, oppSlots.length);
            let targetSize = 1;
            while (targetSize < maxLen) targetSize *= 2;

            while (slots.length < targetSize) slots.push("__BYE__");
            while (oppSlots.length < targetSize) oppSlots.push("__BYE__");

            // Combine: this team's side + opponent's side
            slots = [...slots, ...oppSlots];
        }

        return slots;
    }

    // Process teams with most wins first (deepest bracket paths)
    const teamsByWinCount = Array.from(teamWins.entries())
        .sort((a, b) => b[1].length - a[1].length);

    const masterSlots: (string | null)[] = [];

    for (const [teamId] of teamsByWinCount) {
        if (!visited.has(teamId)) {
            const subtree = buildSlots(teamId);
            for (const s of subtree) masterSlots.push(s === "__BYE__" ? null : s);
        }
    }

    // Add remaining teams (not in any recovered match)
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!visited.has(id)) {
            masterSlots.push(id);
            visited.add(id);
        }
    }

    // Pad to power of 2
    const N = allTeams.length; // 566
    let S = 2; while (S < N) S *= 2; // 1024
    while (masterSlots.length < S) masterSlots.push(null);
    // Trim if somehow too long
    while (masterSlots.length > S) masterSlots.pop();

    const totalRounds = Math.log2(S);
    const realTeams = masterSlots.filter(s => s !== null).length;
    const byes = S - realTeams;

    // Build result lookup
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }

    // Verify: count R1 pairs with known results
    let r1Known = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = masterSlots[i * 2], b = masterSlots[i * 2 + 1];
        if (a && b && resultLookup.has(`${a}|${b}`)) r1Known++;
    }

    console.log(`   Bracket: ${S} slots (${totalRounds} rounds)`);
    console.log(`   Real teams: ${realTeams} | Byes: ${byes}`);
    console.log(`   R1 pairs with known results: ${r1Known}`);

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN complete. Run with: npx tsx scripts/restore-apply-v4.ts --apply");
        await mongoose.disconnect(); return;
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 2: Create bracket (EXACT same logic as API)
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 PHASE 2: Creating bracket (replicating API logic)...");

    // Step 2.0: Cleanup
    const delResult = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${delResult.deletedCount} old matches`);

    // Reset ALL teams to active + zero stats
    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: {
            status: "active",
            "stats.played": 0, "stats.wins": 0, "stats.draws": 0,
            "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0,
        }
    });

    // ── EXACT replication of generateSingleElimination ──
    const getRoundName = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        const teamsInRound = size / Math.pow(2, r - 1);
        return `Vòng ${teamsInRound}`;
    };

    const matchesMap = new Map<number, Map<number, any>>();

    // 2.1: Pre-create all matches from Round 2 onwards
    for (let r = 2; r <= totalRounds; r++) {
        matchesMap.set(r, new Map());
        const matchCount = S / Math.pow(2, r);
        for (let i = 0; i < matchCount; i++) {
            const match = await db.collection("matches").insertOne({
                tournament: tOid,
                round: r,
                roundName: getRoundName(r, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: null,
                awayTeam: null,
                homeScore: null,
                awayScore: null,
                winner: null,
                status: "scheduled",
                bracketPosition: { x: r - 1, y: i },
                leg: 1,
                events: [],
                resultSubmissions: [],
                screenshots: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            matchesMap.get(r)!.set(i, { _id: match.insertedId });
        }
    }

    // 2.2: Create ALL Round 1 matches (including BYEs) — EXACT same as API
    matchesMap.set(1, new Map());
    let cntReal = 0, cntBye = 0, cntEmpty = 0;

    for (let i = 0; i < S / 2; i++) {
        const teamAId = masterSlots[i * 2];
        const teamBId = masterSlots[i * 2 + 1];

        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = matchesMap.get(2)!.get(nextIdx);

        if (teamAId && teamBId) {
            // Both slots filled → Real match
            const match = await db.collection("matches").insertOne({
                tournament: tOid,
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: new mongoose.Types.ObjectId(teamAId),
                awayTeam: new mongoose.Types.ObjectId(teamBId),
                homeScore: null,
                awayScore: null,
                winner: null,
                status: "scheduled",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
                leg: 1,
                events: [],
                resultSubmissions: [],
                screenshots: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: match.insertedId });
            cntReal++;
        } else if (teamAId || teamBId) {
            // Only one team → BYE
            const byeTeamId = new mongoose.Types.ObjectId((teamAId || teamBId)!);
            const match = await db.collection("matches").insertOne({
                tournament: tOid,
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: byeTeamId,
                awayTeam: null,
                homeScore: 0,
                awayScore: 0,
                winner: byeTeamId,
                status: "bye",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
                leg: 1,
                events: [],
                resultSubmissions: [],
                screenshots: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: match.insertedId });
            cntBye++;

            // Auto-promote BYE team to Round 2 (same as API)
            await db.collection("matches").updateOne(
                { _id: r2Match._id },
                { $set: { [side]: byeTeamId } }
            );
        } else {
            cntEmpty++;
        }
    }

    // 2.3: Link Round 2+ matches to their successors (same as API)
    for (let r = 2; r <= totalRounds; r++) {
        const roundMatches = matchesMap.get(r)!;
        for (const [idx, match] of roundMatches.entries()) {
            if (r < totalRounds) {
                const nextIdx = Math.floor(idx / 2);
                const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
                await db.collection("matches").updateOne(
                    { _id: match._id },
                    { $set: { nextMatch: nextMatch._id } }
                );
            }
        }
    }

    const totalCreated = cntReal + cntBye + Array.from(matchesMap.entries()).filter(([r]) => r >= 2).reduce((sum, [, m]) => sum + m.size, 0);
    console.log(`   Created: ${totalCreated} matches (R1: ${cntReal} real + ${cntBye} byes)`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 3: Apply results to completed matches
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 PHASE 3: Applying match results...");

    function getScreenshots(teamId: string, matchDate: Date): string[] {
        const captainId = teamToCaptain.get(teamId);
        if (!captainId) return [];
        const shots = userScreenshots.get(captainId) || [];
        const mTs = matchDate.getTime();
        return shots.filter(s => Math.abs(s.ts - mTs) <= 10 * 60 * 1000).map(s => s.file);
    }

    function makeSubmissions(m: any): any[] {
        const subs: any[] = [];
        const mDate = new Date(m.date);
        for (const tId of [m.homeTeamId, m.awayTeamId]) {
            const captain = teamToCaptain.get(tId);
            if (!captain) continue;
            subs.push({
                user: new mongoose.Types.ObjectId(captain),
                team: new mongoose.Types.ObjectId(tId),
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                screenshots: getScreenshots(tId, mDate),
                notes: "",
                submittedAt: mDate,
            });
        }
        return subs;
    }

    // Apply results round by round (R1 first, then R2, etc.)
    let totalCompleted = 0;

    for (let r = 1; r <= totalRounds; r++) {
        const roundMatches = matchesMap.get(r);
        if (!roundMatches) continue;

        for (const [idx, matchRef] of roundMatches.entries()) {
            // Reload match to get current teams (may have been promoted from previous round)
            const doc = await db.collection("matches").findOne({ _id: matchRef._id });
            if (!doc || !doc.homeTeam || !doc.awayTeam) continue;
            if (doc.status === "bye") continue;

            const hId = doc.homeTeam.toString();
            const aId = doc.awayTeam.toString();
            const result = resultLookup.get(`${hId}|${aId}`);
            if (!result) continue;

            // Determine correct score orientation
            const isFlipped = result.homeTeamId !== hId;
            const hScore = isFlipped ? result.awayScore : result.homeScore;
            const aScore = isFlipped ? result.homeScore : result.awayScore;
            const winnerId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
            const loserId = result.homeScore > result.awayScore ? result.awayTeamId : result.homeTeamId;
            const winnerOid = new mongoose.Types.ObjectId(winnerId);
            const loserOid = new mongoose.Types.ObjectId(loserId);

            const subs = makeSubmissions(result);

            // Update match as completed
            await db.collection("matches").updateOne({ _id: matchRef._id }, {
                $set: {
                    homeScore: hScore,
                    awayScore: aScore,
                    winner: winnerOid,
                    status: "completed",
                    completedAt: new Date(result.date),
                    resultSubmissions: subs,
                }
            });

            // Advance winner to next round
            if (r < totalRounds) {
                const nextIdx = Math.floor(idx / 2);
                const nextSide = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
                await db.collection("matches").updateOne(
                    { _id: nextMatch._id },
                    { $set: { [nextSide]: winnerOid } }
                );
            }

            // Update team stats
            const winnerGoalsFor = winnerId === result.homeTeamId ? result.homeScore : result.awayScore;
            const winnerGoalsAgainst = winnerId === result.homeTeamId ? result.awayScore : result.homeScore;
            await db.collection("teams").updateOne(
                { _id: winnerOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": winnerGoalsFor, "stats.goalsAgainst": winnerGoalsAgainst, "stats.points": 3 } }
            );
            await db.collection("teams").updateOne(
                { _id: loserOid },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": winnerGoalsAgainst, "stats.goalsAgainst": winnerGoalsFor } }
            );

            totalCompleted++;
        }
    }
    console.log(`   Completed: ${totalCompleted} matches`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 4: Add pending resultSubmissions for partially resolved
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 PHASE 4: Adding pending submissions...");
    let pendingCount = 0;

    for (const m of partiallyResolved) {
        const knownId = m.homeTeamId || m.awayTeamId;
        if (!knownId) continue;

        // Find this team's scheduled match
        const matchDoc = await db.collection("matches").findOne({
            tournament: tOid,
            status: "scheduled",
            $or: [
                { homeTeam: new mongoose.Types.ObjectId(knownId) },
                { awayTeam: new mongoose.Types.ObjectId(knownId) },
            ]
        });
        if (!matchDoc) continue;

        const captain = teamToCaptain.get(knownId);
        if (!captain) continue;

        const sub = {
            user: new mongoose.Types.ObjectId(captain),
            team: new mongoose.Types.ObjectId(knownId),
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            screenshots: getScreenshots(knownId, new Date(m.date)),
            notes: "",
            submittedAt: new Date(m.date),
        };

        await db.collection("matches").updateOne(
            { _id: matchDoc._id },
            { $push: { resultSubmissions: sub } as any }
        );
        pendingCount++;
    }
    console.log(`   Pending submissions: ${pendingCount}`);

    // ══════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fs2 = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const fb = await db.collection("matches").countDocuments({ tournament: tOid, status: "bye" });
    const fws = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORE-APPLY-V4 COMPLETE!");
    console.log("=".repeat(80));
    console.log(`   Completed : ${fc}`);
    console.log(`   Scheduled : ${fs2}`);
    console.log(`   Byes      : ${fb}`);
    console.log(`   With subs : ${fws} (Có KQ gửi)`);
    console.log(`   Eliminated: ${fe}`);
    console.log(`   Active    : ${allTeams.length - fe}`);
    console.log(`   Total     : ${fc + fs2 + fb} matches`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("✅ Done.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
