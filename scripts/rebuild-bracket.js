/**
 * REBUILD v2 - Smarter seeding + direct result application
 * 
 * Better approach: Build seeding from match pairs FIRST,
 * then create bracket so ALL pairs are adjacent.
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const TID = '69bd4c8ad4d24902b39db3d5';
const S = 1024;

async function main() {
    const recovery = JSON.parse(fs.readFileSync('scripts/recovery-data-final.json', 'utf8'));
    const { eliminated, active, byeOnly, unknown, matches } = recovery;
    const allTeamIds = [...active, ...eliminated, ...byeOnly, ...unknown];
    const N = allTeamIds.length;
    console.log(`Teams: ${N}, Matches: ${matches.length}, Bracket: ${S}`);

    // ===== BUILD MATCH TREE =====
    const teamWins = {};
    for (const m of matches) {
        let wid = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        let lid = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (m.homeScore === m.awayScore) continue;
        if (!teamWins[wid]) teamWins[wid] = [];
        teamWins[wid].push({ opponent: lid, ...m });
    }

    // Sort wins: opponent with fewer wins = earlier match
    const depth = (t) => (teamWins[t] || []).length;
    for (const t of Object.keys(teamWins)) {
        teamWins[t].sort((a, b) => depth(a.opponent) - depth(b.opponent));
    }

    // Build sub-tree: returns array of teamIds (bracket slot order)
    const placed = new Set();
    function buildTree(tid) {
        if (placed.has(tid)) return [tid];
        placed.add(tid);
        const wins = teamWins[tid] || [];
        if (wins.length === 0) return [tid];

        let left = [tid];
        for (const w of wins) {
            const right = buildTree(w.opponent);
            // Pad both to equal power-of-2 length
            let sz = 1;
            while (sz < Math.max(left.length, right.length)) sz *= 2;
            while (left.length < sz) left.push(null);
            while (right.length < sz) right.push(null);
            left = [...left, ...right];
        }
        return left;
    }

    // Build complete seeding
    let seeding = [];
    const roots = [...active].sort((a, b) => depth(b) - depth(a));
    for (const r of roots) {
        const tree = buildTree(r);
        seeding.push(...tree);
    }
    // Add remaining
    for (const t of allTeamIds) {
        if (!placed.has(t)) { seeding.push(t); placed.add(t); }
    }
    while (seeding.length < S) seeding.push(null);
    seeding.length = S;

    // Verify: check how many match pairs are adjacent
    const pairSet = new Set();
    for (const m of matches) {
        pairSet.add(`${m.homeTeamId}_${m.awayTeamId}`);
        pairSet.add(`${m.awayTeamId}_${m.homeTeamId}`);
    }

    // Build ALL match pairings from seeding (for all rounds)
    // Round 1: seeding[0] vs seeding[1], [2] vs [3], etc.
    // Round 2: winner([0],[1]) vs winner([2],[3]), etc.
    // We check Round 1 pairs + simulate advancement
    let adjacentFound = 0;
    for (let i = 0; i < S / 2; i++) {
        const a = seeding[i * 2], b = seeding[i * 2 + 1];
        if (a && b && pairSet.has(`${a}_${b}`)) adjacentFound++;
    }
    console.log(`Round 1 pairs matching recovery: ${adjacentFound}`);

    // ===== DB OPERATIONS =====
    const c = new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db = c.db('efootcupv2');
    const matchCol = db.collection('matches');
    const teamCol = db.collection('teams');
    const tid = new ObjectId(TID);

    // Clean
    await matchCol.deleteMany({ tournament: tid });
    await teamCol.updateMany({ tournament: tid }, {
        $set: { status: 'active', stats: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] } }
    });
    console.log('Cleaned DB');

    // ===== CREATE BRACKET =====
    const totalRounds = Math.log2(S);
    const getRN = (r) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return `Vòng ${S / Math.pow(2, r - 1)}`;
    };

    // Store match IDs by [round][index]
    const mid = {}; // `${round}_${index}` -> matchId

    // Create rounds 2-10 (empty)
    for (let r = 2; r <= totalRounds; r++) {
        const count = S / Math.pow(2, r);
        const docs = [];
        for (let i = 0; i < count; i++) {
            docs.push({
                tournament: tid, round: r, roundName: getRN(r), matchNumber: i + 1,
                homeTeam: null, awayTeam: null, homeScore: null, awayScore: null,
                winner: null, status: 'scheduled', bracketPosition: { x: r - 1, y: i },
                events: [], resultSubmissions: [], leg: 1,
            });
        }
        const result = await matchCol.insertMany(docs);
        result.insertedIds && Object.values(result.insertedIds).forEach((id, i) => {
            mid[`${r}_${i}`] = id;
        });
    }

    // Link nextMatch for rounds 2+
    for (let r = 2; r < totalRounds; r++) {
        const count = S / Math.pow(2, r);
        for (let i = 0; i < count; i++) {
            const nextIdx = Math.floor(i / 2);
            await matchCol.updateOne({ _id: mid[`${r}_${i}`] }, { $set: { nextMatch: mid[`${r + 1}_${nextIdx}`] } });
        }
    }

    // Create Round 1 + handle BYEs
    const r1Docs = [];
    for (let i = 0; i < S / 2; i++) {
        const tA = seeding[i * 2], tB = seeding[i * 2 + 1];
        const nextIdx = Math.floor(i / 2);
        const nextId = mid[`2_${nextIdx}`];
        const side = i % 2 === 0 ? 'homeTeam' : 'awayTeam';

        if (tA && tB) {
            r1Docs.push({
                tournament: tid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: new ObjectId(tA), awayTeam: new ObjectId(tB),
                homeScore: null, awayScore: null, winner: null,
                status: 'scheduled', bracketPosition: { x: 0, y: i },
                nextMatch: nextId, events: [], resultSubmissions: [], leg: 1,
                _side: side, _nextId: nextId, // temp
            });
        } else if (tA || tB) {
            const byeT = tA || tB;
            r1Docs.push({
                tournament: tid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: new ObjectId(byeT), awayTeam: null,
                homeScore: 0, awayScore: 0, winner: new ObjectId(byeT),
                status: 'bye', bracketPosition: { x: 0, y: i },
                nextMatch: nextId, events: [], resultSubmissions: [], leg: 1,
                _side: side, _nextId: nextId, _byeTeam: byeT,
            });
        } else {
            r1Docs.push({
                tournament: tid, round: 1, roundName: getRN(1), matchNumber: i + 1,
                homeTeam: null, awayTeam: null, homeScore: null, awayScore: null,
                winner: null, status: 'scheduled', bracketPosition: { x: 0, y: i },
                nextMatch: nextId, events: [], resultSubmissions: [], leg: 1,
                _side: side, _nextId: nextId,
            });
        }
    }

    // Insert R1
    for (const doc of r1Docs) {
        const side = doc._side; const nextId = doc._nextId; const byeT = doc._byeTeam;
        delete doc._side; delete doc._nextId; delete doc._byeTeam;
        const res = await matchCol.insertOne(doc);
        mid[`1_${doc.matchNumber - 1}`] = res.insertedId;
        if (byeT) {
            await matchCol.updateOne({ _id: nextId }, { $set: { [side]: new ObjectId(byeT) } });
        }
    }

    console.log('Bracket created');

    // ===== APPLY RESULTS ITERATIVELY =====
    // Keep scanning until no more matches can be applied
    let totalApplied = 0;
    let iteration = 0;
    while (true) {
        iteration++;
        let applied = 0;
        for (let r = 1; r <= totalRounds; r++) {
            const roundMatches = await matchCol.find({ tournament: tid, round: r, status: 'scheduled' }).toArray();
            for (const m of roundMatches) {
                if (!m.homeTeam || !m.awayTeam) continue;
                const hid = m.homeTeam.toString();
                const aid = m.awayTeam.toString();
                const key1 = `${hid}_${aid}`;
                const key2 = `${aid}_${hid}`;

                let result = null;
                for (const rec of matches) {
                    if ((rec.homeTeamId === hid && rec.awayTeamId === aid) ||
                        (rec.homeTeamId === aid && rec.awayTeamId === hid)) {
                        result = rec; break;
                    }
                }
                if (!result) continue;

                const hs = result.homeTeamId === hid ? result.homeScore : result.awayScore;
                const as = result.homeTeamId === hid ? result.awayScore : result.homeScore;
                const winnerId = hs > as ? hid : aid;
                const loserId = winnerId === hid ? aid : hid;

                await matchCol.updateOne({ _id: m._id }, {
                    $set: { homeScore: hs, awayScore: as, winner: new ObjectId(winnerId), status: 'completed', completedAt: new Date() }
                });

                // Advance winner
                if (m.nextMatch) {
                    const idx = m.bracketPosition.y;
                    const slot = idx % 2 === 0 ? 'homeTeam' : 'awayTeam';
                    await matchCol.updateOne({ _id: m.nextMatch }, { $set: { [slot]: new ObjectId(winnerId) } });
                }

                // Stats
                const wS = hs > as ? hs : as;
                const lS = hs > as ? as : hs;
                await teamCol.updateOne({ _id: new ObjectId(winnerId) }, {
                    $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.goalsFor': wS, 'stats.goalsAgainst': lS, 'stats.goalDifference': wS - lS, 'stats.points': 3 }
                });
                await teamCol.updateOne({ _id: new ObjectId(loserId) }, {
                    $inc: { 'stats.played': 1, 'stats.losses': 1, 'stats.goalsFor': lS, 'stats.goalsAgainst': wS, 'stats.goalDifference': lS - wS },
                    $set: { status: 'eliminated' }
                });
                applied++;
            }
        }
        totalApplied += applied;
        console.log(`Iteration ${iteration}: applied ${applied} (total: ${totalApplied})`);
        if (applied === 0) break;
    }

    // Final stats
    const comp = await matchCol.countDocuments({ tournament: tid, status: 'completed' });
    const bye = await matchCol.countDocuments({ tournament: tid, status: 'bye' });
    const sched = await matchCol.countDocuments({ tournament: tid, status: 'scheduled' });
    const actT = await teamCol.countDocuments({ tournament: tid, status: 'active' });
    const elT = await teamCol.countDocuments({ tournament: tid, status: 'eliminated' });

    console.log(`\n✅ DONE: ${comp} completed, ${bye} BYE, ${sched} scheduled`);
    console.log(`Teams: ${actT} active, ${elT} eliminated`);
    console.log(`Recovery: ${totalApplied}/${matches.length} matches applied`);

    await c.close();
}

main().catch(console.error);
