/**
 * 🔧 RESTORE-APPLY-V3: Complete restoration with resultSubmissions + screenshots
 * 
 * Improvements over v2:
 *   - Restores resultSubmissions (player-submitted scores + screenshots)
 *   - Partially resolved matches → "Có KQ gửi" (pending review)
 *   - Maps screenshots to matches via timestamp correlation
 *   - Better bracket seeding from match chains
 * 
 * Run on server:
 *   npx tsx scripts/restore-apply-v3.ts           # dry run
 *   npx tsx scripts/restore-apply-v3.ts --apply    # execute
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log("=".repeat(80));
    console.log(`🔧 RESTORE-APPLY-V3 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("   Features: resultSubmissions + screenshots + pending matches");
    console.log("=".repeat(80));

    // ── Load recovery data ──
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch { console.error("❌ Cannot read tournament_recovery_v2.json!"); process.exit(1); }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));

    console.log(`   Fully resolved: ${fullyResolved.length}`);
    console.log(`   Partially resolved: ${partiallyResolved.length}`);

    // ── Connect ──
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // ── Load teams + registrations ──
    const allTeams = await db.collection("teams").find({ tournament: tOid }).toArray();
    const teamById = new Map(allTeams.map(t => [t._id.toString(), t]));

    const registrations = await db.collection("registrations").find({ tournament: tOid, status: "approved" }).toArray();
    const userToTeam = new Map<string, any>();
    const teamToCaptain = new Map<string, string>();
    for (const reg of registrations) {
        if (reg.user && reg.team) {
            const team = teamById.get(reg.team.toString());
            if (team) {
                userToTeam.set(reg.user.toString(), team);
                teamToCaptain.set(reg.team.toString(), reg.user.toString());
            }
        }
    }
    console.log(`   Teams: ${allTeams.length} | Registrations: ${registrations.length}`);

    // ── Load screenshots ──
    const screenshotDir = path.join(process.cwd(), "uploads", "screenshots");
    const userScreenshots = new Map<string, { file: string; timestamp: number }[]>();
    try {
        const files = await fs.readdir(screenshotDir);
        for (const f of files) {
            const parts = f.split("_");
            if (parts.length < 2) continue;
            const userId = parts[0];
            const ts = parseInt(parts[1].split(".")[0]);
            if (isNaN(ts)) continue;
            if (!userScreenshots.has(userId)) userScreenshots.set(userId, []);
            userScreenshots.get(userId)!.push({ file: `/uploads/screenshots/${f}`, timestamp: ts });
        }
        console.log(`   Screenshot users: ${userScreenshots.size}`);
    } catch (e: any) { console.log(`   ⚠️ Screenshots: ${e.message}`); }

    // ── Build win chains and seed list ──
    const teamWins = new Map<string, any[]>();
    for (const m of fullyResolved) {
        const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins.has(winnerId)) teamWins.set(winnerId, []);
        teamWins.get(winnerId)!.push({ oppId: loserId, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, hScore: m.homeScore, aScore: m.awayScore, date: new Date(m.date) });
    }
    for (const [, wins] of teamWins) wins.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // Build seed list via subtrees
    const placed = new Set<string>();
    function buildLeaves(teamId: string): string[] {
        if (placed.has(teamId)) return [teamId];
        placed.add(teamId);
        const wins = teamWins.get(teamId) || [];
        if (wins.length === 0) return [teamId];
        let leaves = [teamId];
        for (const win of wins) {
            if (placed.has(win.oppId)) continue;
            const oppLeaves = buildLeaves(win.oppId);
            let pad = 1;
            const maxLen = Math.max(leaves.length, oppLeaves.length);
            while (pad < maxLen) pad *= 2;
            while (leaves.length < pad) leaves.push("__BYE__");
            while (oppLeaves.length < pad) oppLeaves.push("__BYE__");
            leaves = [...leaves, ...oppLeaves];
        }
        return leaves;
    }

    const sortedTeams = Array.from(teamWins.entries()).sort((a, b) => b[1].length - a[1].length);
    const allLeaves: string[] = [];
    for (const [teamId] of sortedTeams) { if (!placed.has(teamId)) allLeaves.push(...buildLeaves(teamId)); }
    // Add remaining teams from partially resolved
    for (const m of partiallyResolved) {
        for (const id of [m.homeTeamId, m.awayTeamId]) {
            if (id && !placed.has(id)) { allLeaves.push(id); placed.add(id); }
        }
    }
    // Add all remaining teams
    for (const t of allTeams) { const id = t._id.toString(); if (!placed.has(id)) { allLeaves.push(id); placed.add(id); } }

    let S = 2; while (S < allLeaves.length) S *= 2;
    while (allLeaves.length < S) allLeaves.push("__BYE__");
    const totalRounds = Math.log2(S);

    // Result lookup for fast matching
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }

    // Count R1 matches with known results
    let r1Known = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = allLeaves[i * 2], b = allLeaves[i * 2 + 1];
        if (a !== "__BYE__" && b !== "__BYE__" && resultLookup.has(`${a}|${b}`)) r1Known++;
    }

    console.log(`\n📊 BRACKET PLAN:`);
    console.log(`   Bracket size: ${S} (${totalRounds} rounds)`);
    console.log(`   Real teams: ${allLeaves.filter(l => l !== "__BYE__").length}`);
    console.log(`   R1 known results: ${r1Known}`);
    console.log(`   Total known results: ${fullyResolved.length}`);
    console.log(`   Pending submissions: ${partiallyResolved.length}`);

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN complete. Run with --apply to execute.");
        await mongoose.disconnect(); return;
    }

    // ════════════════════════════════════════════════
    // APPLY
    // ════════════════════════════════════════════════
    console.log("\n🚀 Step 1: Cleanup...");
    const del = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${del.deletedCount} matches`);
    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 }
    });

    console.log("\n🚀 Step 2: Creating bracket...");
    const getRN = (r: number) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return `Vòng ${S / Math.pow(2, r - 1)}`;
    };

    // Helper: find screenshots for a user around a timestamp
    function findScreenshots(teamId: string, matchDate: Date): string[] {
        const captainId = teamToCaptain.get(teamId);
        if (!captainId) return [];
        const shots = userScreenshots.get(captainId) || [];
        const ts = matchDate.getTime();
        const window = 10 * 60 * 1000; // ±10 min
        return shots.filter(s => Math.abs(s.timestamp - ts) <= window).map(s => s.file);
    }

    // Helper: build resultSubmissions for a match
    function buildSubmissions(homeTeamId: string, awayTeamId: string, hScore: number, aScore: number, matchDate: Date) {
        const subs: any[] = [];
        const homeCaptain = teamToCaptain.get(homeTeamId);
        const awayCaptain = teamToCaptain.get(awayTeamId);
        if (homeCaptain) {
            subs.push({
                user: new mongoose.Types.ObjectId(homeCaptain),
                team: new mongoose.Types.ObjectId(homeTeamId),
                homeScore: hScore, awayScore: aScore,
                screenshots: findScreenshots(homeTeamId, matchDate),
                notes: "Restored from recovery", submittedAt: matchDate,
            });
        }
        if (awayCaptain) {
            subs.push({
                user: new mongoose.Types.ObjectId(awayCaptain),
                team: new mongoose.Types.ObjectId(awayTeamId),
                homeScore: hScore, awayScore: aScore,
                screenshots: findScreenshots(awayTeamId, matchDate),
                notes: "Restored from recovery", submittedAt: matchDate,
            });
        }
        return subs;
    }

    // Pre-create R2+ matches
    const mMap = new Map<number, Map<number, any>>();
    for (let r = 2; r <= totalRounds; r++) {
        mMap.set(r, new Map());
        const cnt = S / Math.pow(2, r);
        for (let i = 0; i < cnt; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r, roundName: getRN(r), matchNumber: i + 1,
                homeTeam: null, awayTeam: null, homeScore: null, awayScore: null, winner: null,
                status: "scheduled", bracketPosition: { x: r - 1, y: i }, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // Create R1 matches
    mMap.set(1, new Map());
    let rReal = 0, rBye = 0, rCompleted = 0;

    for (let i = 0; i < S / 2; i++) {
        const leafA = allLeaves[i * 2], leafB = allLeaves[i * 2 + 1];
        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2 = mMap.get(2)!.get(nextIdx);
        const aId = leafA !== "__BYE__" ? new mongoose.Types.ObjectId(leafA) : null;
        const bId = leafB !== "__BYE__" ? new mongoose.Types.ObjectId(leafB) : null;

        if (aId && bId) {
            const key = `${leafA}|${leafB}`;
            const result = resultLookup.get(key);

            let homeTeam = aId, awayTeam = bId;
            let hScore: number | null = null, aScore: number | null = null;
            let winner: any = null, status = "scheduled";
            let subs: any[] = [];

            if (result) {
                homeTeam = new mongoose.Types.ObjectId(result.homeTeamId);
                awayTeam = new mongoose.Types.ObjectId(result.awayTeamId);
                hScore = result.homeScore; aScore = result.awayScore;
                const winnerId = hScore! > aScore! ? result.homeTeamId : result.awayTeamId;
                const loserId = hScore! > aScore! ? result.awayTeamId : result.homeTeamId;
                winner = new mongoose.Types.ObjectId(winnerId);
                status = "completed";
                subs = buildSubmissions(result.homeTeamId, result.awayTeamId, hScore!, aScore!, new Date(result.date));
                rCompleted++;

                await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: winner } });
                // Stats
                await db.collection("teams").updateOne({ _id: new mongoose.Types.ObjectId(winnerId) },
                    { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": hScore! > aScore! ? hScore! : aScore!, "stats.goalsAgainst": hScore! > aScore! ? aScore! : hScore!, "stats.points": 3 } });
                await db.collection("teams").updateOne({ _id: new mongoose.Types.ObjectId(loserId) },
                    { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": hScore! > aScore! ? aScore! : hScore!, "stats.goalsAgainst": hScore! > aScore! ? hScore! : aScore! } });
            }

            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam, awayTeam, homeScore: hScore, awayScore: aScore, winner, status,
                bracketPosition: { x: 0, y: i }, nextMatch: r2._id, leg: 1,
                events: [], resultSubmissions: subs, screenshots: [],
                completedAt: status === "completed" ? new Date(result.date) : undefined,
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
            rReal++;
        } else if (aId || bId) {
            const byeTeam = (aId || bId)!;
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: byeTeam, awayTeam: null, homeScore: 0, awayScore: 0, winner: byeTeam,
                status: "bye", bracketPosition: { x: 0, y: i }, nextMatch: r2._id, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
            rBye++;
            await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: byeTeam } });
        }
    }

    // Link R2+ nextMatch
    for (let r = 2; r < totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            const ni = Math.floor(idx / 2), nm = mMap.get(r + 1)!.get(ni);
            await db.collection("matches").updateOne({ _id: m._id }, { $set: { nextMatch: nm._id } });
        }
    }
    console.log(`   R1: ${rReal} real + ${rBye} byes | ${rCompleted} completed`);

    // ── Apply R2+ results ──
    console.log("\n🚀 Step 3: Applying R2+ results...");
    let rHigher = 0;
    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            const doc = await db.collection("matches").findOne({ _id: m._id });
            if (!doc?.homeTeam || !doc?.awayTeam) continue;
            const hId = doc.homeTeam.toString(), aId = doc.awayTeam.toString();
            const result = resultLookup.get(`${hId}|${aId}`);
            if (!result) continue;

            const isFlip = result.homeTeamId !== hId;
            const hS = isFlip ? result.awayScore : result.homeScore;
            const aS = isFlip ? result.homeScore : result.awayScore;
            const winnerId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
            const loserId = result.homeScore > result.awayScore ? result.awayTeamId : result.homeTeamId;
            const winOid = new mongoose.Types.ObjectId(winnerId);
            const subs = buildSubmissions(result.homeTeamId, result.awayTeamId, result.homeScore, result.awayScore, new Date(result.date));

            await db.collection("matches").updateOne({ _id: m._id }, {
                $set: { homeScore: hS, awayScore: aS, winner: winOid, status: "completed", completedAt: new Date(result.date), resultSubmissions: subs }
            });

            if (r < totalRounds) {
                const ni = Math.floor(idx / 2), ns = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                const nm = mMap.get(r + 1)!.get(ni);
                await db.collection("matches").updateOne({ _id: nm._id }, { $set: { [ns]: winOid } });
            }

            await db.collection("teams").updateOne({ _id: winOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": result.homeScore > result.awayScore ? result.homeScore : result.awayScore, "stats.goalsAgainst": result.homeScore > result.awayScore ? result.awayScore : result.homeScore, "stats.points": 3 } });
            await db.collection("teams").updateOne({ _id: new mongoose.Types.ObjectId(loserId) },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": result.homeScore > result.awayScore ? result.awayScore : result.homeScore, "stats.goalsAgainst": result.homeScore > result.awayScore ? result.homeScore : result.awayScore } });
            rHigher++;
        }
    }
    console.log(`   R2+ completed: ${rHigher}`);

    // ── Add resultSubmissions for partially resolved (pending review) ──
    console.log("\n🚀 Step 4: Adding pending resultSubmissions (partially resolved)...");
    let pendingCount = 0;
    for (const m of partiallyResolved) {
        const knownTeamId = m.homeTeamId || m.awayTeamId;
        if (!knownTeamId) continue;

        // Find the match in our bracket where this team is home or away
        const matchDoc = await db.collection("matches").findOne({
            tournament: tOid,
            status: "scheduled",
            $or: [{ homeTeam: new mongoose.Types.ObjectId(knownTeamId) }, { awayTeam: new mongoose.Types.ObjectId(knownTeamId) }]
        });
        if (!matchDoc) continue;

        const captainId = teamToCaptain.get(knownTeamId);
        if (!captainId) continue;

        const sub = {
            user: new mongoose.Types.ObjectId(captainId),
            team: new mongoose.Types.ObjectId(knownTeamId),
            homeScore: m.homeScore, awayScore: m.awayScore,
            screenshots: findScreenshots(knownTeamId, new Date(m.date)),
            notes: "Restored from recovery (pending verification)",
            submittedAt: new Date(m.date),
        };

        await db.collection("matches").updateOne(
            { _id: matchDoc._id },
            { $push: { resultSubmissions: sub } as any }
        );
        pendingCount++;
    }
    console.log(`   Pending submissions added: ${pendingCount}`);

    // ── Summary ──
    const finalCompleted = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const finalScheduled = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const finalWithSubs = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const finalElim = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORATION v3 COMPLETE!");
    console.log("=".repeat(80));
    console.log(`   ✅ Completed matches: ${finalCompleted} (R1: ${rCompleted}, R2+: ${rHigher})`);
    console.log(`   📋 Scheduled matches: ${finalScheduled}`);
    console.log(`   📨 Matches with submissions: ${finalWithSubs}`);
    console.log(`   ❌ Eliminated teams: ${finalElim}`);
    console.log(`   ✅ Active teams: ${allTeams.length - finalElim}`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("✅ Done.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
