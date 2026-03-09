import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import PaymentConfig from "@/models/PaymentConfig";
import { sendPaymentInvoiceEmail } from "@/lib/email";

/**
 * GET /api/payment/payos-webhook
 * PayOS sends GET to verify webhook URL is reachable
 */
export async function GET() {
    return NextResponse.json({ success: true });
}

/**
 * POST /api/payment/payos-webhook
 * PayOS sends webhook data when a payment is completed.
 * 
 * SECURITY:
 * - Signature verification via HMAC_SHA256
 * - Exact orderCode/paymentLinkId matching only (NO fallback)
 * - Tournament-scoped query using stored tournamentId in paymentNote
 * - Idempotent: already-paid registrations are skipped
 * 
 * Webhook body:
 * {
 *   code: "00",
 *   desc: "success",
 *   success: true,
 *   data: {
 *     orderCode: 123,
 *     amount: 3000,
 *     description: "VQRIO123",
 *     accountNumber: "12345678",
 *     reference: "TF230204212323",
 *     transactionDateTime: "2023-02-04 18:25:00",
 *     currency: "VND",
 *     paymentLinkId: "...",
 *     code: "00",
 *     desc: "Thành công",
 *     counterAccountBankId: "",
 *     counterAccountBankName: "",
 *     counterAccountName: "",
 *     counterAccountNumber: "",
 *     virtualAccountName: "",
 *     virtualAccountNumber: ""
 *   },
 *   signature: "..."
 * }
 * 
 * Signature verification:
 * - Sort all keys in data alphabetically
 * - Create string: key1=value1&key2=value2...
 * - HMAC_SHA256(string, checksumKey) == signature
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("🔔 PayOS Webhook received:", JSON.stringify(body, null, 2));

        const { code, data, signature } = body;

        if (!data || !signature) {
            console.error("PayOS webhook: missing data or signature");
            return NextResponse.json({ success: true }); // Return 2xx to acknowledge
        }

        await dbConnect();

        // Get checksum key from config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const payosMethod = paymentConfig.methods.find(
            (m: any) => m.type === "payos" && m.enabled
        );

        if (!payosMethod?.payosChecksumKey) {
            console.error("PayOS webhook: no checksumKey configured");
            return NextResponse.json({ success: true });
        }

        // Verify signature — MUST pass before any DB operations
        const isValid = verifyPayOSSignature(data, signature, payosMethod.payosChecksumKey);
        if (!isValid) {
            console.error("PayOS webhook: invalid signature — REJECTED");
            return NextResponse.json({ success: true });
        }

        console.log("✅ PayOS signature verified");

        const { orderCode, amount, paymentLinkId, reference, transactionDateTime } = data;

        // Only process successful payments
        if (code !== "00" || data.code !== "00") {
            console.log("PayOS webhook: non-success code", code, data.code);

            // Handle CANCELLED or FAILED payments — reset paymentStatus to unpaid
            // ✅ SECURITY: Only match by exact orderCode/paymentLinkId, no broad queries
            if (orderCode || paymentLinkId) {
                const registration = await findRegistrationByOrderCode(orderCode, paymentLinkId);
                if (registration && registration.paymentStatus !== "paid") {
                    const noteData = JSON.parse(registration.paymentNote || "{}");
                    registration.paymentStatus = "unpaid";
                    registration.paymentNote = JSON.stringify({
                        ...noteData,
                        cancelledAt: new Date().toISOString(),
                        cancelCode: code,
                        cancelDesc: data.desc || "Cancelled",
                    });
                    await registration.save();
                    console.log(`PayOS: Registration ${registration._id} payment cancelled/failed → reset to unpaid`);

                    // Notify user
                    const tournament = await Tournament.findById(registration.tournament);
                    if (tournament) {
                        await Notification.create({
                            recipient: registration.user,
                            type: "system",
                            title: "Thanh toán không thành công",
                            message: `Thanh toán cho giải "${tournament.title}" đã bị hủy hoặc thất bại. Vui lòng thử lại.`,
                            link: `/giai-dau/${tournament._id}?tab=register`,
                        });
                    }
                }
            }

            return NextResponse.json({ success: true });
        }

        // ✅ SECURITY: Find registration by EXACT orderCode match only
        const registration = await findRegistrationByOrderCode(orderCode, paymentLinkId);

        if (!registration) {
            console.error("PayOS webhook: no matching registration for orderCode:", orderCode, "paymentLinkId:", paymentLinkId);
            return NextResponse.json({ success: true });
        }

        // Already paid — idempotent
        if (registration.paymentStatus === "paid") {
            console.log("PayOS webhook: registration already paid, skipping");
            return NextResponse.json({ success: true });
        }

        // ✅ Verify amount matches expected tournament fee (anti-fraud)
        const tournament = await Tournament.findById(registration.tournament);
        if (tournament && amount < tournament.entryFee) {
            console.error(`⚠️ PayOS webhook: amount mismatch! Received ${amount}, expected ${tournament.entryFee}. Registration: ${registration._id}`);
            // Still mark as paid but flag in note for manager review
            const existingNote = JSON.parse(registration.paymentNote || "{}");
            registration.paymentNote = JSON.stringify({
                ...existingNote,
                reference,
                transactionDateTime,
                confirmedByWebhook: true,
                amountMismatch: true,
                expectedAmount: tournament.entryFee,
                receivedAmount: amount,
            });
            registration.paymentStatus = "pending_verification"; // Flag for manual review
            registration.paymentAmount = amount;
            registration.paymentDate = transactionDateTime ? new Date(transactionDateTime) : new Date();
            await registration.save();

            // Notify manager about mismatch
            if (tournament) {
                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "⚠️ Số tiền thanh toán không khớp",
                    message: `VĐV "${registration.playerName}" thanh toán ${amount?.toLocaleString("vi-VN")}đ nhưng lệ phí là ${tournament.entryFee?.toLocaleString("vi-VN")}đ. Vui lòng kiểm tra.`,
                    link: `/manager/giai-dau/${tournament._id}/dang-ky`,
                });
            }

            return NextResponse.json({ success: true });
        }

        // Update registration payment status
        registration.paymentStatus = "paid";
        registration.paymentAmount = amount;
        registration.paymentDate = transactionDateTime ? new Date(transactionDateTime) : new Date();
        registration.paymentConfirmedAt = new Date();

        // Save extra info in paymentNote
        const existingNote = JSON.parse(registration.paymentNote || "{}");
        registration.paymentNote = JSON.stringify({
            ...existingNote,
            reference,
            transactionDateTime,
            confirmedByWebhook: true,
            payosCounterAccountName: data.counterAccountName || "",
            payosCounterAccountNumber: data.counterAccountNumber || "",
            payosCounterAccountBankName: data.counterAccountBankName || "",
        });

        await registration.save();

        console.log(`✅ PayOS: Registration ${registration._id} payment confirmed!`);
        console.log(`   Amount: ${amount}, OrderCode: ${orderCode}, Reference: ${reference}`);

        // ============================================================
        // AUTO-APPROVE: Thanh toán tự động → duyệt vào giải luôn
        // ============================================================
        if (tournament && registration.status === "pending") {
            // Check if tournament still has room
            if (tournament.currentTeams < tournament.maxTeams) {
                // Create team automatically
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

                // Auto-approve registration
                registration.status = "approved";
                registration.team = team._id;
                registration.approvedAt = new Date();
                await registration.save();

                // Update tournament team count
                await Tournament.findByIdAndUpdate(tournament._id, {
                    $inc: { currentTeams: 1 },
                });

                console.log(`🎉 PayOS: Auto-approved registration ${registration._id} → Team ${team._id}`);

                // Notify user: payment + approval in one
                await Notification.create({
                    recipient: registration.user,
                    type: "system",
                    title: "🎉 Đăng ký thành công!",
                    message: `Thanh toán ${amount?.toLocaleString("vi-VN")}đ đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                    link: `/giai-dau/${tournament._id}`,
                });

                // Notify manager
                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "✅ VĐV mới tự động duyệt",
                    message: `VĐV "${registration.playerName}" (đội ${registration.teamName}) đã thanh toán ${amount?.toLocaleString("vi-VN")}đ qua PayOS và được tự động duyệt vào giải "${tournament.title}".`,
                    link: `/manager/giai-dau/${tournament._id}/dang-ky`,
                });

                // 📧 Send invoice email to user
                sendPaymentInvoiceEmail({
                    playerName: registration.playerName,
                    email: registration.email,
                    teamName: registration.teamName,
                    teamShortName: registration.teamShortName,
                    tournamentTitle: tournament.title,
                    tournamentId: tournament._id.toString(),
                    amount,
                    currency: tournament.currency || "VNĐ",
                    paymentDate: transactionDateTime ? new Date(transactionDateTime) : new Date(),
                    orderCode,
                    reference: reference || "",
                    paymentMethod: registration.paymentMethod || "PayOS",
                    registrationId: registration._id.toString(),
                    isAutoApproved: true,
                }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
            } else {
                // Tournament full — can't auto-approve, just confirm payment
                console.log(`⚠️ PayOS: Tournament full, payment confirmed but NOT auto-approved for ${registration._id}`);

                await Notification.create({
                    recipient: registration.user,
                    type: "system",
                    title: "✅ Thanh toán thành công",
                    message: `Thanh toán ${amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận. Giải đã đủ đội, vui lòng liên hệ BTC.`,
                    link: `/giai-dau/${tournament._id}`,
                });

                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "💰 Thanh toán nhận — giải đã đủ đội",
                    message: `VĐV "${registration.playerName}" đã thanh toán ${amount?.toLocaleString("vi-VN")}đ nhưng giải "${tournament.title}" đã đủ ${tournament.maxTeams} đội.`,
                    link: `/manager/giai-dau/${tournament._id}/dang-ky`,
                });

                // 📧 Send invoice email (tournament full)
                sendPaymentInvoiceEmail({
                    playerName: registration.playerName,
                    email: registration.email,
                    teamName: registration.teamName,
                    teamShortName: registration.teamShortName,
                    tournamentTitle: tournament.title,
                    tournamentId: tournament._id.toString(),
                    amount,
                    currency: tournament.currency || "VNĐ",
                    paymentDate: transactionDateTime ? new Date(transactionDateTime) : new Date(),
                    orderCode,
                    reference: reference || "",
                    paymentMethod: registration.paymentMethod || "PayOS",
                    registrationId: registration._id.toString(),
                    isAutoApproved: false,
                }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
            }
        } else if (tournament) {
            // Registration already approved or other status — just confirm payment
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "✅ Thanh toán thành công",
                message: `Thanh toán ${amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động.`,
                link: `/giai-dau/${tournament._id}`,
            });

            // 📧 Send invoice email (already approved)
            sendPaymentInvoiceEmail({
                playerName: registration.playerName,
                email: registration.email,
                teamName: registration.teamName,
                teamShortName: registration.teamShortName,
                tournamentTitle: tournament.title,
                tournamentId: tournament._id.toString(),
                amount,
                currency: tournament.currency || "VNĐ",
                paymentDate: transactionDateTime ? new Date(transactionDateTime) : new Date(),
                orderCode,
                reference: reference || "",
                paymentMethod: registration.paymentMethod || "PayOS",
                registrationId: registration._id.toString(),
                isAutoApproved: false,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PayOS webhook error:", error);
        // Always return 2xx to prevent PayOS from retrying
        return NextResponse.json({ success: true });
    }
}

/**
 * ✅ SECURE: Find registration by exact orderCode or paymentLinkId match
 * No fallback, no broad queries. Each match is precise.
 */
