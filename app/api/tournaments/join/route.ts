import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import User from "@/models/User";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

// POST /api/tournaments/join — Join a tournament collaboration by invite code
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();
        const { code } = body;

        if (!code || typeof code !== "string" || code.trim().length < 4) {
            return apiError("Mã không hợp lệ", 400);
        }

        const tournament = await Tournament.findOne({ inviteCode: code.trim().toUpperCase() });
        if (!tournament) {
            return apiError("Mã mời không tồn tại. Vui lòng kiểm tra lại.", 404);
        }

        const userId = authResult.user._id;

        // Can't add yourself (the owner)
        if (tournament.createdBy.toString() === userId) {
            return apiError("Bạn là chủ giải đấu này rồi", 400);
        }

        // Check if already a collaborator
        const alreadyCollab = (tournament.collaborators || []).some(
            (c: any) => c.userId.toString() === userId
        );
        if (alreadyCollab) {
            return apiResponse({
                tournamentId: tournament._id,
                title: tournament.title,
                alreadyJoined: true,
            }, 200, "Bạn đã là cộng tác viên của giải đấu này");
        }

        // Add as collaborator
        const user = await User.findById(userId).select("name email").lean();
        if (!user) return apiError("Không tìm thấy người dùng", 404);

        tournament.collaborators = tournament.collaborators || [];
        tournament.collaborators.push({
            userId: new mongoose.Types.ObjectId(userId),
            name: user.name,
            email: user.email,
            role: "editor",
            addedAt: new Date(),
        });
        await tournament.save();

        return apiResponse({
            tournamentId: tournament._id,
            title: tournament.title,
        }, 200, `Đã tham gia cộng tác quản lý giải "${tournament.title}"`);
    } catch (error) {
        console.error("Join collaboration error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
