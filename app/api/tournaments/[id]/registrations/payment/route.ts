import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Notification from "@/models/Notification";
import { requireAuth, requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/tournaments/[id]/registrations/payment — Submit payment proof (user) or confirm payment (manager)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug)
            ? { _id: idOrSlug }
            : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const tournamentId = tournament._id;

        const body = await req.json();
        const { action, registrationId, paymentProof, paymentMethod, paymentNote } = body;

        // === Action: submit_proof — User submits payment proof ===
        if (action === "submit_proof") {
            // Find registration by registrationId + user, or just by user
            let registration = registrationId
                ? await Registration.findOne({
                    _id: registrationId,
                    tournament: tournamentId,
                    user: authResult.user._id,
                })
                : null;

            if (!registration) {
                registration = await Registration.findOne({
                    tournament: tournamentId,
                    user: authResult.user._id,
                });
            }

            if (!registration) return apiError("Không tìm thấy đăng ký", 404);

            registration.paymentProof = paymentProof || registration.paymentProof;
            registration.paymentMethod = paymentMethod || registration.paymentMethod;
            registration.paymentNote = paymentNote || registration.paymentNote;
            registration.paymentDate = new Date();
            registration.paymentStatus = "pending_verification";
            await registration.save();

            // Generate quick-confirm token
            const quickConfirmToken = Buffer.from(`${registration._id}_${tournamentId}`).toString("base64");
            const origin = req.headers.get("origin") || new URL(req.url).origin;
            const quickConfirmUrl = `${origin}/api/payment/quick-confirm?regId=${registration._id}&token=${quickConfirmToken}`;

            // Notify the tournament manager with payment details
            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "💰 Minh chứng thanh toán mới",
                message: `VĐV "${registration.playerName}" đã gửi minh chứng thanh toán ${tournament.entryFee?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}". Vào trang đăng ký để xem ảnh và xác nhận.`,
                link: `/manager/giai-dau/${tournamentId}/dang-ky`,
            });

            console.log(`📸 Payment proof submitted for reg ${registration._id}`);
            console.log(`  Quick confirm URL: ${quickConfirmUrl}`);

            return apiResponse(registration, 200, "Đã gửi minh chứng thanh toán thành công");
        }

        // === Action: confirm_payment — Manager confirms payment ===
        if (action === "confirm_payment") {
            // Check manager access
            if (
                authResult.user.role !== "admin" &&
                authResult.user.role !== "manager"
            ) {
                return apiError("Không có quyền", 403);
            }

            if (
                authResult.user.role === "manager" &&
                tournament.createdBy.toString() !== authResult.user._id
            ) {
                return apiError("Không có quyền", 403);
            }

            const registration = await Registration.findById(registrationId);
            if (!registration) return apiError("Không tìm thấy đăng ký", 404);

            registration.paymentStatus = "paid";
            registration.paymentAmount = body.paymentAmount || tournament.entryFee;
            registration.paymentConfirmedBy = authResult.user._id as any;
            registration.paymentConfirmedAt = new Date();
            await registration.save();

            // ✅ AUTO-APPROVE if still pending and tournament has room
            if (registration.status === "pending" && tournament.currentTeams < tournament.maxTeams) {
                const Team = (await import("@/models/Team")).default;

                const team = await Team.create({
                    name: registration.teamName || registration.playerName || "Team",
                    shortName: registration.teamShortName || (registration.teamName || registration.playerName || "TEA").substring(0, 3).toUpperCase(),
                    tournament: tournament._id,
                    captain: registration.user,
                    members: [{
                        user: registration.user,
                        role: "captain",
                        joinedAt: new Date(),
                    }],
                });

                registration.status = "approved";
                registration.team = team._id;
                registration.approvedAt = new Date();
                registration.approvedBy = authResult.user._id as any;
                await registration.save();

                await Tournament.findByIdAndUpdate(tournament._id, { $inc: { currentTeams: 1 } });

                console.log(`🎉 Manager confirmed payment + auto-approved reg ${registration._id}`);
            }

            // Notify user
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "🎉 Thanh toán đã xác nhận",
                message: registration.status === "approved"
                    ? `Thanh toán cho giải "${tournament.title}" đã được xác nhận và bạn đã được duyệt vào giải!`
                    : `Thanh toán cho giải "${tournament.title}" đã được xác nhận thành công.`,
                link: `/giai-dau/${tournamentId}`,
            });

            return apiResponse(registration, 200, "Đã xác nhận thanh toán thành công");
        }

        // === Action: reject_payment — Manager rejects payment ===
        if (action === "reject_payment") {
            if (
                authResult.user.role !== "admin" &&
                authResult.user.role !== "manager"
            ) {
                return apiError("Không có quyền", 403);
            }

            const registration = await Registration.findById(registrationId);
            if (!registration) return apiError("Không tìm thấy đăng ký", 404);

            registration.paymentStatus = "unpaid";
            registration.paymentProof = "";
            await registration.save();

            // Notify user
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "Thanh toán bị từ chối",
                message: `Minh chứng thanh toán cho giải "${tournament.title}" không hợp lệ. Vui lòng gửi lại.`,
                link: `/giai-dau/${tournamentId}`,
            });

            return apiResponse(registration, 200, "Đã từ chối thanh toán");
        }

        return apiError("Hành động không hợp lệ", 400);
    } catch (error) {
        console.error("Payment action error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
