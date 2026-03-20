import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";
import { sendPaymentInvoiceEmail } from "@/lib/email";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tournaments/[id]/verify-payment
 *
 * Called by the payment result page when SePay redirects back with ?status=success.
 * Uses SePay SDK to check order status directly via API, then updates registration.
 * This is a FALLBACK to IPN — in case IPN is delayed or unreachable (e.g. localhost).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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

        // Find user's registration
        const registration = await Registration.findOne({
            tournament: tournament._id,
            user: authResult.user._id,
        });
        if (!registration) {
            return apiError("Bạn chưa đăng ký giải đấu này", 404);
        }

        // Already paid — skip
        if (registration.paymentStatus === "paid") {
            return apiResponse({ alreadyPaid: true }, 200, "Đã thanh toán rồi");
        }

        // Must have payment info
        if (registration.paymentMethod !== "sepay" || !registration.paymentNote) {
            return apiError("Không tìm thấy thông tin thanh toán SePay", 400);
        }

        const noteData = JSON.parse(registration.paymentNote || "{}");
        const invoiceNumber = noteData.invoiceNumber;
        if (!invoiceNumber) {
            return apiError("Không tìm thấy mã đơn hàng", 400);
        }

        // Get SePay config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const sepayMethod = paymentConfig.methods?.find(
            (m: any) => m.type === "sepay" && m.enabled
        );
        if (!sepayMethod?.sepayMerchantId || !sepayMethod?.sepaySecretKey) {
            return apiError("Chưa cấu hình SePay", 500);
        }

        const env = sepayMethod.sepayEnv || "production";

        // Use SePay SDK to check order status
        const { SePayPgClient } = await import("sepay-pg-node");
        const client = new SePayPgClient({
            env,
            merchant_id: sepayMethod.sepayMerchantId,
            secret_key: sepayMethod.sepaySecretKey,
        });

        let orderData: any = null;
        try {
            const orderResult = await client.order.retrieve(invoiceNumber);
            orderData = orderResult?.data;
            console.log(`🔍 SePay verify-payment: Order ${invoiceNumber} status:`, JSON.stringify(orderData, null, 2));
        } catch (err: any) {
            console.error(`❌ SePay verify-payment: Failed to retrieve order ${invoiceNumber}:`, err?.message);
            // If we can't verify with SePay API, try to trust the callback
            // The body may contain the SePay status from the redirect
        }

        // Check if order is CAPTURED/COMPLETED
        const orderStatus = orderData?.order_status || orderData?.status;
        const isConfirmed = orderStatus === "CAPTURED" || orderStatus === "COMPLETED" || orderStatus === "PAID";

        // Also accept if the request body tells us SePay said success
        const body = await req.json().catch(() => ({}));
        const callbackSuccess = body?.sepayStatus === "success";

        if (!isConfirmed && !callbackSuccess) {
            return apiResponse({ verified: false, orderStatus }, 200, "Đơn hàng chưa được thanh toán");
        }

        // ===== MARK AS PAID =====
        const orderAmount = parseFloat(orderData?.order_amount || String(tournament.entryFee)) || tournament.entryFee;

        // Amount verification
        if (orderAmount < tournament.entryFee) {
            registration.paymentStatus = "pending_verification";
            registration.paymentAmount = orderAmount;
            registration.paymentDate = new Date();
            registration.paymentNote = JSON.stringify({
                ...noteData,
                verifiedByCallback: true,
                orderStatus,
                amountMismatch: true,
                expectedAmount: tournament.entryFee,
                receivedAmount: orderAmount,
            });
            await registration.save();
            return apiResponse({ verified: true, amountMismatch: true }, 200, "Số tiền không khớp");
        }

        registration.paymentStatus = "paid";
        registration.paymentAmount = orderAmount;
        registration.paymentDate = new Date();
        registration.paymentConfirmedAt = new Date();
        registration.paymentNote = JSON.stringify({
            ...noteData,
            verifiedByCallback: true,
            orderStatus,
            verifiedAt: new Date().toISOString(),
        });
        await registration.save();

        console.log(`✅ verify-payment: Registration ${registration._id} marked as PAID via callback verify`);

        // ===== AUTO-APPROVE =====
        if (registration.status === "pending" && tournament.currentTeams < tournament.maxTeams) {
            const teamName = registration.teamName || registration.playerName || "Team";
            const teamShortName = registration.teamShortName || teamName.substring(0, 3).toUpperCase();
            const team = await Team.create({
                name: teamName,
                shortName: teamShortName,
                tournament: tournament._id,
                captain: registration.user,
                members: [
                    {
                        user: registration.user,
                        role: "captain",
                        joinedAt: new Date(),
                    },
                ],
            });

            registration.status = "approved";
            registration.team = team._id;
            registration.approvedAt = new Date();
            await registration.save();

            await Tournament.findByIdAndUpdate(tournament._id, {
                $inc: { currentTeams: 1 },
            });

            console.log(`🎉 verify-payment: Auto-approved registration ${registration._id}`);

            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "🎉 Đăng ký thành công!",
                message: `Thanh toán đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                link: `/giai-dau/${tournament._id}`,
            });

            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "✅ VĐV mới tự động duyệt",
                message: `VĐV "${registration.playerName}" đã thanh toán và được tự động duyệt vào giải "${tournament.title}".`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });

            sendPaymentInvoiceEmail({
                playerName: registration.playerName,
                email: registration.email,
                teamName: registration.teamName,
                teamShortName: registration.teamShortName,
                tournamentTitle: tournament.title,
                tournamentId: tournament._id.toString(),
                amount: orderAmount,
                currency: tournament.currency || "VNĐ",
                paymentDate: new Date(),
                orderCode: invoiceNumber,
                reference: `callback-verify`,
                paymentMethod: "Chuyển khoản tự động (SePay)",
                registrationId: registration._id.toString(),
                isAutoApproved: true,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        }

        return apiResponse({ verified: true, paid: true }, 200, "Thanh toán đã được xác nhận!");
    } catch (error) {
        console.error("verify-payment error:", error);
        return apiError("Có lỗi xảy ra khi xác nhận thanh toán", 500);
    }
}
