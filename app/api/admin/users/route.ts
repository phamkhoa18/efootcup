import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const query: any = {};
        if (search) {
            const orConditions: any[] = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { gamerId: { $regex: search, $options: "i" } },
            ];
            // efvId is a number — support both raw number and "EFV-XXXXXX" format
            const efvMatch = search.match(/^EFV-?(\d+)$/i);
            if (efvMatch) {
                orConditions.push({ efvId: parseInt(efvMatch[1], 10) });
            } else {
                const searchNum = parseInt(search, 10);
                if (!isNaN(searchNum)) {
                    orConditions.push({ efvId: searchNum });
                }
            }
            query.$or = orConditions;
        }
        if (role) query.role = role;

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("-password -verificationCode -verificationCodeExpires");

        return apiResponse({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error("Admin get users error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/users — update a user (role, isActive, etc.)
export async function PUT(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();
        const { userId, ...updateData } = body;

        if (!userId) return apiError("Thiếu userId", 400);

        // Prevent admin from changing own role
        if (userId === authResult.user._id && updateData.role) {
            return apiError("Không thể thay đổi role của chính mình", 400);
        }

        const allowedFields = [
            "role", "isActive", "isVerified", "name", "email", "phone", "bio", "gamerId",
            "nickname", "teamName", "province", "facebookName", "facebookLink", "dateOfBirth",
            "stats", "avatar",
        ];
        const sanitized: any = {};
        for (const key of allowedFields) {
            if (updateData[key] !== undefined) {
                sanitized[key] = updateData[key];
            }
        }

        if (updateData.password) {
            if (updateData.password.length < 8) {
                return apiError("Mật khẩu phải có ít nhất 8 ký tự", 400);
            }
            const salt = await bcrypt.genSalt(12);
            sanitized.password = await bcrypt.hash(updateData.password, salt);
        }

        const user = await User.findByIdAndUpdate(userId, sanitized, { new: true })
            .select("-password -verificationCode -verificationCodeExpires");

        if (!user) return apiError("Không tìm thấy người dùng", 404);

        return apiResponse(user, 200, "Cập nhật thành công");
    } catch (error: any) {
        console.error("Admin update user error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/admin/users — delete a user
export async function DELETE(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { userId } = await req.json();

        if (!userId) return apiError("Thiếu userId", 400);
        if (userId === authResult.user._id) {
            return apiError("Không thể xóa tài khoản của chính mình", 400);
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) return apiError("Không tìm thấy người dùng", 404);

        return apiResponse(null, 200, "Đã xóa người dùng");
    } catch (error: any) {
        console.error("Admin delete user error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
