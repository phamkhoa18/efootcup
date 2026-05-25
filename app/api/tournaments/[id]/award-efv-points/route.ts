import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Registration from "@/models/Registration";
import EfvPointLog from "@/models/EfvPointLog";
import EfvPointLog2v2 from "@/models/EfvPointLog2v2";
import Bxh from "@/models/Bxh";
import Bxh2v2 from "@/models/Bxh2v2";
import { requireRole, apiResponse, apiError } from "@/lib/auth";
import { getPlacementFromBracketRound, getEfvPoints, EFV_TIER_WINDOWS, PLACEMENT_RANK } from "@/lib/efv-points";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tournaments/[id]/award-efv-points
 * 
 * Trao điểm EFV khi giải kết thúc.
 * Hỗ trợ cả 1v1 (teamSize=1) và 2v2 (teamSize=2).
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
        const N = teams.length;
        let S = 2; while (S < N) S *= 2;
        const totalRounds = Math.log2(S);

        // 5. Determine placement for each team
        const teamPlacements: Map<string, { placement: string; teamName: string; captainId: string }> = new Map();

        const maxRound = Math.max(...matches.map(m => m.round));
        const finalMatch = matches.find(m => m.round === maxRound);

        for (const team of teams) {
            teamPlacements.set(team._id.toString(), {
                placement: "participant",
                teamName: team.name,
                captainId: team.captain ? team.captain.toString() : "",
            });
        }

        for (const match of matches) {
            if (match.status === "bye") continue;
            if (!match.winner || !match.homeTeam || !match.awayTeam) continue;

            const winnerId = match.winner.toString();
            const homeId = match.homeTeam.toString();
            const awayId = match.awayTeam.toString();
            const loserId = winnerId === homeId ? awayId : homeId;

            const isFinal = match.round === maxRound;

            if (isFinal) {
                const existing = teamPlacements.get(loserId);
                if (existing) {
                    teamPlacements.set(loserId, { ...existing, placement: "runner_up" });
                }
            } else {
                const placement = getPlacementFromBracketRound(match.round, totalRounds, S);
                const existing = teamPlacements.get(loserId);
                if (existing) {
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

        if (finalMatch && finalMatch.winner) {
            const championId = finalMatch.winner.toString();
            const existing = teamPlacements.get(championId);
            if (existing) {
                teamPlacements.set(championId, { ...existing, placement: "champion" });
            }
        }

        // ==========================================================
        // 2V2 LOGIC
        // ==========================================================
        if (tournament.teamSize === 2) {
            const pointLogs2v2: any[] = [];
            const teamPointsMap = new Map<string, number>();

            for (const team of teams) {
                const teamIdStr = team._id.toString();
                const placementInfo = teamPlacements.get(teamIdStr);
                if (!placementInfo) continue;

                // Needs exactly 2 members to award points to a pair
                if (!team.members || team.members.length < 2) {
                    continue;
                }

                const u1 = team.members[0].user.toString();
                const u2 = team.members[1].user.toString();
                if (!u1 || !u2) continue;

                const sortedUsers = [u1, u2].sort();
                const teamHash = `${sortedUsers[0]}_${sortedUsers[1]}`;

                if (teamPointsMap.has(teamHash)) continue;

                // Read custom points directly from the tournament if configured
                const customPoints: any = tournament.customEfvPoints || {};
                const points = customPoints.get ? customPoints.get(placementInfo.placement) ?? getEfvPoints(tournament.efvTier!, placementInfo.placement) : customPoints[placementInfo.placement] ?? getEfvPoints(tournament.efvTier!, placementInfo.placement);

                pointLogs2v2.push({
                    teamHash,
                    player1: sortedUsers[0],
                    player2: sortedUsers[1],
                    tournament: id,
                    mode: tournament.mode,
                    efvTier: tournament.efvTier,
                    placement: placementInfo.placement,
                    points,
                    teamName: placementInfo.teamName,
                    tournamentTitle: tournament.title,
                    awardedAt: new Date(),
                });

                teamPointsMap.set(teamHash, points);
            }

            if (pointLogs2v2.length > 0) {
                const ops = pointLogs2v2.map(log => ({
                    updateOne: {
                        filter: { teamHash: log.teamHash, tournament: log.tournament },
                        update: { $set: log },
                        upsert: true,
                    },
                }));
                await EfvPointLog2v2.bulkWrite(ops);
            }

            const affectedTeamHashes = Array.from(teamPointsMap.keys());
            await recalculateBxh2v2(affectedTeamHashes, tournament.mode);

            tournament.efvPointsAwarded = true;
            await tournament.save();

            return apiResponse(
                {
                    totalTeams: pointLogs2v2.length,
                    placements: pointLogs2v2.map(l => ({
                        teamName: l.teamName,
                        placement: l.placement,
                        points: l.points,
                    })),
                },
                200,
                `Đã trao điểm EFV 2v2 cho ${pointLogs2v2.length} đội thành công!`
            );
        }

        // ==========================================================
        // 1V1 LOGIC (Default)
        // ==========================================================
        const registrations = await Registration.find({
            tournament: id,
            status: "approved",
        }).lean();

        const teamToUser = new Map<string, string>();
        for (const team of teams) {
            if (team.captain) teamToUser.set(team._id.toString(), team.captain.toString());
        }
        for (const reg of registrations) {
            if (reg.team && reg.user) {
                teamToUser.set(reg.team.toString(), reg.user.toString());
            }
        }

        const pointLogs: any[] = [];
        const userPointsMap = new Map<string, number>();

        for (const [teamId, info] of teamPlacements) {
            const userId = teamToUser.get(teamId);
            if (!userId) continue;

            if (userPointsMap.has(userId)) continue;

            const customPoints: any = tournament.customEfvPoints || {};
            const points = customPoints.get ? customPoints.get(info.placement) ?? getEfvPoints(tournament.efvTier!, info.placement) : customPoints[info.placement] ?? getEfvPoints(tournament.efvTier!, info.placement);

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

        const affectedUserIds = Array.from(userPointsMap.keys());
        await recalculateBxh(affectedUserIds, tournament.mode);

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
 * Recalculate 1v1 BXH
 */
async function recalculateBxh(userIds: string[], mode: string) {
    const User = (await import("@/models/User")).default;
    const { getTiersForMode } = await import("@/lib/efv-points");

    const tiers = getTiersForMode(mode);

    for (const userId of userIds) {
        const allLogs = await EfvPointLog.find({ user: userId, mode })
            .sort({ awardedAt: -1 })
            .lean();

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
 * Recalculate 2v2 BXH
 */
async function recalculateBxh2v2(teamHashes: string[], mode: string) {
    const User = (await import("@/models/User")).default;
    const { getTiersForMode } = await import("@/lib/efv-points");

    const tiers = getTiersForMode(mode);

    for (const teamHash of teamHashes) {
        const allLogs = await EfvPointLog2v2.find({ teamHash, mode })
            .sort({ awardedAt: -1 })
            .lean();

        if (allLogs.length === 0) continue;

        const tierPoints: Record<string, number> = {};
        const tierCounts: Record<string, number> = {};
        for (const t of tiers) { tierPoints[t] = 0; tierCounts[t] = 0; }

        for (const log of allLogs) {
            const tier = log.efvTier;
            if (!tiers.includes(tier)) continue;
            // Use sliding window rule: max 5 matches
            const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
            if (tierCounts[tier] < maxWindow) {
                tierCounts[tier]++;
                tierPoints[tier] += log.points;
            }
        }

        const totalPoints = Object.values(tierPoints).reduce((a, b) => a + b, 0);
        const latestLog = allLogs[0];

        // Fetch user profiles to update the cache
        const u1 = await User.findById(latestLog.player1).lean() as any;
        const u2 = await User.findById(latestLog.player2).lean() as any;

        if (!u1 || !u2) continue;

        await Bxh2v2.findOneAndUpdate(
            { teamHash, mode },
            {
                $set: {
                    teamHash,
                    mode,
                    teamName: latestLog.teamName,
                    player1: {
                        userId: u1._id,
                        gamerId: String(u1.efvId || u1._id),
                        name: u1.name,
                        nickname: u1.nickname || "",
                        avatar: u1.avatar || "",
                        facebook: u1.facebookLink || u1.facebookName || "",
                    },
                    player2: {
                        userId: u2._id,
                        gamerId: String(u2.efvId || u2._id),
                        name: u2.name,
                        nickname: u2.nickname || "",
                        avatar: u2.avatar || "",
                        facebook: u2.facebookLink || u2.facebookName || "",
                    },
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
    const allBxh = await Bxh2v2.find({ mode }).sort({ points: -1 }).lean();
    const bulkOps = allBxh.map((entry, index) => ({
        updateOne: {
            filter: { _id: entry._id },
            update: { $set: { rank: index + 1 } },
        },
    }));
    if (bulkOps.length > 0) {
        await Bxh2v2.bulkWrite(bulkOps);
    }
}

/**
 * GET /api/tournaments/[id]/award-efv-points
 * Lấy danh sách điểm EFV đã trao cho giải đấu.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id } = await params;

        const tournament = await Tournament.findById(id).select("efvPointsAwarded efvTier title teamSize").lean();
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        if (!tournament.efvPointsAwarded) {
            return apiResponse({ logs: [], awarded: false });
        }

        if (tournament.teamSize === 2) {
            const logs = await EfvPointLog2v2.find({ tournament: id })
                .select("player1 player2 placement points teamName teamHash")
                .lean();

            return apiResponse({
                logs: logs.map((l: any) => ({
                    teamHash: l.teamHash,
                    placement: l.placement,
                    points: l.points,
                    teamName: l.teamName,
                })),
                awarded: true,
                tier: tournament.efvTier,
            });
        } else {
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
        }
    } catch (error: any) {
        console.error("Get EFV points error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
