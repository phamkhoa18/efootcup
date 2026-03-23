import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Registration from "@/models/Registration";
import { apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/teams — Paginated teams with search
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query).select("_id efvTier status format").lean();
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        const tournamentId = tournament._id;
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "100")));
        const search = (url.searchParams.get("search") || "").trim();

        // Build team query
        const teamFilter: any = { tournament: tournamentId };

        // If search is provided, we need to find matching teams/registrations
        let matchingTeamIds: string[] | null = null;
        if (search) {
            const searchRegex = new RegExp(search, "i");

            // Find teams matching by name/shortName/captain
            const teamsByName = await Team.find({
                tournament: tournamentId,
                $or: [
                    { name: searchRegex },
                    { shortName: searchRegex },
                ],
            }).select("_id").lean();

            // Find teams matching by captain name
            const teamsWithCaptain = await Team.find({ tournament: tournamentId })
                .populate("captain", "name efvId")
                .select("_id captain")
                .lean();

            const captainMatchIds = teamsWithCaptain
                .filter((t: any) => {
                    if (!t.captain) return false;
                    return searchRegex.test(t.captain.name || "") ||
                        (t.captain.efvId != null && String(t.captain.efvId).includes(search));
                })
                .map((t: any) => t._id.toString());

            // Find registrations matching by playerName
            const regMatches = await Registration.find({
                tournament: tournamentId,
                playerName: searchRegex,
            }).select("team").lean();

            const allMatchIds = new Set([
                ...teamsByName.map((t: any) => t._id.toString()),
                ...captainMatchIds,
                ...regMatches.map((r: any) => (r.team?._id || r.team)?.toString()).filter(Boolean),
            ]);

            matchingTeamIds = Array.from(allMatchIds);
            if (matchingTeamIds.length === 0) {
                return apiResponse({
                    teams: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                });
            }

            teamFilter._id = { $in: matchingTeamIds.map(id => new mongoose.Types.ObjectId(id)) };
        }

        // Count total matching teams
        const total = await Team.countDocuments(teamFilter);
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;

        // Fetch paginated teams — sort depends on format
        const isElimination = (tournament as any).format === "single_elimination" || (tournament as any).format === "double_elimination";
        const isCompletedElim = isElimination && (tournament as any).status === "completed";
        const sortOrder: Record<string, 1 | -1> = isElimination
            ? { seed: 1, registeredAt: 1 }
            : { "stats.points": -1, "stats.goalDifference": -1 };

        // For completed elimination: fetch ALL teams so we can sort by placement then paginate
        let teams;
        if (isCompletedElim) {
            teams = await Team.find(teamFilter).populate("captain", "name avatar efvId").sort(sortOrder).lean();
        } else {
            teams = await Team.find(teamFilter).populate("captain", "name avatar efvId").sort(sortOrder).skip(skip).limit(limit).lean();
        }

        // Get registrations for these teams
        const teamIds = teams.map((t: any) => t._id);
        const registrations = await Registration.find({
            tournament: tournamentId,
            team: { $in: teamIds },
        }).populate("user", "name email avatar efvId").lean();

        const regMap: Record<string, any> = {};
        for (const reg of registrations) {
            const tId = (reg.team?._id || reg.team)?.toString();
            if (tId) regMap[tId] = reg;
        }

        // Calculate placements from bracket matches for completed elimination tournaments
        let placementMap: Map<string, { placement: string; efvPoints: number }> | null = null;
        let participantPts = 0;
        if (isCompletedElim) {
            const Match = (await import("@/models/Match")).default;
            const { getPlacementFromBracketRound, getEfvPoints, PLACEMENT_RANK } = await import("@/lib/efv-points");

            const efvTier = (tournament as any).efvTier;
            participantPts = efvTier ? getEfvPoints(efvTier, "participant") : 0;

            const matches = await Match.find({
                tournament: tournamentId,
                status: { $in: ["completed", "bye"] },
            }).sort({ round: 1 }).lean();

            if (matches.length > 0) {
                const totalTeamCount = await Team.countDocuments({ tournament: tournamentId });
                let S = 2; while (S < totalTeamCount) S *= 2;
                const totalRounds = Math.log2(S);
                const maxRound = Math.max(...matches.map((m: any) => m.round));

                placementMap = new Map();
                for (const match of matches as any[]) {
                    if (match.status === "bye") continue;
                    if (!match.winner || !match.homeTeam || !match.awayTeam) continue;
                    const winnerId = match.winner.toString();
                    const homeId = match.homeTeam.toString();
                    const awayId = match.awayTeam.toString();
                    const loserId = winnerId === homeId ? awayId : homeId;

                    const placement = match.round === maxRound
                        ? "runner_up"
                        : getPlacementFromBracketRound(match.round, totalRounds, S);

                    const existing = placementMap.get(loserId);
                    const existingRank = existing ? (PLACEMENT_RANK[existing.placement] ?? 99) : 99;
                    if ((PLACEMENT_RANK[placement] ?? 99) < existingRank) {
                        placementMap.set(loserId, {
                            placement,
                            efvPoints: efvTier ? getEfvPoints(efvTier, placement) : 0,
                        });
                    }
                }
                // Champion = winner of final match
                const finalMatch = (matches as any[]).find(m => m.round === maxRound && m.status === "completed");
                if (finalMatch?.winner) {
                    placementMap.set(finalMatch.winner.toString(), {
                        placement: "champion",
                        efvPoints: efvTier ? getEfvPoints(efvTier, "champion") : 0,
                    });
                }
            }
        }

        // Attach registration + placement data to teams
        let teamsWithReg = teams.map((team: any) => {
            const teamId = team._id.toString();
            const pi = placementMap?.get(teamId);
            return {
                ...team,
                _reg: regMap[teamId] || null,
                ...(placementMap ? {
                    _placement: pi?.placement || "participant",
                    _efvPoints: pi?.efvPoints ?? participantPts,
                } : {}),
            };
        });

        // Sort by placement rank for completed elimination, then paginate in memory
        if (placementMap) {
            const PR: Record<string, number> = { champion: 1, runner_up: 2, top_4: 3, top_8: 4, top_16: 5, top_32: 6, participant: 99 };
            teamsWithReg.sort((a: any, b: any) => {
                const rA = PR[a._placement || "participant"] ?? 99;
                const rB = PR[b._placement || "participant"] ?? 99;
                if (rA !== rB) return rA - rB;
                return (a.seed || 999) - (b.seed || 999);
            });
            teamsWithReg = teamsWithReg.slice(skip, skip + limit);
        }

        return apiResponse({
            teams: teamsWithReg,
            pagination: { page, limit, total, totalPages },
            tournament: {
                efvTier: tournament.efvTier,
                status: tournament.status,
                format: (tournament as any).format,
            },
        });
    } catch (error) {
        console.error("Get teams paginated error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/teams — Save team seeds
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { requireManager } = await import("@/lib/auth");
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query).select("_id createdBy collaborators").lean();
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const isOwner = (tournament as any).createdBy.toString() === authResult.user._id;
        const isCollaborator = ((tournament as any).collaborators || []).some(
            (c: any) => c.userId.toString() === authResult.user._id
        );
        if (!isOwner && !isCollaborator) return apiError("Không có quyền", 403);

        const body = await req.json();

        // Bulk save seeds: { seeds: [{ teamId, seed }] }
        if (body.seeds && Array.isArray(body.seeds)) {
            const bulkOps = body.seeds.map((item: { teamId: string; seed: number | null }) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(item.teamId), tournament: tournament._id },
                    update: { $set: { seed: item.seed } },
                },
            }));

            if (bulkOps.length > 0) {
                await Team.bulkWrite(bulkOps);
            }

            return apiResponse({ updated: bulkOps.length }, 200, "Đã lưu hạt giống");
        }

        return apiError("Thiếu dữ liệu", 400);
    } catch (error) {
        console.error("Update team seeds error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
