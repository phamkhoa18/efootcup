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
        )
            .populate("author", "name avatar")
            .populate("categoryRef", "name slug icon color gradient");

        if (!post) return apiError("Không tìm thấy bài viết", 404);

        // Build related posts query: same category OR same categoryRef OR shared tags
        const orConditions: any[] = [];
        if (post.category) orConditions.push({ category: post.category });
        if (post.categoryRef) orConditions.push({ categoryRef: post.categoryRef._id || post.categoryRef });
        if (post.tags && post.tags.length > 0) orConditions.push({ tags: { $in: post.tags } });

        let related: any[] = [];
        if (orConditions.length > 0) {
            related = await Post.find({
                _id: { $ne: post._id },
                status: "published",
                $or: orConditions,
            })
                .sort({ isPinned: -1, publishedAt: -1 })
                .limit(6)
                .select("title slug excerpt coverImage category categoryRef tags isPinned isFeatured views publishedAt createdAt readingTime author")
                .populate("author", "name avatar")
                .populate("categoryRef", "name slug icon color gradient");
        }

        // If not enough related, fill with featured/latest posts
        if (related.length < 4) {
            const existingIds = [post._id, ...related.map(r => r._id)];
            const extra = await Post.find({
                _id: { $nin: existingIds },
                status: "published",
            })
                .sort({ isFeatured: -1, isPinned: -1, publishedAt: -1 })
                .limit(6 - related.length)
                .select("title slug excerpt coverImage category categoryRef tags isPinned isFeatured views publishedAt createdAt readingTime author")
                .populate("author", "name avatar")
                .populate("categoryRef", "name slug icon color gradient");
            related = [...related, ...extra];
        }

        return apiResponse({ post, related });
    } catch (error: any) {
        console.error("Get post by slug error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
