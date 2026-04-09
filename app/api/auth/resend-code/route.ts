import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { apiResponse, apiError } from "@/lib/auth";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";

// POST /api/auth/resend-code
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return apiError("Vui lòng nhập email", 400);
        }

        // Find user
        const user = await User.findOne({
            email: email.toLowerCase(),
        }).select("+verificationCode +verificationCodeExpires");

        if (!user) {
            return apiError("Không tìm thấy tài khoản với email này", 404);
        }

        if (user.isVerified) {
            return apiError("Tài khoản đã được xác minh", 400);
        }

        // Rate limit: don't resend if last code was sent less than 60 seconds ago
        if (
            user.verificationCodeExpires &&
            new Date(user.verificationCodeExpires.getTime() - 4 * 60 * 1000) > new Date()
        ) {
            // Code was set less than 1 minute ago (5 min expiry - 4 min = 1 min since creation)
            return apiError("Vui lòng đợi 1 phút trước khi yêu cầu mã mới", 429);
        }

        // Generate new code
        const code = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        user.verificationCode = code;
        user.verificationCodeExpires = codeExpires;
        await user.save();

        // Send email
        const emailResult = await sendVerificationEmail(email, user.name, code);
        if (emailResult.previewUrl) {
            console.log("📧 Resend verification email preview:", emailResult.previewUrl);
        }

        if (!emailResult.success) {
            console.error(`[Resend] Failed to send verification email to ${email}:`, emailResult.error);
            return apiError(
                `Không gửi được email xác minh: ${emailResult.error || "Lỗi SMTP"}. Vui lòng liên hệ quản trị viên.`,
                500
            );
        }

        return apiResponse(
            { email: user.email },
            200,
            "Mã xác minh mới đã được gửi vào email của bạn"
        );
    } catch (error: any) {
        console.error("Resend code error:", error);
        return apiError("Có lỗi xảy ra, vui lòng thử lại", 500);
    }
}
