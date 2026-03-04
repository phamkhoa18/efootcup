import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Notification from "@/models/Notification";

/**
 * GET /api/payment/vnpay-ipn
 * VNPay Instant Payment Notification (IPN) endpoint.
 * VNPay calls this endpoint automatically after payment to notify result.
 * 
 * Các bước xử lý theo tài liệu VNPay:
 * 1. Kiểm tra checksum (vnp_SecureHash)
 * 2. Tìm giao dịch trong database (vnp_TxnRef)
 * 3. Kiểm tra số tiền (vnp_Amount)
 * 4. Kiểm tra tình trạng giao dịch trước khi cập nhật
 * 5. Cập nhật kết quả vào Database
 * 6. Trả kết quả (RspCode, Message) cho VNPay
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const url = new URL(req.url);
        const vnp_Params: Record<string, string> = {};

        // Collect all vnp_ params
        url.searchParams.forEach((value, key) => {
            if (key.startsWith("vnp_")) {
                vnp_Params[key] = value;
            }
        });

        console.log("=== VNPay IPN received ===", JSON.stringify(vnp_Params, null, 2));

        // Extract and remove secure hash for verification
        const vnp_SecureHash = vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        if (!vnp_SecureHash) {
            console.error("VNPay IPN: Missing SecureHash");
            return NextResponse.json({ RspCode: "97", Message: "Missing SecureHash" });
        }

        // Get payment config to get HashSecret
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const vnpayMethod = paymentConfig.methods.find(
            (m: any) => m.type === "vnpay" && m.mode === "auto" && m.enabled
        );

        if (!vnpayMethod) {
            console.error("VNPay IPN: No VNPay method configured");
            return NextResponse.json({ RspCode: "99", Message: "VNPay not configured" });
        }

        const secretKey = vnpayMethod.apiHashSecret;
        if (!secretKey) {
            console.error("VNPay IPN: Missing HashSecret");
            return NextResponse.json({ RspCode: "99", Message: "Missing HashSecret config" });
        }

        // Sort params alphabetically and create sign data (raw values, NOT url-encoded)
        const sortedKeys = Object.keys(vnp_Params).sort();
        const signData = sortedKeys
            .map(key => `${key}=${vnp_Params[key]}`)
            .join("&");

        // Verify HMAC SHA512 checksum
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        if (vnp_SecureHash !== signed) {
            console.error("VNPay IPN: Invalid checksum");
            console.error("Sign data:", signData);
            console.error("Expected:", signed);
            console.error("Received:", vnp_SecureHash);
            return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
        }

        // Checksum valid → process payment
        const vnp_TxnRef = vnp_Params["vnp_TxnRef"]; // Our orderId
        const vnp_Amount = parseInt(vnp_Params["vnp_Amount"]) / 100; // VNPay sends amount * 100
        const vnp_ResponseCode = vnp_Params["vnp_ResponseCode"];
        const vnp_TransactionNo = vnp_Params["vnp_TransactionNo"];
        const vnp_BankCode = vnp_Params["vnp_BankCode"];
        const vnp_TransactionStatus = vnp_Params["vnp_TransactionStatus"];

        if (!vnp_TxnRef) {
            console.error("VNPay IPN: Missing TxnRef");
            return NextResponse.json({ RspCode: "01", Message: "Order not found" });
        }

        // Find registration by paymentNote containing orderId
        // paymentNote is JSON: { orderId, tournamentId, registrationId }
        let registration = await Registration.findOne({
            paymentNote: { $regex: vnp_TxnRef, $options: "i" },
            paymentMethod: "vnpay",
        });

        // Fallback: try legacy format (orderId stored directly in paymentNote)
        if (!registration) {
            registration = await Registration.findOne({
                paymentNote: vnp_TxnRef,
                paymentMethod: "vnpay",
            });
        }

        if (!registration) {
            console.error("VNPay IPN: Registration not found for TxnRef:", vnp_TxnRef);
            return NextResponse.json({ RspCode: "01", Message: "Order not found" });
        }

        // Parse tournamentId from paymentNote
        let tournamentId: string | null = null;
        try {
            const noteData = JSON.parse(registration.paymentNote || "{}");
            tournamentId = noteData.tournamentId;
        } catch {
            // Legacy format: EFCUP_tournamentId_registrationId_timestamp
            const parts = vnp_TxnRef.split("_");
            if (parts.length >= 3 && parts[0] === "EFCUP") {
                tournamentId = parts[1];
            }
        }

        // Check amount matches
        const tournament = tournamentId ? await Tournament.findById(tournamentId) : null;
        const expectedAmount = tournament?.entryFee || 0;

        if (expectedAmount > 0 && vnp_Amount !== expectedAmount) {
            console.error("VNPay IPN: Amount mismatch", { vnp_Amount, expectedAmount });
            return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
        }

        // Check if already confirmed (prevent duplicate processing)
        if (registration.paymentStatus === "paid") {
            console.log("VNPay IPN: Order already confirmed:", registration._id);
            return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
        }

        // Process payment result
        if (vnp_ResponseCode === "00" && vnp_TransactionStatus === "00") {
            // Payment successful
            registration.paymentStatus = "paid";
            registration.paymentAmount = vnp_Amount;
            registration.paymentMethod = "vnpay";
            registration.paymentDate = new Date();
            registration.paymentNote = `VNPay TransNo: ${vnp_TransactionNo} | Bank: ${vnp_BankCode} | TxnRef: ${vnp_TxnRef}`;
            registration.paymentConfirmedAt = new Date();
            await registration.save();

            console.log(`✅ VNPay IPN: Payment confirmed for registration ${registration._id}, TransNo: ${vnp_TransactionNo}`);

            // Send notifications
            if (tournament) {
                // Notify manager
                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "💰 Thanh toán VNPay tự động thành công",
                    message: `VĐV "${registration.playerName}" đã thanh toán ${vnp_Amount.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" qua VNPay (${vnp_BankCode}). TransNo: ${vnp_TransactionNo}`,
                    link: `/manager/giai-dau/${tournamentId}/dang-ky`,
                });

                // Notify user
                await Notification.create({
                    recipient: registration.user,
                    type: "system",
                    title: "✅ Thanh toán VNPay thành công",
                    message: `Thanh toán ${vnp_Amount.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động qua VNPay.`,
                    link: `/giai-dau/${tournamentId}`,
                });
            }

            return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
        } else {
            // Payment failed
            console.warn(`VNPay IPN: Payment failed. ResponseCode=${vnp_ResponseCode}, TransactionStatus=${vnp_TransactionStatus}`);

            // Reset payment status
            if (registration.paymentStatus === "pending_verification") {
                registration.paymentStatus = "unpaid";
                await registration.save();
            }

            // Still respond 00 to acknowledge receipt
            return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
        }
    } catch (error) {
        console.error("VNPay IPN error:", error);
        return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
    }
}
