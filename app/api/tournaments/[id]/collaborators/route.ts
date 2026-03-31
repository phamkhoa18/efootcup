import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import User from "@/models/User";
import Match from "@/models/Match";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Generate a short, readable invite code (6 characters, uppercase alphanumeric).
 * Avoids confusing characters like O/0, I/1, L.
 */
function generateInviteCode(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET /api/tournaments/[id]/collaborators — List collaborators + invite code
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;

        const tournament = await Tournament.findById(id).select("createdBy collaborators inviteCode").lean();
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        // Only owner can see full collaborator list & invite code
        if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin") {
            return apiError("Không có quyền", 403);
        }

        // Fetch matches updated by collaborators
        const matchCounts = await Match.aggregate([
            { $match: { tournament: new mongoose.Types.ObjectId(id), updatedBy: { $exists: true, $ne: null } } },
            { $group: { _id: "$updatedBy", count: { $sum: 1 } } }
        ]);
        
        const countsMap = matchCounts.reduce((acc, curr) => {
            if (curr._id) {
                acc[curr._id.toString()] = curr.count;
            }
            return acc;
        }, {} as Record<string, number>);

        const collaboratorsWithStats = (tournament.collaborators || []).map((c: any) => ({
            ...c,
            matchesUpdated: countsMap[c.userId.toString()] || 0,
        }));

        return apiResponse({
            collaborators: collaboratorsWithStats,
            inviteCode: tournament.inviteCode || null,
        });
    } catch (error) {
        console.error("Get collaborators error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments/[id]/collaborators — Generate invite code or join via code
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        // Action: generate_code — Owner generates a short invite code
        if (body.action === "generate_code") {
            const tournament = await Tournament.findById(id);
            if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

            if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin") {
                return apiError("Chỉ chủ giải mới có thể tạo mã mời", 403);
            }

            // Generate a unique code (retry up to 5 times for uniqueness)
            let code = "";
            for (let attempt = 0; attempt < 5; attempt++) {
                code = generateInviteCode();
                const existing = await Tournament.findOne({ inviteCode: code, _id: { $ne: tournament._id } });
                if (!existing) break;
            }

            tournament.inviteCode = code;
            await tournament.save();

            return apiResponse({
                inviteCode: code,
            }, 200, "Đã tạo mã mời");
        }

        // Action: join — Another manager joins using a code
        if (body.action === "join") {
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
        }

        return apiError("Action không hợp lệ", 400);
    } catch (error) {
        console.error("Collaborator action error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/collaborators — Regenerate invite code
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;

        const tournament = await Tournament.findById(id);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin") {
            return apiError("Không có quyền", 403);
        }

        // Generate new invite code (invalidates old one)
        let code = "";
        for (let attempt = 0; attempt < 5; attempt++) {
            code = generateInviteCode();
            const existing = await Tournament.findOne({ inviteCode: code, _id: { $ne: tournament._id } });
            if (!existing) break;
        }

        tournament.inviteCode = code;
        await tournament.save();

        return apiResponse({
            inviteCode: code,
        }, 200, "Đã tạo mã mời mới. Mã cũ không còn hiệu lực.");
    } catch (error) {
        console.error("Regenerate code error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/tournaments/[id]/collaborators — Remove a collaborator
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;
        const body = await req.json();
        const { userId: targetUserId } = body;

        const tournament = await Tournament.findById(id);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        // Owner can remove anyone; collaborator can remove themselves
        const isOwner = tournament.createdBy.toString() === authResult.user._id;
        const isSelf = targetUserId === authResult.user._id;

        if (!isOwner && !isSelf && authResult?.user?.role !== "admin") {
            return apiError("Không có quyền xóa cộng tác viên này", 403);
        }

        tournament.collaborators = (tournament.collaborators || []).filter(
            (c: any) => c.userId.toString() !== targetUserId
        );
        await tournament.save();

        return apiResponse(null, 200, "Đã xóa cộng tác viên");
    } catch (error) {
        console.error("Remove collaborator error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
