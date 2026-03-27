/**
 * RESTORE-SUPPLEMENT: Add unmatched results as pending submissions
 * 
 * This script does NOT touch the bracket. It only adds resultSubmissions
 * for matches that weren't applied in v6 (to increase "Có KQ gửi").
 * 
 * npx tsx scripts/restore-supplement.ts           # dry run
 * npx tsx scripts/restore-supplement.ts --apply
 */
import mongoose from "mongoose";
import * as fs from "fs/promises";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const IS_DRY_RUN = !process.argv.includes("--apply");

async function main() {
    console.log(`RESTORE-SUPPLEMENT - ${IS_DRY_RUN ? "DRY RUN" : "APPLYING"}`);

    const recoveryData = JSON.parse(await fs.readFile("tournament_recovery_v2.json", "utf-8"));
    const fullyResolved = recoveryData.matches.filter((m: any) => m.confidence === "exact" && m.homeTeamId && m.awayTeamId);
    const partiallyResolved = recoveryData.matches.filter((m: any) => m.confidence !== "exact" && m.confidence !== "unresolved" && (m.homeTeamId || m.awayTeamId));

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;
    const tOid = new mongoose.Types.ObjectId(TOURNAMENT_ID);

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

    function getSS(tid: string, d: Date): string[] {
        const c = teamToCap.get(tid); if (!c) return [];
        return (userSS.get(c) || []).filter(x => Math.abs(x.ts - d.getTime()) <= 600000).map(x => x.file);
    }

    // Find all completed matches (already applied)
    const completedMatches = await db.collection("matches").find({
        tournament: tOid, status: "completed"
    }).toArray();

    const appliedPairs = new Set<string>();
    for (const m of completedMatches) {
        if (m.homeTeam && m.awayTeam) {
            appliedPairs.add(`${m.homeTeam}|${m.awayTeam}`);
            appliedPairs.add(`${m.awayTeam}|${m.homeTeam}`);
        }
    }

    // Find all matches that already have submissions
    const withSubs = await db.collection("matches").find({
        tournament: tOid, "resultSubmissions.0": { $exists: true }
    }).toArray();

    const teamsWithSubs = new Set<string>();
    for (const m of withSubs) {
        for (const sub of m.resultSubmissions || []) {
            if (sub.team) teamsWithSubs.add(sub.team.toString());
        }
    }

    console.log(`Already applied: ${appliedPairs.size / 2} pairs`);
    console.log(`Teams with existing subs: ${teamsWithSubs.size}`);

    // Find UNMATCHED fully resolved matches
    let unmatchedFull = 0;
    let addedSubs = 0;

    for (const m of fullyResolved) {
        const key = `${m.homeTeamId}|${m.awayTeamId}`;
        if (appliedPairs.has(key)) continue; // Already applied
        unmatchedFull++;

        if (IS_DRY_RUN) continue;

        const mDate = new Date(m.date);
        // Add submission to BOTH teams' scheduled matches
        for (const tid of [m.homeTeamId, m.awayTeamId]) {
            if (teamsWithSubs.has(tid)) continue; // Already has submission

            const cap = teamToCap.get(tid);
            if (!cap) continue;

            const matchDoc = await db.collection("matches").findOne({
                tournament: tOid,
                status: "scheduled",
                $or: [
                    { homeTeam: new mongoose.Types.ObjectId(tid) },
                    { awayTeam: new mongoose.Types.ObjectId(tid) },
                ]
            });
            if (!matchDoc) continue;

            await db.collection("matches").updateOne({ _id: matchDoc._id }, {
                $push: {
                    resultSubmissions: {
                        user: new mongoose.Types.ObjectId(cap),
                        team: new mongoose.Types.ObjectId(tid),
                        homeScore: m.homeScore,
                        awayScore: m.awayScore,
                        screenshots: getSS(tid, mDate),
                        notes: `Recovered: vs ${tid === m.homeTeamId ? m.awayTeamName : m.homeTeamName}`,
                        submittedAt: mDate,
                    }
                } as any
            });
            teamsWithSubs.add(tid);
            addedSubs++;
        }
    }

    // Also add missed partially resolved
    let unmatchedPartial = 0;
    for (const m of partiallyResolved) {
        const kid = m.homeTeamId || m.awayTeamId;
        if (!kid || teamsWithSubs.has(kid)) continue;

        const cap = teamToCap.get(kid);
        if (!cap) continue;

        unmatchedPartial++;
        if (IS_DRY_RUN) continue;

        const matchDoc = await db.collection("matches").findOne({
            tournament: tOid,
            status: "scheduled",
            $or: [
                { homeTeam: new mongoose.Types.ObjectId(kid) },
                { awayTeam: new mongoose.Types.ObjectId(kid) },
            ]
        });
        if (!matchDoc) continue;

        await db.collection("matches").updateOne({ _id: matchDoc._id }, {
            $push: {
                resultSubmissions: {
                    user: new mongoose.Types.ObjectId(cap),
                    team: new mongoose.Types.ObjectId(kid),
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    screenshots: getSS(kid, new Date(m.date)),
                    notes: "",
                    submittedAt: new Date(m.date),
                }
            } as any
        });
        teamsWithSubs.add(kid);
        addedSubs++;
    }

    console.log(`\nUnmatched fully resolved: ${unmatchedFull}`);
    console.log(`Unmatched partially resolved: ${unmatchedPartial}`);

    if (!IS_DRY_RUN) {
        console.log(`Added submissions: ${addedSubs}`);
        const fws = await db.collection("matches").countDocuments({
            tournament: tOid, "resultSubmissions.0": { $exists: true }
        });
        const fc = await db.collection("matches").countDocuments({ tournament: tOid, status: "completed" });
        console.log(`\n✅ Total now: ${fc} completed + ${fws} with submissions`);
    } else {
        console.log(`\nWould add ~${unmatchedFull * 2 + unmatchedPartial} submissions`);
        console.log("Run with --apply to execute");
    }

    await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
