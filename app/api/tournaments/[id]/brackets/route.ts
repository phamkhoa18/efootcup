import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Notification from "@/models/Notification";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/brackets — Generate brackets
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        const isOwner = tournament.createdBy.toString() === authResult.user._id;

        // 🛡️ FIX: Chỉ owner mới được tạo/tạo lại bracket - collaborator KHÔNG được phép
        if (!isOwner && authResult?.user?.role !== "admin") {
            return apiError("Chỉ chủ giải mới có quyền tạo lịch thi đấu. Cộng tác viên chỉ có thể nhập kết quả trận đấu.", 403);
        }

        // Parse optional seeds and force flag from request body
        let seeds: string[] = [];
        let forceRegenerate = false;
        try {
            const body = await req.json();
            if (body?.seeds && Array.isArray(body.seeds)) {
                seeds = body.seeds;
            }
            if (body?.force === true) {
                forceRegenerate = true;
            }
        } catch { }

        // 🛡️ FIX: Ngăn tạo lại bracket khi giải đang diễn ra và đã có trận hoàn thành
        const existingMatches = await Match.countDocuments({ tournament: id });
        const completedMatches = await Match.countDocuments({ tournament: id, status: "completed" });

        if (existingMatches > 0 && !forceRegenerate) {
            const msg = completedMatches > 0
                ? `⚠️ Giải đấu đã có ${existingMatches} trận đấu (${completedMatches} trận đã hoàn thành). Tạo lại lịch sẽ XÓA TOÀN BỘ kết quả. Bấm xác nhận lưu / tạo lại để tiếp tục (Bắt buộc với Chủ giải).`
                : `Giải đấu đã có ${existingMatches} trận đấu. Gửi lại request với force: true để xác nhận tạo lại.`;
            return apiError(msg, 400);
        }

        if (completedMatches > 0 && forceRegenerate) {
            console.warn(`⚠️ [BRACKETS] Force regeneration for tournament ${id}. Deleting ${existingMatches} matches (${completedMatches} completed) by Owner user ${authResult.user._id} at ${new Date().toISOString()}`);
        }

        // Reset any previously eliminated teams back to active
        await Team.updateMany(
            { tournament: id, status: "eliminated" },
            { $set: { status: "active", stats: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 } } }
        );

        const teams = await Team.find({ tournament: id, status: "active" });
        if (teams.length < 2) return apiError("Cần ít nhất 2 đội", 400);

        await Match.deleteMany({ tournament: id });

        let matches;
        switch (tournament.format) {
            case "single_elimination":
                matches = await generateSingleElimination(id.toString(), teams, seeds);
                break;
            case "double_elimination":
                matches = await generateDoubleElimination(id.toString(), teams, seeds, tournament.scoring?.resetFinal !== false);
                break;
            case "round_robin":
                matches = await generateRoundRobin(id.toString(), teams);
                break;
            default:
                matches = await generateSingleElimination(id.toString(), teams, seeds);
        }

        tournament.status = "ongoing";
        await tournament.save();

        return apiResponse({ matches, totalMatches: matches.length }, 201, "Tạo bracket thành công");
    } catch (error) {
        console.error("Generate brackets error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// GET /api/tournaments/[id]/brackets
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;
        const tournament = await Tournament.findOne(mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }).select("_id").lean();
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        const rawMatches = await Match.find({ tournament: id })
            .populate("homeTeam", "name shortName logo stars seed")
            .populate("awayTeam", "name shortName logo stars seed")
            .populate("winner", "name shortName")
            .populate("updatedBy", "name email")
            .sort({ round: 1, "bracketPosition.y": 1 })
            .lean();

        const Registration = (await import('@/models/Registration')).default;
        const User = (await import('@/models/User')).default;
        const registrations = await Registration.find({ tournament: id, status: 'approved' }).select('user team playerName player2Name player2User facebookName facebookLink player2FacebookName player2FacebookLink personalPhoto gamerId nickname').populate('user', 'efvId avatar personalPhoto').populate('player2User', 'efvId').lean();
        const teamMap = new Map();
        registrations.forEach(r => { if (r.team) teamMap.set(r.team.toString(), r); });

        const matches = rawMatches.map((match: any) => {
            [match.homeTeam, match.awayTeam].forEach(t => {
                if (t && t._id) {
                    const reg = teamMap.get(t._id.toString());
                    if (reg) {
                        t.player1 = reg.playerName;
                        t.facebookName = reg.facebookName;
                        t.facebookLink = reg.facebookLink;
                        t.player2 = reg.player2Name;
                        t.player2FacebookName = reg.player2FacebookName;
                        t.player2FacebookLink = reg.player2FacebookLink;
                        t.player2EfvId = reg.player2User?.efvId;
                        t.efvId = reg.user?.efvId;
                        t.avatar = reg.user?.avatar || '';
                        t.personalPhoto = reg.personalPhoto || reg.user?.personalPhoto || '';
                    }
                }
            });
            return match;
        });

        // Enrich resultSubmissions with full user + registration data
        const allSubmissionUserIds = new Set<string>();
        matches.forEach((m: any) => {
            m.resultSubmissions?.forEach((sub: any) => {
                if (sub.user) allSubmissionUserIds.add(sub.user.toString());
            });
        });

        if (allSubmissionUserIds.size > 0) {
            // Fetch user details
            const submissionUsers = await User.find({ _id: { $in: Array.from(allSubmissionUserIds) } })
                .select('name avatar efvId gamerId nickname')
                .lean();
            const userMap = new Map(submissionUsers.map((u: any) => [u._id.toString(), u]));

            // Fetch registrations for these users in this tournament
            const submissionRegs = await Registration.find({
                tournament: id,
                user: { $in: Array.from(allSubmissionUserIds) },
            }).select('user playerName gamerId personalPhoto nickname team').lean();
            const regByUser = new Map(submissionRegs.map((r: any) => [r.user.toString(), r]));

            matches.forEach((m: any) => {
                m.resultSubmissions?.forEach((sub: any) => {
                    const uid = sub.user?.toString();
                    if (uid) {
                        const u = userMap.get(uid);
                        const r = regByUser.get(uid);
                        sub.userData = {
                            name: r?.playerName || u?.name || 'VĐV',
                            avatar: u?.avatar || '',
                            efvId: u?.efvId ?? null,
                            gamerId: r?.gamerId || u?.gamerId || '',
                            nickname: r?.nickname || u?.nickname || '',
                            personalPhoto: r?.personalPhoto || '',
                        };
                    }
                });
            });
        }

        const rounds: Record<string, any[]> = {};
        matches.forEach(m => {
            const rk = m.roundName || `Vòng ${m.round}`;
            if (!rounds[rk]) rounds[rk] = [];
            rounds[rk].push(m);
        });

        // Debug: check resultSubmissions
        const withSubs = matches.filter((m: any) => m.resultSubmissions && m.resultSubmissions.length > 0);
        if (withSubs.length > 0) {
            console.log(`🟠 Brackets: ${withSubs.length} matches have resultSubmissions`);
            withSubs.forEach((m: any) => console.log(`  Match #${m.matchNumber}: ${m.resultSubmissions.length} submissions`));
        } else {
            console.log(`🟠 Brackets: NO matches have resultSubmissions. Total matches: ${matches.length}`);
        }

        return apiResponse({ matches, rounds });
    } catch (e) { return apiError("Lỗi", 500); }
}

