import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Post from "@/models/Post";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/categories — list all categories
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();

        const categories = await Category.find()
            .sort({ order: 1, createdAt: -1 })
            .populate("parent", "name slug");

        // Get post counts for each category
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
        console.error("Admin get categories error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/admin/categories — create a category
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();

        // Check duplicate slug
        const existingSlug = body.name
            ?.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const existing = await Category.findOne({ slug: existingSlug });
        if (existing) {
            return apiError("Danh mục với tên tương tự đã tồn tại", 400);
        }

        // Auto set order if not provided
        if (!body.order && body.order !== 0) {
            const maxOrder = await Category.findOne().sort({ order: -1 }).select("order");
            body.order = (maxOrder?.order || 0) + 1;
        }

        const category = await Category.create(body);

        return apiResponse(category, 201, "Đã tạo danh mục");
    } catch (error: any) {
        console.error("Admin create category error:", error);
        return apiError(error.message || "Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/categories — update a category
export async function PUT(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const body = await req.json();
        const { categoryId, ...updateData } = body;

        if (!categoryId) return apiError("Thiếu categoryId", 400);

        const category = await Category.findByIdAndUpdate(categoryId, updateData, { new: true })
            .populate("parent", "name slug");

        if (!category) return apiError("Không tìm thấy danh mục", 404);

        return apiResponse(category, 200, "Cập nhật thành công");
    } catch (error: any) {
        console.error("Admin update category error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/admin/categories — delete a category
export async function DELETE(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { categoryId } = await req.json();

        if (!categoryId) return apiError("Thiếu categoryId", 400);

        // Check if category has posts
        const postCount = await Post.countDocuments({ categoryRef: categoryId });
        if (postCount > 0) {
            return apiError(
                `Không thể xóa: danh mục đang có ${postCount} bài viết liên kết. Hãy chuyển bài viết sang danh mục khác trước.`,
                400
            );
        }

        // Check if category has children
        const childCount = await Category.countDocuments({ parent: categoryId });
        if (childCount > 0) {
            return apiError(
                "Không thể xóa: danh mục đang có danh mục con. Hãy xóa danh mục con trước.",
                400
            );
        }

        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) return apiError("Không tìm thấy danh mục", 404);

        return apiResponse(null, 200, "Đã xóa danh mục");
    } catch (error: any) {
        console.error("Admin delete category error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
