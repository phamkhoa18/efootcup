import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Registration from "@/models/Registration";
import User from "@/models/User";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

// GET /api/dashboard — Manager dashboard stats
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const managerId = authResult.user._id;

        // Get all tournaments by this manager
        const tournaments = await Tournament.find({ createdBy: managerId })
            .sort({ createdAt: -1 })
            .lean();

        const tournamentIds = tournaments.map((t) => t._id);

        // Aggregate stats
        const [
            totalTeams,
            totalMatches,
            completedMatches,
            liveMatches,
            pendingRegistrations,
            totalRegistrations,
        ] = await Promise.all([
            Team.countDocuments({ tournament: { $in: tournamentIds } }),
            Match.countDocuments({ tournament: { $in: tournamentIds } }),
            Match.countDocuments({
                tournament: { $in: tournamentIds },
                status: "completed",
            }),
            Match.countDocuments({
                tournament: { $in: tournamentIds },
                status: "live",
            }),
            Registration.countDocuments({
                tournament: { $in: tournamentIds },
                status: "pending",
            }),
            Registration.countDocuments({
                tournament: { $in: tournamentIds },
            }),
        ]);

        // Total views
        const totalViews = tournaments.reduce((sum, t) => sum + (t.views || 0), 0);

        // Status breakdown
        const statusBreakdown = {
            draft: tournaments.filter((t) => t.status === "draft").length,
            registration: tournaments.filter((t) => t.status === "registration").length,
            ongoing: tournaments.filter((t) => t.status === "ongoing").length,
            completed: tournaments.filter((t) => t.status === "completed").length,
            cancelled: tournaments.filter((t) => t.status === "cancelled").length,
        };

        // Recent tournaments (top 5)
        const recentTournaments = tournaments.slice(0, 5).map((t) => ({
            _id: t._id,
            title: t.title,
            slug: t.slug,
            status: t.status,
            currentTeams: t.currentTeams,
            maxTeams: t.maxTeams,
            views: t.views,
            schedule: t.schedule,
            createdAt: t.createdAt,
        }));

        // Recent matches
        const recentMatches = await Match.find({
            tournament: { $in: tournamentIds },
            status: "completed",
        })
            .populate("homeTeam", "name shortName")
            .populate("awayTeam", "name shortName")
            .populate("tournament", "title")
            .sort({ completedAt: -1 })
            .limit(10)
            .lean();

        return apiResponse({
            overview: {
                totalTournaments: tournaments.length,
                totalTeams,
                totalMatches,
                completedMatches,
                liveMatches,
                totalViews,
                pendingRegistrations,
                totalRegistrations,
            },
            statusBreakdown,
            recentTournaments,
            recentMatches,
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
