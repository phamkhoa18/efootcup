import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Post from "@/models/Post";
import { apiResponse, apiError } from "@/lib/auth";

// GET /api/categories — public list active categories
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const categories = await Category.find({ isActive: true })
            .sort({ order: 1 })
            .select("name slug description icon color gradient order postCount");

        // Get actual post counts
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => {
                const count = await Post.countDocuments({
                    $or: [
                        { categoryRef: cat._id },
                        { category: cat.slug },
                    ],
                    status: "published",
                });
                return {
                    ...cat.toObject(),
                    postCount: count,
                };
            })
        );

        return apiResponse({ categories: categoriesWithCounts });
    } catch (error: any) {
        console.error("Get public categories error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
