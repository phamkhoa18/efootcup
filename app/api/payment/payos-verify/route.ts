import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import PaymentConfig from "@/models/PaymentConfig";
import { sendPaymentInvoiceEmail } from "@/lib/email";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/payment/payos-verify
 * Called from PayOS return URL page to verify and confirm payment.
 * 
 * SECURITY:
 * - Requires authentication (requireAuth)
 * - Only processes the CURRENT USER's registration (filter by user ID)
 * - NO fallback matching — only exact orderCode match
 * - Always verifies with PayOS API before confirming
 * 
 * Body: { tournamentId, orderCode }
 */
export async function POST(req: NextRequest) {
    try {
        // ✅ FIX #1: Require authentication — only logged-in users can verify
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;
        const userId = authResult.user._id;

        const body = await req.json();
        const { tournamentId, orderCode } = body;

        if (!tournamentId || !orderCode) {
            return NextResponse.json({ success: false, message: "Missing params" }, { status: 400 });
        }

        await dbConnect();

        // Get PayOS config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const payosMethod = paymentConfig.methods.find(
            (m: any) => m.type === "payos" && m.enabled
        );

        if (!payosMethod?.payosClientId || !payosMethod?.payosApiKey) {
            return NextResponse.json({ success: false, message: "PayOS not configured" }, { status: 500 });
        }

        // Query PayOS API for payment status — ALWAYS verify with PayOS first
        console.log(`🔍 Verifying PayOS payment: orderCode=${orderCode}, user=${userId}`);
        const payosRes = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`, {
            method: "GET",
            headers: {
                "x-client-id": payosMethod.payosClientId,
                "x-api-key": payosMethod.payosApiKey,
            },
        });

        const payosData = await payosRes.json();
        console.log("📦 PayOS verify response:", JSON.stringify(payosData, null, 2));

        if (payosData.code !== "00" || !payosData.data) {
            return NextResponse.json({ success: false, message: "Cannot verify payment", payosStatus: "unknown" });
        }

        const paymentInfo = payosData.data;
        const payosStatus = paymentInfo.status; // PAID, PENDING, EXPIRED, CANCELLED

        if (payosStatus !== "PAID") {
            return NextResponse.json({
                success: false,
                message: `Payment status: ${payosStatus}`,
                payosStatus,
            });
        }

        // ✅ FIX #2: Only find THIS USER's registration for THIS tournament
        // No fallback to other users' registrations!
        const registration = await Registration.findOne({
            tournament: tournamentId,
            user: userId,
            paymentStatus: { $in: ["unpaid", "pending_verification"] },
        });

        if (!registration) {
            // Check if this user already has a paid registration
            const alreadyPaid = await Registration.findOne({
                tournament: tournamentId,
                user: userId, // ✅ FIX #3: Only check THIS user, not any random user
                paymentStatus: "paid",
            });
            if (alreadyPaid) {
                return NextResponse.json({ success: true, message: "Already confirmed", payosStatus: "PAID", alreadyProcessed: true });
            }
            return NextResponse.json({ success: false, message: "Registration not found for this user", payosStatus: "PAID" });
        }

        // ✅ FIX #4: Verify orderCode matches this registration's paymentNote
        // Prevent user from using someone else's paid orderCode to confirm their registration
        let orderCodeMatches = false;
        try {
            const noteData = JSON.parse(registration.paymentNote || "{}");
            if (noteData.orderCode === Number(orderCode) || noteData.orderCode === orderCode) {
                orderCodeMatches = true;
            }
        } catch {
            // Invalid JSON in paymentNote
        }

        if (!orderCodeMatches) {
            // The orderCode from PayOS doesn't match this registration's stored orderCode
            // This could mean the user paid with a different link or is trying to use someone else's code
            console.warn(`⚠️ PayOS verify: orderCode ${orderCode} does NOT match registration ${registration._id}'s stored orderCode. Rejecting.`);
            return NextResponse.json({
                success: false,
                message: "Order code mismatch — this payment does not belong to your registration. Please contact support.",
                payosStatus: "PAID",
                mismatch: true,
            });
        }

        // ✅ Payment verified by PayOS AND orderCode matches — safe to confirm
        const amount = paymentInfo.amount || paymentInfo.amountPaid;
        const reference = paymentInfo.transactions?.[0]?.reference || "";
        const transactionDateTime = paymentInfo.transactions?.[0]?.transactionDateTime || new Date().toISOString();

        registration.paymentStatus = "paid";
        registration.paymentAmount = amount;
        registration.paymentDate = new Date(transactionDateTime);
        registration.paymentConfirmedAt = new Date();

        const existingNote = JSON.parse(registration.paymentNote || "{}");
        registration.paymentNote = JSON.stringify({
            ...existingNote,
            reference,
            transactionDateTime,
            confirmedBy: "payos-verify",
            confirmedByVerify: true,
            payosAmountPaid: paymentInfo.amountPaid,
            payosTransactions: paymentInfo.transactions || [],
        });

        await registration.save();
        console.log(`✅ PayOS verify: Registration ${registration._id} payment confirmed! (user: ${userId})`);

        // Get tournament
        const tournament = await Tournament.findById(tournamentId);

        // AUTO-APPROVE
        if (tournament && registration.status === "pending" && tournament.currentTeams < tournament.maxTeams) {
            const teamName = registration.teamName || registration.playerName || "Team";
            const teamShortName = registration.teamShortName || teamName.substring(0, 3).toUpperCase();
            const team = await Team.create({
                name: teamName,
                shortName: teamShortName,
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
            await registration.save();

            await Tournament.findByIdAndUpdate(tournament._id, { $inc: { currentTeams: 1 } });

            console.log(`🎉 PayOS verify: Auto-approved registration ${registration._id}`);

            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "🎉 Đăng ký thành công!",
                message: `Thanh toán ${amount?.toLocaleString("vi-VN")}đ đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                link: `/giai-dau/${tournament._id}`,
            });

            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "✅ VĐV mới tự động duyệt",
                message: `VĐV "${registration.playerName}" đã thanh toán qua PayOS và được tự động duyệt vào giải "${tournament.title}".`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });

            // Send invoice email
            sendPaymentInvoiceEmail({
                playerName: registration.playerName,
                email: registration.email,
                teamName: registration.teamName,
                teamShortName: registration.teamShortName,
                tournamentTitle: tournament.title,
                tournamentId: tournament._id.toString(),
                amount,
                currency: tournament.currency || "VNĐ",
                paymentDate: new Date(transactionDateTime),
                orderCode: Number(orderCode),
                reference,
                paymentMethod: "PayOS",
                registrationId: registration._id.toString(),
                isAutoApproved: true,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        }

        return NextResponse.json({
            success: true,
            message: "Payment confirmed",
            payosStatus: "PAID",
            autoApproved: registration.status === "approved",
        });
    } catch (error) {
        console.error("PayOS verify error:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
