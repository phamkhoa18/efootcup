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
 * Supports TWO payload formats from SePay:
 *
 * ──────────────────────────────────────────────────
 * FORMAT 1: SePay Payment Gateway (PG) IPN
 * ──────────────────────────────────────────────────
 * Headers:
 *   X-Secret-Key: <secret_key>
 * Body:
 * {
 *   "timestamp": 1759134682,
 *   "notification_type": "ORDER_PAID",
 *   "order": {
 *     "order_invoice_number": "EFCUP-ABCD1234-XXXX",
 *     "order_amount": "100000.00",
 *     "order_status": "CAPTURED",
 *     ...
 *   },
 *   "transaction": { ... },
 *   "customer": { ... }
 * }
 *
 * ──────────────────────────────────────────────────
 * FORMAT 2: SePay Bank Transfer Webhook (Biến động)
 * ──────────────────────────────────────────────────
 * Headers:
 *   Authorization: Apikey <api_key>   (or no auth)
 * Body:
 * {
 *   "id": 46149829,
 *   "gateway": "BIDV",
 *   "transactionDate": "2026-03-21 00:16:13",
 *   "accountNumber": "8886158061",
 *   "subAccount": "962476L6KN",
 *   "code": "PAY165569BD80B4BE2D1",
 *   "content": "PAY165569BD80B4BE2D1",
 *   "transferType": "in",
 *   "description": "BankAPINotify PAY165569BD80B4BE2D1",
 *   "transferAmount": 20000,
 *   "referenceCode": "c82f48f6-...",
 *   "accumulated": 0
 * }
 */
export async function POST(req: NextRequest) {
    // Helper: always include CORS headers in responses
    const jsonRes = (data: any, status = 200) =>
        NextResponse.json(data, { status, headers: corsHeaders() });

    try {
        const body = await req.json();
        console.log("🔔 SePay webhook received:", JSON.stringify(body, null, 2));

        await dbConnect();

        // ============================================================
        // DETECT PAYLOAD FORMAT
        // ============================================================
        const isPaymentGatewayIPN = !!body.notification_type;
        const isBankTransferWebhook = !!body.gateway && !!body.transferType;

        // ============================================================
        // STEP 1: VERIFY AUTHENTICATION
        // Supports multiple auth methods:
        // - X-Secret-Key header (PG IPN)
        // - Authorization: Apikey <key> (Bank Transfer webhook)
        // - No auth (if configured without auth)
        // ============================================================
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const sepayMethod = paymentConfig.methods?.find(
            (m: any) => m.type === "sepay" && m.enabled
        );

        if (sepayMethod?.sepaySecretKey) {
            const secretKey = sepayMethod.sepaySecretKey;

            // Try X-Secret-Key header first (PG IPN sends this)
            const xSecretKey = req.headers.get("x-secret-key") || "";

            // Try Authorization header (Bank Transfer webhook may use Apikey auth)
            const authHeader = req.headers.get("authorization") || "";
            const apikeyMatch = authHeader.match(/^Apikey\s+(.+)$/i);
            const apiKeyValue = apikeyMatch ? apikeyMatch[1].trim() : "";

            const isSecretKeyValid = xSecretKey === secretKey;
            const isApiKeyValid = apiKeyValue === secretKey;

            if (!isSecretKeyValid && !isApiKeyValid) {
                // Return 401 to reject unauthorized payloads
                console.error("🚨 CRITICAL: SePay webhook auth mismatch. Rejecting payload to prevent fake payments.");
                return jsonRes({ error: "Unauthorized" }, 401);
            } else {
                console.log("✅ SePay webhook: Auth verified via", isSecretKeyValid ? "X-Secret-Key" : "Apikey");
            }
        }

        // ============================================================
        // ROUTE TO APPROPRIATE HANDLER
        // ============================================================
        if (isPaymentGatewayIPN) {
            return await handlePaymentGatewayIPN(body, paymentConfig, jsonRes);
        } else if (isBankTransferWebhook) {
            return await handleBankTransferWebhook(body, paymentConfig, jsonRes);
        } else {
            console.log("⚠️ SePay webhook: Unknown payload format, ignoring");
            return jsonRes({ success: true });
        }
    } catch (error) {
        console.error("SePay webhook error:", error);
        // Always return 200 to prevent SePay from retrying endlessly
        return jsonRes({ success: true });
    }
}

