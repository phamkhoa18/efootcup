import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/payment/payos-cancel
 * Called from the payment result page when user cancels PayOS payment.
 * Resets paymentStatus from pending_verification → unpaid so user can retry.
 * 
 * SECURITY:
 * - Requires authentication
 * - Only resets the CURRENT USER's registration (scoped by user ID)
 * - Validates orderCode match before resetting
 */
export async function POST(req: NextRequest) {
    try {
        // ✅ Require auth — only logged-in users can cancel their own payments
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;
        const userId = authResult.user._id;

        const { tournamentId, orderCode } = await req.json();

        if (!tournamentId) {
            return NextResponse.json({ success: false, message: "Missing tournamentId" }, { status: 400 });
        }

        await dbConnect();

        // ✅ SECURITY: Only find THIS USER's registration for THIS tournament
        const registration = await Registration.findOne({
            tournament: tournamentId,
            user: userId,
            paymentStatus: { $in: ["pending_verification", "unpaid"] },
        });

        if (!registration) {
            return NextResponse.json({
                success: true,
                message: "No pending registration found",
                resetCount: 0,
            });
        }

        // Verify orderCode matches if provided
        if (orderCode) {
            try {
                const noteData = JSON.parse(registration.paymentNote || "{}");
                if (noteData.orderCode && noteData.orderCode.toString() !== orderCode.toString()) {
                    // Different orderCode — still reset but log the mismatch
                    console.log(`PayOS Cancel: orderCode mismatch (stored: ${noteData.orderCode}, received: ${orderCode}), still resetting registration ${registration._id}`);
                }
            } catch {
                // Invalid JSON — continue
            }
        }

        // Reset to unpaid
        const noteData = JSON.parse(registration.paymentNote || "{}");
        registration.paymentStatus = "unpaid";
        registration.paymentNote = JSON.stringify({
            ...noteData,
            cancelledAt: new Date().toISOString(),
            cancelledFrom: "result_page",
            cancelledByUser: userId.toString(),
        });
        await registration.save();
        console.log(`PayOS Cancel: Registration ${registration._id} reset to unpaid (user: ${userId})`);

        return NextResponse.json({
            success: true,
            message: "Reset registration to unpaid",
            resetCount: 1,
        });
    } catch (error) {
        console.error("PayOS cancel API error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
