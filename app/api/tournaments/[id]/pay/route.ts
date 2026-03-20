import { NextRequest } from "next/server";
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
 *
 * For auto (SePay Payment Gateway):
 *   Uses sepay-pg-node SDK to create checkout form fields.
 *   Frontend renders a hidden form and auto-submits to SePay checkout.
 *   SePay handles QR payment page → redirects back to success/error/cancel URLs.
 *
 * For manual: returns bank transfer info for user to manually transfer.
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

        // === AUTO MODE: SePay Payment Gateway (SDK) ===
        if (method.mode === "auto" && method.type === "sepay") {
            const merchantId = method.sepayMerchantId;
            const secretKey = method.sepaySecretKey;

            if (!merchantId || !secretKey) {
                return apiError("Chưa cấu hình SePay Merchant ID hoặc Secret Key", 500);
            }

            // Use environment from admin config (default: production)
            const env = method.sepayEnv || "production";

            // Import SDK dynamically (ESM/CJS compatible)
            const { SePayPgClient } = await import("sepay-pg-node");

            const client = new SePayPgClient({
                env,
                merchant_id: merchantId,
                secret_key: secretKey,
            });

            // Generate unique invoice number for this payment
            // Reuse existing invoice number if user already initiated payment
            let invoiceNumber: string;
            if (registration.paymentMethod === "sepay" && registration.paymentNote) {
                try {
                    const noteData = JSON.parse(registration.paymentNote);
                    if (noteData.invoiceNumber) {
                        invoiceNumber = noteData.invoiceNumber;
                    } else {
                        invoiceNumber = `EFCUP-${registration._id.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                    }
                } catch {
                    invoiceNumber = `EFCUP-${registration._id.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                }
            } else {
                invoiceNumber = `EFCUP-${registration._id.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
            }

            // Build callback URLs
            const host = req.headers.get("host") || "localhost:3000";
            const protocol = req.headers.get("x-forwarded-proto") || "https";
            const baseUrl = `${protocol}://${host}`;
            const tournamentSlug = tournament.slug || tournament._id.toString();

            const successUrl = `${baseUrl}/giai-dau/${tournamentSlug}/thanh-toan/ket-qua?status=success&invoice=${invoiceNumber}`;
            const errorUrl = `${baseUrl}/giai-dau/${tournamentSlug}/thanh-toan/ket-qua?status=error&invoice=${invoiceNumber}`;
            const cancelUrl = `${baseUrl}/giai-dau/${tournamentSlug}/thanh-toan/ket-qua?status=cancel&invoice=${invoiceNumber}`;

            // Create checkout form fields using SDK
            const checkoutUrl = client.checkout.initCheckoutUrl();
            const checkoutFormFields = client.checkout.initOneTimePaymentFields({
                operation: "PURCHASE",
                payment_method: "BANK_TRANSFER",
                order_invoice_number: invoiceNumber,
                order_amount: tournament.entryFee,
                currency: "VND",
                order_description: `Le phi giai dau ${tournament.title} - ${registration.playerName}`,
                customer_id: authResult.user._id.toString(),
                success_url: successUrl,
                error_url: errorUrl,
                cancel_url: cancelUrl,
            });

            // Save payment info to registration
            registration.paymentMethod = "sepay";
            registration.paymentNote = JSON.stringify({
                invoiceNumber,
                tournamentId: tournament._id.toString(),
                registrationId: registration._id.toString(),
                env,
                createdAt: new Date().toISOString(),
            });
            await registration.save();

            console.log(`📦 SePay: Created checkout for registration ${registration._id}, invoice=${invoiceNumber}, env=${env}`);

            return apiResponse({
                mode: "auto",
                gateway: "sepay",
                checkoutUrl,
                checkoutFormFields,
                invoiceNumber,
                amount: tournament.entryFee,
                currency: "VND",
            }, 200, "Thông tin thanh toán SePay Payment Gateway");
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
