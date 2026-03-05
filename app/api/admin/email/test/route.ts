import { NextRequest } from "next/server";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email";

// POST /api/admin/email/test — Send test email
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        const { email } = await req.json();

        if (!email) {
            return apiError("Vui long nhap email nhan", 400);
        }

        const result = await sendTestEmail(email);

        if (result.success) {
            return apiResponse(
                { previewUrl: result.previewUrl },
                200,
                "Da gui email test thanh cong! Vui long kiem tra hop thu."
            );
        } else {
            return apiError(
                result.error || "Gui email that bai. Kiem tra lai cau hinh SMTP.",
                400
            );
        }
    } catch (error: any) {
        console.error("Test email API error:", error);
        return apiError(error.message || "Loi he thong", 500);
    }
}
