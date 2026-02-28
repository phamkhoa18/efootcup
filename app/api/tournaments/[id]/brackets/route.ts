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
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

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
                matches = await generateSingleElimination(id.toString(), teams);
                break;
            case "round_robin":
                matches = await generateRoundRobin(id.toString(), teams);
                break;
            default:
                matches = await generateSingleElimination(id.toString(), teams);
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
            .populate("homeTeam", "name shortName logo stars")
            .populate("awayTeam", "name shortName logo stars")
            .populate("winner", "name shortName")
            .sort({ round: 1, "bracketPosition.y": 1 })
            .lean();

        const Registration = (await import('@/models/Registration')).default;
        const registrations = await Registration.find({ tournament: id, status: 'approved' }).lean();
        const teamMap = new Map();
        registrations.forEach(r => { if (r.team) teamMap.set(r.team.toString(), r); });

        const matches = rawMatches.map((match: any) => {
            [match.homeTeam, match.awayTeam].forEach(t => {
                if (t && t._id) {
                    const reg = teamMap.get(t._id.toString());
                    if (reg) { t.player1 = reg.playerName; t.player2 = reg.gamerId; }
                }
            });
            return match;
        });

        const rounds: Record<string, any[]> = {};
        matches.forEach(m => {
            const rk = m.roundName || `Vòng ${m.round}`;
            if (!rounds[rk]) rounds[rk] = [];
            rounds[rk].push(m);
        });

        return apiResponse({ matches, rounds });
    } catch (e) { return apiError("Lỗi", 500); }
}

/**
 * Standard Professional Bracket Generation
 * 1. Find S = next power of 2 >= N (number of teams)
 * 2. Calculate Byes = S - N. These teams go directly to Round 2.
 * 3. Round 1 contains (N - S/2) matches.
 * 4. Sum of winners from Round 1 + Bye teams = S/2 teams for Round 2.
 * 5. Strictly creates N-1 matches total.
 */
async function generateSingleElimination(tournamentId: string, teams: any[]) {
    const N = teams.length;
    let S = 2; while (S < N) S *= 2;
    const totalRounds = Math.log2(S);

    // Standard Seeding (1 vs 32, 2 vs 31, etc.)
    const getSeedOrder = (size: number): number[] => {
        let order = [1];
        while (order.length < size) {
            const nextSize = order.length * 2;
            order = order.flatMap(s => [s, nextSize + 1 - s]);
        }
        return order;
    };
    const seedOrder = getSeedOrder(S);

    // Shuffle and assign to seeds
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const teamSlots = new Array(S).fill(null);
    for (let i = 0; i < N; i++) {
        // Assign i-th team to seed i+1
        const slotIndex = seedOrder.indexOf(i + 1);
        teamSlots[slotIndex] = shuffledTeams[i];
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

    // 1. Pre-create all matches from Round 2 onwards to build the structure
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

    // 2. Handle Round 1 (Play-ins) and Byes
    matchesMap.set(1, new Map());
    for (let i = 0; i < S / 2; i++) {
        const teamA = teamSlots[i * 2];
        const teamB = teamSlots[i * 2 + 1];

        if (teamA && teamB) {
            // Both slots filled -> Create Round 1 Match
            const match = await Match.create({
                tournament: tournamentId,
                round: 1,
                roundName: getRoundName(1, totalRounds, S),
                matchNumber: i + 1,
                homeTeam: teamA._id,
                awayTeam: teamB._id,
                status: "scheduled",
                bracketPosition: { x: 0, y: i },
            });
            matchesMap.get(1)!.set(i, match);
            allMatches.push(match);

            // Link to Round 2
            const nextIdx = Math.floor(i / 2);
            const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
            const r2Match = matchesMap.get(2)!.get(nextIdx);
            match.nextMatch = r2Match._id;
            await match.save();
        } else if (teamA || teamB) {
            // Only one team -> Bye to Round 2
            const byeTeam = teamA || teamB;
            const nextIdx = Math.floor(i / 2);
            const side = i % 2 === 0 ? "homeTeam" : "awayTeam";
            const r2Match = matchesMap.get(2)!.get(nextIdx);

            r2Match[side] = byeTeam._id;
            await r2Match.save();
            // No Round 1 match created
        }
    }

    // 3. Link Round 2+ matches to their successors and finalize them
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
