import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import { apiResponse, apiError } from "@/lib/auth";
import { EFV_TIER_WINDOWS, getTiersForMode } from "@/lib/efv-points";

export const dynamic = "force-dynamic";

/**
 * GET /api/bxh/[id]/history?mode=mobile|pc
 * 
 * Get EFV point history for a specific user.
 * [id] here is the gamerId (efvId) from BXH.
 * Returns all point logs for the given mode + marks which ones are active per tier.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id: efvId } = await params;

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "mobile";

        // Find user by efvId
        const User = (await import("@/models/User")).default;
        const user = await User.findOne({ efvId: Number(efvId) }).lean();
        if (!user) {
            return apiError("Không tìm thấy VĐV", 404);
        }

        // Get all point logs for this user in this mode
        const logs = await EfvPointLog.find({ user: user._id, mode })
            .sort({ awardedAt: -1 })
            .lean();

        // Mark active/inactive based on per-tier sliding windows
        const tiers = getTiersForMode(mode);
        const tierCounts: Record<string, number> = {};
        const activeLogIds = new Set<string>();

        const tierPoints: Record<string, number> = {};
        for (const t of tiers) { tierCounts[t] = 0; tierPoints[t] = 0; }

        for (const log of logs) {
            const tier = log.efvTier;
            if (!tiers.includes(tier)) continue;
            const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
            if (tierCounts[tier] < maxWindow) {
                tierCounts[tier]++;
                activeLogIds.add(log._id.toString());
                tierPoints[tier] += log.points;
            }
        }

        const activeTotal = Object.values(tierPoints).reduce((a, b) => a + b, 0);

        const logsWithStatus = logs.map((log) => ({
            _id: log._id,
            tournament: log.tournament,
            tournamentTitle: log.tournamentTitle,
            mode: log.mode,
            efvTier: log.efvTier,
            placement: log.placement,
            points: log.points,
            teamName: log.teamName,
            awardedAt: log.awardedAt,
            isActive: activeLogIds.has(log._id.toString()),
        }));

        return apiResponse({
            user: {
                _id: user._id,
                name: user.name,
                efvId: user.efvId,
            },
            mode,
            logs: logsWithStatus,
            activeTotal,
            tierPoints,
            tierWindows: EFV_TIER_WINDOWS,
            totalLogs: logs.length,
        });
    } catch (error) {
        console.error("Get EFV history error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
