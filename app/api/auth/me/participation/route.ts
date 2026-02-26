import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Registration from "@/models/Registration";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

// GET /api/auth/me/participation — Get tournaments user has joined or is managing
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const userId = authResult.user._id;

        // 1. Get tournaments where the user is the creator (manager)
        const managedTournaments = await Tournament.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // 2. Get registrations by the user
        const registrations = await Registration.find({ user: userId })
            .populate("tournament", "title status banner slug schedule format currentTeams maxTeams")
            .sort({ createdAt: -1 })
            .lean();

        // 3. Get team IDs where the user is an owner or member
        const Team = (await import("@/models/Team")).default;
        const myTeams = await Team.find({
            $or: [
                { captain: userId },
                { "members.user": userId }
            ]
        }).select("_id tournament name").lean();

        const teamIds = myTeams.map(t => t._id);

        // 4. Get matches for these teams
        const Match = (await import("@/models/Match")).default;
        const myMatches = await Match.find({
            $or: [
                { homeTeam: { $in: teamIds } },
                { awayTeam: { $in: teamIds } }
            ]
        })
            .populate("homeTeam", "name logo shortName")
            .populate("awayTeam", "name logo shortName")
            .populate("tournament", "title status banner slug")
            .sort({ scheduledAt: 1, createdAt: -1 })
            .lean();

        // 5. Categorize matches
        const upcomingMatches = myMatches.filter(m => m.status === 'scheduled' || m.status === 'live');
        const pastMatches = myMatches.filter(m => m.status === 'completed');

        // 6. Extract tournament data from registrations (joined)
        const joinedTournaments = registrations.map(reg => ({
            ...reg.tournament,
            registrationId: reg._id,
            registrationStatus: reg.status,
            playerName: reg.playerName,
            teamName: reg.teamName,
            paymentStatus: reg.paymentStatus,
            registeredAt: reg.createdAt,
            teamId: reg.team
        }));

        return apiResponse({
            managed: managedTournaments,
            joined: joinedTournaments,
            matches: {
                upcoming: upcomingMatches,
                past: pastMatches
            }
        });
    } catch (error) {
        console.error("Get participation error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
