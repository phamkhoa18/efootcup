import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Category from "@/models/Category";
import { apiResponse, apiError } from "@/lib/auth";

// GET /api/posts — public list published posts
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "12", 10);
        const category = searchParams.get("category") || "";
        const search = searchParams.get("search") || "";
        const featured = searchParams.get("featured") || "";

        const query: any = { status: "published" };

        // Category filter - support both slug and ObjectId
        if (category) {
            const catDoc = await Category.findOne({ slug: category });
            if (catDoc) {
                query.$or = query.$or || [];
                // Match by either the string field or the ref field
                const catFilter = [
                    { category: category },
                    { categoryRef: catDoc._id },
                ];
                if (query.$or.length > 0) {
                    // If there's already a $or (from search), wrap both
                    query.$and = [{ $or: catFilter }, { $or: query.$or }];
                    delete query.$or;
                } else {
                    query.$or = catFilter;
                }
            } else {
                query.category = category;
            }
        }

        if (featured === "true") query.isFeatured = true;

        if (search) {
            const searchOr = [
                { title: { $regex: search, $options: "i" } },
                { excerpt: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search, "i")] } },
            ];
            if (query.$or) {
                query.$and = query.$and || [];
                query.$and.push({ $or: searchOr });
            } else {
                query.$or = searchOr;
            }
        }

        const total = await Post.countDocuments(query);
        const posts = await Post.find(query)
            .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("title slug excerpt coverImage category categoryRef tags isPinned isFeatured views publishedAt createdAt readingTime author")
            .populate("author", "name avatar")
            .populate("categoryRef", "name slug icon color gradient");

        return apiResponse({
            posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error("Get public posts error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
