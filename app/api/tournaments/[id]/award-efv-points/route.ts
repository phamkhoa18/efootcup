import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Registration from "@/models/Registration";
import EfvPointLog from "@/models/EfvPointLog";
import Bxh from "@/models/Bxh";
import { requireRole, apiResponse, apiError } from "@/lib/auth";
import { getPlacementFromBracketRound, getEfvPoints, EFV_TIER_WINDOWS, PLACEMENT_RANK } from "@/lib/efv-points";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tournaments/[id]/award-efv-points
 * 
 * Trao điểm EFV khi giải kết thúc.
 * Manager sở hữu giải hoặc Admin được gọi.
 * Chỉ hoạt động với giải có efvTier và format single_elimination.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;

        // 1. Validate tournament
        const tournament = await Tournament.findById(id);
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        // Admin bypasses ownership check, manager must own the tournament
        if (authResult.user.role !== "admin" && tournament.createdBy.toString() !== authResult.user._id) {
            return apiError("Bạn không có quyền thao tác giải đấu này", 403);
        }

        if (!tournament.efvTier) {
            return apiError("Giải này không có hạng EFV, không thể trao điểm", 400);
        }

        if (tournament.efvPointsAwarded) {
            return apiError("Điểm EFV đã được trao cho giải này rồi", 400);
        }

        if (tournament.status !== "completed") {
            return apiError("Giải đấu phải kết thúc mới có thể trao điểm EFV", 400);
        }

        // 2. Get all matches to determine placements (include bye matches too)
        const matches = await Match.find({
            tournament: id,
            status: { $in: ["completed", "bye"] },
        })
            .sort({ round: 1, matchNumber: 1 })
            .lean();

        if (matches.filter(m => m.status === "completed").length === 0) {
            return apiError("Giải chưa có trận đấu nào hoàn thành", 400);
        }

        // 3. Get all teams in the tournament
        const teams = await Team.find({ tournament: id }).lean();
        if (teams.length === 0) {
            return apiError("Giải chưa có đội nào", 400);
        }

        // 4. Calculate bracket size and total rounds
        // Must match bracket generation: S = next power of 2 >= N
        const N = teams.length;
        let S = 2; while (S < N) S *= 2;
        const totalRounds = Math.log2(S);

        // 5. Determine placement for each team
        const teamPlacements: Map<string, { placement: string; teamName: string; captainId: string }> = new Map();

        // Find the final match (highest round)
        const maxRound = Math.max(...matches.map(m => m.round));
        const finalMatch = matches.find(m => m.round === maxRound);

        // Initialize all teams as "participant"
        for (const team of teams) {
            teamPlacements.set(team._id.toString(), {
                placement: "participant",
                teamName: team.name,
                captainId: team.captain.toString(),
            });
        }

        // Process matches to find losers at each round
        // Key logic: placement is determined by WHICH ROUND they reached,
        // not how many matches they played.
        // A player in "Vòng 16" (round of 16) who loses → Top 16
        // A player in "Tứ kết" (quarterfinal / round of 8) who loses → Top 8
        // BYE matches are skipped (no loser in a BYE)
        for (const match of matches) {
            // Skip BYE matches — no one loses in a BYE
            if (match.status === "bye") continue;
            if (!match.winner || !match.homeTeam || !match.awayTeam) continue;

            const winnerId = match.winner.toString();
            const homeId = match.homeTeam.toString();
            const awayId = match.awayTeam.toString();
            const loserId = winnerId === homeId ? awayId : homeId;

            // Determine placement based on the bracket round
            const isFinal = match.round === maxRound;

            if (isFinal) {
                // Loser of the final = runner_up
                const existing = teamPlacements.get(loserId);
                if (existing) {
                    teamPlacements.set(loserId, { ...existing, placement: "runner_up" });
                }
            } else {
                // Determine placement from the number of teams in this round
                // teamsInRound = S / 2^(round-1) → the "Vòng X" number
                // e.g., round 1 with S=32 → 32 teams → "Vòng 32" → Top 32
                //        round 2 with S=32 → 16 teams → "Vòng 16" → Top 16
                //        round 3 with S=32 →  8 teams → "Tứ kết"  → Top 8
                //        round 4 with S=32 →  4 teams → "Bán kết" → Top 4
                const placement = getPlacementFromBracketRound(match.round, totalRounds, S);
                const existing = teamPlacements.get(loserId);
                if (existing) {
                    // Always update: a team should get the BEST (deepest) placement
                    // In case a team somehow has multiple losses recorded,
                    // the later round (higher placement) wins
                    const currentRank = PLACEMENT_RANK[existing.placement] ?? 99;
                    const newRank = PLACEMENT_RANK[placement] ?? 99;
                    if (newRank < currentRank) {
                        teamPlacements.set(loserId, { ...existing, placement });
                    } else if (existing.placement === "participant") {
                        teamPlacements.set(loserId, { ...existing, placement });
                    }
                }
            }
        }

        // Set champion (winner of the final)
        if (finalMatch && finalMatch.winner) {
            const championId = finalMatch.winner.toString();
            const existing = teamPlacements.get(championId);
            if (existing) {
                teamPlacements.set(championId, { ...existing, placement: "champion" });
            }
        }

        // 6. Award points — get user IDs from registrations/teams
        const registrations = await Registration.find({
            tournament: id,
            status: "approved",
        }).lean();

        // Map team → user (captain)
        const teamToUser = new Map<string, string>();
        for (const team of teams) {
            teamToUser.set(team._id.toString(), team.captain.toString());
        }
        // Also from registrations (for users who registered but team captain)
        for (const reg of registrations) {
            if (reg.team && reg.user) {
                // Registration linked to a team - use the user from registration
                teamToUser.set(reg.team.toString(), reg.user.toString());
            }
        }

        const pointLogs: any[] = [];
        const userPointsMap = new Map<string, number>(); // userId → points for this tournament

        for (const [teamId, info] of teamPlacements) {
            const userId = teamToUser.get(teamId);
            if (!userId) continue;

            // Don't award the same user twice (multiple teams in same tournament edge case)
            if (userPointsMap.has(userId)) continue;

            const points = getEfvPoints(tournament.efvTier!, info.placement);

            pointLogs.push({
                user: userId,
                tournament: id,
                mode: tournament.mode,
                efvTier: tournament.efvTier,
                placement: info.placement,
                points,
                teamName: info.teamName,
                tournamentTitle: tournament.title,
                awardedAt: new Date(),
            });

            userPointsMap.set(userId, points);
        }

        // 7. Insert point logs (bulkWrite with upsert for safety)
        if (pointLogs.length > 0) {
            const ops = pointLogs.map(log => ({
                updateOne: {
                    filter: { user: log.user, tournament: log.tournament },
                    update: { $set: log },
                    upsert: true,
                },
            }));
            await EfvPointLog.bulkWrite(ops);
        }

        // 8. Update BXH for all affected users (sliding window: 5 giải gần nhất)
        const affectedUserIds = Array.from(userPointsMap.keys());
        await recalculateBxh(affectedUserIds, tournament.mode);

        // 9. Mark tournament as awarded
        tournament.efvPointsAwarded = true;
        await tournament.save();

        return apiResponse(
            {
                totalPlayers: pointLogs.length,
                placements: pointLogs.map(l => ({
                    teamName: l.teamName,
                    placement: l.placement,
                    points: l.points,
                })),
            },
            200,
            `Đã trao điểm EFV cho ${pointLogs.length} VĐV thành công!`
        );
    } catch (error: any) {
        console.error("Award EFV points error:", error);
        return apiError(error.message || "Có lỗi xảy ra khi trao điểm EFV", 500);
    }
}

