import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/matches/submit-result — Player submits match result
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const userId = authResult.user._id;

        console.log("🔍 Submit result: userId=", userId, "tournamentIdOrSlug=", idOrSlug);

        // Resolve tournament ID
        let tournamentId: string;
        if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
            tournamentId = idOrSlug;
        } else {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
            tournamentId = tournament._id.toString();
        }

        const body = await req.json();
        const { matchId, homeScore, awayScore, homePenalty, awayPenalty, screenshots, notes } = body;

        console.log("📦 Submit body:", { matchId, homeScore, awayScore, screenshots: screenshots?.length, notes });

        if (!matchId) return apiError("Thiếu mã trận đấu", 400);
        if (homeScore === undefined || awayScore === undefined) {
            return apiError("Vui lòng nhập tỉ số", 400);
        }

        // Find the match
        const match = await Match.findById(matchId).lean();
        if (!match) {
            console.error("❌ Match not found:", matchId);
            return apiError("Không tìm thấy trận đấu", 404);
        }

        // Verify match belongs to this tournament
        if (match.tournament.toString() !== tournamentId) {
            console.error("❌ Match tournament mismatch:", match.tournament.toString(), "vs", tournamentId);
            return apiError("Trận đấu không thuộc giải đấu này", 400);
        }

        // Match must be scheduled or live
        if (match.status === "completed") {
            return apiError("Trận đấu đã kết thúc, không thể gửi kết quả", 400);
        }

        // Both teams must be determined (not TBD/null)
        if (!match.homeTeam || !match.awayTeam) {
            return apiError("Cặp đấu chưa xác định đối thủ. Vui lòng chờ vòng trước kết thúc.", 400);
        }

        // Find user's team in this match
        const homeTeam = match.homeTeam ? await Team.findById(match.homeTeam).lean() : null;
        const awayTeam = match.awayTeam ? await Team.findById(match.awayTeam).lean() : null;

        console.log("🏟️ Teams:",
            "home:", homeTeam?._id?.toString(), "captain:", homeTeam?.captain?.toString(),
            "away:", awayTeam?._id?.toString(), "captain:", awayTeam?.captain?.toString(),
            "userId:", userId
        );

        let userTeam: any = null;
        // Check home team
        if (homeTeam) {
            const isCaptain = homeTeam.captain?.toString() === userId.toString();
            const isMember = homeTeam.members?.some((m: any) => m.user?.toString() === userId.toString());
            if (isCaptain || isMember) userTeam = homeTeam;
        }
        // Check away team
        if (!userTeam && awayTeam) {
            const isCaptain = awayTeam.captain?.toString() === userId.toString();
            const isMember = awayTeam.members?.some((m: any) => m.user?.toString() === userId.toString());
            if (isCaptain || isMember) userTeam = awayTeam;
        }

        // Fallback: check Registration
        if (!userTeam) {
            const Registration = (await import("@/models/Registration")).default;
            const reg = await Registration.findOne({
                user: userId,
                tournament: tournamentId,
                status: "approved",
            }).lean();

            console.log("🔎 Fallback registration:", reg?._id, "team:", reg?.team);

            if (reg?.team) {
                const regTeamId = reg.team.toString();
                if (homeTeam && homeTeam._id.toString() === regTeamId) {
                    userTeam = homeTeam;
                } else if (awayTeam && awayTeam._id.toString() === regTeamId) {
                    userTeam = awayTeam;
                }
            }
        }

        if (!userTeam) {
            console.error("❌ User not in match. userId:", userId);
            return apiError("Bạn không phải là thành viên của trận đấu này", 403);
        }

        console.log("✅ User team found:", userTeam._id.toString(), userTeam.name);

        const submissionData = {
            user: new mongoose.Types.ObjectId(userId),
            team: userTeam._id,
            homeScore: Number(homeScore),
            awayScore: Number(awayScore),
            ...(homePenalty !== undefined ? { homePenalty: Number(homePenalty) } : {}),
            ...(awayPenalty !== undefined ? { awayPenalty: Number(awayPenalty) } : {}),
            screenshots: screenshots || [],
            notes: notes || "",
            submittedAt: new Date(),
        };

        // Block if match already has official scores set by manager
        if (match.homeScore !== null && match.homeScore !== undefined && match.awayScore !== null && match.awayScore !== undefined) {
            return apiError("Quản lý giải đã cập nhật tỉ số chính thức. Bạn không thể gửi kết quả.", 400);
        }

        // Check if user already submitted — allow update instead of blocking
        const existingSub = match.resultSubmissions?.find(
            (s: any) => s.user?.toString() === userId.toString()
        );

        let result;
        if (existingSub) {
            // Update existing submission
            result = await Match.updateOne(
                { _id: matchId, "resultSubmissions.user": new mongoose.Types.ObjectId(userId) },
                {
                    $set: {
                        "resultSubmissions.$.homeScore": submissionData.homeScore,
                        "resultSubmissions.$.awayScore": submissionData.awayScore,
                        ...(submissionData.homePenalty !== undefined ? { "resultSubmissions.$.homePenalty": submissionData.homePenalty } : {}),
                        ...(submissionData.awayPenalty !== undefined ? { "resultSubmissions.$.awayPenalty": submissionData.awayPenalty } : {}),
                        "resultSubmissions.$.screenshots": submissionData.screenshots,
                        "resultSubmissions.$.notes": submissionData.notes,
                        "resultSubmissions.$.submittedAt": submissionData.submittedAt,
                    }
                }
            );
            console.log("📝 Updated existing submission:", JSON.stringify(result));
        } else {
            // Add new submission using $push
            result = await Match.updateOne(
                { _id: matchId },
                {
                    $push: {
                        resultSubmissions: submissionData
                    }
                }
            );
            console.log("📝 Pushed new submission:", JSON.stringify(result));
        }

        // Verify the save
        const verify = await Match.findById(matchId).select("resultSubmissions").lean();
        console.log("✅ Verified! Submissions count:", verify?.resultSubmissions?.length || 0);

        // Notify manager
        try {
            const tournament = await Tournament.findById(tournamentId).lean();
            if (tournament) {
                const Notification = (await import("@/models/Notification")).default;
                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "tournament",
                    title: "Kết quả trận đấu mới",
                    message: `Người chơi đã gửi kết quả trận đấu: ${homeTeam?.shortName || "?"} ${homeScore} - ${awayScore} ${awayTeam?.shortName || "?"} trong giải "${tournament.title}"`,
                    link: `/manager/giai-dau/${tournamentId}/lich`,
                });
            }
        } catch (e) {
            console.error("Notify manager error:", e);
        }

        return apiResponse({ matchId, submitted: true, updated: !!existingSub }, 200, existingSub ? "Cập nhật kết quả thành công!" : "Gửi kết quả thành công! Quản lý giải sẽ xem xét.");
    } catch (error) {
        console.error("Submit result error:", error);
        return apiError("Có lỗi xảy ra khi gửi kết quả", 500);
    }
}
