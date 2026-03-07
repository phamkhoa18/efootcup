import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Notification from "@/models/Notification";

/**
 * POST /api/payment/momo-ipn
 * MoMo Instant Payment Notification (IPN) webhook.
 * MoMo calls this endpoint automatically when a payment is completed.
 * This is the heart of automatic payment confirmation.
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        console.log("=== MoMo IPN received ===", JSON.stringify(body, null, 2));

        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature,
        } = body;

        // Get payment config to verify signature
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const momoMethod = paymentConfig.methods.find(
            (m: any) => m.type === "momo" && m.mode === "auto" && m.enabled
        );

        if (!momoMethod) {
            console.error("MoMo IPN: No MoMo method configured");
            return NextResponse.json({ resultCode: 1, message: "MoMo not configured" });
        }

        // Verify signature
        const accessKey = momoMethod.apiAccessKey;
        const secretKey = momoMethod.apiSecretKey;

        const rawSignature = [
            `accessKey=${accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `orderType=${orderType}`,
            `partnerCode=${partnerCode}`,
            `payType=${payType}`,
            `requestId=${requestId}`,
            `responseTime=${responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`,
        ].join("&");

        const expectedSignature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("MoMo IPN: Invalid signature");
            console.error("Expected:", expectedSignature);
            console.error("Received:", signature);
            return NextResponse.json({ resultCode: 1, message: "Invalid signature" });
        }

        // Payment successful
        if (resultCode === 0) {
            // Parse extraData to get registrationId
            let registrationId: string | null = null;
            let tournamentId: string | null = null;

            try {
                const decoded = JSON.parse(Buffer.from(extraData, "base64").toString("utf-8"));
                registrationId = decoded.registrationId;
                tournamentId = decoded.tournamentId;
            } catch (e) {
                // Fallback: parse orderId format EFCUP_{tournamentId}_{registrationId}_{timestamp}
                const parts = orderId.split("_");
                if (parts.length >= 3) {
                    tournamentId = parts[1];
                    registrationId = parts[2];
                }
            }

            if (!registrationId) {
                console.error("MoMo IPN: Cannot find registrationId", { orderId, extraData });
                return NextResponse.json({ resultCode: 1, message: "Missing registrationId" });
            }

            // Update registration payment status
            const registration = await Registration.findById(registrationId);
            if (!registration) {
                console.error("MoMo IPN: Registration not found", registrationId);
                return NextResponse.json({ resultCode: 1, message: "Registration not found" });
            }

            // IMPORTANT: Only update if not already paid (prevent double processing)
            if (registration.paymentStatus !== "paid") {
                registration.paymentStatus = "paid";
                registration.paymentAmount = amount;
                registration.paymentMethod = "momo";
                registration.paymentDate = new Date();
                registration.paymentNote = `MoMo TransID: ${transId} | OrderID: ${orderId}`;
                registration.paymentConfirmedAt = new Date();
                await registration.save();

                console.log(`✅ MoMo IPN: Payment confirmed for registration ${registrationId}, transId: ${transId}`);

                // Notify manager
                if (tournamentId) {
                    const tournament = await Tournament.findById(tournamentId);
                    if (tournament) {
                        // Notify manager about successful payment
                        await Notification.create({
                            recipient: tournament.createdBy,
                            type: "system",
                            title: "💰 Thanh toán tự động thành công",
                            message: `VĐV "${registration.playerName}" đã thanh toán ${amount.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" qua MoMo. TransID: ${transId}`,
                            link: `/manager/giai-dau/${tournamentId}/dang-ky`,
                        });

                        // Notify user
                        await Notification.create({
                            recipient: registration.user,
                            type: "system",
                            title: "✅ Thanh toán thành công",
                            message: `Thanh toán ${amount.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động.`,
                            link: `/giai-dau/${tournamentId}`,
                        });
                    }
                }
            }

            return NextResponse.json({ resultCode: 0, message: "OK" });
        } else {
            // Payment failed or cancelled
            console.warn(`MoMo IPN: Payment failed/cancelled. resultCode=${resultCode}, message=${message}`);

            // Optionally reset payment status back to unpaid
            try {
                const decoded = JSON.parse(Buffer.from(extraData, "base64").toString("utf-8"));
                if (decoded.registrationId) {
                    await Registration.findByIdAndUpdate(decoded.registrationId, {
                        paymentStatus: "unpaid",
                    });
                }
            } catch (e) {
                // ignore
            }

            return NextResponse.json({ resultCode: 0, message: "Acknowledged" });
        }
    } catch (error) {
        console.error("MoMo IPN error:", error);
        return NextResponse.json({ resultCode: 1, message: "Server error" });
    }
}

// GET: MoMo may also send GET requests for health check
export async function GET() {
    return NextResponse.json({ status: "ok", service: "EFV CUP MoMo IPN" });
}
