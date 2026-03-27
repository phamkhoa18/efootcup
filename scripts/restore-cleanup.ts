/**
 * RESTORE-CLEANUP: Remove wrong submissions + add only correct ones
 * 
 * 1. Removes ALL resultSubmissions with notes containing "Recovered:"
 *    (these were wrongly added by supplement to wrong matches)
 * 2. Only adds submissions where BOTH teams in recovery match the match teams
 * 
 * npx tsx scripts/restore-cleanup.ts           # dry run
 * npx tsx scripts/restore-cleanup.ts --apply
 */
import mongoose from "mongoose";
import * as fs from "fs/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log(`RESTORE-CLEANUP - ${IS_DRY_RUN ? "DRY RUN" : "APPLYING"}`);

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

    // Step 1: Find and remove wrong submissions (added by supplement)
    const matchesWithSubs = await db.collection("matches").find({
        tournament: tOid,
        "resultSubmissions.0": { $exists: true },
        status: "scheduled" // only scheduled matches - completed ones are fine
    }).toArray();

    console.log(`\nScheduled matches with submissions: ${matchesWithSubs.length}`);

    let cleaned = 0;
    for (const m of matchesWithSubs) {
        const homeId = m.homeTeam?.toString();
        const awayId = m.awayTeam?.toString();

        // Check each submission: is the submitting team actually in this match?
        const validSubs = (m.resultSubmissions || []).filter((sub: any) => {
            const subTeam = sub.team?.toString();
            return subTeam === homeId || subTeam === awayId;
        });

        const invalidCount = (m.resultSubmissions?.length || 0) - validSubs.length;

        if (invalidCount > 0) {
            if (!IS_DRY_RUN) {
                await db.collection("matches").updateOne(
                    { _id: m._id },
                    { $set: { resultSubmissions: validSubs } }
                );
            }
            cleaned += invalidCount;
        }
    }
    console.log(`Removed ${cleaned} wrong submissions`);

    // Step 2: Count current state
    const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
    const fws = await db.collection("matches").countDocuments({
        tournament: tOid, "resultSubmissions.0": { $exists: true }
    });
    console.log(`\nAfter cleanup:`);
    console.log(`  Completed: ${fc}`);
    console.log(`  With subs: ${fws}`);

    // Step 3: Load recovery data and find what's missing
    const recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8"));
    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));

    // Find applied pairs
    const completed = await db.collection("matches").find({ tournament: tOid, status: "completed" }).toArray();
    const appliedPairs = new Set<string>();
    for (const m of completed) {
        if (m.homeTeam && m.awayTeam) {
            appliedPairs.add(`${m.homeTeam}|${m.awayTeam}`);
            appliedPairs.add(`${m.awayTeam}|${m.homeTeam}`);
        }
    }

    // Count unmatched
    let unmatchedFull = 0;
    for (const m of fullyResolved) {
        if (!appliedPairs.has(`${m.homeTeamId}|${m.awayTeamId}`)) unmatchedFull++;
    }

    console.log(`\nRecovery status:`);
    console.log(`  Fully resolved: ${fullyResolved.length} (${fullyResolved.length - unmatchedFull} applied, ${unmatchedFull} unmatched)`);
    console.log(`  Partially resolved: ${partiallyResolved.length}`);
    console.log(`  Total data: ${fullyResolved.length + partiallyResolved.length} ≈ 300 matches`);
    console.log(`\n⚠️  ${unmatchedFull} fully resolved matches could not be placed in bracket.`);
    console.log(`  These teams exist in the bracket but face DIFFERENT opponents.`);
    console.log(`  Manager needs to review and handle these manually.`);

    if (!IS_DRY_RUN) {
        // Save unmatched results to a file for manager reference
        const unmatched: any[] = [];
        for (const m of fullyResolved) {
            if (!appliedPairs.has(`${m.homeTeamId}|${m.awayTeamId}`)) {
                unmatched.push({
                    homeTeam: m.homeTeamName,
                    awayTeam: m.awayTeamName,
                    score: `${m.homeScore} - ${m.awayScore}`,
                    date: m.date,
                });
            }
        }
        await fs.writeFile("unmatched_results.json", JSON.stringify(unmatched, null, 2));
        console.log(`\n📄 Saved ${unmatched.length} unmatched results to unmatched_results.json`);
    }

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
