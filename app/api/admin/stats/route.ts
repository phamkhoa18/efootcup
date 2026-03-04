import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Tournament from "@/models/Tournament";
import Match from "@/models/Match";
import Registration from "@/models/Registration";
import Post from "@/models/Post";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/stats — system-wide statistics
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();

        // User stats
        const totalUsers = await User.countDocuments();
        const totalManagers = await User.countDocuments({ role: "manager" });
        const totalAdmins = await User.countDocuments({ role: "admin" });
        const activeUsers = await User.countDocuments({ isActive: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });

        // Recent users (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = await User.countDocuments({
            createdAt: { $gte: weekAgo },
        });

        // Tournament stats
        const totalTournaments = await Tournament.countDocuments();
        const activeTournaments = await Tournament.countDocuments({
            status: { $in: ["registration", "ongoing"] },
        });
        const completedTournaments = await Tournament.countDocuments({
            status: "completed",
        });

        // Match stats
        let totalMatches = 0;
        let completedMatches = 0;
        try {
            totalMatches = await Match.countDocuments();
            completedMatches = await Match.countDocuments({ status: "completed" });
        } catch (e) {
            // Match model might not exist yet
        }

        // Registration stats
        let totalRegistrations = 0;
        let pendingRegistrations = 0;
        try {
            totalRegistrations = await Registration.countDocuments();
            pendingRegistrations = await Registration.countDocuments({ status: "pending" });
        } catch (e) {
            // Registration model might not exist yet
        }

        // Post stats
        let totalPosts = 0;
        let publishedPosts = 0;
        try {
            totalPosts = await Post.countDocuments();
            publishedPosts = await Post.countDocuments({ status: "published" });
        } catch (e) {
            // Post model might not exist yet
        }

        // Recent users list
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("name email role createdAt isActive avatar");

        // Status breakdown
        const statusBreakdown = {
            draft: await Tournament.countDocuments({ status: "draft" }),
            registration: await Tournament.countDocuments({ status: "registration" }),
            ongoing: await Tournament.countDocuments({ status: "ongoing" }),
            completed: completedTournaments,
            cancelled: await Tournament.countDocuments({ status: "cancelled" }),
        };

        return apiResponse({
            users: {
                total: totalUsers,
                managers: totalManagers,
                admins: totalAdmins,
                active: activeUsers,
                verified: verifiedUsers,
                newThisWeek: newUsersThisWeek,
            },
            tournaments: {
                total: totalTournaments,
                active: activeTournaments,
                completed: completedTournaments,
                statusBreakdown,
            },
            matches: {
                total: totalMatches,
                completed: completedMatches,
            },
            registrations: {
                total: totalRegistrations,
                pending: pendingRegistrations,
            },
            posts: {
                total: totalPosts,
                published: publishedPosts,
            },
            recentUsers,
        });
    } catch (error: any) {
        console.error("Admin stats error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
