/**
 * 🔧 RESTORE-APPLY-V5: Direct slot placement from recovery data
 * 
 * Strategy: Place known opponents in adjacent bracket positions so results
 * can be applied correctly. Uses 1024 bracket with all 566 teams.
 * 
 * npx tsx scripts/restore-apply-v5.ts           # dry run
 * npx tsx scripts/restore-apply-v5.ts --apply
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log("=".repeat(80));
    console.log(`🔧 RESTORE-APPLY-V5 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("=".repeat(80));

    let recoveryData: any;
    try { recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8")); }
    catch { console.error("❌ Cannot read tournament_recovery_v2.json!"); process.exit(1); }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));
    console.log(`   Fully resolved: ${fullyResolved.length} | Partially: ${partiallyResolved.length}`);

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);
    console.log("✅ Connected");

    const allTeams = await db.collection("teams").find({ tournament: tOid }).sort({ _id: 1 }).toArray();
    const regs = await db.collection("registrations").find({ tournament: tOid, status: "approved" }).toArray();
    const teamToCaptain = new Map<string, string>();
    for (const r of regs) { if (r.user && r.team) teamToCaptain.set(r.team.toString(), r.user.toString()); }

    const userScreenshots = new Map<string, { file: string; ts: number }[]>();
    try {
        for (const f of await fs.readdir(path.join(process.cwd(), "uploads", "screenshots"))) {
            const p = f.split("_"); if (p.length < 2) continue;
            const ts = parseInt(p[1].split(".")[0]); if (isNaN(ts)) continue;
            if (!userScreenshots.has(p[0])) userScreenshots.set(p[0], []);
            userScreenshots.get(p[0])!.push({ file: `/uploads/screenshots/${f}`, ts });
        }
    } catch {}

    // ══════════════════════════════════════════
    // BUILD WIN CHAINS
    // ══════════════════════════════════════════
    const teamWins = new Map<string, any[]>();
    for (const m of fullyResolved) {
        const wId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins.has(wId)) teamWins.set(wId, []);
        teamWins.get(wId)!.push({ oppId: lId, match: m, date: new Date(m.date) });
    }
    for (const [, w] of teamWins) w.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // ══════════════════════════════════════════
    // BUILD SLOT ARRAY (known opponents adjacent)
    // ══════════════════════════════════════════
    // This ensures:
    //   Slots [2k, 2k+1] are R1 opponents
    //   Slots [4k..4k+3] are R2 groups
    //   Slots [8k..8k+7] are R3 groups
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
            // Pad both to same power-of-2 size
            let sz = 1;
            while (sz < Math.max(slots.length, oppSlots.length)) sz *= 2;
            while (slots.length < sz) slots.push("__BYE__");
            while (oppSlots.length < sz) oppSlots.push("__BYE__");
            slots = [...slots, ...oppSlots];
        }
        return slots;
    }

    // Process teams with most wins first
    const byWins = Array.from(teamWins.entries()).sort((a, b) => b[1].length - a[1].length);
    const masterSlots: (string | null)[] = [];

    for (const [tid] of byWins) {
        if (!visited.has(tid)) {
            for (const s of buildSlots(tid)) masterSlots.push(s === "__BYE__" ? null : s);
        }
    }
    // Add remaining teams
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!visited.has(id)) { masterSlots.push(id); visited.add(id); }
    }

    // Pad to 1024
    let S = 1024; // Force 1024 for 566 teams
    while (masterSlots.length < S) masterSlots.push(null);
    if (masterSlots.length > S) masterSlots.length = S;

    const totalRounds = Math.log2(S); // 10

    // Result lookup
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }

    // Count R1 pairs with known results
    let r1Known = 0, r1Real = 0, r1Bye = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = masterSlots[i * 2], b = masterSlots[i * 2 + 1];
        if (a && b) { r1Real++; if (resultLookup.has(`${a}|${b}`)) r1Known++; }
        else if (a || b) r1Bye++;
    }

    console.log(`\n📊 BRACKET PLAN:`);
    console.log(`   Size: ${S} (${totalRounds} rounds)`);
    console.log(`   Teams: ${masterSlots.filter(s => s !== null).length}`);
    console.log(`   R1: ${r1Real} real + ${r1Bye} byes`);
    console.log(`   R1 with known results: ${r1Known}`);

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN. Run with --apply to execute.");
        await mongoose.disconnect(); return;
    }

    // ══════════════════════════════════════════
    // PHASE A: Cleanup
    // ══════════════════════════════════════════
    console.log("\n🚀 Phase A: Cleanup...");
    const del = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${del.deletedCount} matches`);
    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 }
    });

    // ══════════════════════════════════════════
    // PHASE B: Create bracket (same structure as API)
    // ══════════════════════════════════════════
    console.log("\n🚀 Phase B: Creating bracket...");
    const getRN = (r: number) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return `Vòng ${S / Math.pow(2, r - 1)}`;
    };

    const mMap = new Map<number, Map<number, any>>();

    // R2+ matches
    for (let r = 2; r <= totalRounds; r++) {
        mMap.set(r, new Map());
        const cnt = S / Math.pow(2, r);
        for (let i = 0; i < cnt; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r, roundName: getRN(r), matchNumber: i + 1,
                homeTeam: null, awayTeam: null, homeScore: null, awayScore: null,
                winner: null, status: "scheduled", bracketPosition: { x: r - 1, y: i },
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // R1 matches
    mMap.set(1, new Map());
    let cR = 0, cB = 0;
    for (let i = 0; i < S / 2; i++) {
        const aId = masterSlots[i * 2], bId = masterSlots[i * 2 + 1];
        const ni = Math.floor(i / 2), side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2 = mMap.get(2)!.get(ni);

        if (aId && bId) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: new mongoose.Types.ObjectId(aId), awayTeam: new mongoose.Types.ObjectId(bId),
                homeScore: null, awayScore: null, winner: null, status: "scheduled",
                bracketPosition: { x: 0, y: i }, nextMatch: r2._id,
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId }); cR++;
        } else if (aId || bId) {
            const byeOid = new mongoose.Types.ObjectId((aId || bId)!);
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: byeOid, awayTeam: null, homeScore: 0, awayScore: 0,
                winner: byeOid, status: "bye", bracketPosition: { x: 0, y: i },
                nextMatch: r2._id, leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId }); cB++;
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
    console.log(`   R1: ${cR} real + ${cB} byes`);

    // ══════════════════════════════════════════
    // PHASE C: Apply results round-by-round
    // ══════════════════════════════════════════
    console.log("\n🚀 Phase C: Applying results...");

    function getSS(tid: string, d: Date): string[] {
        const c = teamToCaptain.get(tid); if (!c) return [];
        return (userScreenshots.get(c) || []).filter(x => Math.abs(x.ts - d.getTime()) <= 600000).map(x => x.file);
    }
    function mkSubs(m: any): any[] {
        const d = new Date(m.date), subs: any[] = [];
        for (const t of [m.homeTeamId, m.awayTeamId]) {
            const c = teamToCaptain.get(t);
            if (c) subs.push({ user: new mongoose.Types.ObjectId(c), team: new mongoose.Types.ObjectId(t),
                homeScore: m.homeScore, awayScore: m.awayScore, screenshots: getSS(t, d), notes: "", submittedAt: d });
        }
        return subs;
    }

    let totalApplied = 0;
    for (let r = 1; r <= totalRounds; r++) {
        let ra = 0;
        const rm = mMap.get(r); if (!rm) continue;
        for (const [idx, mRef] of rm.entries()) {
            const doc = await db.collection("matches").findOne({ _id: mRef._id });
            if (!doc?.homeTeam || !doc?.awayTeam || doc.status === "bye") continue;
            const hId = doc.homeTeam.toString(), aId = doc.awayTeam.toString();
            const result = resultLookup.get(`${hId}|${aId}`);
            if (!result) continue;

            const flip = result.homeTeamId !== hId;
            const hS = flip ? result.awayScore : result.homeScore;
            const aS = flip ? result.homeScore : result.awayScore;
            const wId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
            const lId = result.homeScore > result.awayScore ? result.awayTeamId : result.homeTeamId;
            const wOid = new mongoose.Types.ObjectId(wId), lOid = new mongoose.Types.ObjectId(lId);

            await db.collection("matches").updateOne({ _id: mRef._id }, {
                $set: { homeScore: hS, awayScore: aS, winner: wOid, status: "completed",
                    completedAt: new Date(result.date), resultSubmissions: mkSubs(result) }
            });

            // Advance winner
            if (r < totalRounds) {
                const ns = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                const nm = mMap.get(r + 1)!.get(Math.floor(idx / 2));
                await db.collection("matches").updateOne({ _id: nm._id }, { $set: { [ns]: wOid } });
            }

            // Stats
            const wGF = wId === result.homeTeamId ? result.homeScore : result.awayScore;
            const wGA = wId === result.homeTeamId ? result.awayScore : result.homeScore;
            await db.collection("teams").updateOne({ _id: wOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": wGF, "stats.goalsAgainst": wGA, "stats.points": 3 } });
            await db.collection("teams").updateOne({ _id: lOid },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": wGA, "stats.goalsAgainst": wGF } });
            ra++; totalApplied++;
        }
        if (ra > 0) console.log(`   Round ${r}: ${ra} applied`);
    }
    console.log(`   TOTAL: ${totalApplied}/${fullyResolved.length} applied`);

    // ══════════════════════════════════════════
    // PHASE D: Pending submissions
    // ══════════════════════════════════════════
    console.log("\n🚀 Phase D: Pending submissions...");
    let pc = 0;
    for (const m of partiallyResolved) {
        const kid = m.homeTeamId || m.awayTeamId; if (!kid) continue;
        const cap = teamToCaptain.get(kid); if (!cap) continue;
        const md = await db.collection("matches").findOne({
            tournament: tOid, status: "scheduled",
            $or: [{ homeTeam: new mongoose.Types.ObjectId(kid) }, { awayTeam: new mongoose.Types.ObjectId(kid) }]
        });
        if (!md) continue;
        await db.collection("matches").updateOne({ _id: md._id }, {
            $push: { resultSubmissions: { user: new mongoose.Types.ObjectId(cap), team: new mongoose.Types.ObjectId(kid),
                homeScore: m.homeScore, awayScore: m.awayScore, screenshots: getSS(kid, new Date(m.date)),
                notes: "", submittedAt: new Date(m.date) } } as any
        });
        pc++;
    }
    console.log(`   Pending: ${pc}`);

    // Summary
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fsc = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const fb = await db.collection("matches").countDocuments({ tournament: tOid, status: "bye" });
    const fws = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ V5 COMPLETE!");
    console.log("=".repeat(80));
    console.log(`   ✅ Completed  : ${fc}`);
    console.log(`   📋 Scheduled  : ${fsc}`);
    console.log(`   ⏭️  Byes       : ${fb}`);
    console.log(`   📨 With subs  : ${fws}`);
    console.log(`   ❌ Eliminated : ${fe}`);
    console.log(`   ✅ Active     : ${allTeams.length - fe}`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("✅ Done.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
