import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Notification from "@/models/Notification";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/brackets — Generate brackets
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        // Get active teams
        const teams = await Team.find({ tournament: id, status: "active" });

        if (teams.length < 2)
            return apiError("Cần ít nhất 2 đội để tạo bracket", 400);

        // Extract formatType from body, fallback to standard
        let formatType = 'standard';
        try {
            const reqBody = await req.json();
            if (reqBody && reqBody.formatType) {
                formatType = reqBody.formatType;
            }
        } catch (e) { }

        // Delete existing matches
        await Match.deleteMany({ tournament: id });

        let matches;

        switch (tournament.format) {
            case "single_elimination":
                matches = await generateSingleElimination(id.toString(), teams, formatType);
                break;
            case "round_robin":
                matches = await generateRoundRobin(id.toString(), teams);
                break;
            case "group_stage":
                matches = await generateGroupStage(id.toString(), teams, tournament.groups || []);
                break;
            default:
                matches = await generateSingleElimination(id.toString(), teams, formatType);
        }

        // Update tournament status
        tournament.status = "ongoing";
        await tournament.save();

        // Notify manager
        await Notification.create({
            recipient: tournament.createdBy,
            type: "tournament",
            title: "Lịch thi đấu đã được Cập nhật/Trộn",
            message: `Bạn vừa sử dụng chức năng Trộn lịch thi đấu cho giải "${tournament.title}".`,
            link: `/manager/giai-dau/${id}/lich`,
        });

        // Notify all active players/captains in the tournament
        try {
            const captains = teams.map(t => t.captain).filter(Boolean);
            if (captains.length > 0) {
                const notifications = captains.map(userId => ({
                    recipient: userId,
                    type: "tournament" as const,
                    title: "Lịch thi đấu đã sẵn sàng",
                    message: `Lịch thi đấu của giải "${tournament.title}" đã được cập nhật. Hãy kiểm tra ngay!`,
                    link: `/giai-dau/${id}?tab=schedule`,
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notifyErr) {
            console.error("Notify bracket generation error:", notifyErr);
        }

        return apiResponse(
            { matches, totalMatches: matches.length },
            201,
            "Tạo bracket thành công"
        );
    } catch (error) {
        console.error("Generate brackets error:", error);
        return apiError("Có lỗi xảy ra khi tạo bracket", 500);
    }
}

// GET /api/tournaments/[id]/brackets — Get all matches for bracket display
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;

        let id = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) id = tournament._id.toString();
        }

        const rawMatches = await Match.find({ tournament: id })
            .populate("homeTeam", "name shortName logo stats")
            .populate("awayTeam", "name shortName logo stats")
            .populate("winner", "name shortName")
            .sort({ round: 1, matchNumber: 1 })
            .lean();

        // Fetch all registrations in this tournament to map team to player names
        const Registration = (await import('@/models/Registration')).default;
        const registrations = await Registration.find({ tournament: id, status: 'approved' }).lean();

        const teamMap = new Map();
        registrations.forEach(r => {
            if (r.team) teamMap.set(r.team.toString(), r);
        });

        const matches = rawMatches.map((match: any) => {
            if (match.homeTeam && match.homeTeam._id) {
                const reg = teamMap.get(match.homeTeam._id.toString());
                if (reg) {
                    match.homeTeam.player1 = reg.playerName;
                    match.homeTeam.player2 = reg.gamerId;
                }
            }
            if (match.awayTeam && match.awayTeam._id) {
                const reg = teamMap.get(match.awayTeam._id.toString());
                if (reg) {
                    match.awayTeam.player1 = reg.playerName;
                    match.awayTeam.player2 = reg.gamerId;
                }
            }
            return match;
        });

        // Group by rounds
        const rounds: Record<string, typeof matches> = {};
        matches.forEach((match) => {
            const roundKey = match.roundName || `Vòng ${match.round}`;
            if (!rounds[roundKey]) rounds[roundKey] = [];
            rounds[roundKey].push(match);
        });

        return apiResponse({ matches, rounds });
    } catch (error) {
        console.error("Get brackets error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// ====== Helper Functions ======

async function generateSingleElimination(
    tournamentId: string,
    teams: any[],
    formatType: string = 'standard'
) {
    const teamCount = teams.length;
    // Find next power of 2
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
    const totalRounds = Math.log2(bracketSize);
    const byes = bracketSize - teamCount;

    // Apply generation mode
    let shuffled: any[] = [];
    if (formatType === 'empty') {
        shuffled = [];
    } else if (formatType === 'custom') {
        const groups: Record<string, any[]> = {};
        for (const t of teams) {
            const key = (t.name === 'Tự do' || !t.name) ? t._id.toString() : t.name;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        }
        const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);
        while (sortedGroups.some(g => g.length > 0)) {
            for (const g of sortedGroups) {
                if (g.length > 0) {
                    shuffled.push(g.pop());
                }
            }
        }
    } else {
        // standard - prioritize seeds, rest random
        shuffled = [...teams].sort((a, b) => {
            if (a.seed && b.seed) return (a.seed) - (b.seed);
            if (a.seed) return -1;
            if (b.seed) return 1;
            return Math.random() - 0.5;
        });
    }

    const roundNames: Record<number, string> = {};
    for (let r = 1; r <= totalRounds; r++) {
        if (r === totalRounds) roundNames[r] = "Chung kết";
        else if (r === totalRounds - 1) roundNames[r] = "Bán kết";
        else if (r === totalRounds - 2) roundNames[r] = "Tứ kết";
        else roundNames[r] = `Vòng ${r}`;
    }

    const allMatches = [];

    // Create first round matches
    const firstRoundMatches = bracketSize / 2;
    let teamIndex = 0;

    for (let i = 0; i < firstRoundMatches; i++) {
        const homeTeam = teamIndex < shuffled.length ? shuffled[teamIndex++] : null;
        const awayTeam = teamIndex < shuffled.length ? shuffled[teamIndex++] : null;

        const match = await Match.create({
            tournament: tournamentId,
            round: 1,
            roundName: roundNames[1],
            matchNumber: i + 1,
            homeTeam: homeTeam?._id || null,
            awayTeam: awayTeam?._id || null,
            status: (!homeTeam && !awayTeam) ? "scheduled" : (!homeTeam || !awayTeam ? "walkover" : "scheduled"),
            winner: !awayTeam && homeTeam ? homeTeam._id : !homeTeam && awayTeam ? awayTeam._id : null,
            bracketPosition: { x: 0, y: i },
        });

        allMatches.push(match);
    }

    // Create subsequent rounds
    for (let round = 2; round <= totalRounds; round++) {
        const matchesInRound = bracketSize / Math.pow(2, round);

        for (let i = 0; i < matchesInRound; i++) {
            const match = await Match.create({
                tournament: tournamentId,
                round,
                roundName: roundNames[round],
                matchNumber: i + 1,
                homeTeam: null,
                awayTeam: null,
                status: "scheduled",
                bracketPosition: { x: round - 1, y: i },
            });

            allMatches.push(match);
        }
    }

    // Link matches (nextMatch)
    for (let round = 1; round < totalRounds; round++) {
        const currentRoundMatches = allMatches.filter((m) => m.round === round);
        const nextRoundMatches = allMatches.filter((m) => m.round === round + 1);

        for (let i = 0; i < currentRoundMatches.length; i++) {
            const nextMatchIndex = Math.floor(i / 2);
            if (nextRoundMatches[nextMatchIndex]) {
                currentRoundMatches[i].nextMatch = nextRoundMatches[nextMatchIndex]._id;
                await currentRoundMatches[i].save();

                // Auto-advance byes
                if (currentRoundMatches[i].status === "walkover" && currentRoundMatches[i].winner) {
                    const nextMatch = nextRoundMatches[nextMatchIndex];
                    if (i % 2 === 0) {
                        nextMatch.homeTeam = currentRoundMatches[i].winner;
                    } else {
                        nextMatch.awayTeam = currentRoundMatches[i].winner;
                    }
                    await nextMatch.save();
                }
            }
        }
    }

    return allMatches;
}

async function generateRoundRobin(tournamentId: string, teams: any[]) {
    const allMatches = [];
    const teamList = [...teams];

    // If odd number of teams, add a bye
    if (teamList.length % 2 !== 0) {
        teamList.push(null);
    }

    const n = teamList.length;
    const totalRounds = n - 1;

    for (let round = 0; round < totalRounds; round++) {
        for (let i = 0; i < n / 2; i++) {
            const home = teamList[i];
            const away = teamList[n - 1 - i];

            if (home && away) {
                const match = await Match.create({
                    tournament: tournamentId,
                    round: round + 1,
                    roundName: `Vòng ${round + 1}`,
                    matchNumber: i + 1,
                    homeTeam: home._id,
                    awayTeam: away._id,
                    status: "scheduled",
                    bracketPosition: { x: round, y: i },
                });
                allMatches.push(match);
            }
        }

        // Rotate teams (keep first team fixed)
        const last = teamList.pop()!;
        teamList.splice(1, 0, last);
    }

    return allMatches;
}

async function generateGroupStage(
    tournamentId: string,
    teams: any[],
    groups: any[]
) {
    const allMatches = [];

    // If no groups defined, create auto groups
    if (!groups || groups.length === 0) {
        const groupCount = Math.max(2, Math.floor(teams.length / 4));
        const shuffled = [...teams].sort(() => Math.random() - 0.5);

        for (let g = 0; g < groupCount; g++) {
            const groupName = String.fromCharCode(65 + g); // A, B, C...
            const groupTeams = shuffled.filter(
                (_, i) => i % groupCount === g
            );

            // Round robin within group
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const createdMatch: any = await Match.create({
                        tournament: tournamentId,
                        round: 1,
                        roundName: `Bảng ${groupName}`,
                        matchNumber: allMatches.length + 1,
                        group: groupName,
                        homeTeam: groupTeams[i]._id,
                        awayTeam: groupTeams[j]._id,
                        status: "scheduled",
                        bracketPosition: { x: 0, y: allMatches.length },
                    });

                    allMatches.push(createdMatch);

                    // Update team group
                    await Team.findByIdAndUpdate(groupTeams[i]._id, { group: groupName });
                    await Team.findByIdAndUpdate(groupTeams[j]._id, { group: groupName });
                }
            }
        }
    }

    return allMatches;
}
