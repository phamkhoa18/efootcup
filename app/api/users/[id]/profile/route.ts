import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Bxh from "@/models/Bxh";
import EfvPointLog from "@/models/EfvPointLog";
import { apiResponse, apiError } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/users/[id]/profile — Public profile by efvId
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const { id } = await params;
        const efvId = parseInt(id, 10);

        if (isNaN(efvId)) {
            return apiError("ID không hợp lệ", 400);
        }

        const user = await User.findOne({ efvId }).lean();
        if (!user) {
            return apiError("Không tìm thấy người dùng", 404);
        }

        // Get BXH data for both modes
        const [mobileBxh, consoleBxh] = await Promise.all([
            Bxh.findOne({ gamerId: String(efvId), mode: "mobile" }).lean(),
            Bxh.findOne({ gamerId: String(efvId), mode: "pc" }).lean(),
        ]);

        // Get EFV point logs
        const logs = await EfvPointLog.find({ gamerId: String(efvId) })
            .sort({ awardedAt: -1 })
            .limit(50)
            .lean();

        // Build public profile data (exclude sensitive info)
        const profileData = {
            efvId: user.efvId,
            name: user.name,
            avatar: user.avatar || "",
            nickname: user.nickname || "",
            teamName: user.teamName || "",
            phone: user.phone || "",
            email: user.email || "",
            facebookName: user.facebookName || "",
            facebookLink: user.facebookLink || "",
            bio: user.bio || "",
            gamerId: user.gamerId || "",
            province: user.province || "",
            country: user.country || "",
            dateOfBirth: user.dateOfBirth || "",
            role: user.role,
            stats: user.stats || {
                tournamentsCreated: 0,
                tournamentsJoined: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                goalsScored: 0,
                goalsConceded: 0,
            },
            createdAt: user.createdAt,
            // BXH
            mobile: mobileBxh
                ? {
                    points: mobileBxh.points,
                    rank: mobileBxh.rank,
                    pointsEfv250: (mobileBxh as any).pointsEfv250 || 0,
                    pointsEfv500: (mobileBxh as any).pointsEfv500 || 0,
                    pointsEfv1000: (mobileBxh as any).pointsEfv1000 || 0,
                }
                : null,
            console: consoleBxh
                ? {
                    points: consoleBxh.points,
                    rank: consoleBxh.rank,
                    pointsEfv50: (consoleBxh as any).pointsEfv50 || 0,
                    pointsEfv100: (consoleBxh as any).pointsEfv100 || 0,
                    pointsEfv200: (consoleBxh as any).pointsEfv200 || 0,
                }
                : null,
            // Recent tournament logs
            recentLogs: logs.map((log: any) => ({
                _id: log._id,
                tournamentTitle: log.tournamentTitle,
                efvTier: log.efvTier,
                placement: log.placement,
                points: log.points,
                teamName: log.teamName,
                awardedAt: log.awardedAt,
                isActive: log.isActive,
            })),
        };

        return apiResponse(profileData);
    } catch (error) {
        console.error("Get public profile error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
