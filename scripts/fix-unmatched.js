/**
 * FIX REMAINING 38 MATCHES
 * 1. Find unmatched results
 * 2. For each: swap teams in bracket so the pair is adjacent
 * 3. Re-apply ALL results iteratively (clean stats)
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const TID = '69bd4c8ad4d24902b39db3d5';

async function main() {
    const recovery = JSON.parse(fs.readFileSync('scripts/recovery-data-final.json', 'utf8'));
    const { matches: recMatches } = recovery;

    const c = new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db = c.db('efootcupv2');
    const matchCol = db.collection('matches');
    const teamCol = db.collection('teams');
    const tid = new ObjectId(TID);

    // ===== STEP 1: Find unmatched results =====
    const allDbMatches = await matchCol.find({ tournament: tid }).toArray();
    const completedPairs = new Set();
    for (const m of allDbMatches) {
        if (m.status !== 'completed') continue;
        if (m.homeTeam && m.awayTeam) {
            completedPairs.add(`${m.homeTeam}_${m.awayTeam}`);
            completedPairs.add(`${m.awayTeam}_${m.homeTeam}`);
        }
    }

    const unmatched = recMatches.filter(r =>
        !completedPairs.has(`${r.homeTeamId}_${r.awayTeamId}`) &&
        !completedPairs.has(`${r.awayTeamId}_${r.homeTeamId}`)
    );
    console.log(`Unmatched: ${unmatched.length}`);
    if (unmatched.length === 0) { await c.close(); return; }

    // ===== STEP 2: Swap teams to create correct pairings =====
    // Build team location map: teamId -> matchId
    const teamLocation = {}; // teamId -> {matchId, field:'homeTeam'|'awayTeam'}
    const refreshLocations = async () => {
        const all = await matchCol.find({ tournament: tid, status: 'scheduled' }).toArray();
        for (const k of Object.keys(teamLocation)) delete teamLocation[k];
        for (const m of all) {
            if (m.homeTeam) teamLocation[m.homeTeam.toString()] = { matchId: m._id, field: 'homeTeam', match: m };
            if (m.awayTeam) teamLocation[m.awayTeam.toString()] = { matchId: m._id, field: 'awayTeam', match: m };
        }
    };

    await refreshLocations();
    let swapCount = 0;

    for (const result of unmatched) {
        const hid = result.homeTeamId;
        const aid = result.awayTeamId;

        const hLoc = teamLocation[hid];
        const aLoc = teamLocation[aid];

        if (!hLoc && !aLoc) continue; // Neither in scheduled matches

        if (hLoc && aLoc && hLoc.matchId.toString() === aLoc.matchId.toString()) {
            continue; // Already paired! Will be caught by apply step
        }

        if (hLoc && aLoc) {
            // Both in different scheduled matches - SWAP
            // Put away team into home team's match, move displaced team to away team's old match
            const displacedTeamId = hLoc.field === 'homeTeam'
                ? hLoc.match.awayTeam?.toString()
                : hLoc.match.homeTeam?.toString();
            const otherField = hLoc.field === 'homeTeam' ? 'awayTeam' : 'homeTeam';

            // Place awayTeam into homeTeam's match
            await matchCol.updateOne({ _id: hLoc.matchId }, { $set: { [otherField]: new ObjectId(aid) } });

            // Put displaced team where awayTeam was
            if (displacedTeamId) {
                await matchCol.updateOne({ _id: aLoc.matchId }, { $set: { [aLoc.field]: new ObjectId(displacedTeamId) } });
                teamLocation[displacedTeamId] = { matchId: aLoc.matchId, field: aLoc.field };
            } else {
                await matchCol.updateOne({ _id: aLoc.matchId }, { $set: { [aLoc.field]: null } });
            }

            // Update locations
            teamLocation[aid] = { matchId: hLoc.matchId, field: otherField };
            delete teamLocation[aid]; // will be refreshed
            swapCount++;
        }
    }
    console.log(`Swaps performed: ${swapCount}`);

    // ===== STEP 3: Reset ALL stats and re-apply ALL results =====
    // Reset completed matches to scheduled (we'll re-apply everything)
    // Actually, don't reset completed - just apply the newly paired ones
    // But first, reset team stats
    await teamCol.updateMany({ tournament: tid }, {
        $set: { status: 'active', stats: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] } }
    });

    // Re-mark completed match results on team stats
    const allCompleted = await matchCol.find({ tournament: tid, status: 'completed' }).toArray();
    for (const m of allCompleted) {
        if (!m.homeTeam || !m.awayTeam || m.homeScore === null) continue;
        const winnerId = m.winner?.toString();
        const loserId = m.homeTeam.toString() === winnerId ? m.awayTeam.toString() : m.homeTeam.toString();
        const wS = m.homeTeam.toString() === winnerId ? m.homeScore : m.awayScore;
        const lS = m.homeTeam.toString() === winnerId ? m.awayScore : m.homeScore;

        await teamCol.updateOne({ _id: new ObjectId(winnerId) }, {
            $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.goalsFor': wS, 'stats.goalsAgainst': lS, 'stats.goalDifference': wS - lS, 'stats.points': 3 }
        });
        await teamCol.updateOne({ _id: new ObjectId(loserId) }, {
            $inc: { 'stats.played': 1, 'stats.losses': 1, 'stats.goalsFor': lS, 'stats.goalsAgainst': wS, 'stats.goalDifference': lS - wS },
            $set: { status: 'eliminated' }
        });
    }

    // ===== STEP 4: Apply newly matchable results =====
    let totalNew = 0;
    let iter = 0;
    while (iter < 20) {
        iter++;
        let applied = 0;
        const scheduled = await matchCol.find({ tournament: tid, status: 'scheduled' }).toArray();
        for (const m of scheduled) {
            if (!m.homeTeam || !m.awayTeam) continue;
            const hid = m.homeTeam.toString();
            const aid = m.awayTeam.toString();

            const result = recMatches.find(r =>
                (r.homeTeamId === hid && r.awayTeamId === aid) ||
                (r.homeTeamId === aid && r.awayTeamId === hid)
            );
            if (!result) continue;

            const hs = result.homeTeamId === hid ? result.homeScore : result.awayScore;
            const as = result.homeTeamId === hid ? result.awayScore : result.homeScore;
            const winnerId = hs > as ? hid : aid;
            const loserId = winnerId === hid ? aid : hid;

            await matchCol.updateOne({ _id: m._id }, {
                $set: { homeScore: hs, awayScore: as, winner: new ObjectId(winnerId), status: 'completed', completedAt: new Date() }
            });

            if (m.nextMatch) {
                const slot = m.bracketPosition.y % 2 === 0 ? 'homeTeam' : 'awayTeam';
                await matchCol.updateOne({ _id: m.nextMatch }, { $set: { [slot]: new ObjectId(winnerId) } });
            }

            const wS = parseInt(hs) > parseInt(as) ? hs : as;
            const lS = parseInt(hs) > parseInt(as) ? as : hs;
            await teamCol.updateOne({ _id: new ObjectId(winnerId) }, {
                $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.goalsFor': wS, 'stats.goalsAgainst': lS, 'stats.goalDifference': wS - lS, 'stats.points': 3 }
            });
            await teamCol.updateOne({ _id: new ObjectId(loserId) }, {
                $inc: { 'stats.played': 1, 'stats.losses': 1, 'stats.goalsFor': lS, 'stats.goalsAgainst': wS, 'stats.goalDifference': lS - wS },
                $set: { status: 'eliminated' }
            });
            applied++;
        }
        totalNew += applied;
        if (applied === 0) break;
        console.log(`  Iter ${iter}: +${applied} (total new: ${totalNew})`);
    }

    // Final
    const comp = await matchCol.countDocuments({ tournament: tid, status: 'completed' });
    const bye = await matchCol.countDocuments({ tournament: tid, status: 'bye' });
    const sched = await matchCol.countDocuments({ tournament: tid, status: 'scheduled' });
    const actT = await teamCol.countDocuments({ tournament: tid, status: 'active' });
    const elT = await teamCol.countDocuments({ tournament: tid, status: 'eliminated' });

    console.log(`\n✅ FINAL: ${comp} completed, ${bye} BYE, ${sched} scheduled`);
    console.log(`Teams: ${actT} active, ${elT} eliminated`);
    console.log(`Total recovery: ${comp}/${recMatches.length} matches`);

    await c.close();
}

main().catch(console.error);