/**
 * Standard Professional Bracket Generation (Complete - shows all players including BYEs)
 * 
 * 1. Find S = next power of 2 >= N (number of teams)
 * 2. Calculate Byes = S - N. These teams get a BYE in Round 1.
 * 3. ALL S/2 Round 1 slots are created as matches.
 *    - Real matches: 2 teams present → status "scheduled"
 *    - BYE matches: only 1 team → status "bye", team auto-promoted to Round 2
 *    - Empty slots: no teams → not created (shouldn't happen with proper seeding)
 * 4. This ensures EVERY player appears on the bracket from Round 1.
 * 5. Total real matches = N - 1. BYE matches are visual-only.
 */
async function generateSingleElimination(tournamentId: string, teams: any[], seeds: string[] = []) {
    const N = teams.length;
    let S = 2; while (S < N) S *= 2;
    const totalRounds = Math.log2(S);

    // Standard Seeding (1 vs S, 2 vs S-1, etc.)
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Order teams: use manual seeds if provided, otherwise random shuffle
    let orderedTeams: any[];
    if (seeds.length > 0) {
        // Manual seeding: order teams by the provided seed IDs
        const teamMap = new Map(teams.map(t => [t._id.toString(), t]));
        orderedTeams = [];
        for (const seedId of seeds) {
            const team = teamMap.get(seedId);
            if (team) {
                orderedTeams.push(team);
                teamMap.delete(seedId);
            }
        }
        // Add any remaining teams not in seeds (shouldn't happen, but safety)
        for (const team of teamMap.values()) {
            orderedTeams.push(team);
        }
    } else {
        orderedTeams = [...teams].sort(() => Math.random() - 0.5);
    }

    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const slotIndex = seedOrder.indexOf(i + 1);
        teamSlots[slotIndex] = orderedTeams[i];
    }

    const allMatches: any[] = [];
    const matchesMap = new Map<number, Map<number, any>>();

    const getRoundName = (r: number, max: number, size: number) => {
        if (r === max) return "Chung kết";
        if (r === max - 1) return "Bán kết";
        if (r === max - 2) return "Tứ kết";
        const teamsInRound = size / Math.pow(2, r - 1);
        return `Vòng ${teamsInRound}`;
    };

    // 1. Pre-create all matches from Round 2 onwards
    for (let r = 2; r <= totalRounds; r++) {
        matchesMap.set(r, new Map());
        const matchCount = S / Math.pow(2, r);
        for (let i = 0; i < matchCount; i++) {
            const match = await Match.create({
                tournament: tournamentId,
                round: r,
                roundName: getRoundName(r, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: null,
                awayTeam: null,
                status: "scheduled",
                bracketPosition: { x: r - 1, y: i },
            });
            matchesMap.get(r)!.set(i, match);
        }
    }

    // 2. Create ALL Round 1 matches (including BYEs)
    matchesMap.set(1, new Map());
    for (let i = 0; i < S / 2; i++) {
        const teamA = teamSlots[i * 2];
        const teamB = teamSlots[i * 2 + 1];

        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = matchesMap.get(2)!.get(nextIdx);

        if (teamA && teamB) {
            // Both slots filled → Real match
            const match = await Match.create({
                tournament: tournamentId,
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: teamA._id,
                awayTeam: teamB._id,
                status: "scheduled",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
            });
            matchesMap.get(1)!.set(i, match);
            allMatches.push(match);
        } else if (teamA || teamB) {
            // Only one team → BYE match (visual slot, team auto-promoted)
            const byeTeam = teamA || teamB;

            const match = await Match.create({
                tournament: tournamentId,
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
            });
            matchesMap.get(1)!.set(i, match);
            allMatches.push(match);

            // Auto-promote BYE team to Round 2
            r2Match[side] = byeTeam._id;
            await r2Match.save();
        }
        // If both null → skip (shouldn't happen with proper seeding)
    }

    // 3. Link Round 2+ matches to their successors
    for (let r = 2; r <= totalRounds; r++) {
        const roundMatches = matchesMap.get(r)!;
        for (const [idx, match] of roundMatches.entries()) {
            if (r < totalRounds) {
                const nextIdx = Math.floor(idx / 2);
                const nextMatch = matchesMap.get(r + 1)!.get(nextIdx);
                match.nextMatch = nextMatch._id;
                await match.save();
            }
            allMatches.push(match);
        }
    }

    return allMatches;
}

