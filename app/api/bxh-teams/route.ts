import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import BxhTeam from "@/models/BxhTeam";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/bxh-teams — Get all teams ranking (public)
export async function GET() {
    try {
        await dbConnect();

        const teams = await BxhTeam.find({}).lean();

        // Sort by rank (ascending), then by points (descending)
        teams.sort((a, b) => {
            const rankA = a.rank && a.rank > 0 ? a.rank : 999999;
            const rankB = b.rank && b.rank > 0 ? b.rank : 999999;
            if (rankA !== rankB) return rankA - rankB;
            return (b.point || 0) - (a.point || 0);
        });

        const data = teams.map((item) => ({
            _id: item._id,
            rank: item.rank || 0,
            clubName: item.clubName,
            leader: item.leader,
            point: item.point || 0,
            logo: item.logo || "",
        }));

        return apiResponse({ data, total: data.length });
    } catch (error) {
        console.error("Get BXH Teams error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/bxh-teams — Create team(s) (manager only)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        let teamsData = body;
        let replaceAll = false;

        // Check if bulk import with wrapper
        if (body && typeof body === "object" && !Array.isArray(body) && Array.isArray(body.data)) {
            replaceAll = body.replaceAll === true;
            teamsData = body.data;
        }

        if (Array.isArray(teamsData)) {
            if (replaceAll) {
                await BxhTeam.deleteMany({});
                if (teamsData.length > 0) {
                    await BxhTeam.insertMany(teamsData);
                }
                return apiResponse(null, 201, `Đã làm mới BXH Teams với ${teamsData.length} đội`);
            } else {
                // Bulk upsert by clubName
                const ops = teamsData.map((item: any) => ({
                    updateOne: {
                        filter: { clubName: item.clubName },
                        update: { $set: item },
                        upsert: true,
                    },
                }));
                if (ops.length > 0) {
                    await BxhTeam.bulkWrite(ops);
                }
                return apiResponse(null, 201, `Đã cập nhật/thêm ${ops.length} đội thành công`);
            }
        } else {
            // Single create
            const newTeam = await BxhTeam.create(body);
            return apiResponse(newTeam, 201, "Thêm đội vào BXH Teams thành công");
        }
    } catch (error: any) {
        console.error("Create BXH Team error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/bxh-teams — Clear all teams (manager only)
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        await BxhTeam.deleteMany({});

        return apiResponse(null, 200, "Đã xóa toàn bộ BXH Teams");
    } catch (error) {
        console.error("Delete all BXH Teams error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
