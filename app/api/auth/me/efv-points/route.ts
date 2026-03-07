import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import Bxh from "@/models/Bxh";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";
import { EFV_MAX_WINDOW, PLACEMENT_LABELS, EFV_TIER_OPTIONS } from "@/lib/efv-points";

/**
 * GET /api/auth/me/efv-points
 * 
 * Lấy thông tin điểm EFV của user hiện tại:
 * - Tổng điểm (từ BXH hoặc tính từ logs)
 * - Hạng BXH
 * - Lịch sử điểm (5 giải gần nhất + cũ hơn)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const userId = authResult.user._id;

        // 1. Get all point logs for this user
        const allLogs = await EfvPointLog.find({ user: userId })
            .sort({ awardedAt: -1 })
            .lean();

        // 2. Calculate active points (top 5 recent across all modes)
        const activeLogs = allLogs.slice(0, EFV_MAX_WINDOW);
        const totalActivePoints = activeLogs.reduce((sum, log) => sum + log.points, 0);
        const totalAllPoints = allLogs.reduce((sum, log) => sum + log.points, 0);

        const userObj = authResult.user as any;

        // 3. Get BXH rank
        const userBxh = await Bxh.findOne({
            $or: [
                { gamerId: userObj.efvId },
                { gamerId: userId },
            ]
        }).lean();

        // 4. Format logs for display
        const formattedLogs = allLogs.map((log, index) => ({
            _id: log._id,
            tournamentTitle: log.tournamentTitle,
            tournamentId: log.tournament,
            efvTier: log.efvTier,
            efvTierLabel: EFV_TIER_OPTIONS.find(t => t.value === log.efvTier)?.label || log.efvTier,
            placement: log.placement,
            placementLabel: PLACEMENT_LABELS[log.placement] || log.placement,
            points: log.points,
            mode: log.mode,
            teamName: log.teamName,
            awardedAt: log.awardedAt,
            isActive: index < EFV_MAX_WINDOW, // Only top 5 count
        }));

        return apiResponse({
            totalActivePoints,
            totalAllPoints,
            activeWindow: EFV_MAX_WINDOW,
            rank: userBxh?.rank || null,
            totalLogs: allLogs.length,
            logs: formattedLogs,
        });
    } catch (error: any) {
        console.error("Get EFV points error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
