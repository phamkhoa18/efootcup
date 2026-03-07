import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import Bxh from "@/models/Bxh";
import User from "@/models/User";
import { apiResponse, apiError, requireRole } from "@/lib/auth";
import { EFV_MAX_WINDOW } from "@/lib/efv-points";

export const dynamic = "force-dynamic";

/**
 * POST /api/bxh/reload-system
 * 
 * Reload BXH từ dữ liệu hệ thống (EfvPointLog).
 * Xóa toàn bộ BXH hiện tại → tính lại từ EfvPointLog (5 giải gần nhất).
 * Chỉ manager mới được gọi.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        // 1. Get all distinct users who have point logs
        const userIds = await EfvPointLog.distinct("user");

        if (userIds.length === 0) {
            return apiResponse({ totalPlayers: 0 }, 200, "Không có dữ liệu điểm EFV trong hệ thống");
        }

        // 2. Clear existing BXH
        await Bxh.deleteMany({});

        // 3. Calculate BXH for each user from EfvPointLog
        const bxhEntries: any[] = [];

        for (const userId of userIds) {
            // Get top 5 most recent logs (sliding window)
            const logs = await EfvPointLog.find({ user: userId })
                .sort({ awardedAt: -1 })
                .limit(EFV_MAX_WINDOW)
                .lean();

            const totalPoints = logs.reduce((sum, log) => sum + log.points, 0);

            if (totalPoints <= 0) continue;

            // Get user info
            const user = await User.findById(userId).lean();
            if (!user) continue;

            // Get team name from the most recent log
            const latestTeamName = logs[0]?.teamName || "";

            bxhEntries.push({
                gamerId: String(user.efvId || userId),
                name: user.name,
                facebook: (user as any).facebookName || (user as any).facebookLink || "",
                team: latestTeamName,
                nickname: (user as any).nickname || "",
                points: totalPoints,
                rank: 0, // Will be set below
            });
        }

        // 4. Sort by points descending and assign ranks
        bxhEntries.sort((a, b) => b.points - a.points);
        bxhEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        // 5. Insert all
        if (bxhEntries.length > 0) {
            await Bxh.insertMany(bxhEntries);
        }

        return apiResponse(
            {
                totalPlayers: bxhEntries.length,
                topPlayer: bxhEntries[0] ? { name: bxhEntries[0].name, points: bxhEntries[0].points } : null,
            },
            200,
            `Đã reload BXH từ hệ thống: ${bxhEntries.length} VĐV`
        );
    } catch (error: any) {
        console.error("Reload BXH from system error:", error);
        return apiError(error.message || "Có lỗi xảy ra khi reload BXH", 500);
    }
}
