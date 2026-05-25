import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bxh2v2 from "@/models/Bxh2v2";
import { apiResponse, apiError } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/bxh-2v2
 * Lấy danh sách bảng xếp hạng 2v2
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const searchParams = req.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "1000"); // Return up to 1000 for frontend to handle pagination
        const mode = searchParams.get("mode") || "mobile";
        
        // Return active ranking teams only (points > 0)
        const query = { points: { $gt: 0 }, mode };
        
        const data = await Bxh2v2.find(query)
            .sort({ rank: 1, points: -1 })
            .limit(limit)
            .lean();
            
        // Map data to match what the UI expects
        const formattedData = data.map(t => ({
            _id: t._id.toString(),
            rank: t.rank || "-",
            teamId: t.teamHash, // Use teamHash as the unique team ID for the UI
            teamName: t.teamName || "Chưa có tên",
            points: t.points,
            pointsEfv250: t.pointsEfv250,
            pointsEfv500: t.pointsEfv500,
            pointsEfv1000: t.pointsEfv1000,
            player1: {
                id: t.player1.gamerId,
                name: t.player1.name,
                nickname: t.player1.nickname,
                avatar: t.player1.avatar,
                facebook: t.player1.facebook,
            },
            player2: {
                id: t.player2.gamerId,
                name: t.player2.name,
                nickname: t.player2.nickname,
                avatar: t.player2.avatar,
                facebook: t.player2.facebook,
            }
        }));

        return apiResponse({
            data: formattedData,
            total: formattedData.length
        });
    } catch (error) {
        console.error("Get BXH 2v2 error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
