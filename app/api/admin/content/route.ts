import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/content — list all posts
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "";
        const category = searchParams.get("category") || "";

        const query: any = {};
        if (status) query.status = status;
        if (category) query.category = category;

        const posts = await Post.find(query)
            .sort({ isPinned: -1, createdAt: -1 })
            .populate("author", "name email avatar")
            .populate("categoryRef", "name slug icon color gradient");

        return apiResponse({ posts });
    } catch (error: any) {
        console.error("Admin get posts error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/admin/content — create a post
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();

        const post = await Post.create({
            ...body,
            author: authResult.user._id,
            publishedAt: body.status === "published" ? new Date() : undefined,
        });

        return apiResponse(post, 201, "Đã tạo bài viết");
    } catch (error: any) {
        console.error("Admin create post error:", error);
        return apiError(error.message || "Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/content — update a post
export async function PUT(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();
        const { postId, ...updateData } = body;

        if (!postId) return apiError("Thiếu postId", 400);

        // If publishing for the first time, set publishedAt
        if (updateData.status === "published") {
            const existing = await Post.findById(postId);
            if (existing && !existing.publishedAt) {
                updateData.publishedAt = new Date();
            }
        }

        const post = await Post.findByIdAndUpdate(postId, updateData, { new: true })
            .populate("author", "name email avatar");

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        return apiResponse(post, 200, "Cập nhật thành công");
    } catch (error: any) {
        console.error("Admin update post error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/admin/content — delete a post
export async function DELETE(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { postId } = await req.json();

        if (!postId) return apiError("Thiếu postId", 400);

        const post = await Post.findByIdAndDelete(postId);
        if (!post) return apiError("Không tìm thấy bài viết", 404);

        return apiResponse(null, 200, "Đã xóa bài viết");
    } catch (error: any) {
        console.error("Admin delete post error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
