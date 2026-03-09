import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { requireAuth, requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/teams — Get all teams in a tournament
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;

        let id = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) id = tournament._id.toString();
        }

        const { searchParams } = new URL(req.url);
        const group = searchParams.get("group");
        const status = searchParams.get("status");

        const query: any = { tournament: id };
        if (group) query.group = group;
        if (status) query.status = status;

        const teams = await Team.find(query)
            .populate("captain", "name avatar gamerId")
            .populate("members.user", "name avatar gamerId")
            .sort({ "stats.points": -1, "stats.goalDifference": -1, "stats.goalsFor": -1 })
            .lean();

        return apiResponse({ teams, total: teams.length });
    } catch (error) {
        console.error("Get teams error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments/[id]/teams — Add team (manager only)
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        // Check tournament exists and belongs to manager
        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const id = tournament._id;
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        // Check if tournament is full
        if (tournament.currentTeams >= tournament.maxTeams) {
            return apiError("Giải đấu đã đủ đội", 400);
        }

        const body = await req.json();

        const team = await Team.create({
            ...body,
            tournament: id,
            captain: body.captain || authResult.user._id,
            members: body.members || [
                {
                    user: body.captain || authResult.user._id,
                    role: "captain",
                    joinedAt: new Date(),
                },
            ],
        });

        // Update tournament team count
        await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: 1 } });

        return apiResponse(team, 201, "Thêm đội thành công");
    } catch (error: any) {
        console.error("Add team error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/teams — Update team seed (manager only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        const body = await req.json();

        // Batch update seeds: { seeds: [{ teamId, seed }] }
        if (body.seeds && Array.isArray(body.seeds)) {
            const bulkOps = body.seeds.map((s: { teamId: string; seed: number | null }) => ({
                updateOne: {
                    filter: { _id: s.teamId, tournament: tournament._id },
                    update: { $set: { seed: s.seed } },
                },
            }));
            await Team.bulkWrite(bulkOps);
            return apiResponse(null, 200, "Cập nhật hạt giống thành công");
        }

        // Single team update: { teamId, seed }
        if (body.teamId) {
            const team = await Team.findOneAndUpdate(
                { _id: body.teamId, tournament: tournament._id },
                { $set: { seed: body.seed ?? null } },
                { new: true }
            );
            if (!team) return apiError("Không tìm thấy đội", 404);
            return apiResponse(team, 200, "Cập nhật hạt giống thành công");
        }

        return apiError("Thiếu dữ liệu", 400);
    } catch (error) {
        console.error("Update team seed error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