/**
 * Recalculate BXH for given users based on per-tier sliding windows.
 * Supports both Mobile (EFV250/500/1000) and PC (EFV50/100/200) modes.
 */
async function recalculateBxh(userIds: string[], mode: string) {
    const User = (await import("@/models/User")).default;
    const { getTiersForMode } = await import("@/lib/efv-points");

    const tiers = getTiersForMode(mode);

    for (const userId of userIds) {
        const allLogs = await EfvPointLog.find({ user: userId, mode })
            .sort({ awardedAt: -1 })
            .lean();

        // Calculate per-tier points
        const tierPoints: Record<string, number> = {};
        const tierCounts: Record<string, number> = {};
        for (const t of tiers) { tierPoints[t] = 0; tierCounts[t] = 0; }

        for (const log of allLogs) {
            const tier = log.efvTier;
            if (!tiers.includes(tier)) continue;
            const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
            if (tierCounts[tier] < maxWindow) {
                tierCounts[tier]++;
                tierPoints[tier] += log.points;
            }
        }

        const totalPoints = Object.values(tierPoints).reduce((a, b) => a + b, 0);
        const latestTeamName = allLogs[0]?.teamName || "";

        const user = await User.findById(userId).lean() as any;
        if (!user) continue;

        await Bxh.findOneAndUpdate(
            { gamerId: String(user.efvId || userId), mode },
            {
                $set: {
                    gamerId: String(user.efvId || userId),
                    mode,
                    name: user.name,
                    facebook: user.facebookName || user.facebookLink || "",
                    team: latestTeamName,
                    nickname: user.nickname || "",
                    points: totalPoints,
                    pointsEfv250: tierPoints["efv_250"] || 0,
                    pointsEfv500: tierPoints["efv_500"] || 0,
                    pointsEfv1000: tierPoints["efv_1000"] || 0,
                    pointsEfv50: tierPoints["efv_50"] || 0,
                    pointsEfv100: tierPoints["efv_100"] || 0,
                    pointsEfv200: tierPoints["efv_200"] || 0,
                },
            },
            { upsert: true }
        );
    }

    // Recalculate ranks for this mode
    const allBxh = await Bxh.find({ mode }).sort({ points: -1 }).lean();
    const bulkOps = allBxh.map((entry, index) => ({
        updateOne: {
            filter: { _id: entry._id },
            update: { $set: { rank: index + 1 } },
        },
    }));
    if (bulkOps.length > 0) {
        await Bxh.bulkWrite(bulkOps);
    }
}

/**
 * GET /api/tournaments/[id]/award-efv-points
 * 
 * Lấy danh sách điểm EFV đã trao cho giải đấu.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id } = await params;

        const tournament = await Tournament.findById(id).select("efvPointsAwarded efvTier title").lean();
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        if (!tournament.efvPointsAwarded) {
            return apiResponse({ logs: [], awarded: false });
        }

        const logs = await EfvPointLog.find({ tournament: id })
            .select("user placement points teamName")
            .lean();

        return apiResponse({
            logs: logs.map((l: any) => ({
                userId: l.user?.toString(),
                placement: l.placement,
                points: l.points,
                teamName: l.teamName,
            })),
            awarded: true,
            tier: tournament.efvTier,
        });
    } catch (error: any) {
        console.error("Get EFV points error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