// ================================================================
// HANDLER 1: SePay Payment Gateway IPN (notification_type based)
// ================================================================
async function handlePaymentGatewayIPN(body: any, paymentConfig: any, jsonRes: Function) {
    const { notification_type, order, transaction, customer } = body;

    if (notification_type !== "ORDER_PAID") {
        console.log(`SePay PG IPN: ignoring notification_type=${notification_type}`);
        return jsonRes({ success: true });
    }

    if (!order?.order_invoice_number) {
        console.error("SePay PG IPN: missing order_invoice_number");
        return jsonRes({ success: true });
    }

    const invoiceNumber = order.order_invoice_number;
    const orderAmount = parseFloat(order.order_amount) || 0;
    const transactionId = transaction?.transaction_id || "";
    const transactionDate = transaction?.transaction_date || "";
    const paymentMethod = transaction?.payment_method || "BANK_TRANSFER";
    const orderId = order.order_id || "";
    const orderStatus = order.order_status || "";

    console.log(`🔍 SePay PG IPN: Processing ORDER_PAID for invoice=${invoiceNumber}, amount=${orderAmount}`);

    const registration = await findRegistrationByInvoice(invoiceNumber);
    if (!registration) {
        console.error(`SePay PG IPN: no matching registration for invoice=${invoiceNumber}`);
        return jsonRes({ success: true });
    }

    return await processPayment(registration, {
        amount: orderAmount,
        transactionId,
        transactionDate,
        paymentMethod: `SePay PG - ${paymentMethod}`,
        orderId,
        orderStatus,
        invoiceNumber,
        source: "pg_ipn",
        confirmedByIPN: true,
    }, jsonRes);
}

