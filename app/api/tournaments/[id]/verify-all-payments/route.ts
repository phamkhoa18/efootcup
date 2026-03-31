import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tournaments/[id]/verify-all-payments
 *
 * Manager-only endpoint: batch-verify all unpaid SePay registrations.
 * Uses SePay PG SDK to check order status by invoice number.
 * Updates registration with SePay order data (orderId, status, PAY code).
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

        // Check if user is manager/owner
        const isOwner = tournament.createdBy?.toString() === authResult.user._id.toString();
        const isCollaborator = tournament.collaborators?.some(
            (c: any) => c.user?.toString() === authResult.user._id.toString()
        );
        const isAdmin = authResult.user.role === "admin";
        if (!isOwner && !isCollaborator && !isAdmin) {
            return apiError("Không có quyền", 403);
        }

        // Get SePay config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const sepayMethod = paymentConfig.methods?.find(
            (m: any) => m.type === "sepay" && m.enabled
        );
        if (!sepayMethod?.sepayMerchantId || !sepayMethod?.sepaySecretKey) {
            return apiError("Chưa cấu hình SePay PG", 500);
        }

        const env = sepayMethod.sepayEnv || "production";

        // Initialize SePay SDK
        const { SePayPgClient } = await import("sepay-pg-node");
        const client = new SePayPgClient({
            env,
            merchant_id: sepayMethod.sepayMerchantId,
            secret_key: sepayMethod.sepaySecretKey,
        });

        // Find all unpaid sepay registrations for this tournament
        const unpaidRegs = await Registration.find({
            tournament: tournament._id,
            paymentMethod: "sepay",
            paymentStatus: { $in: ["unpaid", "pending_verification"] },
            paymentNote: { $exists: true, $ne: "" },
        });

        console.log(`🔍 verify-all: Found ${unpaidRegs.length} unpaid SePay registrations for tournament ${tournament.title}`);

        const results = {
            total: unpaidRegs.length,
            verified: 0,
            alreadyPaid: 0,
            notPaid: 0,
            errors: 0,
            updated: [] as string[],
        };

        for (const reg of unpaidRegs) {
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                const invoiceNumber = noteData.invoiceNumber;
                if (!invoiceNumber) {
                    results.errors++;
                    continue;
                }

                // Call SePay SDK to check order status
                let orderData: any = null;
                try {
                    const orderResult = await client.order.retrieve(invoiceNumber);
                    orderData = orderResult?.data;
                } catch (err: any) {
                    console.log(`  ⚠️ ${invoiceNumber}: SDK error - ${err?.message}`);
                    results.errors++;
                    continue;
                }

                if (!orderData) {
                    results.errors++;
                    continue;
                }

                const orderStatus = orderData.order_status || orderData.status;
                const isConfirmed = orderStatus === "CAPTURED" || orderStatus === "COMPLETED" || orderStatus === "PAID";

                // Always update noteData with SePay order info (even if not paid)
                const updatedNote = {
                    ...noteData,
                    sepayOrderId: orderData.order_id || orderData.id || noteData.sepayOrderId,
                    sepayOrderStatus: orderStatus,
                    sepayVerifiedAt: new Date().toISOString(),
                    // Store any transaction/payment reference from the order
                    ...(orderData.transaction_id ? { transactionId: String(orderData.transaction_id) } : {}),
                    ...(orderData.payment_method ? { sepayPaymentMethod: orderData.payment_method } : {}),
                };

                if (isConfirmed) {
                    const orderAmount = parseFloat(orderData.order_amount || String(tournament.entryFee)) || tournament.entryFee;

                    reg.paymentStatus = "paid";
                    reg.paymentAmount = orderAmount;
                    reg.paymentDate = new Date();
                    reg.paymentConfirmedAt = new Date();
                    reg.paymentNote = JSON.stringify({
                        ...updatedNote,
                        confirmedByBatchVerify: true,
                        orderStatus,
                    });
                    await reg.save();

                    // Auto-approve if tournament has space
                    if (reg.status === "pending" && tournament.currentTeams < tournament.maxTeams) {
                        const teamName = reg.teamName || reg.playerName || "Team";
                        const teamShortName = reg.teamShortName || teamName.substring(0, 3).toUpperCase();
                        const team = await Team.create({
                            name: teamName,
                            shortName: teamShortName,
                            tournament: tournament._id,
                            captain: reg.user || undefined,
                            members: reg.user ? [{ user: reg.user, role: "captain", joinedAt: new Date() }] : [],
                        });

                        reg.status = "approved";
                        reg.team = team._id;
                        reg.approvedAt = new Date();
                        await reg.save();

                        await Tournament.findByIdAndUpdate(tournament._id, {
                            $inc: { currentTeams: 1 },
                        });

                        if (reg.user) {
                            await Notification.create({
                                recipient: reg.user,
                                type: "system",
                                title: "🎉 Đăng ký thành công!",
                                message: `Thanh toán đã được xác nhận. Bạn đã chính thức tham gia giải "${tournament.title}"!`,
                                link: `/giai-dau/${tournament._id}`,
                            });
                        }
                    }

                    results.verified++;
                    results.updated.push(`${reg.playerName} (${invoiceNumber})`);
                    console.log(`  ✅ ${invoiceNumber}: PAID → ${reg.playerName}`);
                } else {
                    // Not paid yet — save the order info for debugging
                    reg.paymentNote = JSON.stringify(updatedNote);
                    await reg.save();
                    results.notPaid++;
                    console.log(`  ⏳ ${invoiceNumber}: ${orderStatus} → ${reg.playerName}`);
                }
            } catch (err: any) {
                console.error(`  ❌ Error verifying reg ${reg._id}:`, err?.message);
                results.errors++;
            }
        }

        console.log(`📊 verify-all results: ${results.verified} verified, ${results.notPaid} not paid, ${results.errors} errors`);

        return apiResponse(results, 200, `Đã kiểm tra ${results.total} đăng ký, xác nhận ${results.verified} thanh toán`);
    } catch (error) {
        console.error("verify-all-payments error:", error);
        return apiError("Có lỗi xảy ra khi kiểm tra thanh toán", 500);
    }
}
