import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Notification from "@/models/Notification";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

/**
 * GET /api/payment/quick-confirm?regId=xxx&token=xxx
 * Quick confirm payment from notification link
 * Token = simple hash: base64(regId + "_" + tournamentId)
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const url = new URL(req.url);
        const regId = url.searchParams.get("regId");
        const token = url.searchParams.get("token");

        if (!regId || !token) {
            return apiError("Link không hợp lệ", 400);
        }

        await dbConnect();

        const registration = await Registration.findById(regId);
        if (!registration) {
            return apiError("Không tìm thấy đăng ký", 404);
        }

        // Verify token
        const expectedToken = Buffer.from(`${regId}_${registration.tournament}`).toString("base64");
        if (token !== expectedToken) {
            return apiError("Token không hợp lệ", 403);
        }

        // Check authorization: must be admin, or manager who owns the tournament
        const tournament = await Tournament.findById(registration.tournament);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        if (
            authResult.user.role !== "admin" &&
            (authResult.user.role !== "manager" || tournament.createdBy.toString() !== authResult.user._id)
        ) {
            return apiError("Không có quyền xác nhận", 403);
        }

        // Check payment status
        if (registration.paymentStatus === "paid") {
            return apiResponse({ alreadyConfirmed: true }, 200, "Thanh toán đã được xác nhận trước đó");
        }

        // Confirm payment
        registration.paymentStatus = "paid";
        registration.paymentAmount = tournament.entryFee || 0;
        registration.paymentConfirmedBy = authResult.user._id as any;
        registration.paymentConfirmedAt = new Date();
        await registration.save();

        // Notify user
        await Notification.create({
            recipient: registration.user,
            type: "system",
            title: "✅ Thanh toán đã xác nhận",
            message: `Thanh toán cho giải "${tournament.title}" đã được xác nhận thành công.`,
            link: `/giai-dau/${tournament._id}`,
        });

        // Return redirect info
        const origin = url.origin;
        return apiResponse(
            {
                confirmed: true,
                redirectUrl: `${origin}/manager/giai-dau/${tournament._id}/dang-ky`,
            },
            200,
            "Đã xác nhận thanh toán thành công!"
        );
    } catch (error) {
        console.error("Quick confirm error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