/**
 * Double Elimination Bracket Generation
 * 
 * Structure:
 * - Winner Bracket (WB): Standard single elimination
 * - Loser Bracket (LB): Losers from WB drop here, play through a second bracket
 * - Grand Final (GF): WB champion vs LB champion
 * - Reset Match: If LB champion wins GF1, a second GF match is played (optional)
 * 
 * LB Round Structure for S-team bracket (S = next power of 2):
 *   totalWBRounds = log2(S)
 *   totalLBRounds = 2 * (totalWBRounds - 1)
 *   
 *   Odd LB rounds (1,3,5...): receive drops from WB + play vs existing LB teams
 *   Even LB rounds (2,4,6...): internal LB matches (no new drops)
 */
async function generateDoubleElimination(tournamentId: string, teams: any[], seeds: string[] = [], resetFinal: boolean = true) {
    const N = teams.length;
    if (N < 2) throw new Error("Cần ít nhất 2 đội");

    let S = 2; while (S < N) S *= 2;
    const totalWBRounds = Math.log2(S);
    const totalLBRounds = 2 * (totalWBRounds - 1);

    // Standard Seeding (same as single elimination)
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Order teams
    let orderedTeams: any[];
    if (seeds.length > 0) {
        const teamMap = new Map(teams.map(t => [t._id.toString(), t]));
        orderedTeams = [];
        for (const seedId of seeds) {
            const team = teamMap.get(seedId);
            if (team) {
                orderedTeams.push(team);
                teamMap.delete(seedId);
            }
        }
        for (const team of teamMap.values()) orderedTeams.push(team);
    } else {
        orderedTeams = [...teams].sort(() => Math.random() - 0.5);
    }

    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        const slotIndex = seedOrder.indexOf(i + 1);
        teamSlots[slotIndex] = orderedTeams[i];
    }

    const allMatches: any[] = [];
    // Maps: wbMatchesMap[round][posY] = match, lbMatchesMap[lbRound][posY] = match
    const wbMatchesMap = new Map<number, Map<number, any>>();
    const lbMatchesMap = new Map<number, Map<number, any>>();

    const getWBRoundName = (r: number) => `Round ${r}`;

    const getLBRoundName = (lbR: number) => `Losers Round ${lbR}`;

    // ===== STEP 1: Create Winner Bracket (WB) =====
    // Pre-create WB matches from Round 2 onwards
    let matchCounter = 0;
    for (let r = 2; r <= totalWBRounds; r++) {
        wbMatchesMap.set(r, new Map());
        const matchCount = S / Math.pow(2, r);
        for (let i = 0; i < matchCount; i++) {
            matchCounter++;
            const match = await Match.create({
                tournament: tournamentId,
                round: r,
                roundName: getWBRoundName(r),
                matchNumber: matchCounter,
                homeTeam: null,
                awayTeam: null,
                status: "scheduled",
                bracketType: "winner",
                bracketPosition: { x: r - 1, y: i },
            });
            wbMatchesMap.get(r)!.set(i, match);
        }
    }

    // Create WB Round 1 matches (including BYEs)
    wbMatchesMap.set(1, new Map());
    for (let i = 0; i < S / 2; i++) {
        const teamA = teamSlots[i * 2];
        const teamB = teamSlots[i * 2 + 1];

        const nextIdx = Math.floor(i / 2);
        const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
        const r2Match = wbMatchesMap.get(2)!.get(nextIdx);

        matchCounter++;
        if (teamA && teamB) {
            const match = await Match.create({
                tournament: tournamentId,
                round: 1,
                roundName: getWBRoundName(1),
                matchNumber: matchCounter,
                homeTeam: teamA._id,
                awayTeam: teamB._id,
                status: "scheduled",
                bracketType: "winner",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
            });
            wbMatchesMap.get(1)!.set(i, match);
            allMatches.push(match);
        } else if (teamA || teamB) {
            const byeTeam = teamA || teamB;
            const match = await Match.create({
                tournament: tournamentId,
                round: 1,
                roundName: getWBRoundName(1),
                matchNumber: matchCounter,
                homeTeam: byeTeam._id,
                awayTeam: null,
                homeScore: 0,
                awayScore: 0,
                winner: byeTeam._id,
                status: "bye",
                bracketType: "winner",
                bracketPosition: { x: 0, y: i },
                nextMatch: r2Match._id,
            });
            wbMatchesMap.get(1)!.set(i, match);
            allMatches.push(match);

            r2Match[side] = byeTeam._id;
            await r2Match.save();
        }
    }

    // Link WB Round 2+ matches to their successors
    for (let r = 2; r <= totalWBRounds; r++) {
        const roundMatches = wbMatchesMap.get(r)!;
        for (const [idx, match] of roundMatches.entries()) {
            if (r < totalWBRounds) {
                const nextIdx = Math.floor(idx / 2);
                const nextMatch = wbMatchesMap.get(r + 1)!.get(nextIdx);
                match.nextMatch = nextMatch._id;
                await match.save();
            }
            allMatches.push(match);
        }
    }

    // ===== STEP 2: Create Loser Bracket (LB) =====
    // LB structure:
    //   LB Round 1: Losers from WB R1 play each other (S/4 matches if no byes)
    //   LB Round 2: Winners of LB R1 vs Losers from WB R2 (receiving drops)
    //   LB Round 3: Winners of LB R2 play each other
    //   LB Round 4: Winners of LB R3 vs Losers from WB R3 (receiving drops)
    //   ... and so on
    //
    // Match counts per LB round:
    //   LB R1: S/4 matches (losers from WB R1 paired up)
    //   LB R2: S/4 matches (same count, drops from WB R2 come in)
    //   LB R3: S/8 matches (halved - internal matches)
    //   LB R4: S/8 matches (drops from WB R3 come in)
    //   ...
    //   LB Final: 1 match

    // Calculate match counts for each LB round
    const lbRoundMatchCounts: number[] = [];
    let lbMatchCount = S / 4; // LB R1 starts with S/4 matches
    for (let lbR = 1; lbR <= totalLBRounds; lbR++) {
        lbRoundMatchCounts.push(lbMatchCount);
        // After odd rounds (drop rounds), same count continues
        // After even rounds (internal rounds), count halves
        if (lbR % 2 === 0) {
            lbMatchCount = Math.max(1, lbMatchCount / 2);
        }
    }

    // Create all LB matches
    for (let lbR = 1; lbR <= totalLBRounds; lbR++) {
        lbMatchesMap.set(lbR, new Map());
        const count = lbRoundMatchCounts[lbR - 1];
        for (let i = 0; i < count; i++) {
            matchCounter++;
            const match = await Match.create({
                tournament: tournamentId,
                round: 100 + lbR, // Use 100+ offset to distinguish LB rounds in DB
                roundName: getLBRoundName(lbR),
                matchNumber: matchCounter,
                homeTeam: null,
                awayTeam: null,
                status: "scheduled",
                bracketType: "loser",
                bracketPosition: { x: lbR - 1, y: i },
            });
            lbMatchesMap.get(lbR)!.set(i, match);
            allMatches.push(match);
        }
    }

    // Link LB matches: each LB match's winner goes to the next LB round
    for (let lbR = 1; lbR < totalLBRounds; lbR++) {
        const currentRound = lbMatchesMap.get(lbR)!;
        const nextRound = lbMatchesMap.get(lbR + 1)!;

        for (const [idx, match] of currentRound.entries()) {
            let nextIdx: number;
            if (lbR % 2 === 1) {
                // Odd LB round → next round has same match count, 1:1 mapping
                nextIdx = idx;
            } else {
                // Even LB round → next round has half the matches, pair up
                nextIdx = Math.floor(idx / 2);
            }
            const nextMatch = nextRound.get(nextIdx);
            if (nextMatch) {
                // Winner of this LB match goes as home or away
                const side = (lbR % 2 === 0) ? (idx % 2 === 0 ? "homeTeam" : "awayTeam") : "homeTeam";
                match.nextMatch = nextMatch._id;
                await match.save();
            }
        }
    }

    // ===== STEP 3: Link WB losers to LB (loserDropsToMatch) =====
    
    // WB Round 1 → LB Round 1 (pair up: WB 0&1 → LB 0)
    const wbR1 = wbMatchesMap.get(1)!;
    const lbR1 = lbMatchesMap.get(1)!;
    for (const [idx, wbMatch] of wbR1.entries()) {
        const lbIdx = Math.floor(idx / 2);
        const lbMatch = lbR1.get(lbIdx);
        if (lbMatch) {
            wbMatch.loserDropsToMatch = lbMatch._id;
            await wbMatch.save();
        }
    }

    // WB Round 2+ → LB Drop Rounds
    let dropRoundIndex = 1; // 1 for WB R2->LB R2, 2 for WB R3->LB R4, etc.
    for (let r = 2; r <= totalWBRounds; r++) {
        const lbR = 2 * (r - 1); // r=2 -> lbR=2, r=3 -> lbR=4, r=4 -> lbR=6
        const wbRMatches = wbMatchesMap.get(r);
        const lbRMatches = lbMatchesMap.get(lbR);
        
        if (wbRMatches && lbRMatches) {
            const count = lbRMatches.size;
            // Cross drops in alternating drop rounds to prevent rematches
            // Round 1 (WB R2) -> cross
            // Round 2 (WB R3) -> no cross
            // Round 3 (WB R4) -> cross
            const shouldCross = dropRoundIndex % 2 !== 0;
            
            for (const [idx, wbMatch] of wbRMatches.entries()) {
                const lbIdx = shouldCross ? count - 1 - idx : idx;
                const lbMatch = lbRMatches.get(lbIdx);
                if (lbMatch) {
                    wbMatch.loserDropsToMatch = lbMatch._id;
                    await wbMatch.save();
                }
            }
        }
        dropRoundIndex++;
    }

    // ===== STEP 4 & 5: Grand Final removed per user request =====
    // The user explicitly requested to only have Winner and Loser brackets.
    // So WB Final winner and LB Final winner do NOT play a Grand Final.

    await resolveGhosts(tournamentId, Match);

    return allMatches;
}

