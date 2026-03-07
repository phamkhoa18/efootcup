import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import { apiResponse, apiError } from "@/lib/auth";
import { EFV_MAX_WINDOW } from "@/lib/efv-points";

export const dynamic = "force-dynamic";

/**
 * GET /api/bxh/[id]/history
 * 
 * Get EFV point history for a specific user.
 * [id] here is the gamerId (efvId) from BXH.
 * Returns all point logs + marks which ones are within the 5-game window.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id: efvId } = await params;

        // Find user by efvId
        const User = (await import("@/models/User")).default;
        const user = await User.findOne({ efvId: Number(efvId) }).lean();
        if (!user) {
            return apiError("Không tìm thấy VĐV", 404);
        }

        // Get all point logs for this user
        const logs = await EfvPointLog.find({ user: user._id })
            .sort({ awardedAt: -1 })
            .lean();

        // Mark active/inactive based on sliding window
        const logsWithStatus = logs.map((log, index) => ({
            _id: log._id,
            tournament: log.tournament,
            tournamentTitle: log.tournamentTitle,
            mode: log.mode,
            efvTier: log.efvTier,
            placement: log.placement,
            points: log.points,
            teamName: log.teamName,
            awardedAt: log.awardedAt,
            isActive: index < EFV_MAX_WINDOW, // Top 5 most recent = active
        }));

        const activeTotal = logsWithStatus
            .filter(l => l.isActive)
            .reduce((sum, l) => sum + l.points, 0);

        return apiResponse({
            user: {
                _id: user._id,
                name: user.name,
                efvId: user.efvId,
            },
            logs: logsWithStatus,
            activeTotal,
            totalLogs: logs.length,
            maxWindow: EFV_MAX_WINDOW,
        });
    } catch (error) {
        console.error("Get EFV history error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
