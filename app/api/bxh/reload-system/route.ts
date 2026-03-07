import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import EfvPointLog from "@/models/EfvPointLog";
import Bxh from "@/models/Bxh";
import User from "@/models/User";
import { apiResponse, apiError, requireRole } from "@/lib/auth";
import { EFV_TIER_WINDOWS, getTiersForMode } from "@/lib/efv-points";

export const dynamic = "force-dynamic";

/**
 * POST /api/bxh/reload-system
 * 
 * Reload BXH từ dữ liệu hệ thống (EfvPointLog).
 * Tính riêng cho từng mode (mobile / pc).
 * Chỉ manager hoặc admin mới được gọi.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        // Support reloading a specific mode or both
        let targetMode: string | null = null;
        try {
            const body = await req.json();
            targetMode = body?.mode || null;
        } catch {
            // No body = reload both modes
        }

        const modes = targetMode ? [targetMode] : ["mobile", "pc"];
        let totalPlayers = 0;

        for (const mode of modes) {
            // 1. Get all distinct users who have point logs for this mode
            const userIds = await EfvPointLog.distinct("user", { mode });
            if (userIds.length === 0) continue;

            // 2. Clear existing BXH for this mode
            await Bxh.deleteMany({ mode });

            // 3. Get tier list for this mode
            const tiers = getTiersForMode(mode);

            // 4. Calculate BXH for each user
            const bxhEntries: any[] = [];

            for (const userId of userIds) {
                const logs = await EfvPointLog.find({ user: userId, mode })
                    .sort({ awardedAt: -1 })
                    .lean();

                // Calculate per-tier points with separate sliding windows
                const tierPoints: Record<string, number> = {};
                const tierCounts: Record<string, number> = {};

                for (const t of tiers) {
                    tierPoints[t] = 0;
                    tierCounts[t] = 0;
                }

                for (const log of logs) {
                    const tier = log.efvTier;
                    if (!tiers.includes(tier)) continue;
                    const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
                    if (tierCounts[tier] < maxWindow) {
                        tierCounts[tier]++;
                        tierPoints[tier] += log.points;
                    }
                }

                const totalPoints = Object.values(tierPoints).reduce((a, b) => a + b, 0);
                if (totalPoints <= 0) continue;

                const user = await User.findById(userId).lean();
                if (!user) continue;

                const latestTeamName = logs[0]?.teamName || "";

                const entry: any = {
                    gamerId: String(user.efvId || userId),
                    mode,
                    name: user.name,
                    facebook: (user as any).facebookName || (user as any).facebookLink || "",
                    team: latestTeamName,
                    nickname: (user as any).nickname || "",
                    points: totalPoints,
                    // Mobile tiers
                    pointsEfv250: tierPoints["efv_250"] || 0,
                    pointsEfv500: tierPoints["efv_500"] || 0,
                    pointsEfv1000: tierPoints["efv_1000"] || 0,
                    // PC tiers
                    pointsEfv50: tierPoints["efv_50"] || 0,
                    pointsEfv100: tierPoints["efv_100"] || 0,
                    pointsEfv200: tierPoints["efv_200"] || 0,
                    rank: 0,
                };

                bxhEntries.push(entry);
            }

            // 5. Sort and assign ranks
            bxhEntries.sort((a, b) => b.points - a.points);
            bxhEntries.forEach((entry, index) => {
                entry.rank = index + 1;
            });

            // 6. Insert
            if (bxhEntries.length > 0) {
                await Bxh.insertMany(bxhEntries);
            }

            totalPlayers += bxhEntries.length;
        }

        return apiResponse(
            { totalPlayers, modes },
            200,
            `Đã reload BXH từ hệ thống: ${totalPlayers} VĐV`
        );
    } catch (error: any) {
        console.error("Reload BXH from system error:", error);
        return apiError(error.message || "Có lỗi xảy ra khi reload BXH", 500);
    }
}
