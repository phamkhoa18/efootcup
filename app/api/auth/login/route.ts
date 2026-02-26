import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken, apiResponse, apiError } from "@/lib/auth";

// POST /api/auth/login
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { email, password } = body;

        // Validate
        if (!email || !password) {
            return apiError("Vui lòng nhập email và mật khẩu", 400);
        }

        // Find user with password
        const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password"
        );

        if (!user) {
            return apiError("Email hoặc mật khẩu không đúng", 401);
        }

        if (!user.isActive) {
            return apiError("Tài khoản đã bị khóa", 403);
        }

        if (!user.isVerified) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tài khoản chưa được xác minh. Vui lòng kiểm tra email",
                    data: { email: user.email, requiresVerification: true },
                },
                { status: 403 }
            );
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return apiError("Email hoặc mật khẩu không đúng", 401);
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user);

        const response = apiResponse(
            {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    phone: user.phone,
                    bio: user.bio,
                    gamerId: user.gamerId,
                    stats: user.stats,
                },
                token,
            },
            200,
            "Đăng nhập thành công"
        );

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        return response;
    } catch (error: any) {
        console.error("Login error:", error);
        return apiError("Có lỗi xảy ra, vui lòng thử lại", 500);
    }
}
