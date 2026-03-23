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
        const sortOrder: Record<string, 1 | -1> = isElimination
            ? { seed: 1, registeredAt: 1 }  // By seed/placement for elimination
            : { "stats.points": -1, "stats.goalDifference": -1 }; // By points for league

        const teams = await Team.find(teamFilter)
            .populate("captain", "name avatar efvId")
            .sort(sortOrder)
            .skip(skip)
            .limit(limit)
            .lean();

        // Get registrations for these teams (for playerName, personalPhoto, user info)
        const teamIds = teams.map((t: any) => t._id);
        const registrations = await Registration.find({
            tournament: tournamentId,
            team: { $in: teamIds },
        })
            .populate("user", "name email avatar efvId")
            .lean();

        // Build a map for quick lookup
        const regMap: Record<string, any> = {};
        for (const reg of registrations) {
            const tId = (reg.team?._id || reg.team)?.toString();
            if (tId) regMap[tId] = reg;
        }

        // Attach registration data to teams
        const teamsWithReg = teams.map((team: any) => ({
            ...team,
            _reg: regMap[team._id.toString()] || null,
        }));

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