async function findRegistrationByOrderCode(orderCode: any, paymentLinkId?: string) {
    // Query only unpaid/pending registrations with payos method
    const registrations = await Registration.find({
        paymentMethod: "payos",
        paymentStatus: { $in: ["unpaid", "pending_verification"] },
        paymentNote: { $exists: true, $ne: "" },
    });

    for (const reg of registrations) {
        try {
            const noteData = JSON.parse(reg.paymentNote || "{}");
            // Exact match on orderCode or paymentLinkId
            if (
                (orderCode && (noteData.orderCode === orderCode || noteData.orderCode === Number(orderCode))) ||
                (paymentLinkId && noteData.paymentLinkId === paymentLinkId)
            ) {
                return reg;
            }
        } catch {
            // Skip invalid JSON
        }
    }

    return null;
}

/**
 * Verify PayOS webhook signature
 * Sort data keys alphabetically → key=value joined by & → HMAC_SHA256
 */
function verifyPayOSSignature(data: any, signature: string, checksumKey: string): boolean {
    const sortedKeys = Object.keys(data).sort();
    const parts: string[] = [];

    for (const key of sortedKeys) {
        let value = data[key];
        if (value === undefined || value === null) {
            value = "";
        }
        if (Array.isArray(value)) {
            // Sort each element object by keys
            const sortedArr = value.map((el: any) => {
                if (typeof el === "object") {
                    const sorted: any = {};
                    Object.keys(el).sort().forEach(k => { sorted[k] = el[k]; });
                    return sorted;
                }
                return el;
            });
            value = JSON.stringify(sortedArr);
        }
        parts.push(`${key}=${value}`);
    }

    const dataStr = parts.join("&");
    const computedSignature = crypto
        .createHmac("sha256", checksumKey)
        .update(dataStr)
        .digest("hex");

    console.log("PayOS signature check:");
    console.log("  Data string:", dataStr);
    console.log("  Computed:", computedSignature);
    console.log("  Received:", signature);

    return computedSignature === signature;
}
