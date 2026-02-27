import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bxh from "@/models/Bxh";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(req, ["manager"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const { id } = await params;
        const body = await req.json();

        // Remove gamerId update if different to prevent collision, 
        // or check collision
        if (body.gamerId) {
            const exists = await Bxh.findOne({ gamerId: body.gamerId, _id: { $ne: id } });
            if (exists) {
                return apiError("ID VĐV đã tồn tại trong bảng xếp hạng", 400);
            }
        }

        const bxh = await Bxh.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true }
        );

        if (!bxh) {
            return apiError("Không tìm thấy VĐV trong BXH", 404);
        }

        return apiResponse(bxh, 200, "Cập nhật VĐV thành công");
    } catch (error: any) {
        console.error("Update BXH error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(req, ["manager"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;

        const bxh = await Bxh.findByIdAndDelete(id);

        if (!bxh) {
            return apiError("Không tìm thấy VĐV trong BXH", 404);
        }

        return apiResponse(null, 200, "Xóa VĐV khỏi BXH thành công");
    } catch (error) {
        console.error("Delete BXH error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
