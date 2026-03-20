import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import PaymentConfig from "@/models/PaymentConfig";
import { sendPaymentInvoiceEmail } from "@/lib/email";

// Ensure this route runs on Node.js runtime (not Edge)
export const runtime = "nodejs";
// Disable body size limit for webhook payloads
export const maxDuration = 30;

/**
 * CORS headers so SePay can reach this endpoint from any origin
 */
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Secret-Key, Authorization",
    };
}

/**
 * OPTIONS /api/payment/sepay-webhook
 * Handle CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

/**
 * GET /api/payment/sepay-webhook
 * SePay may send GET to verify webhook URL is reachable
 */
export async function GET() {
    return NextResponse.json({ success: true, message: "SePay IPN endpoint is alive" }, { headers: corsHeaders() });
}

/**
 * POST /api/payment/sepay-webhook
 *
 * SePay Payment Gateway IPN (Instant Payment Notification)
 * Docs: https://developer.sepay.vn/vi/cong-thanh-toan/IPN
 *
 * Headers:
 *   X-Secret-Key: <secret_key> (when merchant configures auth type = SECRET_KEY)
 *   Content-Type: application/json
 *
 * Body (example):
 * {
 *   "timestamp": 1759134682,
 *   "notification_type": "ORDER_PAID",
 *   "order": {
 *     "id": "uuid",
 *     "order_id": "NQD-68DA43D73C1A5",
 *     "order_status": "CAPTURED",
 *     "order_currency": "VND",
 *     "order_amount": "100000.00",
 *     "order_invoice_number": "EFCUP-ABCD1234-XXXX",
 *     "custom_data": [],
 *     "order_description": "Le phi giai dau ..."
 *   },
 *   "transaction": {
 *     "id": "uuid",
 *     "payment_method": "BANK_TRANSFER",
 *     "transaction_id": "68da43da2d9de",
 *     "transaction_type": "PAYMENT",
 *     "transaction_date": "2025-09-29 15:31:22",
 *     "transaction_status": "APPROVED",
 *     "transaction_amount": "100000",
 *     "transaction_currency": "VND",
 *     "authentication_status": "AUTHENTICATION_SUCCESSFUL"
 *   },
 *   "customer": { "id": "uuid", "customer_id": "userId" }
 * }
 */