async function generateRoundRobin(tournamentId: string, teams: any[]) {
    const allMatches = [];
    const teamList = [...teams];
    if (teamList.length % 2 !== 0) teamList.push(null);
    const n = teamList.length;
    for (let r = 0; r < n - 1; r++) {
        for (let i = 0; i < n / 2; i++) {
            const h = teamList[i], a = teamList[n - 1 - i];
            if (h && a) {
                const m = await Match.create({
                    tournament: tournamentId,
                    round: r + 1,
                    roundName: `Vòng ${r + 1}`,
                    matchNumber: i + 1,
                    homeTeam: h._id,
                    awayTeam: a._id,
                    status: "scheduled",
                    bracketPosition: { x: r, y: i },
                });
                allMatches.push(m);
            }
        }
        teamList.splice(1, 0, teamList.pop()!);
    }
    return allMatches;
}
export async function resolveGhosts(tournamentId: any, Match: any) {
    const wbR1Byes = await Match.find({ tournament: tournamentId, round: 1, bracketType: "winner", status: "bye" }).lean();
    
    const deadLBSlots = new Map<string, string>();
    for (const m of wbR1Byes) {
        if (m.loserDropsToMatch) {
            const posY = m.bracketPosition?.y ?? 0;
            const side = posY % 2 === 0 ? "homeTeam" : "awayTeam";
            deadLBSlots.set(`${m.loserDropsToMatch}_${side}`, "dead");
        }
    }
    
    const lbR1Matches = await Match.find({ tournament: tournamentId, round: 101, bracketType: "loser" });
    
    const cascadeAdvance = async (matchId: string, winnerId: string, depth = 0) => {
        if (depth > 10) return;
        const match = await Match.findById(matchId);
        if (!match || !match.nextMatch) return;

        const siblings = await Match.find({
            tournament: match.tournament,
            round: match.round,
            nextMatch: match.nextMatch,
        }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

        const idx = siblings.findIndex((m: any) => m._id.toString() === match._id.toString());
        const nextMatch = await Match.findById(match.nextMatch);
        if (nextMatch) {
            const lbR = match.round - 100;
            const side = (lbR % 2 === 1) ? "homeTeam" : (idx % 2 === 0 ? "homeTeam" : "awayTeam");
            nextMatch[side] = winnerId;
            await nextMatch.save();
        }
    };
    
    for (const lbMatch of lbR1Matches) {
        const homeDead = deadLBSlots.has(`${lbMatch._id}_homeTeam`);
        const awayDead = deadLBSlots.has(`${lbMatch._id}_awayTeam`);
        
        if (homeDead && awayDead) {
            lbMatch.status = "bye";
            await lbMatch.save();
        } else if (homeDead && lbMatch.awayTeam && lbMatch.status !== "walkover" && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.awayTeam;
            lbMatch.status = "walkover";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.awayTeam.toString());
        } else if (awayDead && lbMatch.homeTeam && lbMatch.status !== "walkover" && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.homeTeam;
            lbMatch.status = "walkover";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.homeTeam.toString());
        }
    }
}

