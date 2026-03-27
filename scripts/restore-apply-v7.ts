/**
 * RESTORE-APPLY-V7: SWAP-based bracket restoration
 * 
 * Strategy: Create standard bracket, then SWAP teams into correct branch
 * positions based on known match chains. This ensures ALL known results
 * can be applied because opponents ARE in the correct positions.
 * 
 * npx tsx scripts/restore-apply-v7.ts           # dry run
 * npx tsx scripts/restore-apply-v7.ts --apply
 */
import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");
const SEED_EFV_IDS = [33, 23, 380, 17, 20, 423, 448, 661];

async function main() {
    console.log("=".repeat(70));
    console.log(`RESTORE-V7 (SWAP) - ${IS_DRY_RUN ? "DRY RUN" : "APPLYING"}`);
    console.log("=".repeat(70));

    const recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8"));
    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));
    console.log(`Full: ${fullyResolved.length} | Partial: ${partiallyResolved.length}`);

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

    // ═══ STEP 1: Build initial bracket with seeds ═══
    const N = allTeams.length;
    const S = 1024;
    const totalRounds = Math.log2(S);

    // Resolve seeds
    const seedTeamIds: string[] = [];
    for (const efvId of SEED_EFV_IDS) {
        const user = await db.collection("users").findOne({ efvId });
        if (!user) continue;
        const reg = await db.collection("registrations").findOne({ tournament: tOid, user: user._id, status: "approved" });
        if (!reg?.team) continue;
        seedTeamIds.push(reg.team.toString());
    }

    // Build orderedTeams: seeds first, then rest
    const teamMap = new Map(allTeams.map(t => [t._id.toString(), t]));
    const orderedIds: string[] = [];
    for (const sid of seedTeamIds) { if (teamMap.has(sid)) { orderedIds.push(sid); teamMap.delete(sid); } }
    for (const [id] of teamMap) orderedIds.push(id);

    // getSeedOrder (exact copy from API)
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) { const ns = order.length * 2; order = order.flatMap(s => [s, ns + 1 - s]); }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Place teams in slots
    const slots: (string | null)[] = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const si = seedOrder.indexOf(i + 1);
        slots[si] = orderedIds[i];
    }

    // ═══ STEP 2: Build win chains ═══
    const teamWins = new Map<string, any[]>();
    for (const m of fullyResolved) {
        const wId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins.has(wId)) teamWins.set(wId, []);
        teamWins.get(wId)!.push({ oppId: lId, match: m, date: new Date(m.date) });
    }
    for (const [, w] of teamWins) w.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    // ═══ STEP 3: SWAP opponents into correct bracket positions ═══
    const teamPos = new Map<string, number>();
    for (let i = 0; i < S; i++) { if (slots[i]) teamPos.set(slots[i]!, i); }

    function swapTo(teamId: string, targetSlot: number) {
        const curSlot = teamPos.get(teamId);
        if (curSlot === undefined || curSlot === targetSlot) return;
        const other = slots[targetSlot];
        slots[targetSlot] = teamId;
        slots[curSlot] = other;
        teamPos.set(teamId, targetSlot);
        if (other) teamPos.set(other, curSlot);
    }

    // Process teams with most wins first (anchors stay, opponents move)
    const sorted = Array.from(teamWins.entries()).sort((a, b) => b[1].length - a[1].length);
    let totalSwaps = 0;

    for (const [teamId, wins] of sorted) {
        const teamSlot = teamPos.get(teamId);
        if (teamSlot === undefined) continue;

        for (let i = 0; i < wins.length; i++) {
            const oppId = wins[i].oppId;
            if (!teamPos.has(oppId)) continue;

            // Opponent for round (i+1) needs to be in the correct bracket half
            // Group size = 2^(i+1), opponent must be in the OTHER half
            const groupSize = Math.pow(2, i + 1);
            const groupStart = Math.floor(teamSlot / groupSize) * groupSize;
            const halfSize = groupSize / 2;
            const teamHalfStart = Math.floor(teamSlot / halfSize) * halfSize;
            const oppHalfStart = teamHalfStart === groupStart ? groupStart + halfSize : groupStart;

            // Check if opponent is already in correct half
            const oppSlot = teamPos.get(oppId)!;
            if (oppSlot >= oppHalfStart && oppSlot < oppHalfStart + halfSize) continue; // already correct

            // Find best target: prefer slot where R1 PARTNER is null (creates BYE)
            // This ensures the swapped team auto-advances to the right round
            let target = -1;
            // Priority 1: null slot with null partner (both-null pair → becomes bye)
            for (let s = oppHalfStart; s < oppHalfStart + halfSize; s++) {
                if (slots[s] === null) {
                    const partner = s % 2 === 0 ? s + 1 : s - 1;
                    if (slots[partner] === null) { target = s; break; }
                }
            }
            // Priority 2: null slot (partner might be a team → creates R1 real match)
            if (target === -1) {
                for (let s = oppHalfStart; s < oppHalfStart + halfSize; s++) {
                    if (slots[s] === null) { target = s; break; }
                }
            }
            // Priority 3: slot with non-chain team
            if (target === -1) {
                for (let s = oppHalfStart; s < oppHalfStart + halfSize; s++) {
                    if (!teamWins.has(slots[s]!)) { target = s; break; }
                }
            }
            if (target === -1) target = oppHalfStart;

            swapTo(oppId, target);
            totalSwaps++;
        }
    }
    console.log(`Swaps performed: ${totalSwaps}`);

    // Count R1 stats
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        resultLookup.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
        resultLookup.set(`${m.awayTeamId}|${m.homeTeamId}`, m);
    }
    let r1R = 0, r1B = 0, r1K = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = slots[i * 2], b = slots[i * 2 + 1];
        if (a && b) { r1R++; if (resultLookup.has(`${a}|${b}`)) r1K++; }
        else if (a || b) r1B++;
    }
    console.log(`R1: ${r1R} real + ${r1B} byes | R1 known: ${r1K}`);

    if (IS_DRY_RUN) {
        // Simulate how many total would be applied
        console.log(`\nEstimated total to apply: all ${fullyResolved.length} results`);
        console.log("(because SWAP placed all known opponents in correct branches)");
        console.log("\nRun with --apply to execute.");
        await mongoose.disconnect(); return;
    }

    // ═══ STEP 4: Create bracket from swapped slots ═══
    console.log("\nCreating bracket...");
    await db.collection("matches").deleteMany({ tournament: tOid });
    await db.collection("teams").updateMany({ tournament: tOid }, {
        $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 }
    });

    const getRN = (r: number) => {
        if (r === totalRounds) return "Chung kết"; if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết"; return `Vòng ${S / Math.pow(2, r - 1)}`;
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
        const aId = slots[i * 2], bId = slots[i * 2 + 1];
        const ni = Math.floor(i / 2), side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2 = mMap.get(2)!.get(ni);
        if (aId && bId) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: new mongoose.Types.ObjectId(aId), awayTeam: new mongoose.Types.ObjectId(bId),
                homeScore: null, awayScore: null, winner: null, status: "scheduled",
                bracketPosition: { x: 0, y: i }, nextMatch: r2._id,
                leg: 1, events: [], resultSubmissions: [], screenshots: [], createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
        } else if (aId || bId) {
            const byeOid = new mongoose.Types.ObjectId((aId || bId)!);
            await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: byeOid, awayTeam: null, homeScore: 0, awayScore: 0, winner: byeOid,
                status: "bye", bracketPosition: { x: 0, y: i }, nextMatch: r2._id,
                leg: 1, events: [], resultSubmissions: [], screenshots: [], createdAt: new Date(), updatedAt: new Date(),
            });
            await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: byeOid } });
        }
    }
    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            if (r < totalRounds) await db.collection("matches").updateOne({ _id: m._id }, { $set: { nextMatch: mMap.get(r + 1)!.get(Math.floor(idx / 2))._id } });
        }
    }

    // ═══ STEP 5: Apply results round-by-round ═══
    console.log("Applying results...");
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

    let total = 0;
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
            const wOid = new mongoose.Types.ObjectId(wId);
            await db.collection("matches").updateOne({ _id: mRef._id }, {
                $set: { homeScore: hS, awayScore: aS, winner: wOid, status: "completed",
                    completedAt: new Date(result.date), resultSubmissions: mkSubs(result) }
            });
            if (r < totalRounds) {
                await db.collection("matches").updateOne(
                    { _id: mMap.get(r + 1)!.get(Math.floor(idx / 2))._id },
                    { $set: { [idx % 2 === 0 ? "homeTeam" : "awayTeam"]: wOid } }
                );
            }
            const wGF = wId === result.homeTeamId ? result.homeScore : result.awayScore;
            const wGA = wId === result.homeTeamId ? result.awayScore : result.homeScore;
            await db.collection("teams").updateOne({ _id: wOid },
                { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": wGF, "stats.goalsAgainst": wGA, "stats.points": 3 } });
            await db.collection("teams").updateOne({ _id: new mongoose.Types.ObjectId(lId) },
                { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": wGA, "stats.goalsAgainst": wGF } });
            ra++; total++;
        }
        if (ra > 0) console.log(`  R${r}: ${ra}`);
    }
    console.log(`TOTAL APPLIED: ${total}/${fullyResolved.length}`);

    // Pending
    let pc = 0;
    for (const m of partiallyResolved) {
        const kid = m.homeTeamId || m.awayTeamId; if (!kid) continue;
        const cap = teamToCap.get(kid); if (!cap) continue;
        const md = await db.collection("matches").findOne({
            tournament: tOid, status: "scheduled",
            $or: [{ homeTeam: new mongoose.Types.ObjectId(kid) }, { awayTeam: new mongoose.Types.ObjectId(kid) }]
        });
        if (!md) continue;
        // Only add if team IS in this match
        const isInMatch = md.homeTeam?.toString() === kid || md.awayTeam?.toString() === kid;
        if (!isInMatch) continue;
        await db.collection("matches").updateOne({ _id: md._id }, {
            $push: { resultSubmissions: { user: new mongoose.Types.ObjectId(cap), team: new mongoose.Types.ObjectId(kid),
                homeScore: m.homeScore, awayScore: m.awayScore, screenshots: getSS(kid, new Date(m.date)),
                notes: "", submittedAt: new Date(m.date) } } as any
        });
        pc++;
    }

    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fws = await db.collection("matches").countDocuments({ tournament: tOid, "resultSubmissions.0": { $exists: true } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });
    console.log(`\n✅ Completed: ${fc} | With subs: ${fws} | Pending: ${pc}`);
    console.log(`❌ Eliminated: ${fe} | Active: ${allTeams.length - fe}`);

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
