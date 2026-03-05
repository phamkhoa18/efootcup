import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";

/**
 * POST /api/payment/payos-cancel
 * Called from the payment result page when user cancels PayOS payment.
 * Resets paymentStatus from pending_verification → unpaid so user can retry.
 */
export async function POST(req: NextRequest) {
    try {
        const { tournamentId, orderCode } = await req.json();

        if (!tournamentId) {
            return NextResponse.json({ success: false, message: "Missing tournamentId" }, { status: 400 });
        }

        await dbConnect();

        // Find registrations with pending_verification for this tournament
        const registrations = await Registration.find({
            tournament: tournamentId,
            paymentStatus: "pending_verification",
        });

        let resetCount = 0;
        for (const reg of registrations) {
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                // Match by orderCode or reset any pending_verification for this tournament
                if (
                    (orderCode && (noteData.orderCode?.toString() === orderCode?.toString() || noteData.paymentLinkId)) ||
                    !orderCode
                ) {
                    reg.paymentStatus = "unpaid";
                    reg.paymentNote = JSON.stringify({
                        ...noteData,
                        cancelledAt: new Date().toISOString(),
                        cancelledFrom: "result_page",
                    });
                    await reg.save();
                    resetCount++;
                    console.log(`PayOS Cancel: Registration ${reg._id} reset to unpaid`);
                }
            } catch {
                // Skip invalid JSON
            }
        }

        return NextResponse.json({
            success: true,
            message: `Reset ${resetCount} registration(s) to unpaid`,
            resetCount,
        });
    } catch (error) {
        console.error("PayOS cancel API error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
