import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import SiteMenu from "@/models/SiteMenu";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/menus — get all menus
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const menus = await SiteMenu.find({}).sort({ location: 1 });
        return apiResponse({ menus });
    } catch (error: any) {
        console.error("Get menus error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/menus — update a menu by location
export async function PUT(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    try {
        await dbConnect();
        const { location, items } = await req.json();

        if (!location || !["navbar", "footer", "sidebar"].includes(location)) {
            return apiError("Vị trí menu không hợp lệ", 400);
        }

        const menu = await SiteMenu.findOneAndUpdate(
            { location },
            { items, updatedBy: authResult.user._id },
            { upsert: true, new: true }
        );

        return apiResponse({ menu }, 200, "Đã cập nhật menu");
    } catch (error: any) {
        console.error("Update menu error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
