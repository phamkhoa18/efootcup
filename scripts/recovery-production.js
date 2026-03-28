/**
 * ============================================
 * TOURNAMENT BRACKET RECOVERY - PRODUCTION
 * ============================================
 * Chạy trên server: node recovery-production.js
 * 
 * Script tự động:
 * 1. Parse PM2 logs để lấy match results
 * 2. Xóa bracket hiện tại
 * 3. Tạo bracket 1024 mới với seeding từ match data
 * 4. Apply tất cả kết quả (thắng/thua/advance)
 * 5. Fix các trận chưa khớp bằng swap
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'efootcupv2';
const TID = '69bd4c8ad4d24902b39db3d5';
const PM2_LOG = __dirname + '/tournament-pm2-full.txt';
const OLD_PREFIX = '69c28eb';
const S = 1024;

async function main() {
    console.log('🔄 TOURNAMENT BRACKET RECOVERY');
    console.log('================================\n');

    // ===== STEP 1: Parse PM2 logs =====
    console.log('📋 Step 1: Parsing PM2 logs...');
    const raw = fs.readFileSync(PM2_LOG, 'utf8');

    // Extract blocks for our tournament
    const lines = raw.split('\n');
    const submissions = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.includes('tournamentIdOrSlug= ' + TID)) {
            // Found a submit for our tournament - parse next lines
            let matchId = null, homeScore = null, awayScore = null;
            let homeTeamId = null, awayTeamId = null;
            let userId = null;

            const userMatch = line.match(/userId=\s*(\S+)/);
            if (userMatch) userId = userMatch[1];

            // Scan next 10 lines for match data
            for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
                const l = lines[j];
                if (l.includes('tournamentIdOrSlug=')) break; // next submission

                const mid = l.match(/matchId:\s*'([^']+)'/);
                if (mid) matchId = mid[1];

                const hs = l.match(/^\s*homeScore:\s*(\d+)/);
                if (hs) homeScore = parseInt(hs[1]);

                const as = l.match(/^\s*awayScore:\s*(\d+)/);
                if (as) awayScore = parseInt(as[1]);

                const tm = l.match(/Teams:\s*home:\s*(\S+)\s+captain:\s*\S+\s+away:\s*(\S+)/);
                if (tm) { homeTeamId = tm[1]; awayTeamId = tm[2]; }
            }

            if (matchId && homeScore !== null && awayScore !== null && homeTeamId && awayTeamId) {
                submissions.push({ matchId, homeScore, awayScore, homeTeamId, awayTeamId, userId });
            }
        }
        i++;
    }

    // Filter old bracket only + dedup
    const oldSubs = submissions.filter(s => s.matchId.startsWith(OLD_PREFIX));
    const matchMap = {};
    for (const s of oldSubs) matchMap[s.matchId] = s;
    const matches = Object.values(matchMap);
    console.log(`  Found ${submissions.length} submissions, ${oldSubs.length} old bracket, ${matches.length} unique matches\n`);

    // ===== STEP 2: Build match tree =====
    console.log('🌳 Step 2: Building match tree...');
    const teamWins = {};
    for (const m of matches) {
        if (m.homeScore === m.awayScore) continue;
        const wid = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lid = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        if (!teamWins[wid]) teamWins[wid] = [];
        teamWins[wid].push({ opponent: lid, ...m });
    }

    const depth = (t) => (teamWins[t] || []).length;
    for (const t of Object.keys(teamWins)) {
        teamWins[t].sort((a, b) => depth(a.opponent) - depth(b.opponent));
    }

    const placed = new Set();
    function buildTree(tid) {
        if (placed.has(tid)) return [tid];
        placed.add(tid);
        const wins = teamWins[tid] || [];
        if (wins.length === 0) return [tid];
        let left = [tid];
        for (const w of wins) {
            const right = buildTree(w.opponent);
            let sz = 1;
            while (sz < Math.max(left.length, right.length)) sz *= 2;
            while (left.length < sz) left.push(null);
            while (right.length < sz) right.push(null);
            left = [...left, ...right];
        }
        return left;
    }

    // ===== STEP 3: Connect to DB =====
    console.log('🔌 Step 3: Connecting to database...');
    const c = new MongoClient(MONGO_URI);
    await c.connect();
    const db = c.db(DB_NAME);
    const matchCol = db.collection('matches');
    const teamCol = db.collection('teams');
    const tid = new ObjectId(TID);

    const allTeams = await teamCol.find({ tournament: tid }).toArray();
    const allTeamIds = allTeams.map(t => t._id.toString());
    console.log(`  ${allTeams.length} teams in tournament\n`);

    // Build ordered team list using match trees
    const elimSet = new Set();
    const activeSet = new Set();
    for (const m of matches) {
        if (m.homeScore === m.awayScore) continue;
        const wid = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
        const lid = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        activeSet.add(wid);
        elimSet.add(lid);
    }
    for (const e of elimSet) activeSet.delete(e);

    // Build bracket slots from match trees (preserves match pairs)
    const slotList = [];
    const roots = [...activeSet].sort((a, b) => depth(b) - depth(a));
    for (const r of roots) slotList.push(...buildTree(r));
    // Add unplaced teams
    for (const t of allTeamIds) {
        if (!placed.has(t)) { slotList.push(t); placed.add(t); }
    }
    // Pad to S with null (BYEs)
    while (slotList.length < S) slotList.push(null);
    slotList.length = S;

    // Standard seed distribution: spread BYEs evenly using getSeedOrder mapping
    // Map our ordered list through the seeding algorithm
    const getSeedOrder = (size) => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // CRITICAL: The tree ordering has match pairs at [0,1], [2,3], [4,5]...
    // We need these pairs to stay together in the bracket.
    // Extract pairs, then place them using getSeedOrder for even BYE distribution
    const pairs = [];
    for (let x = 0; x < S; x += 2) {
        pairs.push([slotList[x], slotList[x + 1]]);
    }

    // Sort pairs: real matches first, then BYEs, then empty
    const pairScore = (p) => {
        if (p[0] && p[1]) return 0; // real match = highest priority
        if (p[0] || p[1]) return 1; // BYE
        return 2; // empty
    };
    pairs.sort((a, b) => pairScore(a) - pairScore(b));

    // Place pairs into bracket slots using seedOrder for even distribution
    const teamSlots = new Array(S).fill(null);
    const halfSeedOrder = []; // Seed for each pair position
    for (let x = 0; x < S / 2; x++) {
        // Use seedOrder to determine which bracket matchup slot this pair goes to
        const slotIdx = seedOrder.indexOf(x + 1);
        const matchupIdx = Math.floor(slotIdx / 2);
        halfSeedOrder.push(matchupIdx);
    }
    // Actually simpler: just place pairs directly using tree order
    // (tree order naturally places match pairs adjacent)
    for (let x = 0; x < S / 2; x++) {
        teamSlots[x * 2] = pairs[x][0];
        teamSlots[x * 2 + 1] = pairs[x][1];
    }

    const realR1 = pairs.filter(p => p[0] && p[1]).length;
    const byeR1 = pairs.filter(p => (p[0] || p[1]) && !(p[0] && p[1])).length;
    console.log(`  Real R1: ${realR1}, BYE R1: ${byeR1}, Teams: ${allTeamIds.length}\n`);

    // ===== STEP 4: Delete current data =====
    console.log('🗑️  Step 4: Deleting current bracket...');
    const deleted = await matchCol.deleteMany({ tournament: tid });
    console.log(`  Deleted ${deleted.deletedCount} matches`);

    await teamCol.updateMany({ tournament: tid }, {
        $set: { status: 'active', stats: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] } }
    });
    console.log('  Reset all team stats\n');

    // ===== STEP 5: Create bracket =====
    console.log('🏗️  Step 5: Creating 1024-bracket...');
    const totalRounds = Math.log2(S);
    const getRN = (r) => {
        if (r === totalRounds) return "Chung kết";
        if (r === totalRounds - 1) return "Bán kết";
        if (r === totalRounds - 2) return "Tứ kết";
        return 'Vòng ' + (S / Math.pow(2, r - 1));
    };

    const mid = {};
    // Rounds 2+
    for (let r = 2; r <= totalRounds; r++) {
        const count = S / Math.pow(2, r);
        const docs = [];
        for (let j = 0; j < count; j++) {
            docs.push({
                tournament: tid, round: r, roundName: getRN(r), matchNumber: j + 1,
                homeTeam: null, awayTeam: null, homeScore: null, awayScore: null,
                winner: null, status: 'scheduled', bracketPosition: { x: r - 1, y: j },
                events: [], resultSubmissions: [], leg: 1,
            });
        }
        const result = await matchCol.insertMany(docs);
        Object.values(result.insertedIds).forEach((id, j) => { mid[r + '_' + j] = id; });
    }

    // Link nextMatch
    for (let r = 2; r < totalRounds; r++) {
        const count = S / Math.pow(2, r);
        for (let j = 0; j < count; j++) {
            await matchCol.updateOne({ _id: mid[r + '_' + j] }, { $set: { nextMatch: mid[(r + 1) + '_' + Math.floor(j / 2)] } });
        }
    }

    // Round 1: create matches from teamSlots pairs
    let r1Created = 0;
    for (let j = 0; j < S / 2; j++) {
        const tA = teamSlots[j * 2];
        const tB = teamSlots[j * 2 + 1];
        const nextIdx = Math.floor(j / 2);
        const nextId = mid['2_' + nextIdx];
        const side = j % 2 === 0 ? 'homeTeam' : 'awayTeam';

        if (tA && tB) {
            await matchCol.insertOne({
                tournament: tid, round: 1, roundName: getRN(1), matchNumber: j + 1,
                homeTeam: new ObjectId(tA), awayTeam: new ObjectId(tB),
                homeScore: null, awayScore: null, winner: null, status: 'scheduled',
                bracketPosition: { x: 0, y: j }, nextMatch: nextId,
                events: [], resultSubmissions: [], leg: 1,
            });
            r1Created++;
        } else if (tA || tB) {
            const byeT = tA || tB;
            await matchCol.insertOne({
                tournament: tid, round: 1, roundName: getRN(1), matchNumber: j + 1,
                homeTeam: new ObjectId(byeT), awayTeam: null,
                homeScore: 0, awayScore: 0, winner: new ObjectId(byeT), status: 'bye',
                bracketPosition: { x: 0, y: j }, nextMatch: nextId,
                events: [], resultSubmissions: [], leg: 1,
            });
            await matchCol.updateOne({ _id: nextId }, { $set: { [side]: new ObjectId(byeT) } });
            r1Created++;
        }
        // Skip completely empty slots
    }
    console.log(`  R1: ${r1Created} matches created\n`);

    // ===== STEP 6: Apply results iteratively =====
    console.log('⚡ Step 6: Applying match results...');
    let totalApplied = 0;
    for (let iter = 1; iter <= 20; iter++) {
        let applied = 0;
        for (let r = 1; r <= totalRounds; r++) {
            const roundMatches = await matchCol.find({ tournament: tid, round: r, status: 'scheduled' }).toArray();
            for (const m of roundMatches) {
                if (!m.homeTeam || !m.awayTeam) continue;
                const hid = m.homeTeam.toString(), aid = m.awayTeam.toString();
                const result = matches.find(rec =>
                    (rec.homeTeamId === hid && rec.awayTeamId === aid) ||
                    (rec.homeTeamId === aid && rec.awayTeamId === hid)
                );
                if (!result) continue;

                const hs = result.homeTeamId === hid ? result.homeScore : result.awayScore;
                const as = result.homeTeamId === hid ? result.awayScore : result.homeScore;
                if (hs === as) continue;
                const winnerId = hs > as ? hid : aid;
                const loserId = winnerId === hid ? aid : hid;

                await matchCol.updateOne({ _id: m._id }, {
                    $set: { homeScore: hs, awayScore: as, winner: new ObjectId(winnerId), status: 'completed', completedAt: new Date() }
                });
                if (m.nextMatch) {
                    const slot = m.bracketPosition.y % 2 === 0 ? 'homeTeam' : 'awayTeam';
                    await matchCol.updateOne({ _id: m.nextMatch }, { $set: { [slot]: new ObjectId(winnerId) } });
                }
                await teamCol.updateOne({ _id: new ObjectId(winnerId) }, {
                    $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.goalsFor': hs > as ? hs : as, 'stats.goalsAgainst': hs > as ? as : hs, 'stats.goalDifference': Math.abs(hs - as), 'stats.points': 3 }
                });
                await teamCol.updateOne({ _id: new ObjectId(loserId) }, {
                    $inc: { 'stats.played': 1, 'stats.losses': 1, 'stats.goalsFor': hs > as ? as : hs, 'stats.goalsAgainst': hs > as ? hs : as, 'stats.goalDifference': -(Math.abs(hs - as)) },
                    $set: { status: 'eliminated' }
                });
                applied++;
            }
        }
        totalApplied += applied;
        if (applied === 0) break;
        console.log('  Iteration ' + iter + ': +' + applied + ' (total: ' + totalApplied + ')');
    }

    // ===== STEP 7: Fix unmatched by swapping =====
    console.log('\n🔧 Step 7: Fixing unmatched results...');
    const completedPairs = new Set();
    (await matchCol.find({ tournament: tid, status: 'completed' }).toArray()).forEach(m => {
        if (m.homeTeam && m.awayTeam) {
            completedPairs.add(m.homeTeam + '_' + m.awayTeam);
            completedPairs.add(m.awayTeam + '_' + m.homeTeam);
        }
    });
    const unmatched = matches.filter(m =>
        !completedPairs.has(m.homeTeamId + '_' + m.awayTeamId) &&
        !completedPairs.has(m.awayTeamId + '_' + m.homeTeamId)
    );
    console.log('  Unmatched: ' + unmatched.length);

    // Swap + apply loop
    for (let pass = 0; pass < 5; pass++) {
        const scheduled = await matchCol.find({ tournament: tid, status: 'scheduled' }).toArray();
        const teamLoc = {};
        for (const m of scheduled) {
            if (m.homeTeam) teamLoc[m.homeTeam.toString()] = { matchId: m._id, field: 'homeTeam', other: 'awayTeam', match: m };
            if (m.awayTeam) teamLoc[m.awayTeam.toString()] = { matchId: m._id, field: 'awayTeam', other: 'homeTeam', match: m };
        }

        // Re-check unmatched
        const cp2 = new Set();
        (await matchCol.find({ tournament: tid, status: 'completed' }).toArray()).forEach(m => {
            if (m.homeTeam && m.awayTeam) { cp2.add(m.homeTeam + '_' + m.awayTeam); cp2.add(m.awayTeam + '_' + m.homeTeam); }
        });
        const um2 = matches.filter(m => !cp2.has(m.homeTeamId + '_' + m.awayTeamId) && !cp2.has(m.awayTeamId + '_' + m.homeTeamId));
        if (um2.length === 0) break;

        let swapped = 0;
        for (const result of um2) {
            const hid = result.homeTeamId, aid = result.awayTeamId;
            const hLoc = teamLoc[hid], aLoc = teamLoc[aid];
            if (!hLoc || !aLoc) continue;
            if (hLoc.matchId.toString() === aLoc.matchId.toString()) continue;

            // Swap: put aid into hLoc's match, displace the other team
            const displaced = hLoc.match[hLoc.other]?.toString();
            await matchCol.updateOne({ _id: hLoc.matchId }, { $set: { [hLoc.other]: new ObjectId(aid) } });
            if (displaced) {
                await matchCol.updateOne({ _id: aLoc.matchId }, { $set: { [aLoc.field]: new ObjectId(displaced) } });
            } else {
                await matchCol.updateOne({ _id: aLoc.matchId }, { $set: { [aLoc.field]: null } });
            }
            swapped++;
        }

        // Apply newly matched
        let applied2 = 0;
        for (let iter = 0; iter < 10; iter++) {
            let a = 0;
            const sched2 = await matchCol.find({ tournament: tid, status: 'scheduled' }).toArray();
            for (const m of sched2) {
                if (!m.homeTeam || !m.awayTeam) continue;
                const hid = m.homeTeam.toString(), aid = m.awayTeam.toString();
                const res = matches.find(r => (r.homeTeamId === hid && r.awayTeamId === aid) || (r.homeTeamId === aid && r.awayTeamId === hid));
                if (!res) continue;
                const hs = res.homeTeamId === hid ? res.homeScore : res.awayScore;
                const as = res.homeTeamId === hid ? res.awayScore : res.homeScore;
                if (hs === as) continue;
                const wid = hs > as ? hid : aid;
                const lid = wid === hid ? aid : hid;
                await matchCol.updateOne({ _id: m._id }, { $set: { homeScore: hs, awayScore: as, winner: new ObjectId(wid), status: 'completed', completedAt: new Date() } });
                if (m.nextMatch) {
                    const slot = m.bracketPosition.y % 2 === 0 ? 'homeTeam' : 'awayTeam';
                    await matchCol.updateOne({ _id: m.nextMatch }, { $set: { [slot]: new ObjectId(wid) } });
                }
                await teamCol.updateOne({ _id: new ObjectId(wid) }, { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.goalsFor': Math.max(hs,as), 'stats.goalsAgainst': Math.min(hs,as), 'stats.goalDifference': Math.abs(hs-as), 'stats.points': 3 } });
                await teamCol.updateOne({ _id: new ObjectId(lid) }, { $inc: { 'stats.played': 1, 'stats.losses': 1, 'stats.goalsFor': Math.min(hs,as), 'stats.goalsAgainst': Math.max(hs,as), 'stats.goalDifference': -Math.abs(hs-as) }, $set: { status: 'eliminated' } });
                a++;
            }
            applied2 += a;
            totalApplied += a;
            if (a === 0) break;
        }
        console.log('  Pass ' + (pass + 1) + ': swapped ' + swapped + ', applied ' + applied2);
        if (swapped === 0 && applied2 === 0) break;
    }

    // ===== FINAL STATS =====
    const comp = await matchCol.countDocuments({ tournament: tid, status: 'completed' });
    const bye = await matchCol.countDocuments({ tournament: tid, status: 'bye' });
    const sched = await matchCol.countDocuments({ tournament: tid, status: 'scheduled' });
    const actT = await teamCol.countDocuments({ tournament: tid, status: 'active' });
    const elT = await teamCol.countDocuments({ tournament: tid, status: 'eliminated' });

    console.log('\n============================================');
    console.log('✅ RECOVERY COMPLETE!');
    console.log('============================================');
    console.log('Matches: ' + comp + ' completed, ' + bye + ' BYE, ' + sched + ' scheduled');
    console.log('Teams: ' + actT + ' active, ' + elT + ' eliminated');
    console.log('Recovery: ' + totalApplied + '/' + matches.length + ' matches applied');
    console.log('============================================');

    await c.close();
}

main().catch(err => { console.error('❌ ERROR:', err); process.exit(1); });
