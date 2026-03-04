import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { apiResponse, apiError } from "@/lib/auth";

// GET /api/posts/[slug] — get single published post by slug
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        await dbConnect();
        const { slug } = await params;

        const post = await Post.findOneAndUpdate(
            { slug, status: "published" },
            { $inc: { views: 1 } },
            { new: true }
        ).populate("author", "name avatar");

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        // Get related posts
        const related = await Post.find({
            _id: { $ne: post._id },
            status: "published",
            $or: [
                { category: post.category },
                { tags: { $in: post.tags || [] } },
            ],
        })
            .sort({ publishedAt: -1 })
            .limit(4)
            .select("title slug excerpt coverImage category publishedAt readingTime");

        return apiResponse({ post, related });
    } catch (error: any) {
        console.error("Get post by slug error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
