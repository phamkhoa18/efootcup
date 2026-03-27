/**
 * 🔧 RESTORE-APPLY-V4: EXACT bracket reconstruction
 * 
 * KEY INSIGHT: The original bracket was generated using 8 seeds + teams in
 * MongoDB _id order. By using the SAME seeds and the SAME team query order,
 * we can recreate the EXACT SAME bracket as the original!
 * 
 * Then we apply all recovered match results to the correct positions.
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

// The 8 seeds (from user's memory) — EFV IDs
const SEED_EFV_IDS = [33, 23, 380, 17, 20, 423, 448, 661];

async function main() {
    console.log("=".repeat(80));
    console.log(`🔧 RESTORE-APPLY-V4 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("   Strategy: Recreate EXACT original bracket using seeds + DB order");
    console.log("=".repeat(80));

    // Load recovery data
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch { console.error("❌ Cannot read tournament_recovery_v2.json!"); process.exit(1); }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));
    console.log(`   Fully resolved: ${fullyResolved.length} | Partially: ${partiallyResolved.length}`);

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // ══════════════════════════════════════════════════════════════
    // STEP 1: Find seed team IDs from EFV IDs
    // ══════════════════════════════════════════════════════════════
    console.log("\n📐 Step 1: Resolving seeds...");

    const seedTeamIds: string[] = [];
    for (const efvId of SEED_EFV_IDS) {
        // Find user by efvId
        const user = await db.collection("users").findOne({ efvId });
        if (!user) { console.log(`   ⚠️ EFV#${efvId}: user not found`); continue; }

        // Find their registration → team
        const reg = await db.collection("registrations").findOne({
            tournament: tOid, user: user._id, status: "approved"
        });
        if (!reg?.team) { console.log(`   ⚠️ EFV#${efvId} (${user.name}): no approved registration`); continue; }

        const team = await db.collection("teams").findOne({ _id: reg.team });
        if (!team) { console.log(`   ⚠️ EFV#${efvId}: team not found`); continue; }

        seedTeamIds.push(team._id.toString());
        console.log(`   ✅ Seed ${seedTeamIds.length}: EFV#${efvId} → ${team.name} (${team._id})`);
    }
    console.log(`   Seeds resolved: ${seedTeamIds.length}/${SEED_EFV_IDS.length}`);

    // ══════════════════════════════════════════════════════════════
    // STEP 2: Load teams in EXACT same order as API
    // ══════════════════════════════════════════════════════════════
    console.log("\n📐 Step 2: Loading teams (same query as API)...");

    // The API does: Team.find({ tournament: id, status: "active" })
    // MongoDB returns in _id order by default
    const allTeams = await db.collection("teams")
        .find({ tournament: tOid })  // All teams (we'll reset status first)
        .sort({ _id: 1 })            // Explicit _id order
        .toArray();

    console.log(`   Total teams: ${allTeams.length}`);

    // Build orderedTeams EXACTLY like the API does with seeds:
    // 1. Seeds first (in order)
    // 2. Remaining teams in Map iteration order (= _id order)
    const teamMap = new Map(allTeams.map(t => [t._id.toString(), t]));
    const orderedTeams: any[] = [];

    // Add seeds first
    for (const seedId of seedTeamIds) {
        const team = teamMap.get(seedId);
        if (team) {
            orderedTeams.push(team);
            teamMap.delete(seedId);
        }
    }
    // Add remaining in Map order (= _id order since Map preserves insertion)
    for (const team of teamMap.values()) {
        orderedTeams.push(team);
    }

    const N = orderedTeams.length;
    let S = 2; while (S < N) S *= 2;
    const totalRounds = Math.log2(S);

    // ── Standard seeding (EXACT copy from API) ──
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Map orderedTeams to slots (EXACT copy from API)
    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const slotIndex = seedOrder.indexOf(i + 1);
        teamSlots[slotIndex] = orderedTeams[i];
    }

    // Count expected R1 real matches and byes
    let r1Real = 0, r1Bye = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = teamSlots[i * 2], b = teamSlots[i * 2 + 1];
        if (a && b) r1Real++;
        else if (a || b) r1Bye++;
    }

    // Build result lookup
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }

    // Check how many R1 matches have known results
    let r1Known = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = teamSlots[i * 2], b = teamSlots[i * 2 + 1];
        if (a && b && resultLookup.has(`${a._id.toString()}|${b._id.toString()}`)) r1Known++;
    }

    console.log(`\n📊 BRACKET:`);
    console.log(`   Size: ${S} (${totalRounds} rounds)`);
    console.log(`   R1: ${r1Real} real matches + ${r1Bye} byes`);
    console.log(`   R1 with known results: ${r1Known}`);
    console.log(`   Total known results: ${fullyResolved.length}`);

    // Load registrations + screenshots for resultSubmissions
    const registrations = await db.collection("registrations").find({ tournament: tOid, status: "approved" }).toArray();
    const teamToCaptain = new Map<string, string>();
    for (const r of registrations) { if (r.user && r.team) teamToCaptain.set(r.team.toString(), r.user.toString()); }

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

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN complete. Run with: npx tsx scripts/restore-apply-v4.ts --apply");
        await mongoose.disconnect(); return;
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE A: Cleanup
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 Phase A: Cleanup...");
    const del = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${del.deletedCount} matches`);

    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: {
            status: "active",
            "stats.played": 0, "stats.wins": 0, "stats.draws": 0,
            "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0,
        }
    });

    // ══════════════════════════════════════════════════════════════
    // PHASE B: Create bracket (EXACT copy of API generateSingleElimination)
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 Phase B: Creating bracket (exact API replication)...");

    const getRoundName = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        return `Vòng ${size / Math.pow(2, r - 1)}`;
    };

    const matchesMap = new Map<number, Map<number, any>>();

    // B.1: Pre-create R2+ matches
    for (let r = 2; r <= totalRounds; r++) {
        matchesMap.set(r, new Map());
        const matchCount = S / Math.pow(2, r);
        for (let i = 0; i < matchCount; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r,
                roundName: getRoundName(r, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: null, awayTeam: null,
                homeScore: null, awayScore: null, winner: null,
                status: "scheduled",
                bracketPosition: { x: r - 1, y: i },
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // B.2: Create ALL R1 matches
    matchesMap.set(1, new Map());
    let cReal = 0, cBye = 0;

    for (let i = 0; i < S / 2; i++) {
        const teamA = teamSlots[i * 2];
        const teamB = teamSlots[i * 2 + 1];
        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = matchesMap.get(2)!.get(nextIdx);

        if (teamA && teamB) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: teamA._id, awayTeam: teamB._id,
                homeScore: null, awayScore: null, winner: null,
                status: "scheduled",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: res.insertedId });
            cReal++;
        } else if (teamA || teamB) {
            const byeTeam = teamA || teamB;
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: byeTeam._id, awayTeam: null,
                homeScore: 0, awayScore: 0, winner: byeTeam._id,
                status: "bye",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: res.insertedId });
            cBye++;
            // Auto-promote BYE team to R2
            await db.collection("matches").updateOne(
                { _id: r2Match._id }, { $set: { [side]: byeTeam._id } }
            );
        }
    }

    // B.3: Link R2+ nextMatch
    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of matchesMap.get(r)!.entries()) {
            if (r < totalRounds) {
                const ni = Math.floor(idx / 2);
                const nm = matchesMap.get(r + 1)!.get(ni);
                await db.collection("matches").updateOne(
                    { _id: m._id }, { $set: { nextMatch: nm._id } }
                );
            }
        }
    }

    console.log(`   R1: ${cReal} real + ${cBye} byes`);

    // ══════════════════════════════════════════════════════════════
    // PHASE C: Apply results round by round
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 Phase C: Applying results round-by-round...");

    function getScreenshots(teamId: string, date: Date): string[] {
        const c = teamToCaptain.get(teamId); if (!c) return [];
        const s = userScreenshots.get(c) || [];
        const t = date.getTime();
        return s.filter(x => Math.abs(x.ts - t) <= 10 * 60 * 1000).map(x => x.file);
    }

    function makeSubs(m: any): any[] {
        const d = new Date(m.date), subs: any[] = [];
        for (const tId of [m.homeTeamId, m.awayTeamId]) {
            const cap = teamToCaptain.get(tId);
            if (cap) subs.push({
                user: new mongoose.Types.ObjectId(cap),
                team: new mongoose.Types.ObjectId(tId),
                homeScore: m.homeScore, awayScore: m.awayScore,
                screenshots: getScreenshots(tId, d), notes: "", submittedAt: d,
            });
        }
        return subs;
    }

    let totalApplied = 0;

    for (let r = 1; r <= totalRounds; r++) {
        let roundApplied = 0;
        const roundMatches = matchesMap.get(r);
        if (!roundMatches) continue;

        for (const [idx, mRef] of roundMatches.entries()) {
            const doc = await db.collection("matches").findOne({ _id: mRef._id });
            if (!doc?.homeTeam || !doc?.awayTeam || doc.status === "bye") continue;

            const hId = doc.homeTeam.toString(), aId = doc.awayTeam.toString();
            const key = `${hId}|${aId}`;
            const result = resultLookup.get(key);
            if (!result) continue;

            const isFlipped = result.homeTeamId !== hId;
            const hS = isFlipped ? result.awayScore : result.homeScore;
            const aS = isFlipped ? result.homeScore : result.awayScore;
            const winnerId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
            const loserId = result.homeScore > result.awayScore ? result.awayTeamId : result.homeTeamId;
            const winOid = new mongoose.Types.ObjectId(winnerId);
            const loseOid = new mongoose.Types.ObjectId(loserId);

            // Mark completed with resultSubmissions
            await db.collection("matches").updateOne({ _id: mRef._id }, {
                $set: {
                    homeScore: hS, awayScore: aS, winner: winOid,
                    status: "completed", completedAt: new Date(result.date),
                    resultSubmissions: makeSubs(result),
                }
            });

            // Advance winner to next round
            if (r < totalRounds) {
                const ni = Math.floor(idx / 2);
                const ns = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                const nm = matchesMap.get(r + 1)!.get(ni);
                await db.collection("matches").updateOne(
                    { _id: nm._id }, { $set: { [ns]: winOid } }
                );
            }

            // Stats
            const wGF = winnerId === result.homeTeamId ? result.homeScore : result.awayScore;
            const wGA = winnerId === result.homeTeamId ? result.awayScore : result.homeScore;
            await db.collection("teams").updateOne({ _id: winOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": wGF, "stats.goalsAgainst": wGA, "stats.points": 3 } });
            await db.collection("teams").updateOne({ _id: loseOid },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": wGA, "stats.goalsAgainst": wGF } });

            roundApplied++;
            totalApplied++;
        }
        if (roundApplied > 0) console.log(`   Round ${r}: ${roundApplied} results applied`);
    }
    console.log(`   Total applied: ${totalApplied}/${fullyResolved.length}`);

    // ══════════════════════════════════════════════════════════════
    // PHASE D: Add pending submissions for partially resolved
    // ══════════════════════════════════════════════════════════════
    console.log("\n🚀 Phase D: Adding pending submissions...");
    let pendingCount = 0;
    for (const m of partiallyResolved) {
        const knownId = m.homeTeamId || m.awayTeamId;
        if (!knownId) continue;
        const cap = teamToCaptain.get(knownId);
        if (!cap) continue;

        const matchDoc = await db.collection("matches").findOne({
            tournament: tOid, status: "scheduled",
            $or: [{ homeTeam: new mongoose.Types.ObjectId(knownId) }, { awayTeam: new mongoose.Types.ObjectId(knownId) }]
        });
        if (!matchDoc) continue;

        await db.collection("matches").updateOne({ _id: matchDoc._id }, {
            $push: { resultSubmissions: {
                user: new mongoose.Types.ObjectId(cap),
                team: new mongoose.Types.ObjectId(knownId),
                homeScore: m.homeScore, awayScore: m.awayScore,
                screenshots: getScreenshots(knownId, new Date(m.date)),
                notes: "", submittedAt: new Date(m.date),
            }} as any
        });
        pendingCount++;
    }
    console.log(`   Pending submissions: ${pendingCount}`);

    // Summary
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fsc = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const fb = await db.collection("matches").countDocuments({ tournament: tOid, status: "bye" });
    const fws = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORE-APPLY-V4 COMPLETE!");
    console.log("=".repeat(80));
    console.log(`   ✅ Completed  : ${fc}`);
    console.log(`   📋 Scheduled  : ${fsc}`);
    console.log(`   ⏭️  Byes       : ${fb}`);
    console.log(`   📨 With subs  : ${fws}`);
    console.log(`   ❌ Eliminated : ${fe}`);
    console.log(`   ✅ Active     : ${allTeams.length - fe}`);
    console.log(`   📊 Total      : ${fc + fsc + fb}`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("✅ Done.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
