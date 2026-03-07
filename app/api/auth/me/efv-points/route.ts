import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import Bxh from "@/models/Bxh";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";
import { EFV_TIER_WINDOWS, PLACEMENT_LABELS, ALL_EFV_TIER_OPTIONS, getTiersForMode } from "@/lib/efv-points";

/**
 * GET /api/auth/me/efv-points
 * 
 * Lấy thông tin điểm EFV của user hiện tại:
 * - Mobile breakdown (EFV250/500/1000)
 * - PC breakdown (EFV50/100/200)
 * - Hạng BXH cho từng mode
 * - Lịch sử điểm (tất cả giải, đánh dấu active/inactive theo tier)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const userId = authResult.user._id;
        const userObj = authResult.user as any;

        // 1. Get all point logs for this user
        const allLogs = await EfvPointLog.find({ user: userId })
            .sort({ awardedAt: -1 })
            .lean();

        // 2. Calculate per-mode, per-tier active points
        const mobileTiers = getTiersForMode("mobile");
        const pcTiers = getTiersForMode("pc");

        const tierCounts: Record<string, number> = {};
        const tierPoints: Record<string, number> = {};
        const activeLogIds = new Set<string>();

        // Initialize
        for (const t of [...mobileTiers, ...pcTiers]) {
            tierCounts[t] = 0;
            tierPoints[t] = 0;
        }

        // Process logs (already sorted by awardedAt desc)
        for (const log of allLogs) {
            const tier = log.efvTier;
            if (!tierCounts.hasOwnProperty(tier)) continue;
            const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
            if (tierCounts[tier] < maxWindow) {
                tierCounts[tier]++;
                activeLogIds.add(log._id.toString());
                tierPoints[tier] += log.points;
            }
        }

        // Mobile totals
        const pointsEfv250 = tierPoints["efv_250"] || 0;
        const pointsEfv500 = tierPoints["efv_500"] || 0;
        const pointsEfv1000 = tierPoints["efv_1000"] || 0;
        const totalMobilePoints = pointsEfv250 + pointsEfv500 + pointsEfv1000;

        // PC totals
        const pointsEfv50 = tierPoints["efv_50"] || 0;
        const pointsEfv100 = tierPoints["efv_100"] || 0;
        const pointsEfv200 = tierPoints["efv_200"] || 0;
        const totalPcPoints = pointsEfv50 + pointsEfv100 + pointsEfv200;

        const totalActivePoints = totalMobilePoints + totalPcPoints;
        const totalAllPoints = allLogs.reduce((sum, log) => sum + log.points, 0);

        // 3. Get BXH ranks for both modes
        const mobileBxh = await Bxh.findOne({
            gamerId: String(userObj.efvId || userId),
            mode: "mobile",
        }).lean();

        const pcBxh = await Bxh.findOne({
            gamerId: String(userObj.efvId || userId),
            mode: "pc",
        }).lean();

        // 4. Format logs for display
        const formattedLogs = allLogs.map((log) => ({
            _id: log._id,
            tournamentTitle: log.tournamentTitle,
            tournamentId: log.tournament,
            mode: log.mode,
            efvTier: log.efvTier,
            efvTierLabel: ALL_EFV_TIER_OPTIONS.find(t => t.value === log.efvTier)?.label || log.efvTier,
            placement: log.placement,
            placementLabel: PLACEMENT_LABELS[log.placement] || log.placement,
            points: log.points,
            teamName: log.teamName,
            awardedAt: log.awardedAt,
            isActive: activeLogIds.has(log._id.toString()),
        }));

        return apiResponse({
            totalActivePoints,
            totalAllPoints,
            // Mobile
            totalMobilePoints,
            pointsEfv250,
            pointsEfv500,
            pointsEfv1000,
            mobileRank: mobileBxh?.rank || null,
            // PC
            totalPcPoints,
            pointsEfv50,
            pointsEfv100,
            pointsEfv200,
            pcRank: pcBxh?.rank || null,
            // Legacy
            rank: mobileBxh?.rank || null,
            tierWindows: EFV_TIER_WINDOWS,
            totalLogs: allLogs.length,
            logs: formattedLogs,
        });
    } catch (error: any) {
        console.error("Get EFV points error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
