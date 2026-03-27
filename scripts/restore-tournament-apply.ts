/**
 * 🔧 RESTORE TOURNAMENT - APPLY v2 (with match results)
 * 
 * This script:
 * 1. Reads recovery data
 * 2. Builds bracket tree from recovered match chains
 * 3. Seeds teams so known opponents face each other
 * 4. Creates bracket with completed matches + scores
 * 5. Advances winners through rounds
 * 
 * Run:
 *   npx tsx scripts/restore-tournament-apply.ts           # dry run
 *   npx tsx scripts/restore-tournament-apply.ts --apply    # execute
 */

import mongoose from "mongoose";
import * as fs from "fs/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function apply() {
    console.log("=".repeat(80));
    console.log(`🔧 TOURNAMENT RESTORATION v2 - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("=".repeat(80));

    // Load recovery data
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch {
        console.error("❌ Cannot read tournament_recovery_v2.json!");
        process.exit(1);
    }

    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact");
    console.log(`📋 Fully resolved matches: ${fullyResolved.length}`);

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
    const db = mongoose.connection.db!;

    // Load all teams
    const allTeams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).toArray();
    const teamById = new Map(allTeams.map(t => [t._id.toString(), t]));
    console.log(`   Teams: ${allTeams.length}`);

    // ═══════════════════════════════════════════
    // BUILD MATCH CHAINS FROM RECOVERY DATA
    // ═══════════════════════════════════════════
    // For each team, track their wins (chronological order)
    const teamWinChain = new Map<string, { oppId: string; hScore: number; aScore: number; date: Date; isHome: boolean }[]>();
    const teamLostTo = new Map<string, string>(); // teamId → winnerId

    for (const m of fullyResolved) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;

        if (!teamWinChain.has(winnerId)) teamWinChain.set(winnerId, []);
        teamWinChain.get(winnerId)!.push({
            oppId: loserId,
            hScore: m.homeScore,
            aScore: m.awayScore,
            date: new Date(m.date),
            isHome: winnerId === m.homeTeamId,
        });
        teamLostTo.set(loserId, winnerId);
    }

    // Sort each chain by date
    for (const [, chain] of teamWinChain) {
        chain.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    // ═══════════════════════════════════════════
    // BUILD SEED LIST (place known opponents adjacent)
    // ═══════════════════════════════════════════
    // Build bracket subtrees from win chains
    // A team's tree: R1 opponent as leaf, R2 opponent's subtree, etc.

    const placedTeams = new Set<string>();

    interface TreeNode {
        teamId?: string;
        leaves: string[]; // flattened team IDs in bracket order
        matchResults: { homeId: string; awayId: string; hScore: number; aScore: number; depth: number }[];
    }

    function buildTree(teamId: string): TreeNode {
        if (placedTeams.has(teamId)) return { teamId, leaves: [teamId], matchResults: [] };
        placedTeams.add(teamId);

        const wins = teamWinChain.get(teamId) || [];
        if (wins.length === 0) {
            return { teamId, leaves: [teamId], matchResults: [] };
        }

        // Build bottom-up: R1 first, then R2, etc.
        // Start: just the team itself
        let node: TreeNode = { teamId, leaves: [teamId], matchResults: [] };

        for (let i = 0; i < wins.length; i++) {
            const win = wins[i];
            if (placedTeams.has(win.oppId)) {
                // Opponent already placed elsewhere, skip
                continue;
            }

            const oppTree = buildTree(win.oppId);

            // Pad both sides to same power-of-2 size
            const maxLen = Math.max(node.leaves.length, oppTree.leaves.length);
            let padSize = 1;
            while (padSize < maxLen) padSize *= 2;

            while (node.leaves.length < padSize) node.leaves.push("__BYE__");
            while (oppTree.leaves.length < padSize) oppTree.leaves.push("__BYE__");

            const depth = Math.log2(padSize * 2);

            const hId = win.isHome ? teamId : win.oppId;
            const aId = win.isHome ? win.oppId : teamId;

            node = {
                teamId,
                leaves: [...node.leaves, ...oppTree.leaves],
                matchResults: [
                    ...node.matchResults,
                    ...oppTree.matchResults,
                    { homeId: hId, awayId: aId, hScore: win.hScore, aScore: win.aScore, depth: Math.ceil(depth) },
                ],
            };
        }

        return node;
    }

    // Build trees starting from teams with most wins (deepest paths)
    const teamsByWins = Array.from(teamWinChain.entries())
        .sort((a, b) => b[1].length - a[1].length);

    const subtrees: TreeNode[] = [];
    for (const [teamId] of teamsByWins) {
        if (!placedTeams.has(teamId)) {
            subtrees.push(buildTree(teamId));
        }
    }

    // Also build trees for teams that only lost (have no wins but were in a resolved match)
    for (const [loserId] of teamLostTo) {
        if (!placedTeams.has(loserId)) {
            subtrees.push(buildTree(loserId));
        }
    }

    // Collect all match results from trees
    const allMatchResults: { homeId: string; awayId: string; hScore: number; aScore: number }[] = [];
    for (const tree of subtrees) {
        allMatchResults.push(...tree.matchResults);
    }

    // Build seed list from subtree leaves
    const seedList: (string | null)[] = [];
    for (const tree of subtrees) {
        for (const leaf of tree.leaves) {
            if (leaf === "__BYE__") seedList.push(null);
            else seedList.push(leaf);
        }
    }

    // Add remaining teams not in any recovered match
    for (const t of allTeams) {
        const id = t._id.toString();
        if (!placedTeams.has(id)) {
            seedList.push(id);
        }
    }

    // Pad to next power of 2 with nulls (byes)
    let S = 2;
    while (S < seedList.length) S *= 2;
    while (seedList.length < S) seedList.push(null);

    const totalRounds = Math.log2(S);
    const realTeams = seedList.filter(s => s !== null).length;
    const byes = S - realTeams;

    console.log(`\n📊 BRACKET PLAN:`);
    console.log(`   Seed list size: ${S} (${totalRounds} rounds)`);
    console.log(`   Real teams: ${realTeams}`);
    console.log(`   Byes: ${byes}`);
    console.log(`   Match results to apply: ${allMatchResults.length}`);
    console.log(`   Subtrees built: ${subtrees.length}`);

    if (IS_DRY_RUN) {
        console.log("\n⚠️ DRY RUN - run with --apply to execute");
        await mongoose.disconnect();
        return;
    }

    // ═══════════════════════════════════════════
    // APPLY: Delete old + Create new bracket
    // ═══════════════════════════════════════════
    console.log("\n🚀 Step 1: Deleting wrong bracket...");
    const del = await db.collection("matches").deleteMany({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    });
    console.log(`   ✅ Deleted ${del.deletedCount} matches`);

    // Reset ALL teams to active first, then mark eliminated after applying results
    await db.collection("teams").updateMany(
        { tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID) },
        { $set: { status: "active", "stats.played": 0, "stats.wins": 0, "stats.draws": 0, "stats.losses": 0, "stats.goalsFor": 0, "stats.goalsAgainst": 0, "stats.points": 0 } }
    );

    console.log("\n🚀 Step 2: Creating bracket...");

    const getRoundName = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        return `Vòng ${size / Math.pow(2, r - 1)}`;
    };

    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);
    const matchesMap = new Map<number, Map<number, any>>(); // round → matchIdx → doc

    // Pre-create Round 2+ matches
    for (let r = 2; r <= totalRounds; r++) {
        matchesMap.set(r, new Map());
        const count = S / Math.pow(2, r);
        for (let i = 0; i < count; i++) {
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: r, roundName: getRoundName(r, totalRounds, S),
                matchNumber: i + 1, homeTeam: null, awayTeam: null,
                homeScore: null, awayScore: null, winner: null, status: "scheduled",
                bracketPosition: { x: r - 1, y: i }, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(r)!.set(i, { _id: res.insertedId });
        }
    }

    // Create Round 1 matches
    matchesMap.set(1, new Map());
    let byeCount = 0, realCount = 0;

    for (let i = 0; i < S / 2; i++) {
        const tA = seedList[i * 2];
        const tB = seedList[i * 2 + 1];
        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = matchesMap.get(2)!.get(nextIdx);

        if (tA && tB) {
            const aOid = new mongoose.Types.ObjectId(tA);
            const bOid = new mongoose.Types.ObjectId(tB);

            // Check if this pair has a known result
            const result = allMatchResults.find(
                r => (r.homeId === tA && r.awayId === tB) || (r.homeId === tB && r.awayId === tA)
            );

            let status = "scheduled", hScore: any = null, aScore: any = null, winner: any = null;
            let homeId = aOid, awayId = bOid;

            if (result) {
                homeId = new mongoose.Types.ObjectId(result.homeId);
                awayId = new mongoose.Types.ObjectId(result.awayId);
                hScore = result.hScore;
                aScore = result.aScore;
                winner = hScore > aScore ? homeId : awayId;
                status = "completed";

                // Advance winner to R2
                await db.collection("matches").updateOne(
                    { _id: r2Match._id },
                    { $set: { [side]: winner } }
                );

                // Update team stats
                await updateTeamStats(db, homeId.toString(), awayId.toString(), hScore, aScore);
            }

            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1, homeTeam: homeId, awayTeam: awayId,
                homeScore: hScore, awayScore: aScore, winner, status,
                bracketPosition: { x: 0, y: i }, nextMatch: r2Match._id, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                completedAt: status === "completed" ? new Date() : undefined,
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: res.insertedId });
            realCount++;
        } else if (tA || tB) {
            const byeTeamId = new mongoose.Types.ObjectId((tA || tB)!);
            const res = await db.collection("matches").insertOne({
                tournament: tOid, round: 1, roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1, homeTeam: byeTeamId, awayTeam: null,
                homeScore: 0, awayScore: 0, winner: byeTeamId, status: "bye",
                bracketPosition: { x: 0, y: i }, nextMatch: r2Match._id, leg: 1,
                events: [], resultSubmissions: [], screenshots: [],
                createdAt: new Date(), updatedAt: new Date(),
            });
            matchesMap.get(1)!.set(i, { _id: res.insertedId });
            byeCount++;
            await db.collection("matches").updateOne({ _id: r2Match._id }, { $set: { [side]: byeTeamId } });
        }
    }

    // Link Round 2+ nextMatch
    for (let r = 2; r < totalRounds; r++) {
        for (const [idx, match] of matchesMap.get(r)!.entries()) {
            const nextIdx = Math.floor(idx / 2);
            const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
            await db.collection("matches").updateOne(
                { _id: match._id },
                { $set: { nextMatch: nextMatch._id } }
            );
        }
    }

    // Now apply results to Round 2+ matches
    console.log("\n🚀 Step 3: Applying results to higher rounds...");
    let appliedHigherRounds = 0;

    for (let r = 2; r <= totalRounds; r++) {
        for (const [idx, match] of matchesMap.get(r)!.entries()) {
            const doc = await db.collection("matches").findOne({ _id: match._id });
            if (!doc || !doc.homeTeam || !doc.awayTeam) continue;

            const hId = doc.homeTeam.toString();
            const aId = doc.awayTeam.toString();

            const result = allMatchResults.find(
                mr => (mr.homeId === hId && mr.awayId === aId) || (mr.homeId === aId && mr.awayId === hId)
            );

            if (result) {
                const isFlipped = result.homeId === aId;
                const hScore = isFlipped ? result.aScore : result.hScore;
                const aScore = isFlipped ? result.hScore : result.aScore;
                const winnerId = new mongoose.Types.ObjectId(
                    result.hScore > result.aScore ? result.homeId : result.awayId
                );

                await db.collection("matches").updateOne({ _id: match._id }, {
                    $set: { homeScore: hScore, awayScore: aScore, winner: winnerId, status: "completed", completedAt: new Date() }
                });

                // Advance winner to next round
                if (r < totalRounds) {
                    const nextIdx = Math.floor(idx / 2);
                    const nextSide = idx % 2 === 0 ? "homeTeam" : "awayTeam";
                    const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
                    await db.collection("matches").updateOne(
                        { _id: nextMatch._id },
                        { $set: { [nextSide]: winnerId } }
                    );
                }

                await updateTeamStats(db, result.homeId, result.awayId, result.hScore, result.aScore);
                appliedHigherRounds++;
            }
        }
    }

    console.log(`   ✅ Applied ${appliedHigherRounds} results to higher rounds`);

    // Mark eliminated teams
    console.log("\n🚀 Step 4: Marking eliminated teams...");
    const completedMatches = await db.collection("matches").find({
        tournament: tOid, status: "completed"
    }).toArray();

    let elimCount = 0;
    for (const m of completedMatches) {
        if (!m.winner || !m.homeTeam || !m.awayTeam) continue;
        const loserId = m.winner.toString() === m.homeTeam.toString() ? m.awayTeam : m.homeTeam;
        await db.collection("teams").updateOne(
            { _id: loserId },
            { $set: { status: "eliminated" } }
        );
        elimCount++;
    }
    console.log(`   ✅ Eliminated ${elimCount} teams`);

    // Count results
    const finalCompleted = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const finalTotal = await db.collection("matches").countDocuments({ tournament: tOid, status: { $ne: "bye" } });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORATION COMPLETE!");
    console.log(`  ${finalCompleted}/${finalTotal} matches completed`);
    console.log(`  ${elimCount} teams eliminated`);
    console.log("=".repeat(80));

    await mongoose.disconnect();
}

async function updateTeamStats(db: any, homeId: string, awayId: string, hScore: number, aScore: number) {
    const winnerId = hScore > aScore ? homeId : awayId;
    const loserId = hScore > aScore ? awayId : homeId;

    await db.collection("teams").updateOne(
        { _id: new mongoose.Types.ObjectId(winnerId) },
        { $inc: { "stats.played": 1, "stats.wins": 1, "stats.goalsFor": hScore > aScore ? hScore : aScore, "stats.goalsAgainst": hScore > aScore ? aScore : hScore, "stats.points": 3 } }
    );
    await db.collection("teams").updateOne(
        { _id: new mongoose.Types.ObjectId(loserId) },
        { $inc: { "stats.played": 1, "stats.losses": 1, "stats.goalsFor": hScore > aScore ? aScore : hScore, "stats.goalsAgainst": hScore > aScore ? hScore : aScore } }
    );
}

apply().catch(err => { console.error("❌", err); process.exit(1); });
