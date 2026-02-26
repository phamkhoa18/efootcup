import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken, apiResponse, apiError } from "@/lib/auth";

// POST /api/auth/verify
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return apiError("Vui lòng nhập email và mã xác minh", 400);
        }

        // Find user with verification fields
        const user = await User.findOne({
            email: email.toLowerCase(),
        }).select("+verificationCode +verificationCodeExpires");

        if (!user) {
            return apiError("Không tìm thấy tài khoản với email này", 404);
        }

        if (user.isVerified) {
            return apiError("Tài khoản đã được xác minh trước đó", 400);
        }

        // Check code
        if (!user.verificationCode || !user.verificationCodeExpires) {
            return apiError("Mã xác minh không hợp lệ. Vui lòng yêu cầu mã mới", 400);
        }

        // Check expiration (5 minutes)
        if (new Date() > user.verificationCodeExpires) {
            return apiError("Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới", 400);
        }

        // Check code match
        if (user.verificationCode !== code) {
            return apiError("Mã xác minh không đúng", 400);
        }

        // Activate account
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        // Generate JWT token and log user in
        const token = generateToken(user);

        const response = apiResponse(
            {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    stats: user.stats,
                },
                token,
            },
            200,
            "Xác minh thành công! Tài khoản của bạn đã được kích hoạt"
        );

        // Set cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return response;
    } catch (error: any) {
        console.error("Verify error:", error);
        return apiError("Có lỗi xảy ra, vui lòng thử lại", 500);
    }
}
