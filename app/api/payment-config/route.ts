import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import { apiResponse, apiError } from "@/lib/auth";

// GET /api/payment-config — Get payment config (public, only enabled methods)
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const config = await (PaymentConfig as any).getSingleton();

        // Only return enabled methods for public view
        const publicConfig = {
            methods: (config.methods || []).filter((m: any) => m.enabled).map((m: any) => ({
                id: m.id,
                type: m.type,
                mode: m.mode,
                name: m.name,
                accountName: m.accountName,
                accountNumber: m.accountNumber,
                bankName: m.bankName,
                bankBranch: m.bankBranch,
                qrImage: m.qrImage,
                instructions: m.instructions,
                icon: m.icon,
            })),
            paymentDeadlineHours: config.paymentDeadlineHours,
            paymentNote: config.paymentNote,
            refundPolicy: config.refundPolicy,
        };

        return apiResponse(publicConfig);
    } catch (error) {
        console.error("Get public payment config error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
