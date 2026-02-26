import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Registration from "@/models/Registration";
import Match from "@/models/Match";
import { requireManager, apiResponse, apiError } from "@/lib/auth";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const managerId = authResult.user._id;

        // Get manager's tournaments
        const tournaments = await Tournament.find({ createdBy: managerId }).lean();
        const tournamentIds = tournaments.map(t => t._id);

        if (tournamentIds.length === 0) {
            return apiResponse({
                overview: { totalTournaments: 0, totalRegistrations: 0, totalMatches: 0, totalViews: 0 },
                dailyStats: [],
                performance: [],
                statusDistribution: {}
            });
        }

        // 1. Timeline stats (Last 30 days)
        const thirtyDaysAgo = subDays(startOfDay(new Date()), 29);

        const registrationsTimeline = await Registration.aggregate([
            {
                $match: {
                    tournament: { $in: tournamentIds },
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const matchesTimeline = await Match.aggregate([
            {
                $match: {
                    tournament: { $in: tournamentIds },
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Fill gaps in timeline
        const dailyStats = [];
        for (let i = 0; i < 30; i++) {
            const date = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
            const reg = registrationsTimeline.find(r => r._id === date);
            const mat = matchesTimeline.find(m => m._id === date);

            // For revenue timeline, we'd need to track when payments happened.
            // Since we don't have a Payment model yet, we'll estimate based on registration date
            // or just use 0 for now until Payment model exists.

            dailyStats.push({
                date,
                registrations: reg ? reg.count : 0,
                matches: mat ? mat.count : 0
            });
        }

        // 2. Tournament Performance (Top 10)
        const performance = tournaments.map(t => ({
            id: t._id,
            title: t.title,
            views: t.views || 0,
            registrations: t.currentTeams || 0,
            maxTeams: t.maxTeams,
            status: t.status,
            entryFee: t.entryFee || 0,
            revenue: (t.entryFee || 0) * (t.currentTeams || 0),
            conversion: t.views > 0 ? ((t.currentTeams / t.views) * 100).toFixed(1) : 0
        })).sort((a, b) => b.views - a.views).slice(0, 10);

        // 3. Status Distribution
        const statusDistribution = {
            draft: tournaments.filter(t => t.status === "draft").length,
            registration: tournaments.filter(t => t.status === "registration").length,
            ongoing: tournaments.filter(t => t.status === "ongoing").length,
            completed: tournaments.filter(t => t.status === "completed").length,
        };

        // 4. Totals
        const totalMatches = await Match.countDocuments({ tournament: { $in: tournamentIds } });
        const totalRegistrations = await Registration.countDocuments({ tournament: { $in: tournamentIds } });
        const totalViews = tournaments.reduce((sum, t) => sum + (t.views || 0), 0);
        const totalRevenue = tournaments.reduce((sum, t) => sum + ((t.entryFee || 0) * (t.currentTeams || 0)), 0);

        return apiResponse({
            overview: {
                totalTournaments: tournaments.length,
                totalRegistrations,
                totalMatches,
                totalViews,
                totalRevenue
            },
            dailyStats,
            performance,
            statusDistribution
        });

    } catch (error) {
        console.error("Reports API error:", error);
        return apiError("Có lỗi xảy ra khi tải báo cáo", 500);
    }
}
