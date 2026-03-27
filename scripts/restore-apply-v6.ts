/**
 * RESTORE-APPLY-V6: Fixed bracket with proper bye distribution
 * 
 * Key fix: Each team gets R1 BYE, known opponents meet in R2+
 * Post-process fills null-null gaps with remaining teams
 * 
 * npx tsx scripts/restore-apply-v6.ts           # dry run
 * npx tsx scripts/restore-apply-v6.ts --apply
 */
import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log("=".repeat(70));
    console.log(`RESTORE-V6 - ${IS_DRY_RUN ? "DRY RUN" : "APPLYING"}`);
    console.log("=".repeat(70));

    const recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8"));
    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));
    console.log(`Resolved: ${fullyResolved.length} full + ${partiallyResolved.length} partial`);

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);
    const allTeams = await db.collection("teams").find({ tournament: tOid }).sort({ _id: 1 }).toArray();
    const regs = await db.collection("registrations").find({ tournament: tOid, status: "approved" }).toArray();
    const teamToCap = new Map<string, string>();
    for (const r of regs) { if (r.user && r.team) teamToCap.set(r.team.toString(), r.user.toString()); }
    const userSS = new Map<string, { file: string; ts: number }[]>();
    try {
        for (const f of await fs.readdir(path.join(process.cwd(), "uploads", "screenshots"))) {
            const p = f.split("_"); if (p.length < 2) continue;
            const ts = parseInt(p[1].split(".")[0]); if (isNaN(ts)) continue;
            if (!userSS.has(p[0])) userSS.set(p[0], []);
            userSS.get(p[0])!.push({ file: `/uploads/screenshots/${f}`, ts });
        }
    } catch {}

    // Build win chains
    const teamWins = new Map<string, any[]>();
    for (const m of fullyResolved) {
        const wId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins.has(wId)) teamWins.set(wId, []);
        teamWins.get(wId)!.push({ oppId: lId, match: m, date: new Date(m.date) });
    }
    for (const [, w] of teamWins) w.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // ═══ BUILD SLOTS: each team gets R1 bye, opponents meet in R2+ ═══
    const visited = new Set<string>();

    function buildSlots(teamId: string): (string | null)[] {
        if (visited.has(teamId)) return [teamId, null]; // bye pair
        visited.add(teamId);
        const wins = teamWins.get(teamId) || [];
        if (wins.length === 0) return [teamId, null]; // bye pair

        let slots: (string | null)[] = [teamId, null];
        for (const win of wins) {
            if (visited.has(win.oppId)) continue;
            const opp = buildSlots(win.oppId);
            let sz = 1;
            while (sz < Math.max(slots.length, opp.length)) sz *= 2;
            while (slots.length < sz) slots.push(null);
            while (opp.length < sz) opp.push(null);
            slots = [...slots, ...opp];
        }
        return slots;
    }

    const byWins = Array.from(teamWins.entries()).sort((a, b) => b[1].length - a[1].length);
    const masterSlots: (string | null)[] = [];
    for (const [tid] of byWins) {
        if (!visited.has(tid)) masterSlots.push(...buildSlots(tid));
    }

    // Remaining teams (not in any recovered match)
    const remaining: string[] = [];
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!visited.has(id)) { remaining.push(id); visited.add(id); }
    }

    const S = 1024;
    // Pad to 1024
    while (masterSlots.length < S) masterSlots.push(null);
    if (masterSlots.length > S) masterSlots.length = S;

    // POST-PROCESS: Fill null-null pairs with remaining teams
    let filled = 0;
    for (let i = 0; i < S / 2 && remaining.length > 0; i++) {
        if (masterSlots[i * 2] === null && masterSlots[i * 2 + 1] === null) {
            masterSlots[i * 2] = remaining.shift()!;
            filled++;
        }
    }
    // If still remaining, replace nulls in bye pairs (making real R1 matches)
    for (let i = 0; i < S / 2 && remaining.length > 0; i++) {
        if (masterSlots[i * 2] !== null && masterSlots[i * 2 + 1] === null) {
            // Check if this team has known results - don't break those
            const tid = masterSlots[i * 2]!;
            const hasResult = fullyResolved.some((m: any) =>
                (m.homeTeamId === tid || m.awayTeamId === tid));
            if (!hasResult) {
                masterSlots[i * 2 + 1] = remaining.shift()!;
                filled++;
            }
        }
    }
    // Last resort: fill any remaining null slots
    for (let i = 0; i < S && remaining.length > 0; i++) {
        if (masterSlots[i] === null) { masterSlots[i] = remaining.shift()!; filled++; }
    }
    console.log(`Post-process: filled ${filled} slots with ${remaining.length} teams left`);

    const totalRounds = Math.log2(S);
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }

    let r1R = 0, r1B = 0, r1E = 0, r1K = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = masterSlots[i * 2], b = masterSlots[i * 2 + 1];
        if (a && b) { r1R++; if (resultLookup.has(`${a}|${b}`)) r1K++; }
        else if (a || b) r1B++;
        else r1E++;
    }
    console.log(`\nBracket: ${S} slots, ${totalRounds} rounds`);
    console.log(`R1: ${r1R} real + ${r1B} byes + ${r1E} empty`);
    console.log(`R1 known: ${r1K} | Total known: ${fullyResolved.length}`);
    console.log(`Teams placed: ${masterSlots.filter(s => s !== null).length}/566`);

    if (IS_DRY_RUN) { console.log("\nDRY RUN done. Use --apply"); await mongoose.disconnect(); return; }

    // ═══ CLEANUP ═══
    await db.collection("matches").deleteMany({ tournament: tOid });
    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 }
    });

    // ═══ CREATE BRACKET ═══
    const getRN = (r: number) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return `Vòng ${S / Math.pow(2, r - 1)}`;
    };
    const mMap = new Map<number, Map<number, any>>();
    for (let r = 2; r <= totalRounds; r++) {
        mMap.set(r, new Map());
        for (let i = 0; i < S / Math.pow(2, r); i++) {
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
    mMap.set(1, new Map());
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
            mMap.get(1)!.set(i, { _id: res.insertedId });
        } else if (aId || bId) {
            const byeOid = new mongoose.Types.ObjectId((aId || bId)!);
            await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: byeOid, awayTeam: null, homeScore: 0, awayScore: 0,
                winner: byeOid, status: "bye", bracketPosition: { x: 0, y: i },
                nextMatch: r2._id, leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: byeOid } });
        }
    }
    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            if (r < totalRounds) {
                const nm = mMap.get(r + 1)!.get(Math.floor(idx / 2));
                await db.collection("matches").updateOne({ _id: m._id }, { $set: { nextMatch: nm._id } });
            }
        }
    }

    // ═══ APPLY RESULTS ═══
    function getSS(tid: string, d: Date): string[] {
        const c = teamToCap.get(tid); if (!c) return [];
        return (userSS.get(c) || []).filter(x => Math.abs(x.ts - d.getTime()) <= 600000).map(x => x.file);
    }
    function mkSubs(m: any): any[] {
        const d = new Date(m.date), subs: any[] = [];
        for (const t of [m.homeTeamId, m.awayTeamId]) {
            const c = teamToCap.get(t);
            if (c) subs.push({ user: new mongoose.Types.ObjectId(c), team: new mongoose.Types.ObjectId(t),
                homeScore: m.homeScore, awayScore: m.awayScore, screenshots: getSS(t, d), notes: "", submittedAt: d });
        }
        return subs;
    }

    let totalApplied = 0;
    for (let r = 1; r <= totalRounds; r++) {
        const rm = mMap.get(r); if (!rm) continue;
        let ra = 0;
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
            if (r < totalRounds) {
                const ns = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                await db.collection("matches").updateOne(
                    { _id: mMap.get(r + 1)!.get(Math.floor(idx / 2))._id },
                    { $set: { [ns]: wOid } }
                );
            }
            const wGF = wId === result.homeTeamId ? result.homeScore : result.awayScore;
            const wGA = wId === result.homeTeamId ? result.awayScore : result.homeScore;
            await db.collection("teams").updateOne({ _id: wOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": wGF, "stats.goalsAgainst": wGA, "stats.points": 3 } });
            await db.collection("teams").updateOne({ _id: lOid },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": wGA, "stats.goalsAgainst": wGF } });
            ra++; totalApplied++;
        }
        if (ra > 0) console.log(`  R${r}: ${ra} applied`);
    }
    console.log(`TOTAL: ${totalApplied}/${fullyResolved.length}`);

    // Pending submissions
    let pc = 0;
    for (const m of partiallyResolved) {
        const kid = m.homeTeamId || m.awayTeamId; if (!kid) continue;
        const cap = teamToCap.get(kid); if (!cap) continue;
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

    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fsc = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const fb = await db.collection("matches").countDocuments({ tournament: tOid, status: "bye" });
    const fws = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(70));
    console.log(`✅ Completed: ${fc} | Scheduled: ${fsc} | Byes: ${fb}`);
    console.log(`📨 With subs: ${fws} | Pending: ${pc}`);
    console.log(`❌ Eliminated: ${fe} | Active: ${allTeams.length - fe}`);
    console.log("=".repeat(70));

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
