import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import MatchAuditLog from "@/models/MatchAuditLog";
import Tournament from "@/models/Tournament";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/matches/audit-log
// Query params: matchId (optional), userId (optional), page, limit
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;

        // Resolve slug to ID if needed
        let tournamentId = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) tournamentId = tournament._id.toString();
        }

        // Verify access
        const tournament = await Tournament.findById(tournamentId).select("createdBy collaborators").lean();
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const isOwner = tournament.createdBy.toString() === authResult.user._id;
        const isCollaborator = (tournament.collaborators || []).some(
            (c: any) => c.userId.toString() === authResult.user._id
        );
        if (!isOwner && !isCollaborator && authResult?.user?.role !== "admin") {
            return apiError("Không có quyền", 403);
        }

        const { searchParams } = new URL(req.url);
        const matchId = searchParams.get("matchId");
        const userId = searchParams.get("userId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const query: any = { tournament: tournamentId };
        if (matchId) query.match = matchId;
        if (userId) query.user = userId;

        const [total, logs] = await Promise.all([
            MatchAuditLog.countDocuments(query),
            MatchAuditLog.find(query)
                .populate("user", "name email avatar")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        // Also compute per-user stats for the tournament
        const userStats = await MatchAuditLog.aggregate([
            { $match: { tournament: new mongoose.Types.ObjectId(tournamentId) } },
            {
                $group: {
                    _id: "$user",
                    totalActions: { $sum: 1 },
                    lastAction: { $max: "$createdAt" },
                    scoreUpdates: {
                        $sum: { $cond: [{ $eq: ["$action", "update_score"] }, 1, 0] },
                    },
                    statusChanges: {
                        $sum: { $cond: [{ $eq: ["$action", "change_status"] }, 1, 0] },
                    },
                    resets: {
                        $sum: { $cond: [{ $eq: ["$action", "reset_match"] }, 1, 0] },
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo",
                    pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
                },
            },
            { $unwind: "$userInfo" },
            { $sort: { totalActions: -1 } },
        ]);

        return apiResponse({
            logs,
            userStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get audit log error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
