import { NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tournaments/[id]/pay
 * Creates a payment link (PayOS) for a tournament registration,
 * or returns manual payment info.
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

        if (tournament.entryFee <= 0) {
            return apiError("Giải đấu này miễn phí, không cần thanh toán", 400);
        }

        // Find user's registration
        const registration = await Registration.findOne({
            tournament: tournament._id,
            user: authResult.user._id,
        });
        if (!registration) {
            return apiError("Bạn chưa đăng ký giải đấu này", 404);
        }
        if (registration.paymentStatus === "paid") {
            return apiError("Bạn đã thanh toán rồi", 400);
        }

        const body = await req.json();
        const { methodId } = body;

        // Get payment config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const method = paymentConfig.methods.find((m: any) => m.id === methodId && m.enabled);
        if (!method) {
            return apiError("Phương thức thanh toán không hợp lệ", 400);
        }

        // === AUTO MODE: PayOS ===
        if (method.mode === "auto" && method.type === "payos") {
            // Check if there's already a pending PayOS link
            if (registration.paymentMethod === "payos" && registration.paymentNote) {
                try {
                    const noteData = JSON.parse(registration.paymentNote);
                    if (noteData.orderCode && noteData.paymentLinkId) {
                        // Check existing link status via PayOS API
                        const checkRes = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${noteData.orderCode}`, {
                            headers: {
                                "x-client-id": method.payosClientId,
                                "x-api-key": method.payosApiKey,
                            },
                        });
                        const checkData = await checkRes.json();
                        if (checkData.code === "00" && checkData.data) {
                            const linkStatus = checkData.data.status;
                            if (linkStatus === "PENDING") {
                                // Return existing checkout URL
                                return apiResponse({
                                    payUrl: checkData.data.checkoutUrl,
                                    qrCode: checkData.data.qrCode,
                                    orderCode: noteData.orderCode,
                                    paymentLinkId: noteData.paymentLinkId,
                                    amount: checkData.data.amount,
                                }, 200, "Link thanh toán PayOS đang chờ");
                            } else if (linkStatus === "PAID") {
                                // Already paid! Update status
                                registration.paymentStatus = "paid";
                                registration.paymentAmount = checkData.data.amountPaid || checkData.data.amount;
                                registration.paymentConfirmedAt = new Date();
                                // paymentConfirmedBy stored in paymentNote as "payos-check"
                                await registration.save();
                                return apiError("Bạn đã thanh toán rồi", 400);
                            }
                            // CANCELLED/EXPIRED → allow creating new link below
                        }
                    }
                } catch (e) {
                    console.error("Check existing PayOS link error:", e);
                }
            }

            return await createPayOSPayment(
                method,
                paymentConfig,
                tournament,
                registration,
                req
            );
        }

        // === MANUAL MODE: Return payment info ===
        const paymentNoteTemplate = paymentConfig.paymentNote || "[TÊN GIẢI] - [TÊN VĐV]";
        return apiResponse({
            mode: "manual",
            method: {
                type: method.type,
                name: method.name,
                accountName: method.accountName,
                accountNumber: method.accountNumber,
                bankName: method.bankName,
                bankBranch: method.bankBranch,
                qrImage: method.qrImage,
                instructions: method.instructions,
            },
            amount: tournament.entryFee,
            currency: tournament.currency || "VNĐ",
            paymentNote: paymentNoteTemplate
                .replace("[TÊN GIẢI]", tournament.title)
                .replace("[TÊN VĐV]", registration.playerName),
        }, 200, "Thông tin thanh toán thủ công");
    } catch (error) {
        console.error("Create payment error:", error);
        return apiError("Có lỗi xảy ra khi tạo thanh toán", 500);
    }
}

/**
 * Create PayOS payment link
 * API: POST https://api-merchant.payos.vn/v2/payment-requests
 * 
 * Signature = HMAC_SHA256(
 *   "amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}",
 *   checksumKey
 * )
 */
async function createPayOSPayment(
    method: any,
    config: any,
    tournament: any,
    registration: any,
    req: NextRequest
) {
    const clientId = method.payosClientId;
    const apiKey = method.payosApiKey;
    const checksumKey = method.payosChecksumKey;

    if (!clientId || !apiKey || !checksumKey) {
        return apiError("PayOS chưa được cấu hình đúng. Vui lòng liên hệ Admin.", 500);
    }

    const callbackBaseUrl = config.callbackBaseUrl || new URL(req.url).origin;
    const amount = tournament.entryFee;

    // orderCode: must be a positive integer, unique – use timestamp last 7 digits + random
    const orderCode = Number(Date.now().toString().slice(-7) + Math.floor(Math.random() * 100).toString().padStart(2, "0"));

    // Description: max 25 chars for non-linked banks, keep it short
    const description = `EFCUP${orderCode}`;

    const returnUrl = `${callbackBaseUrl}/giai-dau/${tournament._id}/thanh-toan/ket-qua?gateway=payos`;
    const cancelUrl = `${callbackBaseUrl}/giai-dau/${tournament._id}/thanh-toan/ket-qua?gateway=payos&cancelled=true`;

    // Create signature: sorted by key alphabetically
    // amount=X&cancelUrl=X&description=X&orderCode=X&returnUrl=X
    const signData = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
    const signature = crypto
        .createHmac("sha256", checksumKey)
        .update(signData)
        .digest("hex");

    // Build request body
    const payosBody = {
        orderCode,
        amount,
        description,
        buyerName: registration.playerName || "",
        buyerEmail: registration.email || "",
        buyerPhone: registration.phone || "",
        items: [
            {
                name: `Lệ phí giải ${tournament.title}`,
                quantity: 1,
                price: amount,
            },
        ],
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(Date.now() / 1000) + (config.paymentDeadlineHours || 24) * 3600,
        signature,
    };

    console.log("📦 PayOS request body:", JSON.stringify(payosBody, null, 2));

    try {
        const response = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": clientId,
                "x-api-key": apiKey,
            },
            body: JSON.stringify(payosBody),
        });

        const result = await response.json();
        console.log("📦 PayOS response:", JSON.stringify(result, null, 2));

        if (result.code === "00" && result.data) {
            // Save payment info to registration (keep unpaid until webhook or return URL confirms)
            registration.paymentMethod = "payos";
            registration.paymentNote = JSON.stringify({
                orderCode,
                paymentLinkId: result.data.paymentLinkId,
                tournamentId: tournament._id.toString(),
                registrationId: registration._id.toString(),
            });
            // Keep as unpaid — will be updated by webhook or return URL verification
            await registration.save();

            return apiResponse({
                payUrl: result.data.checkoutUrl,
                qrCode: result.data.qrCode,
                orderCode,
                paymentLinkId: result.data.paymentLinkId,
                amount: result.data.amount,
            }, 200, "Tạo link thanh toán PayOS thành công");
        } else {
            console.error("PayOS error:", result);
            return apiError(
                `PayOS lỗi: ${result.desc || "Không thể tạo link thanh toán"}`,
                400
            );
        }
    } catch (error) {
        console.error("PayOS fetch error:", error);
        return apiError("Không thể kết nối đến PayOS", 500);
    }
}
