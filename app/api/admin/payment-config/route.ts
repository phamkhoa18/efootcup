import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/payment-config — Get payment configuration
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const config = await (PaymentConfig as any).getSingleton();
        return apiResponse(config);
    } catch (error) {
        console.error("Get payment config error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/payment-config — Update payment configuration
export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        let config = await (PaymentConfig as any).getSingleton();

        // Update fields
        if (body.methods !== undefined) config.methods = body.methods;
        if (body.autoConfirm !== undefined) config.autoConfirm = body.autoConfirm;
        if (body.paymentDeadlineHours !== undefined) config.paymentDeadlineHours = body.paymentDeadlineHours;
        if (body.paymentNote !== undefined) config.paymentNote = body.paymentNote;
        if (body.refundPolicy !== undefined) config.refundPolicy = body.refundPolicy;
        if (body.callbackBaseUrl !== undefined) config.callbackBaseUrl = body.callbackBaseUrl;

        config.updatedBy = authResult.user._id;
        await config.save();

        return apiResponse(config, 200, "Cập nhật cấu hình thanh toán thành công");
    } catch (error) {
        console.error("Update payment config error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
