/**
 * 🔧 RESTORE TOURNAMENT - APPLY SCRIPT
 * 
 * This script APPLIES the recovery data to restore the tournament.
 * 
 * What it does:
 * 1. Reads tournament_recovery_v2.json 
 * 2. Deletes the WRONG bracket (1023 matches)
 * 3. Marks confirmed eliminated teams (125+)
 * 4. Generates a NEW bracket with only remaining active teams
 * 5. The tournament continues from this point
 * 
 * SAFETY:
 * - DRY RUN by default (shows what will happen)
 * - Add --apply flag to actually execute:
 *     npx tsx scripts/restore-tournament-apply.ts --apply
 * 
 * Run on server:
 *   cd /root/apps/efootcup
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
    console.log(`🔧 TOURNAMENT RESTORATION - ${IS_DRY_RUN ? "⚠️ DRY RUN" : "🚀 APPLYING"}`);
    console.log("=".repeat(80));

    if (IS_DRY_RUN) {
        console.log("\n  ℹ️  This is a DRY RUN. No changes will be made.");
        console.log("  ℹ️  To apply changes, run with --apply flag:");
        console.log("      npx tsx scripts/restore-tournament-apply.ts --apply\n");
    }

    // 1. Load recovery data
    let recoveryData: any;
    try {
        const raw = await fs.readFile("tournament_recovery_v2.json", "utf-8");
        recoveryData = JSON.parse(raw);
    } catch (e) {
        console.error("❌ Cannot read tournament_recovery_v2.json. Run restore-tournament-v2.ts first!");
        process.exit(1);
    }

    console.log(`📋 Recovery data loaded:`);
    console.log(`   Tournament: ${recoveryData.tournament.title}`);
    console.log(`   Total teams: ${recoveryData.tournament.totalTeams}`);
    console.log(`   Fully resolved matches: ${recoveryData.summary.fullyResolved}`);
    console.log(`   Partially resolved: ${recoveryData.summary.partiallyResolved}`);
    console.log(`   Confirmed eliminated: ${recoveryData.summary.confirmedEliminated}`);
    console.log(`   Confirmed active: ${recoveryData.summary.confirmedActive}`);

    // 2. Connect to DB
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!");

    const db = mongoose.connection.db!;

    // 3. Collect ALL eliminated teams
    // From fully resolved matches (loser is eliminated)
    const eliminatedTeamIds = new Set<string>(recoveryData.eliminatedTeamIds);

    // Also extract from partially resolved matches
    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact");
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved");

    for (const m of partiallyResolved) {
        // If we know one team and they LOST → that team is eliminated
        if (m.homeTeamId && m.homeScore < m.awayScore) {
            eliminatedTeamIds.add(m.homeTeamId);
        }
        if (m.awayTeamId && m.awayScore < m.homeScore) {
            eliminatedTeamIds.add(m.awayTeamId);
        }
    }

    console.log(`\n📊 PLAN:`);
    console.log(`   1. Delete ${1023} wrong matches (current bracket)`);
    console.log(`   2. Mark ${eliminatedTeamIds.size} teams as eliminated`);
    console.log(`   3. Generate new bracket with remaining active teams`);

    // Load current state
    const allTeams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    }).toArray();

    const totalTeams = allTeams.length;
    const activeAfterRestore = totalTeams - eliminatedTeamIds.size;

    console.log(`\n   Total teams: ${totalTeams}`);
    console.log(`   Will be eliminated: ${eliminatedTeamIds.size}`);
    console.log(`   Will remain active: ${activeAfterRestore}`);
    console.log(`   Expected bracket size: ${Math.pow(2, Math.ceil(Math.log2(activeAfterRestore)))}`);

    // Show win distribution for remaining active teams
    const activeTeamStats = allTeams.filter(t => !eliminatedTeamIds.has(t._id.toString()));
    const winDist = new Map<number, number>();
    for (const t of activeTeamStats) {
        const w = t.stats?.wins || 0;
        winDist.set(w, (winDist.get(w) || 0) + 1);
    }
    console.log(`\n   Win distribution of remaining active teams:`);
    for (const [w, c] of Array.from(winDist.entries()).sort((a, b) => b[0] - a[0])) {
        console.log(`     ${w} wins: ${c} teams`);
    }

    if (IS_DRY_RUN) {
        console.log("\n" + "=".repeat(80));
        console.log("  ⚠️  DRY RUN COMPLETE - No changes made");
        console.log("  To apply: npx tsx scripts/restore-tournament-apply.ts --apply");
        console.log("=".repeat(80));
        await mongoose.disconnect();
        return;
    }

    // ════════════════════════════════════════
    // APPLY CHANGES
    // ════════════════════════════════════════
    console.log("\n" + "=".repeat(80));
    console.log("  🚀 APPLYING CHANGES...");
    console.log("=".repeat(80));

    // Step 1: Delete all current (wrong) matches
    console.log("\n  Step 1: Deleting wrong bracket...");
    const deleteResult = await db.collection("matches").deleteMany({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID)
    });
    console.log(`    ✅ Deleted ${deleteResult.deletedCount} matches`);

    // Step 2: Mark eliminated teams
    console.log("\n  Step 2: Marking eliminated teams...");
    let eliminatedCount = 0;
    for (const teamId of eliminatedTeamIds) {
        await db.collection("teams").updateOne(
            { _id: new mongoose.Types.ObjectId(teamId) },
            { $set: { status: "eliminated" } }
        );
        eliminatedCount++;
    }
    console.log(`    ✅ Marked ${eliminatedCount} teams as eliminated`);

    // Step 3: Generate new bracket with remaining active teams
    console.log("\n  Step 3: Generating new bracket for active teams...");

    const activeTeams = await db.collection("teams").find({
        tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
        status: "active"
    }).toArray();

    console.log(`    Active teams: ${activeTeams.length}`);

    const N = activeTeams.length;
    if (N < 2) {
        console.error("    ❌ Less than 2 active teams! Cannot generate bracket.");
        await mongoose.disconnect();
        return;
    }

    // Shuffle teams randomly for new bracket
    const shuffled = [...activeTeams].sort(() => Math.random() - 0.5);

    let S = 2;
    while (S < N) S *= 2;
    const totalRounds = Math.log2(S);

    console.log(`    Bracket size: ${S} (${totalRounds} rounds)`);
    console.log(`    Byes: ${S - N}`);
    console.log(`    Real matches: ${N - 1}`);

    // Standard seeding order
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Place teams in slots
    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const slotIndex = seedOrder.indexOf(i + 1);
        teamSlots[slotIndex] = shuffled[i];
    }

    const getRoundName = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        const teamsInRound = size / Math.pow(2, r - 1);
        return `Vòng ${teamsInRound}`;
    };

    const tId = TOURNAMENT_ID;
    const matchesMap = new Map<number, Map<number, any>>();
    let totalCreated = 0;

    // Pre-create Round 2+ matches
    for (let r = 2; r <= totalRounds; r++) {
        matchesMap.set(r, new Map());
        const matchCount = S / Math.pow(2, r);
        for (let i = 0; i < matchCount; i++) {
            const result = await db.collection("matches").insertOne({
                tournament: new mongoose.Types.ObjectId(tId),
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
            matchesMap.get(r)!.set(i, { _id: result.insertedId, matchNumber: i + 1 });
            totalCreated++;
        }
    }

    // Create Round 1 matches (including BYEs)
    matchesMap.set(1, new Map());
    let byeCount = 0;
    let realMatchCount = 0;

    for (let i = 0; i < S / 2; i++) {
        const teamA = teamSlots[i * 2];
        const teamB = teamSlots[i * 2 + 1];

        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = matchesMap.get(2)!.get(nextIdx);

        if (teamA && teamB) {
            // Both teams → real match
            const result = await db.collection("matches").insertOne({
                tournament: new mongoose.Types.ObjectId(tId),
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: teamA._id,
                awayTeam: teamB._id,
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
            matchesMap.get(1)!.set(i, { _id: result.insertedId });
            totalCreated++;
            realMatchCount++;
        } else if (teamA || teamB) {
            // One team → BYE
            const byeTeam = teamA || teamB;
            const result = await db.collection("matches").insertOne({
                tournament: new mongoose.Types.ObjectId(tId),
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: byeTeam._id,
                awayTeam: null,
                homeScore: 0,
                awayScore: 0,
                winner: byeTeam._id,
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
            matchesMap.get(1)!.set(i, { _id: result.insertedId });
            totalCreated++;
            byeCount++;

            // Auto-promote bye team to Round 2
            await db.collection("matches").updateOne(
                { _id: r2Match._id },
                { $set: { [side]: byeTeam._id } }
            );
        }
    }

    // Link Round 2+ matches to their successors (nextMatch)
    for (let r = 2; r < totalRounds; r++) {
        const roundMatches = matchesMap.get(r)!;
        for (const [idx, match] of roundMatches.entries()) {
            const nextIdx = Math.floor(idx / 2);
            const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
            await db.collection("matches").updateOne(
                { _id: match._id },
                { $set: { nextMatch: nextMatch._id } }
            );
        }
    }

    console.log(`    ✅ Created ${totalCreated} matches`);
    console.log(`       Real matches: ${realMatchCount}`);
    console.log(`       Bye matches: ${byeCount}`);
    console.log(`       Later rounds: ${totalCreated - realMatchCount - byeCount}`);

    // Step 4: Reset stats for active teams (fresh start for new bracket)
    console.log("\n  Step 4: Resetting stats for active teams (new bracket = fresh start)...");
    const resetResult = await db.collection("teams").updateMany(
        {
            tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
            status: "active"
        },
        {
            $set: {
                "stats.played": 0,
                "stats.wins": 0,
                "stats.draws": 0,
                "stats.losses": 0,
                "stats.goalsFor": 0,
                "stats.goalsAgainst": 0,
                "stats.points": 0,
            }
        }
    );
    console.log(`    ✅ Reset stats for ${resetResult.modifiedCount} teams`);

    // ════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════
    console.log("\n" + "=".repeat(80));
    console.log("  ✅ RESTORATION COMPLETE!");
    console.log("=".repeat(80));
    console.log(`
  Summary:
    ✅ Deleted ${deleteResult.deletedCount} wrong matches
    ✅ Eliminated ${eliminatedCount} teams
    ✅ Generated new bracket: ${totalCreated} matches
       - ${realMatchCount} real matches (Round 1)
       - ${byeCount} byes
       - ${totalCreated - realMatchCount - byeCount} later round slots
    ✅ ${activeTeams.length} teams continue in the tournament

  What to do next:
    1. Open the tournament bracket page
    2. Verify the bracket looks correct
    3. Manager can start entering match results
    4. Review partially resolved matches (${recoveryData.summary.partiallyResolved})
       for any teams that should be eliminated but weren't identified

  ⚠️ NOTES:
    - Teams that were eliminated but NOT identified in recovery data
      may still be "active" in the bracket. Manager should review.
    - Old match history is preserved in tournament_recovery_v2.json
    - Notifications with old results are still in the database
    `);

    await mongoose.disconnect();
    console.log("✅ Done.");
}

apply().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
