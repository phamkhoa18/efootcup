/**
 * 🔧 RESTORE TOURNAMENT - APPLY v2
 * 
 * Creates bracket with COMPLETED match results from recovery data.
 * 
 * Run on server:
 *   npx tsx scripts/restore-apply-v2.ts           # dry run
 *   npx tsx scripts/restore-apply-v2.ts --apply    # execute
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log("=".repeat(80));
    console.log(`🔧 RESTORE-APPLY-V2 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("=".repeat(80));

    // 1. Load recovery data
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch {
        console.error("❌ Cannot read tournament_recovery_v2.json!");
        process.exit(1);
    }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    console.log(`📋 Fully resolved matches: ${fullyResolved.length}`);

    // 2. Connect
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    const db = mongoose.connection.db!;

    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // 3. Load all teams
    const allTeams = await db.collection("teams").find({ tournament: tOid }).toArray();
    console.log(`   Teams: ${allTeams.length}`);

    // ═══════════════════════════════════════════════════
    // BUILD WIN CHAINS
    // ═══════════════════════════════════════════════════
    // teamId → [{oppId, hScore, aScore, date, originalHomeId, originalAwayId}]
    const teamWins = new Map<string, any[]>();

    for (const m of fullyResolved) {
        const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;

        if (!teamWins.has(winnerId)) teamWins.set(winnerId, []);
        teamWins.get(winnerId)!.push({
            oppId: loserId,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            hScore: m.homeScore,
            aScore: m.awayScore,
            date: new Date(m.date),
        });
    }

    // Sort by date (earliest = first round)
    for (const [, wins] of teamWins) {
        wins.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    }

    // ═══════════════════════════════════════════════════
    // BUILD SEED LIST (known opponents adjacent)
    // ═══════════════════════════════════════════════════
    const placed = new Set<string>();

    // Recursive: build leaf array for a team's bracket subtree
    function buildLeaves(teamId: string): string[] {
        if (placed.has(teamId)) return [teamId];
        placed.add(teamId);

        const wins = teamWins.get(teamId) || [];
        if (wins.length === 0) return [teamId];

        // Start with just this team
        let leaves = [teamId];

        for (const win of wins) {
            if (placed.has(win.oppId)) continue;

            const oppLeaves = buildLeaves(win.oppId);

            // Pad both to same power-of-2 size
            const maxLen = Math.max(leaves.length, oppLeaves.length);
            let pad = 1;
            while (pad < maxLen) pad *= 2;
            while (leaves.length < pad) leaves.push("__BYE__");
            while (oppLeaves.length < pad) oppLeaves.push("__BYE__");

            // Combine: this team's side + opponent's side
            leaves = [...leaves, ...oppLeaves];
        }

        return leaves;
    }

    // Process teams with most wins first
    const sortedTeams = Array.from(teamWins.entries())
        .sort((a, b) => b[1].length - a[1].length);

    const allLeaves: string[] = [];
    for (const [teamId] of sortedTeams) {
        if (!placed.has(teamId)) {
            allLeaves.push(...buildLeaves(teamId));
        }
    }

    // Add teams that lost (only appeared as opponents, no wins)
    const allInvolved = new Set<string>();
    for (const m of fullyResolved) {
        if (m.homeTeamId) allInvolved.add(m.homeTeamId);
        if (m.awayTeamId) allInvolved.add(m.awayTeamId);
    }
    for (const id of allInvolved) {
        if (!placed.has(id)) {
            allLeaves.push(id);
            placed.add(id);
        }
    }

    // Add remaining teams
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!placed.has(id)) {
            allLeaves.push(id);
            placed.add(id);
        }
    }

    // Pad to power of 2
    let S = 2;
    while (S < allLeaves.length) S *= 2;
    while (allLeaves.length < S) allLeaves.push("__BYE__");

    const totalRounds = Math.log2(S);

    // Build lookup: which pairs of teams have known results
    const resultLookup = new Map<string, any>();
    for (const m of fullyResolved) {
        const key1 = `${m.homeTeamId}|${m.awayTeamId}`;
        const key2 = `${m.awayTeamId}|${m.homeTeamId}`;
        resultLookup.set(key1, m);
        resultLookup.set(key2, m);
    }

    // Count how many R1 pairs match a known result
    let r1Matches = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = allLeaves[i * 2];
        const b = allLeaves[i * 2 + 1];
        if (a !== "__BYE__" && b !== "__BYE__") {
            const key = `${a}|${b}`;
            if (resultLookup.has(key)) r1Matches++;
        }
    }

    const realTeams = allLeaves.filter(l => l !== "__BYE__").length;

    console.log(`\n📊 BRACKET PLAN:`);
    console.log(`   Bracket size: ${S} (${totalRounds} rounds)`);
    console.log(`   Real teams: ${realTeams}`);
    console.log(`   Byes: ${S - realTeams}`);
    console.log(`   R1 pairs with known results: ${r1Matches}`);
    console.log(`   Total known results: ${fullyResolved.length}`);

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN complete. Run with --apply to execute.");
        await mongoose.disconnect();
        return;
    }

    // ═══════════════════════════════════════════════════
    // EXECUTE: Delete old, create new bracket
    // ═══════════════════════════════════════════════════
    console.log("\n🚀 Step 1: Cleanup...");

    // Delete ALL matches
    const del = await db.collection("matches").deleteMany({ tournament: tOid });
    console.log(`   Deleted ${del.deletedCount} matches`);

    // Reset ALL teams
    await db.collection("teams").updateMany(
        { tournament: tOid },
        {
            $set: {
                status: "active",
                "stats.played": 0, "stats.wins": 0, "stats.draws": 0,
                "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0,
            }
        }
    );
    console.log(`   Reset all ${allTeams.length} teams to active`);

    // ═══════════════════════════════════════════════════
    // CREATE BRACKET
    // ═══════════════════════════════════════════════════
    console.log("\n🚀 Step 2: Creating bracket...");

    const getRoundName = (r: number) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return `Vòng ${S / Math.pow(2, r - 1)}`;
    };

    // Pre-create R2+ matches
    const mMap = new Map<number, Map<number, any>>();
    for (let r = 2; r <= totalRounds; r++) {
        mMap.set(r, new Map());
        const cnt = S / Math.pow(2, r);
        for (let i = 0; i < cnt; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r, roundName: getRoundName(r),
                matchNumber: i + 1, homeTeam: null, awayTeam: null,
                homeScore: null, awayScore: null, winner: null,
                status: "scheduled", bracketPosition: { x: r - 1, y: i },
                leg: 1, events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // Create R1 matches
    mMap.set(1, new Map());
    let createdReal = 0, createdBye = 0, completedR1 = 0;

    for (let i = 0; i < S / 2; i++) {
        const leafA = allLeaves[i * 2];
        const leafB = allLeaves[i * 2 + 1];
        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2 = mMap.get(2)!.get(nextIdx);

        const aId = leafA !== "__BYE__" ? new mongoose.Types.ObjectId(leafA) : null;
        const bId = leafB !== "__BYE__" ? new mongoose.Types.ObjectId(leafB) : null;

        if (aId && bId) {
            // Real match - check for known result
            const key = `${leafA}|${leafB}`;
            const result = resultLookup.get(key);

            let homeTeam = aId, awayTeam = bId;
            let hScore: number | null = null, aScore: number | null = null;
            let winner: mongoose.Types.ObjectId | null = null;
            let status = "scheduled";

            if (result) {
                // Apply the known result!
                homeTeam = new mongoose.Types.ObjectId(result.homeTeamId);
                awayTeam = new mongoose.Types.ObjectId(result.awayTeamId);
                hScore = result.homeScore;
                aScore = result.awayScore;
                const winnerId = hScore! > aScore! ? result.homeTeamId : result.awayTeamId;
                const loserId = hScore! > aScore! ? result.awayTeamId : result.homeTeamId;
                winner = new mongoose.Types.ObjectId(winnerId);
                status = "completed";
                completedR1++;

                // Advance winner to R2
                await db.collection("matches").updateOne(
                    { _id: r2._id }, { $set: { [side]: winner } }
                );

                // Update stats
                await db.collection("teams").updateOne(
                    { _id: new mongoose.Types.ObjectId(winnerId) },
                    { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": hScore! > aScore! ? hScore! : aScore!, "stats.goalsAgainst": hScore! > aScore! ? aScore! : hScore!, "stats.points": 3 } }
                );
                await db.collection("teams").updateOne(
                    { _id: new mongoose.Types.ObjectId(loserId) },
                    { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": hScore! > aScore! ? aScore! : hScore!, "stats.goalsAgainst": hScore! > aScore! ? hScore! : aScore! } }
                );
            }

            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRoundName(1),
                matchNumber: i + 1, homeTeam, awayTeam,
                homeScore: hScore, awayScore: aScore, winner, status,
                bracketPosition: { x: 0, y: i }, nextMatch: r2._id, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                completedAt: status === "completed" ? new Date() : undefined,
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
            createdReal++;

        } else if (aId || bId) {
            // BYE
            const byeTeam = (aId || bId)!;
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRoundName(1),
                matchNumber: i + 1, homeTeam: byeTeam, awayTeam: null,
                homeScore: 0, awayScore: 0, winner: byeTeam, status: "bye",
                bracketPosition: { x: 0, y: i }, nextMatch: r2._id, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            mMap.get(1)!.set(i, { _id: res.insertedId });
            createdBye++;
            await db.collection("matches").updateOne({ _id: r2._id }, { $set: { [side]: byeTeam } });
        }
    }

    // Link R2+ nextMatch
    for (let r = 2; r < totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            const ni = Math.floor(idx / 2);
            const nm = mMap.get(r + 1)!.get(ni);
            await db.collection("matches").updateOne(
                { _id: m._id }, { $set: { nextMatch: nm._id } }
            );
        }
    }

    console.log(`   R1: ${createdReal} real + ${createdBye} byes`);
    console.log(`   R1 completed: ${completedR1}`);

    // ═══════════════════════════════════════════════════
    // APPLY R2+ RESULTS
    // ═══════════════════════════════════════════════════
    console.log("\n🚀 Step 3: Applying results to R2+ matches...");
    let completedHigher = 0;

    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, m] of mMap.get(r)!.entries()) {
            // Reload match to get populated teams
            const doc = await db.collection("matches").findOne({ _id: m._id });
            if (!doc?.homeTeam || !doc?.awayTeam) continue;

            const hId = doc.homeTeam.toString();
            const aId = doc.awayTeam.toString();
            const key = `${hId}|${aId}`;
            const result = resultLookup.get(key);

            if (result) {
                const isFlipped = result.homeTeamId !== hId;
                const hScore = isFlipped ? result.awayScore : result.homeScore;
                const aScore = isFlipped ? result.homeScore : result.awayScore;
                const winnerId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
                const loserId = result.homeScore > result.awayScore ? result.awayTeamId : result.homeTeamId;
                const winnerOid = new mongoose.Types.ObjectId(winnerId);

                await db.collection("matches").updateOne({ _id: m._id }, {
                    $set: {
                        homeScore: hScore, awayScore: aScore,
                        winner: winnerOid, status: "completed", completedAt: new Date(),
                    }
                });

                // Advance winner
                if (r < totalRounds) {
                    const ni = Math.floor(idx / 2);
                    const nside = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                    const nm = mMap.get(r + 1)!.get(ni);
                    await db.collection("matches").updateOne(
                        { _id: nm._id }, { $set: { [nside]: winnerOid } }
                    );
                }

                // Stats + eliminate loser
                await db.collection("teams").updateOne(
                    { _id: winnerOid },
                    { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": result.homeScore > result.awayScore ? result.homeScore : result.awayScore, "stats.goalsAgainst": result.homeScore > result.awayScore ? result.awayScore : result.homeScore, "stats.points": 3 } }
                );
                await db.collection("teams").updateOne(
                    { _id: new mongoose.Types.ObjectId(loserId) },
                    { $set: { status: "eliminated" }, $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": result.homeScore > result.awayScore ? result.awayScore : result.homeScore, "stats.goalsAgainst": result.homeScore > result.awayScore ? result.homeScore : result.awayScore } }
                );

                completedHigher++;
            }
        }
    }

    console.log(`   R2+ completed: ${completedHigher}`);

    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    const totalCompleted = completedR1 + completedHigher;
    const totalScheduled = await db.collection("matches").countDocuments({ tournament: tOid, status: "scheduled" });
    const totalElim = await db.collection("teams").countDocuments({ tournament: tOid, status: "eliminated" });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORATION COMPLETE!");
    console.log("=".repeat(80));
    console.log(`   Completed matches: ${totalCompleted} (R1: ${completedR1}, R2+: ${completedHigher})`);
    console.log(`   Scheduled matches: ${totalScheduled}`);
    console.log(`   Eliminated teams: ${totalElim}`);
    console.log(`   Active teams: ${allTeams.length - totalElim}`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
    console.log("✅ Done.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