export async function POST(req: NextRequest) {
    // Helper: always include CORS headers in responses
    const jsonRes = (data: any, status = 200) =>
        NextResponse.json(data, { status, headers: corsHeaders() });

    try {
        const body = await req.json();
        console.log("🔔 SePay IPN received:", JSON.stringify(body, null, 2));

        await dbConnect();

        // ============================================================
        // STEP 1: VERIFY SECRET KEY
        // SePay sends X-Secret-Key header when auth type = SECRET_KEY
        // ============================================================
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const sepayMethod = paymentConfig.methods?.find(
            (m: any) => m.type === "sepay" && m.enabled
        );

        if (sepayMethod?.sepaySecretKey) {
            const receivedKey = req.headers.get("x-secret-key") || "";
            if (receivedKey !== sepayMethod.sepaySecretKey) {
                console.error("❌ SePay IPN: Invalid X-Secret-Key!");
                return jsonRes({ error: "Unauthorized" }, 401);
            }
            console.log("✅ SePay IPN: Secret key verified");
        }

        // ============================================================
        // STEP 2: VALIDATE NOTIFICATION TYPE
        // Only process ORDER_PAID notifications
        // ============================================================
        const { notification_type, order, transaction, customer } = body;

        if (notification_type !== "ORDER_PAID") {
            console.log(`SePay IPN: ignoring notification_type=${notification_type}`);
            return jsonRes({ success: true });
        }

        if (!order?.order_invoice_number) {
            console.error("SePay IPN: missing order_invoice_number");
            return jsonRes({ success: true });
        }

        const invoiceNumber = order.order_invoice_number;
        const orderAmount = parseFloat(order.order_amount) || 0;
        const transactionAmount = parseFloat(transaction?.transaction_amount) || orderAmount;
        const transactionId = transaction?.transaction_id || "";
        const transactionDate = transaction?.transaction_date || "";
        const paymentMethod = transaction?.payment_method || "BANK_TRANSFER";
        const orderId = order.order_id || "";
        const orderStatus = order.order_status || "";
        const customerId = customer?.customer_id || "";

        console.log(`🔍 SePay IPN: Processing ORDER_PAID for invoice=${invoiceNumber}, amount=${orderAmount}`);

        // ============================================================
        // STEP 3: FIND REGISTRATION BY INVOICE NUMBER
        // invoiceNumber is stored in paymentNote JSON
        // ============================================================
        const registration = await findRegistrationByInvoice(invoiceNumber);

        if (!registration) {
            console.error(`SePay IPN: no matching registration for invoice=${invoiceNumber}`);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Idempotent: already paid
        if (registration.paymentStatus === "paid") {
            console.log(`SePay IPN: registration ${registration._id} already paid, skipping`);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Get tournament for amount verification and auto-approval
        const tournament = await Tournament.findById(registration.tournament);

        // ============================================================
        // STEP 4: VERIFY AMOUNT (anti-fraud)
        // ============================================================
        if (tournament && orderAmount < tournament.entryFee) {
            console.error(`⚠️ SePay IPN: amount mismatch! Received ${orderAmount}, expected ${tournament.entryFee}. Registration: ${registration._id}`);

            const existingNote = JSON.parse(registration.paymentNote || "{}");
            registration.paymentNote = JSON.stringify({
                ...existingNote,
                sepayOrderId: orderId,
                transactionId,
                transactionDate,
                paymentMethod,
                orderStatus,
                confirmedByIPN: true,
                amountMismatch: true,
                expectedAmount: tournament.entryFee,
                receivedAmount: orderAmount,
            });
            registration.paymentStatus = "pending_verification";
            registration.paymentAmount = orderAmount;
            registration.paymentDate = transactionDate ? new Date(transactionDate) : new Date();
            await registration.save();

            // Notify manager
            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "⚠️ Số tiền thanh toán không khớp",
                message: `VĐV "${registration.playerName}" thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ nhưng lệ phí là ${tournament.entryFee?.toLocaleString("vi-VN")}đ. Vui lòng kiểm tra.`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });

            return jsonRes({ success: true });
        }

        // ============================================================
        // STEP 5: MARK AS PAID
        // ============================================================
        registration.paymentStatus = "paid";
        registration.paymentAmount = orderAmount;
        registration.paymentDate = transactionDate ? new Date(transactionDate) : new Date();
        registration.paymentConfirmedAt = new Date();

        const existingNote = JSON.parse(registration.paymentNote || "{}");
        registration.paymentNote = JSON.stringify({
            ...existingNote,
            sepayOrderId: orderId,
            transactionId,
            transactionDate,
            paymentMethod,
            orderStatus,
            confirmedByIPN: true,
        });

        await registration.save();

        console.log(`✅ SePay IPN: Registration ${registration._id} payment confirmed!`);
        console.log(`   Amount: ${orderAmount}, Invoice: ${invoiceNumber}, OrderId: ${orderId}`);

        // ============================================================
        // STEP 6: AUTO-APPROVE if tournament has space
        // ============================================================
        if (tournament && registration.status === "pending") {
            if (tournament.currentTeams < tournament.maxTeams) {
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

                console.log(`🎉 SePay IPN: Auto-approved registration ${registration._id} → Team ${team._id}`);

                await Notification.create({
                    recipient: registration.user,
                    type: "system",
                    title: "🎉 Đăng ký thành công!",
                    message: `Thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                    link: `/giai-dau/${tournament._id}`,
                });

                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "✅ VĐV mới tự động duyệt",
                    message: `VĐV "${registration.playerName}" (đội ${registration.teamName}) đã thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ và được tự động duyệt vào giải "${tournament.title}".`,
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
                    paymentDate: transactionDate ? new Date(transactionDate) : new Date(),
                    orderCode: invoiceNumber,
                    reference: transactionId,
                    paymentMethod: `Chuyển khoản tự động (SePay - ${paymentMethod})`,
                    registrationId: registration._id.toString(),
                    isAutoApproved: true,
                }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
            } else {
                console.log(`⚠️ SePay IPN: Tournament full, payment confirmed but NOT auto-approved for ${registration._id}`);

                await Notification.create({
                    recipient: registration.user,
                    type: "system",
                    title: "✅ Thanh toán thành công",
                    message: `Thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận. Giải đã đủ đội, vui lòng liên hệ BTC.`,
                    link: `/giai-dau/${tournament._id}`,
                });

                await Notification.create({
                    recipient: tournament.createdBy,
                    type: "system",
                    title: "💰 Thanh toán nhận — giải đã đủ đội",
                    message: `VĐV "${registration.playerName}" đã thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ nhưng giải "${tournament.title}" đã đủ ${tournament.maxTeams} đội.`,
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
                    paymentDate: transactionDate ? new Date(transactionDate) : new Date(),
                    orderCode: invoiceNumber,
                    reference: transactionId,
                    paymentMethod: `Chuyển khoản tự động (SePay - ${paymentMethod})`,
                    registrationId: registration._id.toString(),
                    isAutoApproved: false,
                }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
            }
        } else if (tournament) {
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "✅ Thanh toán thành công",
                message: `Thanh toán ${orderAmount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động.`,
                link: `/giai-dau/${tournament._id}`,
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
                paymentDate: transactionDate ? new Date(transactionDate) : new Date(),
                orderCode: invoiceNumber,
                reference: transactionId,
                paymentMethod: `Chuyển khoản tự động (SePay - ${paymentMethod})`,
                registrationId: registration._id.toString(),
                isAutoApproved: false,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        }

        // Return 200 to acknowledge receipt (required by SePay)
        return jsonRes({ success: true });
    } catch (error) {
        console.error("SePay IPN error:", error);
        // Always return 200 to prevent SePay from retrying
        return jsonRes({ success: true });
    }
}

/**
 * Find registration by invoiceNumber stored in paymentNote JSON
 */
async function findRegistrationByInvoice(invoiceNumber: string) {
    const registrations = await Registration.find({
        paymentMethod: "sepay",
        paymentStatus: { $in: ["unpaid", "pending_verification"] },
        paymentNote: { $exists: true, $ne: "" },
    });

    for (const reg of registrations) {
        try {
            const noteData = JSON.parse(reg.paymentNote || "{}");
            if (noteData.invoiceNumber === invoiceNumber) {
                return reg;
            }
        } catch {
            // Skip invalid JSON
        }
    }

    return null;
}
