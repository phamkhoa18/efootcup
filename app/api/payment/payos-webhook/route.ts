import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Notification from "@/models/Notification";
import PaymentConfig from "@/models/PaymentConfig";

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

        // Verify signature
        const isValid = verifyPayOSSignature(data, signature, payosMethod.payosChecksumKey);
        if (!isValid) {
            console.error("PayOS webhook: invalid signature");
            return NextResponse.json({ success: true });
        }

        console.log("✅ PayOS signature verified");

        // Only process successful payments
        if (code !== "00" || data.code !== "00") {
            console.log("PayOS webhook: non-success code", code, data.code);
            return NextResponse.json({ success: true });
        }

        const { orderCode, amount, paymentLinkId, reference, transactionDateTime } = data;

        // Find registration by orderCode stored in paymentNote
        const registrations = await Registration.find({
            paymentStatus: { $in: ["pending_verification", "unpaid"] },
        });

        let registration = null;
        for (const reg of registrations) {
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                if (noteData.orderCode === orderCode || noteData.paymentLinkId === paymentLinkId) {
                    registration = reg;
                    break;
                }
            } catch {
                // Skip invalid JSON
            }
        }

        if (!registration) {
            console.error("PayOS webhook: no matching registration for orderCode:", orderCode);
            return NextResponse.json({ success: true });
        }

        // Already paid
        if (registration.paymentStatus === "paid") {
            console.log("PayOS webhook: registration already paid");
            return NextResponse.json({ success: true });
        }

        // Update registration payment status
        registration.paymentStatus = "paid";
        registration.paymentAmount = amount;
        registration.paymentDate = transactionDateTime ? new Date(transactionDateTime) : new Date();
        registration.paymentConfirmedAt = new Date();
        registration.paymentConfirmedBy = "payos-auto" as any;

        // Save extra info in paymentNote
        const existingNote = JSON.parse(registration.paymentNote || "{}");
        registration.paymentNote = JSON.stringify({
            ...existingNote,
            reference,
            transactionDateTime,
            confirmedByWebhook: true,
        });

        await registration.save();

        console.log(`✅ PayOS: Registration ${registration._id} payment confirmed!`);
        console.log(`   Amount: ${amount}, OrderCode: ${orderCode}, Reference: ${reference}`);

        // Get tournament info for notification
        const tournament = await Tournament.findById(registration.tournament);

        // Notify user
        if (tournament) {
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "✅ Thanh toán thành công",
                message: `Thanh toán ${amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động.`,
                link: `/giai-dau/${tournament._id}`,
            });

            // Notify manager
            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "💰 Thanh toán tự động xác nhận",
                message: `VĐV "${registration.playerName}" đã thanh toán ${amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" qua PayOS.`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PayOS webhook error:", error);
        // Always return 2xx to prevent PayOS from retrying
        return NextResponse.json({ success: true });
    }
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
