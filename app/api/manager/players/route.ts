import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Registration from "@/models/Registration";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const managerId = authResult.user._id;

        // Get manager's tournaments
        const tournaments = await Tournament.find({ createdBy: managerId }).select("_id").lean();
        const tournamentIds = tournaments.map(t => t._id);

        const players = await Registration.aggregate([
            {
                $match: {
                    tournament: { $in: tournamentIds },
                    status: "approved"
                }
            },
            {
                $group: {
                    _id: "$email", // Group by email to get unique players
                    name: { $first: "$playerName" },
                    gamerId: { $first: "$gamerId" },
                    phone: { $first: "$phone" },
                    tournamentsCount: { $sum: 1 },
                    lastJoined: { $max: "$createdAt" },
                    tournaments: { $addToSet: "$tournament" }
                }
            },
            { $sort: { lastJoined: -1 } }
        ]);

        return apiResponse({
            players,
            totalUniquePlayers: players.length
        });

    } catch (error) {
        console.error("Manager players API error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
