import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { apiResponse, apiError } from "@/lib/auth";
import { sendResetPasswordEmail } from "@/lib/email";

// POST /api/auth/forgot-password
// Step 1: Request reset code (sends 6-digit code via email)
// Step 2: Verify code + set new password
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { email, step, code, newPassword } = body;

        if (!email) return apiError("Vui lòng nhập email", 400);

        // ======= STEP 1: Request Reset Code =======
        if (step === "request" || !step) {
            const user = await User.findOne({ email: email.toLowerCase().trim() });

            if (!user) {
                // Return success even if user doesn't exist (security: don't reveal if email exists)
                return apiResponse({ sent: true }, 200, "Nếu email tồn tại, mã xác nhận đã được gửi");
            }

            // Generate 6-digit code
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store code in DB
            await User.findByIdAndUpdate(user._id, {
                resetPasswordCode: resetCode,
                resetPasswordCodeExpires: resetExpires,
            });

            // Send email with reset code
            console.log(`[RESET PASSWORD] Attempting to send reset code to ${email}`);
            const emailResult = await sendResetPasswordEmail(
                user.email,
                user.name,
                resetCode
            );

            if (!emailResult.success) {
                console.error(`[RESET PASSWORD] Failed to send email to ${email}. Check SMTP configuration in admin settings.`);
                return apiError("Không thể gửi email. Vui lòng thử lại sau hoặc liên hệ admin.", 500);
            }

            console.log(`[RESET PASSWORD] Email sent successfully to ${email}`);

            return apiResponse(
                { sent: true },
                200,
                "Mã xác nhận đã được gửi đến email của bạn"
            );
        }

        // ======= STEP 2: Verify Code & Reset Password =======
        if (step === "reset") {
            if (!code) return apiError("Vui lòng nhập mã xác nhận", 400);
            if (!newPassword) return apiError("Vui lòng nhập mật khẩu mới", 400);
            if (newPassword.length < 8) return apiError("Mật khẩu phải có ít nhất 8 ký tự", 400);

            const user = await User.findOne({ email: email.toLowerCase().trim() })
                .select("+resetPasswordCode +resetPasswordCodeExpires");

            if (!user) return apiError("Email không tồn tại", 400);

            if (!user.resetPasswordCode || !user.resetPasswordCodeExpires) {
                return apiError("Bạn chưa yêu cầu đặt lại mật khẩu", 400);
            }

            // Check expiry
            if (user.resetPasswordCodeExpires < new Date()) {
                return apiError("Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.", 400);
            }

            // Verify code
            if (user.resetPasswordCode !== code) {
                return apiError("Mã xác nhận không đúng", 400);
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password and clear reset fields
            await User.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                resetPasswordCode: null,
                resetPasswordCodeExpires: null,
            });

            return apiResponse(null, 200, "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.");
        }

        return apiError("Bước không hợp lệ", 400);

    } catch (error: any) {
        console.error("Forgot password error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
