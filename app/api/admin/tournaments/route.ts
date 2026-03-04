import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/tournaments — all tournaments (any creator)
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const query: any = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
            ];
        }
        if (status) query.status = status;

        const total = await Tournament.countDocuments(query);
        const tournaments = await Tournament.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("createdBy", "name email");

        return apiResponse({
            tournaments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error("Admin get tournaments error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/tournaments — update any tournament
export async function PUT(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();
        const { tournamentId, ...updateData } = body;

        if (!tournamentId) return apiError("Thiếu tournamentId", 400);

        const tournament = await Tournament.findByIdAndUpdate(
            tournamentId,
            updateData,
            { new: true }
        );

        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        return apiResponse(tournament, 200, "Cập nhật thành công");
    } catch (error: any) {
        console.error("Admin update tournament error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/admin/tournaments — delete any tournament
export async function DELETE(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { tournamentId } = await req.json();

        if (!tournamentId) return apiError("Thiếu tournamentId", 400);

        const tournament = await Tournament.findByIdAndDelete(tournamentId);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        return apiResponse(null, 200, "Đã xóa giải đấu");
    } catch (error: any) {
        console.error("Admin delete tournament error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
