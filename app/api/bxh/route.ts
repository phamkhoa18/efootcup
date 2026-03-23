import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bxh from "@/models/Bxh";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/bxh — Get BXH list (filtered by mode)
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "mobile";

        const bxhList = await Bxh.find({ mode }).lean();

        // Sắp xếp: Thứ hạng cứng có trước
        bxhList.sort((a, b) => {
            const rankA = a.rank && a.rank > 0 ? a.rank : 999999;
            const rankB = b.rank && b.rank > 0 ? b.rank : 999999;
            if (rankA !== rankB) return rankA - rankB;
            return (b.points || 0) - (a.points || 0);
        });

        // Look up User data (avatar, efvId, facebookLink) by efvId (stored as gamerId in BXH)
        const User = (await import("@/models/User")).default;
        const efvIds = bxhList.map(item => Number(item.gamerId)).filter(n => !isNaN(n));
        const users = efvIds.length > 0
            ? await User.find({ efvId: { $in: efvIds } }).select("efvId avatar facebookLink facebookName").lean()
            : [];
        const userMap = new Map<number, { avatar?: string; efvId: number; facebookLink?: string; facebookName?: string }>();
        for (const u of users) {
            userMap.set(u.efvId, { avatar: u.avatar || "", efvId: u.efvId, facebookLink: u.facebookLink || "", facebookName: u.facebookName || "" });
        }

        const data = bxhList.map((item) => {
            const userInfo = userMap.get(Number(item.gamerId));
            // Determine the best facebook link: prefer User.facebookLink, then check if BXH.facebook is a URL
            const bxhFb = item.facebook || "";
            const isBxhFbUrl = bxhFb.startsWith("http") || bxhFb.startsWith("www.") || bxhFb.includes("facebook.com");
            const facebookLink = userInfo?.facebookLink || (isBxhFbUrl ? bxhFb : "");
            const facebookName = userInfo?.facebookName || (!isBxhFbUrl && bxhFb ? bxhFb : "");

            return {
                id: item.gamerId,
                _id: item._id,
                name: item.name,
                facebook: facebookLink, // Always a URL now
                facebookName: facebookName, // Display name
                team: item.team,
                nickname: item.nickname,
                points: item.points,
                // User profile
                avatar: userInfo?.avatar || "",
                efvId: userInfo?.efvId ?? item.gamerId,
                // Mobile tiers
                pointsEfv250: (item as any).pointsEfv250 || 0,
                pointsEfv500: (item as any).pointsEfv500 || 0,
                pointsEfv1000: (item as any).pointsEfv1000 || 0,
                // PC tiers
                pointsEfv50: (item as any).pointsEfv50 || 0,
                pointsEfv100: (item as any).pointsEfv100 || 0,
                pointsEfv200: (item as any).pointsEfv200 || 0,
                rank: item.rank || 0,
            };
        });

        return apiResponse({ data, total: data.length, mode });
    } catch (error) {
        console.error("Get BXH error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/bxh — Create BXH entry (manager only)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        let bxhData = body;
        let replaceAll = false;
        let mode = body?.mode || "mobile";

        if (body && typeof body === "object" && !Array.isArray(body) && Array.isArray(body.data)) {
            replaceAll = body.replaceAll === true;
            mode = body.mode || "mobile";
            bxhData = body.data;
        }

        if (Array.isArray(bxhData)) {
            // Ensure every entry has the correct mode
            bxhData = bxhData.map((item: any) => ({ ...item, mode }));

            if (replaceAll) {
                await Bxh.deleteMany({ mode });
                if (bxhData.length > 0) {
                    await Bxh.insertMany(bxhData);
                }
                return apiResponse(null, 201, `Đã làm mới bảng xếp hạng với ${bxhData.length} VĐV`);
            } else {
                // Bulk upsert
                const ops = bxhData.map((item: any) => ({
                    updateOne: {
                        filter: { gamerId: item.gamerId, mode },
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
            const exists = await Bxh.findOne({ gamerId: body.gamerId, mode });
            if (exists) {
                return apiError("ID VĐV đã tồn tại trong bảng xếp hạng", 400);
            }

            const newBxh = await Bxh.create({ ...body, mode });

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

// DELETE /api/bxh — Clear all BXH for a specific mode (manager only)
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "mobile";

        await Bxh.deleteMany({ mode });

        const modeLabel = mode === "pc" ? "Console" : "Mobile";
        return apiResponse(null, 200, `Đã xóa toàn bộ VĐV khỏi BXH ${modeLabel}`);
    } catch (error) {
        console.error("Delete all BXH error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
