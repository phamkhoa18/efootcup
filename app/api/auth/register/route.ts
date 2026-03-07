import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { apiResponse, apiError } from "@/lib/auth";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";

// POST /api/auth/register
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { name, email, password, confirmPassword, role, teamName } = body;

        // Validate
        if (!name || !email || !password) {
            return apiError("Vui lòng điền đầy đủ thông tin", 400);
        }

        if (password.length < 8) {
            return apiError("Mật khẩu phải có ít nhất 8 ký tự", 400);
        }

        if (password !== confirmPassword) {
            return apiError("Mật khẩu xác nhận không khớp", 400);
        }

        // Check existing user
        const existingUser = await User.findOne({ email: email.toLowerCase() }).select(
            "+verificationCode +verificationCodeExpires"
        );

        if (existingUser) {
            // If existing user is not verified, allow re-registration with new code
            if (!existingUser.isVerified) {
                const code = generateVerificationCode();
                const codeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

                // Update with new password and code
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(password, salt);

                existingUser.name = name;
                existingUser.password = hashedPassword;
                existingUser.role = role === "manager" ? "manager" : "user";
                if (teamName) existingUser.teamName = teamName;
                existingUser.verificationCode = code;
                existingUser.verificationCodeExpires = codeExpires;
                await existingUser.save();

                // Send verification email
                const emailResult = await sendVerificationEmail(email, name, code);
                if (emailResult.previewUrl) {
                    console.log("📧 Verification email preview:", emailResult.previewUrl);
                }

                return apiResponse(
                    { email: existingUser.email, requiresVerification: true },
                    200,
                    "Mã xác minh đã được gửi lại vào email của bạn"
                );
            }

            return apiError("Email này đã được đăng ký", 409);
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification code (4 digits, expires in 5 minutes)
        const code = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Create user (unverified)
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role === "manager" ? "manager" : "user",
            ...(teamName ? { teamName } : {}),
            isVerified: false,
            verificationCode: code,
            verificationCodeExpires: codeExpires,
        });

        // Send verification email
        const emailResult = await sendVerificationEmail(email, name, code);
        if (emailResult.previewUrl) {
            console.log("📧 Verification email preview:", emailResult.previewUrl);
        }

        return apiResponse(
            {
                email: user.email,
                requiresVerification: true,
            },
            201,
            "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản"
        );
    } catch (error: any) {
        console.error("Register error:", error);

        // Mongoose validation errors
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }

        return apiError("Có lỗi xảy ra, vui lòng thử lại", 500);
    }
}
