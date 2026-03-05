import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import PaymentConfig from "@/models/PaymentConfig";
import { sendPaymentInvoiceEmail } from "@/lib/email";

/**
 * POST /api/payment/payos-verify
 * Called from PayOS return URL page to verify and confirm payment.
 * This is needed because webhooks don't work on localhost.
 * 
 * Body: { tournamentId, orderCode }
 * 
 * Checks PayOS API for payment status and updates registration.
 */
export async function POST(req: NextRequest) {
    try {
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

        // Query PayOS API for payment status
        console.log(`🔍 Verifying PayOS payment: orderCode=${orderCode}`);
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

        // Payment is PAID — find and update registration
        const registrations = await Registration.find({
            tournament: tournamentId,
            paymentStatus: { $in: ["unpaid", "pending_verification"] },
        });

        let registration = null;
        // Try exact orderCode match first
        for (const reg of registrations) {
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                if (noteData.orderCode === Number(orderCode) || noteData.orderCode === orderCode) {
                    registration = reg;
                    break;
                }
            } catch {
                // Skip invalid JSON
            }
        }

        // Fallback: if no exact match, find any unpaid payos registration for this tournament
        // This handles the case where user clicked pay multiple times (different orderCodes)
        if (!registration) {
            registration = registrations.find((r: any) => r.paymentMethod === "payos") || registrations[0] || null;
            if (registration) {
                console.log(`⚠️ PayOS verify: orderCode mismatch, using fallback registration ${registration._id}`);
            }
        }

        if (!registration) {
            // Maybe already processed by webhook or verify
            const alreadyPaid = await Registration.findOne({
                tournament: tournamentId,
                paymentStatus: "paid",
            });
            if (alreadyPaid) {
                return NextResponse.json({ success: true, message: "Already confirmed", payosStatus: "PAID", alreadyProcessed: true });
            }
            return NextResponse.json({ success: false, message: "Registration not found", payosStatus: "PAID" });
        }

        // Update registration
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
        });

        await registration.save();
        console.log(`✅ PayOS verify: Registration ${registration._id} payment confirmed!`);

        // Get tournament
        const tournament = await Tournament.findById(tournamentId);

        // AUTO-APPROVE
        if (tournament && registration.status === "pending" && tournament.currentTeams < tournament.maxTeams) {
            const team = await Team.create({
                name: registration.teamName,
                shortName: registration.teamShortName,
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