// ================================================================
// HANDLER 2: SePay Bank Transfer Webhook (biến động số dư)
// ================================================================
async function handleBankTransferWebhook(body: any, paymentConfig: any, jsonRes: Function) {
    const {
        id: sepayTxId,
        gateway,
        transactionDate,
        accountNumber,
        subAccount,
        code,          // Payment code detected by SePay — this should match our invoiceNumber
        content,       // Transfer content/description
        transferType,
        description,
        transferAmount,
        referenceCode,
        accumulated,
    } = body;

    // Only process incoming transfers
    if (transferType !== "in") {
        console.log(`SePay Bank webhook: ignoring transferType=${transferType}`);
        return jsonRes({ success: true });
    }

    if (!transferAmount || transferAmount <= 0) {
        console.log("SePay Bank webhook: no transfer amount, ignoring");
        return jsonRes({ success: true });
    }

    console.log(`🔍 SePay Bank webhook: Processing transfer code=${code}, content="${content}", amount=${transferAmount}, gateway=${gateway}`);

    // Try to find registration by the payment code
    // The `code` field is what SePay auto-detects as the payment code
    // It should match our invoiceNumber stored in registration.paymentNote
    let registration = null;

    if (code) {
        registration = await findRegistrationByInvoice(code);
    }

    // Fallback: search by content field (the full transfer description)
    if (!registration && content) {
        registration = await findRegistrationByInvoice(content.trim());
    }

    // Fallback: try to extract invoice number from content
    // Our invoice format: EFCUP-XXXXXXXX-XXXXXX or PAYxxxxxxxxx
    if (!registration && content) {
        const efcupMatch = content.match(/EFCUP-[A-Z0-9]+-[A-Z0-9]+/i);
        if (efcupMatch) {
            registration = await findRegistrationByInvoice(efcupMatch[0]);
        }
    }

    if (!registration) {
        // PAY code from SePay PG: try to link to a registration that was recently
        // paid by PG IPN (which uses EFCUP invoice, not PAY code)
        // This bridges the gap: PG IPN marks paid with EFCUP → bank webhook has PAY code
        if (code && /^PAY[A-F0-9]{10,}/i.test(code) && transferAmount > 0) {
            console.log(`🔗 SePay Bank webhook: Trying to link PAY code ${code} to recently paid registration...`);

            const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
            const recentlyPaid = await Registration.find({
                paymentMethod: "sepay",
                paymentStatus: "paid",
                paymentAmount: transferAmount,
                paymentConfirmedAt: { $gte: thirtyMinAgo },
            });

            for (const reg of recentlyPaid) {
                try {
                    const noteData = JSON.parse(reg.paymentNote || "{}");
                    // Skip if already has this PAY code or bankPayCode
                    if (noteData.bankPayCode) continue;

                    // Store the PAY code for future reconciliation
                    noteData.bankPayCode = code;
                    noteData.bankContent = content;
                    noteData.bankTransactionId = String(sepayTxId || "");
                    noteData.bankTransactionDate = transactionDate;
                    noteData.bankGateway = gateway;
                    reg.paymentNote = JSON.stringify(noteData);
                    await reg.save();

                    console.log(`✅ SePay Bank webhook: Linked PAY code ${code} to registration ${reg._id} (invoice: ${noteData.invoiceNumber})`);
                    return jsonRes({ success: true });
                } catch { }
            }
        }

        console.error(`SePay Bank webhook: no matching registration for code=${code}, content="${content}"`);
        // Still return 200 to acknowledge
        return jsonRes({ success: true });
    }

    return await processPayment(registration, {
        amount: transferAmount,
        transactionId: String(sepayTxId || ""),
        transactionDate: transactionDate || "",
        paymentMethod: `Chuyển khoản (${gateway || "Bank"})`,
        orderId: "",
        orderStatus: "CAPTURED",
        invoiceNumber: code || content || "",
        source: "bank_webhook",
        confirmedByWebhook: true,
        // Store full bank transfer details
        bankDetails: {
            gateway,
            accountNumber,
            subAccount,
            referenceCode,
            description,
            content,
            accumulated,
            sepayTxId,
        },
    }, jsonRes);
}

