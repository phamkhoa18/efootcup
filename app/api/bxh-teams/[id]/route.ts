import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import BxhTeam from "@/models/BxhTeam";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/bxh-teams/[id] — Get single team
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const team = await BxhTeam.findById(id).lean();
        if (!team) return apiError("Không tìm thấy đội", 404);
        return apiResponse(team);
    } catch (error) {
        console.error("Get BXH Team error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/bxh-teams/[id] — Update team (manager only)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updated = await BxhTeam.findByIdAndUpdate(
            id,
            {
                rank: Number(body.rank) || 0,
                clubName: body.clubName,
                leader: body.leader,
                point: Number(body.point) || 0,
                logo: body.logo || "",
            },
            { new: true, runValidators: true }
        );

        if (!updated) return apiError("Không tìm thấy đội", 404);

        return apiResponse(updated, 200, "Cập nhật đội thành công");
    } catch (error: any) {
        console.error("Update BXH Team error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/bxh-teams/[id] — Delete single team (manager only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;
        const deleted = await BxhTeam.findByIdAndDelete(id);
        if (!deleted) return apiError("Không tìm thấy đội", 404);

        return apiResponse(null, 200, `Đã xóa đội ${deleted.clubName}`);
    } catch (error) {
        console.error("Delete BXH Team error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
