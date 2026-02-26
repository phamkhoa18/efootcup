import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

// GET /api/auth/me — Get current user profile
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const user = await User.findById(authResult.user._id);
        if (!user) {
            return apiError("Không tìm thấy người dùng", 404);
        }

        return apiResponse({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            bio: user.bio,
            gamerId: user.gamerId,
            stats: user.stats,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/auth/me — Update profile
export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const body = await req.json();
        const { name, phone, bio, gamerId, avatar } = body;

        const user = await User.findByIdAndUpdate(
            authResult.user._id,
            {
                ...(name && { name }),
                ...(phone !== undefined && { phone }),
                ...(bio !== undefined && { bio }),
                ...(gamerId !== undefined && { gamerId }),
                ...(avatar !== undefined && { avatar }),
            },
            { new: true, runValidators: true }
        );

        if (!user) {
            return apiError("Không tìm thấy người dùng", 404);
        }

        return apiResponse(
            {
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
            200,
            "Cập nhật thành công"
        );
    } catch (error: any) {
        console.error("Update profile error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}