// ================================================================
// SHARED: Process payment for a found registration
// ================================================================
async function processPayment(registration: any, paymentInfo: {
    amount: number;
    transactionId: string;
    transactionDate: string;
    paymentMethod: string;
    orderId: string;
    orderStatus: string;
    invoiceNumber: string;
    source: string;
    confirmedByIPN?: boolean;
    confirmedByWebhook?: boolean;
    bankDetails?: any;
}, jsonRes: Function) {
    // Idempotent: already paid
    if (registration.paymentStatus === "paid") {
        console.log(`SePay webhook: registration ${registration._id} already paid, skipping`);
        return jsonRes({ success: true });
    }

    const tournament = await Tournament.findById(registration.tournament);

    // ============================================================
    // VERIFY AMOUNT (anti-fraud)
    // ============================================================
    if (tournament && paymentInfo.amount < tournament.entryFee) {
        console.error(`⚠️ SePay webhook: amount mismatch! Received ${paymentInfo.amount}, expected ${tournament.entryFee}. Registration: ${registration._id}`);

        const existingNote = JSON.parse(registration.paymentNote || "{}");
        registration.paymentNote = JSON.stringify({
            ...existingNote,
            sepayOrderId: paymentInfo.orderId,
            transactionId: paymentInfo.transactionId,
            transactionDate: paymentInfo.transactionDate,
            paymentMethod: paymentInfo.paymentMethod,
            orderStatus: paymentInfo.orderStatus,
            confirmedByIPN: paymentInfo.confirmedByIPN || false,
            confirmedByWebhook: paymentInfo.confirmedByWebhook || false,
            source: paymentInfo.source,
            amountMismatch: true,
            expectedAmount: tournament.entryFee,
            receivedAmount: paymentInfo.amount,
            ...(paymentInfo.bankDetails ? { bankDetails: paymentInfo.bankDetails } : {}),
        });
        registration.paymentStatus = "pending_verification";
        registration.paymentAmount = paymentInfo.amount;
        registration.paymentDate = parseVietnamTime(paymentInfo.transactionDate);
        await registration.save();

        // Notify manager
        await Notification.create({
            recipient: tournament.createdBy,
            type: "system",
            title: "⚠️ Số tiền thanh toán không khớp",
            message: `VĐV "${registration.playerName}" thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ nhưng lệ phí là ${tournament.entryFee?.toLocaleString("vi-VN")}đ. Vui lòng kiểm tra.`,
            link: `/manager/giai-dau/${tournament._id}/dang-ky`,
        });

        return jsonRes({ success: true });
    }

    // ============================================================
    // MARK AS PAID
    // ============================================================
    registration.paymentStatus = "paid";
    registration.paymentAmount = paymentInfo.amount;
    registration.paymentDate = parseVietnamTime(paymentInfo.transactionDate);
    registration.paymentConfirmedAt = new Date();

    const existingNote = JSON.parse(registration.paymentNote || "{}");
    registration.paymentNote = JSON.stringify({
        ...existingNote,
        sepayOrderId: paymentInfo.orderId,
        transactionId: paymentInfo.transactionId,
        transactionDate: paymentInfo.transactionDate,
        paymentMethod: paymentInfo.paymentMethod,
        orderStatus: paymentInfo.orderStatus,
        confirmedByIPN: paymentInfo.confirmedByIPN || false,
        confirmedByWebhook: paymentInfo.confirmedByWebhook || false,
        source: paymentInfo.source,
        ...(paymentInfo.bankDetails ? { bankDetails: paymentInfo.bankDetails } : {}),
    });

    await registration.save();

    console.log(`✅ SePay webhook: Registration ${registration._id} payment confirmed!`);
    console.log(`   Amount: ${paymentInfo.amount}, Invoice: ${paymentInfo.invoiceNumber}, Source: ${paymentInfo.source}`);

    // ============================================================
    // AUTO-APPROVE if tournament has space
    // ============================================================
    if (tournament && registration.status === "pending") {
        if (tournament.currentTeams < tournament.maxTeams) {
            const teamName = registration.teamName || registration.playerName || "Team";
            const teamShortName = registration.teamShortName || teamName.substring(0, 4).toUpperCase();
            
            const members = [];
            if (registration.user) {
                members.push({ user: registration.user, role: "captain", joinedAt: new Date() });
            }
            if (registration.player2User) {
                members.push({ user: registration.player2User, role: "player", joinedAt: new Date() });
            }

            const team = await Team.create({
                name: teamName,
                shortName: teamShortName,
                tournament: tournament._id,
                captain: registration.user || undefined,
                members: members,
            });

            registration.status = "approved";
            registration.team = team._id;
            registration.approvedAt = new Date();
            await registration.save();

            await Tournament.findByIdAndUpdate(tournament._id, {
                $inc: { currentTeams: 1 },
            });

            console.log(`🎉 SePay webhook: Auto-approved registration ${registration._id} → Team ${team._id}`);

            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "🎉 Đăng ký thành công!",
                message: `Thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                link: `/giai-dau/${tournament._id}`,
            });

            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "✅ VĐV mới tự động duyệt",
                message: `VĐV "${registration.playerName}" (đội ${registration.teamName}) đã thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ và được tự động duyệt vào giải "${tournament.title}".`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });

            sendPaymentInvoiceEmail({
                playerName: registration.playerName,
                email: registration.email,
                teamName: registration.teamName,
                teamShortName: registration.teamShortName,
                tournamentTitle: tournament.title,
                tournamentId: tournament._id.toString(),
                amount: paymentInfo.amount,
                currency: tournament.currency || "VNĐ",
                paymentDate: parseVietnamTime(paymentInfo.transactionDate),
                orderCode: paymentInfo.invoiceNumber,
                reference: paymentInfo.transactionId,
                paymentMethod: `Chuyển khoản tự động (${paymentInfo.paymentMethod})`,
                registrationId: registration._id.toString(),
                isAutoApproved: true,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        } else {
            console.log(`⚠️ SePay webhook: Tournament full, payment confirmed but NOT auto-approved for ${registration._id}`);

            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "✅ Thanh toán thành công",
                message: `Thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận. Giải đã đủ đội, vui lòng liên hệ BTC.`,
                link: `/giai-dau/${tournament._id}`,
            });

            await Notification.create({
                recipient: tournament.createdBy,
                type: "system",
                title: "💰 Thanh toán nhận — giải đã đủ đội",
                message: `VĐV "${registration.playerName}" đã thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ nhưng giải "${tournament.title}" đã đủ ${tournament.maxTeams} đội.`,
                link: `/manager/giai-dau/${tournament._id}/dang-ky`,
            });

            sendPaymentInvoiceEmail({
                playerName: registration.playerName,
                email: registration.email,
                teamName: registration.teamName,
                teamShortName: registration.teamShortName,
                tournamentTitle: tournament.title,
                tournamentId: tournament._id.toString(),
                amount: paymentInfo.amount,
                currency: tournament.currency || "VNĐ",
                paymentDate: parseVietnamTime(paymentInfo.transactionDate),
                orderCode: paymentInfo.invoiceNumber,
                reference: paymentInfo.transactionId,
                paymentMethod: `Chuyển khoản tự động (${paymentInfo.paymentMethod})`,
                registrationId: registration._id.toString(),
                isAutoApproved: false,
            }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
        }
    } else if (tournament) {
        await Notification.create({
            recipient: registration.user,
            type: "system",
            title: "✅ Thanh toán thành công",
            message: `Thanh toán ${paymentInfo.amount?.toLocaleString("vi-VN")}đ cho giải "${tournament.title}" đã được xác nhận tự động.`,
            link: `/giai-dau/${tournament._id}`,
        });

        sendPaymentInvoiceEmail({
            playerName: registration.playerName,
            email: registration.email,
            teamName: registration.teamName,
            teamShortName: registration.teamShortName,
            tournamentTitle: tournament.title,
            tournamentId: tournament._id.toString(),
            amount: paymentInfo.amount,
            currency: tournament.currency || "VNĐ",
            paymentDate: parseVietnamTime(paymentInfo.transactionDate),
            orderCode: paymentInfo.invoiceNumber,
            reference: paymentInfo.transactionId,
            paymentMethod: `Chuyển khoản tự động (${paymentInfo.paymentMethod})`,
            registrationId: registration._id.toString(),
            isAutoApproved: false,
        }).catch((err: any) => console.error("❌ Failed to send invoice email:", err));
    }

    // Return 200 to acknowledge receipt (required by SePay)
    return jsonRes({ success: true });
}

/**
 * Find registration by invoiceNumber stored in paymentNote JSON
 */
async function findRegistrationByInvoice(invoiceNumber: string) {
    if (!invoiceNumber) return null;

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

/**
 * Parse SePay's Vietnam time string (YYYY-MM-DD HH:mm:ss) into a correct Date object
 * Avoids UTC mismatch when Node runs in UTC
 */
function parseVietnamTime(dateString?: string): Date {
    if (!dateString) return new Date();
    // If it already has timezone info or T, pass it through
    if (dateString.includes('T') || dateString.includes('+') || dateString.includes('Z')) {
        return new Date(dateString);
    }
    // Convert "2026-03-21 00:16:13" to "2026-03-21T00:16:13+07:00"
    return new Date(dateString.replace(' ', 'T') + '+07:00');
}
