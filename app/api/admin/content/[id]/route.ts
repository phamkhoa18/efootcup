import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/content/[id] — get single post
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { id } = await params;
        const post = await Post.findById(id)
            .populate("author", "name email avatar")
            .populate("categoryRef", "name slug icon color gradient");

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        return apiResponse({ post });
    } catch (error: any) {
        console.error("Admin get post error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/content/[id] — update single post
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        // If publishing for the first time, set publishedAt
        if (body.status === "published") {
            const existing = await Post.findById(id);
            if (existing && !existing.publishedAt) {
                body.publishedAt = new Date();
            }
        }

        // Track last editor
        body.lastEditedBy = authResult.user._id;

        const post = await Post.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        }).populate("author", "name email avatar")
            .populate("categoryRef", "name slug icon color gradient");

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        return apiResponse({ post }, 200, "Cập nhật thành công");
    } catch (error: any) {
        console.error("Admin update post error:", error);
        return apiError(error.message || "Có lỗi xảy ra", 500);
    }
}

// DELETE /api/admin/content/[id] — delete single post
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { id } = await params;
        const post = await Post.findByIdAndDelete(id);

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        return apiResponse(null, 200, "Đã xóa bài viết");
    } catch (error: any) {
        console.error("Admin delete post error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
