/**
 * TOURNAMENT RECOVERY v6 - WITH SCREENSHOT LINKS
 * Parse PM2 logs, include screenshot URLs based on userId
 */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const XLSX = require('xlsx');

const TID = '69bd4c8ad4d24902b39db3d5';
const OLD_MATCH_PREFIX = '69c28eb';
const SITE_URL = 'https://efootball.vn'; // Production URL

async function main() {
    // ===== 1. PARSE PM2 LOGS =====
    const raw = fs.readFileSync('scripts/tournament-pm2-full.txt', 'utf8');
    const blocks = raw.split('--\n').filter(b => b.trim());

    const submissions = [];
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        let matchId = null, homeScore = null, awayScore = null;
        let homeTeamId = null, awayTeamId = null;
        let homeCaptain = null, awayCaptain = null;
        let userId = null, userTeamId = null, userTeamName = null;
        let notes = '', screenshotCount = 0;

        for (const line of lines) {
            const submitMatch = line.match(/Submit result: userId=\s*(\S+)/);
            if (submitMatch) userId = submitMatch[1];

            const matchIdMatch = line.match(/matchId:\s*'([^']+)'/);
            if (matchIdMatch) matchId = matchIdMatch[1];

            const hsMatch = line.match(/^\s*homeScore:\s*(\d+)/);
            if (hsMatch) homeScore = parseInt(hsMatch[1]);

            const asMatch = line.match(/^\s*awayScore:\s*(\d+)/);
            if (asMatch) awayScore = parseInt(asMatch[1]);

            const ssMatch = line.match(/screenshots:\s*(\d+)/);
            if (ssMatch) screenshotCount = parseInt(ssMatch[1]);

            // Multi-line notes handling
            const notesMatch = line.match(/notes:\s*'(.*)'/);
            if (notesMatch) notes = notesMatch[1].replace(/\\n/g, ' ');

            const teamsMatch = line.match(/Teams:\s*home:\s*(\S+)\s+captain:\s*(\S+)\s+away:\s*(\S+)\s+captain:\s*(\S+)/);
            if (teamsMatch) {
                homeTeamId = teamsMatch[1];
                homeCaptain = teamsMatch[2];
                awayTeamId = teamsMatch[3];
                awayCaptain = teamsMatch[4];
            }

            const utMatch = line.match(/User team found:\s*(\S+)\s+(.*)/);
            if (utMatch) {
                userTeamId = utMatch[1];
                userTeamName = utMatch[2].trim();
            }
        }

        if (matchId && homeScore !== null && awayScore !== null) {
            submissions.push({
                matchId, homeScore, awayScore,
                homeTeamId, awayTeamId, homeCaptain, awayCaptain,
                userId, userTeamId, userTeamName, notes, screenshotCount,
            });
        }
    }

    // Filter old bracket only
    const oldSubs = submissions.filter(s => s.matchId.startsWith(OLD_MATCH_PREFIX));
    console.log(`Old bracket submissions: ${oldSubs.length}`);

    // Dedup by matchId (keep last) + collect ALL submissions per match for screenshots
    const matchAllSubs = {}; // matchId -> [submissions]
    const matchMap = {};
    for (const s of oldSubs) {
        if (!matchAllSubs[s.matchId]) matchAllSubs[s.matchId] = [];
        matchAllSubs[s.matchId].push(s);
        matchMap[s.matchId] = s; // last wins
    }
    const uniqueMatches = Object.values(matchMap);
    console.log(`Unique matches: ${uniqueMatches.length}`);

    // ===== 2. LOAD DB DATA =====
    const c = new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db = c.db('efootcupv2');

    const allTeams = await db.collection('teams').find({ tournament: new ObjectId(TID) }).toArray();
    const idToTeam = {};
    allTeams.forEach(t => { idToTeam[t._id.toString()] = t; });

    const regs = await db.collection('registrations').find({
        tournament: new ObjectId(TID), status: 'approved'
    }).toArray();
    const teamToReg = {};
    regs.forEach(r => { if (r.team) teamToReg[r.team.toString()] = r; });

    const userIds = [...new Set(regs.map(r => r.user?.toString()).filter(Boolean))];
    const usersArr = await db.collection('users').find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray();
    const idToUser = {};
    usersArr.forEach(u => { idToUser[u._id.toString()] = u; });

    // ===== 3. BUILD SCREENSHOT URLs =====
    // Screenshots are at: /api/files/screenshots/{userId}_{timestamp}.jpg
    // We know userId from PM2 log. We build URL patterns.
    const buildScreenshotUrls = (matchId) => {
        const allSubs = matchAllSubs[matchId] || [];
        const urls = [];
        for (const sub of allSubs) {
            if (sub.screenshotCount > 0 && sub.userId) {
                // We don't know exact timestamps, but provide userId-based search pattern
                urls.push(`${SITE_URL}/api/files/screenshots/${sub.userId}_*`);
            }
        }
        return [...new Set(urls)];
    };

    // ===== 4. CATEGORIZE TEAMS =====
    const teamMatches = {};
    const eliminatedSet = new Set();
    const winnersSet = new Set();
    const winsPerTeam = {};

    for (const m of uniqueMatches) {
        let winnerId = null, loserId = null;
        if (m.homeScore > m.awayScore) { winnerId = m.homeTeamId; loserId = m.awayTeamId; }
        else if (m.awayScore > m.homeScore) { winnerId = m.awayTeamId; loserId = m.homeTeamId; }

        if (winnerId) { winnersSet.add(winnerId); winsPerTeam[winnerId] = (winsPerTeam[winnerId] || 0) + 1; }
        if (loserId) eliminatedSet.add(loserId);

        for (const [tid, side] of [[m.homeTeamId, 'home'], [m.awayTeamId, 'away']]) {
            if (tid && tid !== 'undefined') {
                if (!teamMatches[tid]) teamMatches[tid] = [];
                teamMatches[tid].push({
                    matchId: m.matchId, opponent: side === 'home' ? m.awayTeamId : m.homeTeamId,
                    homeScore: m.homeScore, awayScore: m.awayScore, side,
                    result: (side === 'home' && m.homeScore > m.awayScore) || (side === 'away' && m.awayScore > m.homeScore)
                        ? 'WIN' : ((side === 'home' && m.homeScore < m.awayScore) || (side === 'away' && m.awayScore < m.homeScore) ? 'LOSE' : 'DRAW'),
                    notes: m.notes, userId: m.userId,
                });
            }
        }
    }

    const confirmedActive = new Set([...winnersSet].filter(id => !eliminatedSet.has(id)));
    const byeOnly = new Set();
    const unknownTeams = new Set();
    for (const t of allTeams) {
        const tid = t._id.toString();
        if (eliminatedSet.has(tid)) continue;
        if (confirmedActive.has(tid)) continue;
        if ((teamMatches[tid] || []).length === 0) byeOnly.add(tid);
        else unknownTeams.add(tid);
    }

    const getRound = (w) => w >= 4 ? 'Vòng 64+' : w === 3 ? 'Vòng 128' : w === 2 ? 'Vòng 256' : w === 1 ? 'Vòng 512' : 'N/A';

    const getTeamInfo = (tid) => {
        const team = idToTeam[tid]; const reg = teamToReg[tid];
        const user = reg?.user ? idToUser[reg.user.toString()] : null;
        return {
            name: team?.name || '?', shortName: team?.shortName || '?',
            playerName: reg?.playerName || '', gamerId: reg?.gamerId || user?.gamerId || '',
            efvId: user?.efvId || '', captain: team?.captain?.toString() || '',
        };
    };

    console.log(`Eliminated: ${eliminatedSet.size}, Active: ${confirmedActive.size}, BYE: ${byeOnly.size}, Unknown: ${unknownTeams.size}`);

    // ===== 5. EXPORT EXCEL =====
    const wb = XLSX.utils.book_new();

    // SHEET 1: Summary
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { 'Thông tin': 'Tổng đội', 'Giá trị': allTeams.length },
        { 'Thông tin': 'Bracket', 'Giá trị': '1024 (458 BYE)' },
        { 'Thông tin': 'Trận đấu phục hồi', 'Giá trị': uniqueMatches.length },
        { 'Thông tin': 'BỊ LOẠI', 'Giá trị': eliminatedSet.size },
        { 'Thông tin': 'CÒN THI ĐẤU', 'Giá trị': confirmedActive.size },
        { 'Thông tin': 'CHƯA THI ĐẤU (BYE)', 'Giá trị': byeOnly.size },
        { 'Thông tin': 'KHÔNG XÁC ĐỊNH', 'Giá trị': unknownTeams.size },
    ]), 'Tổng quan');

    // SHEET 2: Match Results WITH Screenshot URLs
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uniqueMatches.map((m, i) => {
        const hi = getTeamInfo(m.homeTeamId);
        const ai = getTeamInfo(m.awayTeamId);
        const winName = m.homeScore > m.awayScore ? hi.name : (m.awayScore > m.homeScore ? ai.name : 'HÒA');

        // Build screenshot URLs for this match
        const allSubs = matchAllSubs[m.matchId] || [];
        const screenshotLinks = allSubs
            .filter(s => s.screenshotCount > 0)
            .map(s => `${SITE_URL}/api/files/screenshots/${s.userId}_`)
            .filter((v, i, a) => a.indexOf(v) === i); // unique

        return {
            'STT': i + 1,
            'Đội nhà': hi.name,
            'VĐV nhà': hi.playerName || hi.name,
            'Tỉ số nhà': m.homeScore,
            'Tỉ số khách': m.awayScore,
            'Đội khách': ai.name,
            'VĐV khách': ai.playerName || ai.name,
            'Đội thắng': winName,
            'Ghi chú': m.notes || '',
            'Số ảnh': m.screenshotCount,
            'Screenshot (userId submitter)': m.userId || '',
            'Screenshot URL pattern': screenshotLinks.length > 0 ? screenshotLinks.join(' | ') : 'Không có ảnh',
            'Match ID': m.matchId,
        };
    })), 'Kết quả + Screenshots');

    // SHEET 3: Master list
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allTeams.map(t => {
        const tid = t._id.toString();
        const info = getTeamInfo(tid);
        const history = teamMatches[tid] || [];
        const wins = winsPerTeam[tid] || 0;
        let status;
        if (eliminatedSet.has(tid)) status = '❌ BỊ LOẠI';
        else if (confirmedActive.has(tid)) status = '✅ CÒN THI ĐẤU';
        else if (byeOnly.has(tid)) status = '🔄 CHƯA THI ĐẤU';
        else status = '❓ CẦN XÁC MINH';

        return {
            'Team ID': tid,
            'Tên đội': info.name,
            'VĐV': info.playerName || info.name,
            'Viết tắt': info.shortName,
            'EFV ID': info.efvId,
            'Gamer ID': info.gamerId,
            'Trạng thái': status,
            'Trận thắng': wins,
            'Trận thua': history.filter(h => h.result === 'LOSE').length,
            'Tổng trận': history.length,
            'Vòng đạt được': wins > 0 ? getRound(wins) : (byeOnly.has(tid) ? 'BYE' : 'N/A'),
        };
    }).sort((a, b) => {
        const o = { '✅ CÒN THI ĐẤU': 0, '🔄 CHƯA THI ĐẤU': 1, '❓ CẦN XÁC MINH': 2, '❌ BỊ LOẠI': 3 };
        return (o[a['Trạng thái']] || 4) - (o[b['Trạng thái']] || 4);
    })), 'Tất cả đội');

    // SHEET 4: Còn thi đấu
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        [...confirmedActive].map(tid => {
            const info = getTeamInfo(tid);
            const wins = winsPerTeam[tid] || 0;
            const history = teamMatches[tid] || [];
            return {
                'Tên đội': info.name,
                'VĐV': info.playerName || info.name,
                'Viết tắt': info.shortName,
                'EFV ID': info.efvId,
                'Trận thắng': wins,
                'Vòng hiện tại': getRound(wins),
                'Lịch sử': history.map(h => {
                    const o = idToTeam[h.opponent]?.name || '?';
                    return `${h.result}: ${h.homeScore}-${h.awayScore} vs ${o}`;
                }).join(' | '),
                'Team ID': tid,
            };
        }).sort((a, b) => b['Trận thắng'] - a['Trận thắng'])
    ), 'Còn thi đấu');

    // SHEET 5: Bị loại
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        [...eliminatedSet].map(tid => {
            const info = getTeamInfo(tid);
            const wins = winsPerTeam[tid] || 0;
            const history = teamMatches[tid] || [];
            const lost = history.find(h => h.result === 'LOSE');
            const lostTo = lost ? (idToTeam[lost.opponent]?.name || '?') : '?';
            // Find screenshots for the lost match
            const lostMatchSubs = lost ? (matchAllSubs[lost.matchId] || []) : [];
            const lostScreenshots = lostMatchSubs.filter(s => s.screenshotCount > 0)
                .map(s => `${SITE_URL}/api/files/screenshots/${s.userId}_`);

            return {
                'Tên đội': info.name,
                'VĐV': info.playerName || info.name,
                'Viết tắt': info.shortName,
                'EFV ID': info.efvId,
                'Thắng trước loại': wins,
                'Thua bởi': lostTo,
                'Tỉ số thua': lost ? `${lost.homeScore}-${lost.awayScore}` : '?',
                'Screenshot trận thua': lostScreenshots.join(' | ') || '',
                'Team ID': tid,
            };
        }).sort((a, b) => a['Tên đội'].localeCompare(b['Tên đội']))
    ), 'Bị loại');

    // SHEET 6: Chưa thi đấu
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        [...byeOnly].map(tid => {
            const info = getTeamInfo(tid);
            return {
                'Tên đội': info.name,
                'VĐV': info.playerName || info.name,
                'Viết tắt': info.shortName,
                'EFV ID': info.efvId,
                'Ghi chú': 'BYE vòng 1 - chưa có trận đấu nào trong dữ liệu',
                'Team ID': tid,
            };
        }).sort((a, b) => a['Tên đội'].localeCompare(b['Tên đội']))
    ), 'Chưa thi đấu');

    // SHEET 7: Cần xác minh
    if (unknownTeams.size > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
            [...unknownTeams].map(tid => {
                const info = getTeamInfo(tid);
                const history = teamMatches[tid] || [];
                return {
                    'Tên đội': info.name,
                    'VĐV': info.playerName || info.name,
                    'Viết tắt': info.shortName,
                    'EFV ID': info.efvId,
                    'Lịch sử': history.map(h => {
                        const o = idToTeam[h.opponent]?.name || '?';
                        return `${h.result}: ${h.homeScore}-${h.awayScore} vs ${o}`;
                    }).join(' | '),
                    'Team ID': tid,
                };
            })
        ), 'Cần xác minh');
    }

    const outPath = 'scripts/tournament-recovery-FINAL.xlsx';
    XLSX.writeFile(wb, outPath);
    console.log(`\n✅ Excel: ${outPath}`);

    // JSON
    fs.writeFileSync('scripts/recovery-data-final.json', JSON.stringify({
        eliminated: [...eliminatedSet],
        active: [...confirmedActive],
        byeOnly: [...byeOnly],
        unknown: [...unknownTeams],
        matches: uniqueMatches.map(m => ({
            matchId: m.matchId, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId,
            homeScore: m.homeScore, awayScore: m.awayScore,
        })),
    }, null, 2));
    console.log('JSON: scripts/recovery-data-final.json');

    await c.close();
}

main().catch(console.error);
