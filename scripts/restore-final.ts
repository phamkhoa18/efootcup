/**
 * RESTORE-FINAL: Create Phase 2 bracket for surviving teams
 * 
 * The ONLY accurate approach when bracket data is lost:
 * 1. Determine which teams are STILL ACTIVE (from recovery data + original stats)
 * 2. Create a fresh bracket for ONLY those teams
 * 3. Seeds that are still alive get proper seeding
 * 4. Tournament continues cleanly
 * 
 * npx tsx scripts/restore-final.ts           # dry run (see plan)
 * npx tsx scripts/restore-final.ts --apply   # execute
 */
import mongoose from "mongoose";
import * as fs from "fs/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");
const SEED_EFV_IDS = [33, 23, 380, 17, 20, 423, 448, 661];

async function main() {
    console.log("=".repeat(70));
    console.log(`RESTORE-FINAL - ${IS_DRY_RUN ? "DRY RUN" : "APPLYING"}`);
    console.log("  Strategy: Phase 2 bracket for surviving teams only");
    console.log("=".repeat(70));

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // ═══ STEP 1: Determine active teams ═══
    console.log("\n📋 Step 1: Identifying active teams...");

    // Load recovery data
    let recoveryData: any;
    try {
        recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8"));
    } catch {
        console.error("❌ Cannot read tournament_recovery_v2.json!");
        process.exit(1);
    }

    const eliminatedIds = new Set<string>(recoveryData.eliminatedTeamIds || []);
    const activeIds = new Set<string>(recoveryData.activeTeamIds || []);

    // Also extract eliminations from ALL matches (fully + partially resolved)
    const allMatches = recoveryData.matches || [];
    for (const m of allMatches) {
        if (m.homeTeamId && m.awayTeamId && m.homeScore !== undefined && m.awayScore !== undefined) {
            const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
            eliminatedIds.add(loserId);
        }
        // For partially resolved: if known team LOST
        if (m.homeTeamId && !m.awayTeamId && m.homeScore < m.awayScore) {
            eliminatedIds.add(m.homeTeamId);
        }
        if (!m.homeTeamId && m.awayTeamId && m.awayScore < m.homeScore) {
            eliminatedIds.add(m.awayTeamId);
        }
    }

    // Remove eliminated from active set
    for (const eid of eliminatedIds) activeIds.delete(eid);

    // Load all teams
    const allTeams = await db.collection("teams").find({ tournament: tOid }).toArray();

    // For teams not in either set: check if they have stats > 0
    // (Teams with stats > 0 were active before regeneration reset)
    // First check current DB stats (might have been modified by previous scripts)
    // Also include any team NOT in eliminated set as potentially active if stats > 0
    const teamsWithStats = allTeams.filter(t => {
        const id = t._id.toString();
        if (eliminatedIds.has(id)) return false;
        if (activeIds.has(id)) return true;
        // Unknown: check stats (if still has original stats from before any script)
        return (t.stats?.wins > 0 || t.stats?.played > 0);
    });

    // Final active teams = confirmed active + teams with stats
    const finalActiveIds = new Set<string>();
    for (const id of activeIds) finalActiveIds.add(id);
    for (const t of teamsWithStats) finalActiveIds.add(t._id.toString());

    console.log(`   All teams: ${allTeams.length}`);
    console.log(`   Confirmed eliminated: ${eliminatedIds.size}`);
    console.log(`   Confirmed active (recovery): ${activeIds.size}`);
    console.log(`   Final active for bracket: ${finalActiveIds.size}`);

    // ═══ STEP 2: Resolve seeds that are still active ═══
    console.log("\n📋 Step 2: Resolving active seeds...");
    const activeSeedIds: string[] = [];

    for (const efvId of SEED_EFV_IDS) {
        const user = await db.collection("users").findOne({ efvId });
        if (!user) { console.log(`   ⚠️ EFV#${efvId}: not found`); continue; }
        const reg = await db.collection("registrations").findOne({
            tournament: tOid, user: user._id, status: "approved"
        });
        if (!reg?.team) continue;

        const teamId = reg.team.toString();
        const team = await db.collection("teams").findOne({ _id: reg.team });
        const isActive = finalActiveIds.has(teamId);

        if (isActive) {
            activeSeedIds.push(teamId);
            console.log(`   ✅ Seed ${activeSeedIds.length}: EFV#${efvId} → ${team?.name} (ACTIVE)`);
        } else {
            console.log(`   ❌ Seed: EFV#${efvId} → ${team?.name} (ELIMINATED)`);
        }
    }

    // ═══ STEP 3: Build bracket plan ═══
    const N = finalActiveIds.size;
    let S = 2; while (S < N) S *= 2;
    const totalRounds = Math.log2(S);
    const byes = S - N;

    console.log(`\n📊 BRACKET PLAN:`);
    console.log(`   Active teams: ${N}`);
    console.log(`   Bracket size: ${S} (${totalRounds} rounds)`);
    console.log(`   Byes: ${byes}`);
    console.log(`   Real R1 matches: ${N - byes}`);
    console.log(`   Active seeds: ${activeSeedIds.length}/${SEED_EFV_IDS.length}`);

    if (IS_DRY_RUN) {
        // Show team list
        const activeTeamDocs = allTeams.filter(t => finalActiveIds.has(t._id.toString()));
        const winsMap = new Map<number, number>();
        for (const t of activeTeamDocs) {
            const w = t.stats?.wins || 0;
            winsMap.set(w, (winsMap.get(w) || 0) + 1);
        }
        console.log(`\n   Win distribution (remaining teams):`);
        for (const [w, c] of Array.from(winsMap.entries()).sort((a, b) => b[0] - a[0])) {
            console.log(`     ${w} wins: ${c} teams`);
        }

        console.log(`\n⚠️ DRY RUN. Run with --apply to create bracket.`);
        await mongoose.disconnect();
        return;
    }

    // ═══ STEP 4: Cleanup ═══
    console.log("\n🚀 Step 4: Cleanup...");
    const del = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${del.deletedCount} matches`);

    // Mark eliminated teams
    for (const t of allTeams) {
        const id = t._id.toString();
        if (finalActiveIds.has(id)) {
            await db.collection("teams").updateOne({ _id: t._id }, {
                $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0,
                    "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 }
            });
        } else {
            await db.collection("teams").updateOne({ _id: t._id }, {
                $set: { status: "eliminated" }
            });
        }
    }
    console.log(`   ${finalActiveIds.size} active, ${allTeams.length - finalActiveIds.size} eliminated`);

    // ═══ STEP 5: Generate bracket (EXACT API replication) ═══
    console.log("\n🚀 Step 5: Generating bracket...");

    // Build orderedTeams: active seeds first, then rest
    const activeTeamMap = new Map<string, any>();
    for (const t of allTeams) {
        if (finalActiveIds.has(t._id.toString())) {
            activeTeamMap.set(t._id.toString(), t);
        }
    }

    const orderedIds: string[] = [];
    // Seeds first
    for (const sid of activeSeedIds) {
        if (activeTeamMap.has(sid)) {
            orderedIds.push(sid);
            activeTeamMap.delete(sid);
        }
    }
    // Remaining: shuffle randomly (like original API)
    const remaining = Array.from(activeTeamMap.keys());
    for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    orderedIds.push(...remaining);

    // getSeedOrder (exact copy from API)
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const ns = order.length * 2;
            order = order.flatMap(s => [s, ns + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Place teams in slots (exact copy from API)
    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const si = seedOrder.indexOf(i + 1);
        teamSlots[si] = orderedIds[i];
    }

    // Generate bracket (exact copy from API)
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

    // ═══ SUMMARY ═══
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: { $ne: "bye" } });
    const fe = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(70));
    console.log("  ✅ RESTORE-FINAL COMPLETE!");
    console.log("=".repeat(70));
    console.log(`   Active teams in bracket: ${N}`);
    console.log(`   Eliminated teams: ${fe}`);
    console.log(`   Active seeds: ${activeSeedIds.length}`);
    console.log(`   Bracket: ${S} size, ${totalRounds} rounds`);
    console.log(`   Matches: ${fc} (waiting for results)`);
    console.log(`\n   📌 NEXT STEPS FOR MANAGER:`);
    console.log(`   1. Open bracket page → verify teams look correct`);
    console.log(`   2. Announce to players: "Giải đấu tiếp tục từ vòng mới"`);
    console.log(`   3. Players submit results normally`);
    console.log(`   4. Previous results still visible in notifications`);
    console.log("=".repeat(70));

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
