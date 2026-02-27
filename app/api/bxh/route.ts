import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bxh from "@/models/Bxh";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/bxh — Get BXH list
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const bxhList = await Bxh.find().lean();

        // Sắp xếp: Thứ hạng cứng có trước
        bxhList.sort((a, b) => {
            const rankA = a.rank && a.rank > 0 ? a.rank : 999999;
            const rankB = b.rank && b.rank > 0 ? b.rank : 999999;
            if (rankA !== rankB) return rankA - rankB;
            // Nếu bằng rank (ví dụ cùng là null), thì xếp theo điểm (hoặc tùy bạn, excel không có rank thì cũng chả cần thiết, nhưng cứ xếp tạm theo điểm nếu lỡ tay chưa có rank)
            return (b.points || 0) - (a.points || 0);
        });

        const data = bxhList.map((item) => {
            return {
                id: item.gamerId,
                _id: item._id,
                name: item.name,
                facebook: item.facebook,
                team: item.team,
                nickname: item.nickname,
                points: item.points,
                rank: item.rank || 0, // Chỉ trả về rank có sẵn, nếu không có thì là 0 hoặc "?" ở Frontend tự lo
            };
        });

        return apiResponse({ data, total: data.length });
    } catch (error) {
        console.error("Get BXH error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/bxh — Create BXH entry (manager only)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        let bxhData = body;
        let replaceAll = false;

        if (body && typeof body === "object" && !Array.isArray(body) && Array.isArray(body.data)) {
            replaceAll = body.replaceAll === true;
            bxhData = body.data;
        }

        if (Array.isArray(bxhData)) {
            if (replaceAll) {
                await Bxh.deleteMany({});
                if (bxhData.length > 0) {
                    await Bxh.insertMany(bxhData);
                }
                return apiResponse(null, 201, `Đã làm mới bảng xếp hạng với ${bxhData.length} VĐV`);
            } else {
                // Bulk upsert
                const ops = bxhData.map((item: any) => ({
                    updateOne: {
                        filter: { gamerId: item.gamerId },
                        update: { $set: item },
                        upsert: true
                    }
                }));
                if (ops.length > 0) {
                    await Bxh.bulkWrite(ops);
                }
                return apiResponse(null, 201, `Đã cập nhật/thêm ${ops.length} VĐV thành công`);
            }
        } else {
            const exists = await Bxh.findOne({ gamerId: body.gamerId });
            if (exists) {
                return apiError("ID VĐV đã tồn tại trong bảng xếp hạng", 400);
            }

            const newBxh = await Bxh.create(body);

            return apiResponse(newBxh, 201, "Thêm VĐV vào BXH thành công");
        }
    } catch (error: any) {
        console.error("Create BXH error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/bxh — Clear all BXH (manager only)
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        await Bxh.deleteMany({});

        return apiResponse(null, 200, "Đã xóa toàn bộ VĐV khỏi BXH");
    } catch (error) {
        console.error("Delete all BXH error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
