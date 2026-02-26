import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/matches — Get all matches
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;

        let id = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) id = tournament._id.toString();
        }

        const { searchParams } = new URL(req.url);
        const round = searchParams.get("round");
        const group = searchParams.get("group");
        const status = searchParams.get("status");

        const query: any = { tournament: id };
        if (round) query.round = parseInt(round);
        if (group) query.group = group;
        if (status) query.status = status;

        const matches = await Match.find(query)
            .populate("homeTeam", "name shortName logo")
            .populate("awayTeam", "name shortName logo")
            .populate("winner", "name shortName")
            .populate("referee", "name")
            .sort({ round: 1, matchNumber: 1, scheduledAt: 1 })
            .lean();

        return apiResponse({ matches, total: matches.length });
    } catch (error) {
        console.error("Get matches error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/matches — Update match result
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        // Check ownership
        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const {
            matchId,
            homeScore,
            awayScore,
            homePenalty,
            awayPenalty,
            status,
            events,
            scheduledAt,
            notes,
        } = body;

        const match = await Match.findById(matchId);
        if (!match) return apiError("Không tìm thấy trận đấu", 404);

        // Update match
        if (homeScore !== undefined) match.homeScore = homeScore;
        if (awayScore !== undefined) match.awayScore = awayScore;
        if (homePenalty !== undefined) match.homePenalty = homePenalty;
        if (awayPenalty !== undefined) match.awayPenalty = awayPenalty;
        if (status) match.status = status;
        if (events) match.events = events;
        if (scheduledAt) match.scheduledAt = scheduledAt;
        if (notes !== undefined) match.notes = notes;

        // Determine winner
        if (status === "completed" && homeScore !== undefined && awayScore !== undefined) {
            match.completedAt = new Date();

            let winnerId = null;
            if (homeScore > awayScore) {
                winnerId = match.homeTeam;
            } else if (awayScore > homeScore) {
                winnerId = match.awayTeam;
            } else if (homePenalty !== undefined && awayPenalty !== undefined) {
                winnerId = homePenalty > awayPenalty ? match.homeTeam : match.awayTeam;
            }

            match.winner = winnerId;

            // Update team stats
            if (match.homeTeam && match.awayTeam) {
                const homeUpdate: any = {
                    $inc: {
                        "stats.played": 1,
                        "stats.goalsFor": homeScore,
                        "stats.goalsAgainst": awayScore,
                        "stats.goalDifference": homeScore - awayScore,
                    },
                };

                const awayUpdate: any = {
                    $inc: {
                        "stats.played": 1,
                        "stats.goalsFor": awayScore,
                        "stats.goalsAgainst": homeScore,
                        "stats.goalDifference": awayScore - homeScore,
                    },
                };

                if (homeScore > awayScore) {
                    homeUpdate.$inc["stats.wins"] = 1;
                    homeUpdate.$inc["stats.points"] = 3;
                    homeUpdate.$push = { "stats.form": { $each: ["W"], $slice: -5 } };
                    awayUpdate.$inc["stats.losses"] = 1;
                    awayUpdate.$push = { "stats.form": { $each: ["L"], $slice: -5 } };
                } else if (awayScore > homeScore) {
                    awayUpdate.$inc["stats.wins"] = 1;
                    awayUpdate.$inc["stats.points"] = 3;
                    awayUpdate.$push = { "stats.form": { $each: ["W"], $slice: -5 } };
                    homeUpdate.$inc["stats.losses"] = 1;
                    homeUpdate.$push = { "stats.form": { $each: ["L"], $slice: -5 } };
                } else {
                    homeUpdate.$inc["stats.draws"] = 1;
                    homeUpdate.$inc["stats.points"] = 1;
                    homeUpdate.$push = { "stats.form": { $each: ["D"], $slice: -5 } };
                    awayUpdate.$inc["stats.draws"] = 1;
                    awayUpdate.$inc["stats.points"] = 1;
                    awayUpdate.$push = { "stats.form": { $each: ["D"], $slice: -5 } };
                }

                await Team.findByIdAndUpdate(match.homeTeam, homeUpdate);
                await Team.findByIdAndUpdate(match.awayTeam, awayUpdate);

                // Elimination: mark loser as eliminated
                if (tournament.format === "single_elimination" && winnerId) {
                    const loserId =
                        winnerId.toString() === match.homeTeam?.toString()
                            ? match.awayTeam
                            : match.homeTeam;
                    await Team.findByIdAndUpdate(loserId, { status: "eliminated" });
                }
            }

            // Advance winner to next match
            if (match.nextMatch && winnerId) {
                const nextMatch = await Match.findById(match.nextMatch);
                if (nextMatch) {
                    // Find which slot this match feeds into
                    const currentRoundMatches = await Match.find({
                        tournament: id,
                        round: match.round,
                        nextMatch: match.nextMatch,
                    }).sort({ matchNumber: 1 });

                    const slotIndex = currentRoundMatches.findIndex(
                        (m) => m._id.toString() === match._id.toString()
                    );

                    if (slotIndex === 0) {
                        nextMatch.homeTeam = winnerId;
                    } else {
                        nextMatch.awayTeam = winnerId;
                    }
                    await nextMatch.save();
                }
            }
        }

        if (status === "live") {
            match.startedAt = new Date();
        }

        await match.save();

        // Notify players involved in the match
        try {
            const tournament = await Tournament.findById(match.tournament);
            const teamIds = [match.homeTeam, match.awayTeam].filter(Boolean);
            const teams = await Team.find({ _id: { $in: teamIds } });
            const userIds = teams.map(t => t.captain).filter(Boolean);

            if (userIds.length > 0) {
                const Notification = (await import('@/models/Notification')).default;
                const notifications = userIds.map(userId => ({
                    recipient: userId,
                    type: "tournament" as const,
                    title: "Cập nhật trận đấu",
                    message: `Trận đấu của bạn trong giải "${tournament?.title}" đã có cập nhật mới (Tỉ số/Thời gian/Trạng thái).`,
                    link: `/giai-dau/${match.tournament}?tab=schedule`,
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notifyErr) {
            console.error("Notify match update error:", notifyErr);
        }

        const updatedMatch = await Match.findById(matchId)
            .populate("homeTeam", "name shortName logo")
            .populate("awayTeam", "name shortName logo")
            .populate("winner", "name shortName")
            .lean();

        return apiResponse(updatedMatch, 200, "Cập nhật trận đấu thành công");
    } catch (error) {
        console.error("Update match error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
