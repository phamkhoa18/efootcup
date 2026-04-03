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

// GET /api/tournaments/[id]/matches — Get matches with pagination and search
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
        const statusParam = searchParams.get("status");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "0"); // 0 = no limit

        const query: any = { tournament: id, status: { $nin: ['walkover', 'bye'] } };

        if (round) query.round = parseInt(round);
        if (group) query.group = group;

        if (statusParam && statusParam !== 'all') {
            if (statusParam === "upcoming") {
                query.status = { $nin: ["completed", "live", "walkover", "bye"] };
            } else {
                query.status = statusParam;
            }
        }

        // Full text Search logic
        if (search && search.trim() !== "") {
            const q = search.trim();
            const isNum = !isNaN(Number(q));

            const teamQuery: any = {
                tournament: id,
                $or: [
                    { name: { $regex: q, $options: "i" } },
                    { shortName: { $regex: q, $options: "i" } }
                ]
            };
            const matchingTeams = await Team.find(teamQuery).select('_id').lean();
            const teamIdsByName = matchingTeams.map((t: any) => t._id.toString());

            const Registration = (await import('@/models/Registration')).default;
            const User = (await import('@/models/User')).default;

            const userQuery: any = { $or: [{ name: { $regex: q, $options: "i" } }, { nickname: { $regex: q, $options: "i" } }] };
            if (isNum) userQuery.$or.push({ efvId: Number(q) });
            const matchingUsers = await User.find(userQuery).select('_id').lean();
            const userIds = matchingUsers.map((u: any) => u._id);

            const matchingRegs = await Registration.find({
                tournament: id,
                status: 'approved',
                $or: [
                    { playerName: { $regex: q, $options: "i" } },
                    { nickname: { $regex: q, $options: "i" } },
                    { user: { $in: userIds } }
                ]
            }).select('team').lean();
            const teamIdsByReg = matchingRegs.filter((r: any) => r.team).map((r: any) => r.team.toString());

            const allTeamIds = [...new Set([...teamIdsByName, ...teamIdsByReg])];

            const matchOr: any[] = [
                { homeTeam: { $in: allTeamIds } },
                { awayTeam: { $in: allTeamIds } }
            ];
            if (isNum) matchOr.push({ matchNumber: Number(q) });

            query.$or = matchOr;
        }

        const [total, completedCount, liveCount, totalCount] = await Promise.all([
            Match.countDocuments(query),
            Match.countDocuments({ tournament: id, status: 'completed' }),
            Match.countDocuments({ tournament: id, status: 'live' }),
            Match.countDocuments({ tournament: id, status: { $nin: ['walkover', 'bye'] } })
        ]);

        let dbQuery = Match.find(query)
            .populate("homeTeam", "name shortName logo stars seed")
            .populate("awayTeam", "name shortName logo stars seed")
            .populate("winner", "name shortName")
            .populate("referee", "name")
            .sort({ round: 1, matchNumber: 1, scheduledAt: 1 });

        if (limit > 0) {
            dbQuery = dbQuery.skip((page - 1) * limit).limit(limit);
        }

        let matches = await dbQuery.lean();

        // Enrich result with player/user info from Registration
        const Registration = (await import('@/models/Registration')).default;
        const registrations = await Registration.find({ tournament: id, status: 'approved' })
            .select('user team playerName personalPhoto teamLineupPhoto gamerId nickname facebookName facebookLink player2User player2Name player2FacebookName player2FacebookLink')
            .populate('user', 'efvId avatar personalPhoto')
            .populate('player2User', 'efvId avatar personalPhoto')
            .lean();
            
        const teamMap = new Map();
        registrations.forEach(r => { if (r.team) teamMap.set(r.team.toString(), r); });

        matches = matches.map((match: any) => {
            [match.homeTeam, match.awayTeam].forEach(t => {
                if (t && t._id) {
                    const reg = teamMap.get(t._id.toString());
                    if (reg) {
                        t.player1 = reg.playerName;
                        t.facebookName = reg.facebookName;
                        t.facebookLink = reg.facebookLink;
                        t.player2 = reg.player2Name;
                        t.player2FacebookName = reg.player2FacebookName;
                        t.player2FacebookLink = reg.player2FacebookLink;
                        t.player2EfvId = reg.player2User?.efvId;
                        t.efvId = reg.user?.efvId;
                        t.avatar = reg.user?.avatar || '';
                        t.personalPhoto = reg.personalPhoto || reg.user?.personalPhoto || '';
                        t.teamLineupPhoto = reg.teamLineupPhoto || '';
                    }
                }
            });
            return match;
        });

        return apiResponse({
            matches,
            pagination: { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 },
            stats: { completedCount, liveCount, totalCount }
        });
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
        const isOwner = tournament.createdBy.toString() === authResult.user._id;
        const isCollaborator = (tournament.collaborators || []).some(
            (c: any) => c.userId.toString() === authResult.user._id
        );
        if (!isOwner && !isCollaborator && authResult?.user?.role !== "admin")
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

        // --- Helper: find which slot this match occupies in its next match ---
        const findSlotInNextMatch = async (currentMatch: any): Promise<"homeTeam" | "awayTeam"> => {
            const siblings = await Match.find({
                tournament: id,
                round: currentMatch.round,
                nextMatch: currentMatch.nextMatch,
            }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

            const idx = siblings.findIndex(m => m._id.toString() === currentMatch._id.toString());
            return idx === 0 ? "homeTeam" : "awayTeam";
        };

        // --- Helper: cascade rollback from a match through future rounds ---
        const cascadeRollback = async (fromMatchId: mongoose.Types.ObjectId, teamIdToRemove: mongoose.Types.ObjectId | null) => {
            if (!teamIdToRemove) return;

            let currentMatchId: mongoose.Types.ObjectId | null = fromMatchId;
            let teamId: mongoose.Types.ObjectId | null = teamIdToRemove;

            while (currentMatchId && teamId) {
                const nextMatch: any = await Match.findById(currentMatchId);
                if (!nextMatch) break;

                // Remove this team from the next match
                const teamStr = teamId.toString();
                if (nextMatch.homeTeam?.toString() === teamStr) {
                    nextMatch.homeTeam = null;
                } else if (nextMatch.awayTeam?.toString() === teamStr) {
                    nextMatch.awayTeam = null;
                } else {
                    break; // Team not found in this match, stop cascading
                }

                // If this match had a result and the removed team was involved, reset it
                if (nextMatch.status === "completed" && nextMatch.winner) {
                    const oldWinner = nextMatch.winner;
                    const oldLoser = nextMatch.homeTeam?.toString() === oldWinner.toString()
                        ? nextMatch.awayTeam : nextMatch.homeTeam;

                    // Un-eliminate the loser of this match
                    if (oldLoser && tournament.format === "single_elimination") {
                        await Team.findByIdAndUpdate(oldLoser, { status: "active" });
                    }

                    // Reset this match
                    nextMatch.homeScore = null;
                    nextMatch.awayScore = null;
                    nextMatch.winner = null;
                    nextMatch.status = "scheduled";
                    nextMatch.completedAt = undefined;
                    await nextMatch.save();

                    // Continue cascading: remove the old winner from the next-next match
                    if (nextMatch.nextMatch) {
                        currentMatchId = nextMatch.nextMatch;
                        teamId = oldWinner;
                    } else {
                        break;
                    }
                } else {
                    await nextMatch.save();
                    break; // Match not completed, stop cascading
                }
            }
        };

        // ========================================
        // PHASE 1: ROLLBACK if match was previously completed
        // ========================================
        const wasCompleted = match.status === "completed";
        const previousWinner = match.winner;
        const isResetting = status === "scheduled" || status === "live";
        const isChangingResult = status === "completed" && wasCompleted;

        if (wasCompleted && (isResetting || isChangingResult)) {
            // 1a. Rollback team stats from previous result
            if (match.homeTeam && match.awayTeam && match.homeScore !== null && match.awayScore !== null) {
                const prevHS = match.homeScore;
                const prevAS = match.awayScore;

                const reverseHome: any = {
                    $inc: {
                        "stats.played": -1,
                        "stats.goalsFor": -prevHS,
                        "stats.goalsAgainst": -prevAS,
                        "stats.goalDifference": -(prevHS - prevAS),
                    },
                };
                const reverseAway: any = {
                    $inc: {
                        "stats.played": -1,
                        "stats.goalsFor": -prevAS,
                        "stats.goalsAgainst": -prevHS,
                        "stats.goalDifference": -(prevAS - prevHS),
                    },
                };

                if (prevHS > prevAS) {
                    reverseHome.$inc["stats.wins"] = -1;
                    reverseHome.$inc["stats.points"] = -3;
                    reverseAway.$inc["stats.losses"] = -1;
                } else if (prevAS > prevHS) {
                    reverseAway.$inc["stats.wins"] = -1;
                    reverseAway.$inc["stats.points"] = -3;
                    reverseHome.$inc["stats.losses"] = -1;
                } else {
                    reverseHome.$inc["stats.draws"] = -1;
                    reverseHome.$inc["stats.points"] = -1;
                    reverseAway.$inc["stats.draws"] = -1;
                    reverseAway.$inc["stats.points"] = -1;
                }

                await Team.findByIdAndUpdate(match.homeTeam, reverseHome);
                await Team.findByIdAndUpdate(match.awayTeam, reverseAway);
            }

            // 1b. Un-eliminate the previous loser
            if (previousWinner && tournament.format === "single_elimination") {
                const previousLoserId = previousWinner.toString() === match.homeTeam?.toString()
                    ? match.awayTeam : match.homeTeam;
                if (previousLoserId) {
                    await Team.findByIdAndUpdate(previousLoserId, { status: "active" });
                }
            }

            // 1c. Cascade rollback: remove previous winner from next match and future rounds
            if (match.nextMatch && previousWinner) {
                await cascadeRollback(match.nextMatch, previousWinner);
            }

            // 1d. Clear old result on the current match
            match.winner = null;
            match.completedAt = undefined;
            if (isResetting) {
                match.homeScore = null;
                match.awayScore = null;
            }
        }

        // ========================================
        // PHASE 2: APPLY new values
        // ========================================
        if (homeScore !== undefined) match.homeScore = homeScore;
        if (awayScore !== undefined) match.awayScore = awayScore;
        if (homePenalty !== undefined) match.homePenalty = homePenalty;
        if (awayPenalty !== undefined) match.awayPenalty = awayPenalty;
        if (status) match.status = status;
        if (events) match.events = events;
        if (scheduledAt) match.scheduledAt = scheduledAt;
        if (notes !== undefined) match.notes = notes;

        if (status === "live") {
            match.startedAt = new Date();
        }

        // Track who updated this match
        match.updatedBy = new mongoose.Types.ObjectId(authResult.user._id as string);

        // ========================================
        // PHASE 3: ADVANCE winner if status is completed
        // ========================================
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
                const slot = await findSlotInNextMatch(match);
                const nextMatch = await Match.findById(match.nextMatch);
                if (nextMatch) {
                    nextMatch[slot] = winnerId;

                    // If the next match was walkover/bye and now has both teams, reset to scheduled
                    if ((nextMatch.status === 'walkover' || nextMatch.status === 'bye') && nextMatch.homeTeam && nextMatch.awayTeam) {
                        nextMatch.status = 'scheduled';
                        nextMatch.winner = null;
                        nextMatch.homeScore = null;
                        nextMatch.awayScore = null;
                    }

                    await nextMatch.save();
                }
            }
        }

        await match.save();

        // Notify players involved in the match
        try {
            const teamIds = [match.homeTeam, match.awayTeam].filter(Boolean);
            const teams = await Team.find({ _id: { $in: teamIds } });
            const userIds = teams.map(t => t.captain).filter(Boolean);

            if (userIds.length > 0) {
                const Notification = (await import('@/models/Notification')).default;
                const User = (await import('@/models/User')).default;
                const { sendNotificationEmail } = await import('@/lib/email');

                const users = await User.find({ _id: { $in: userIds } });

                const notifications = userIds.map(userId => ({
                    recipient: userId,
                    type: "tournament" as const,
                    title: "Cập nhật trận đấu",
                    message: `Trận đấu của bạn trong giải "${tournament?.title}" đã có cập nhật mới (Tỉ số/Thời gian/Trạng thái).`,
                    link: `/giai-dau/${match.tournament}?tab=schedule`,
                }));
                await Notification.insertMany(notifications);

                if (scheduledAt) {
                    const timeStr = new Date(scheduledAt).toLocaleString('vi-VN', {
                        hour: '2-digit', minute: '2-digit',
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    });

                    for (const user of users) {
                        try {
                            await sendNotificationEmail(
                                user.email,
                                user.name,
                                "Cập nhật lịch thi đấu",
                                `Trận đấu của bạn trong giải "${tournament?.title}" đã được đặt lịch vào lúc <strong>${timeStr}</strong>. Cố gắng tham gia đúng giờ nhé!`,
                                `/giai-dau/${match.tournament}?tab=schedule`
                            );
                        } catch (e) {
                            console.error("Lỗi gửi email lịch thi đấu:", e);
                        }
                    }
                }
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

