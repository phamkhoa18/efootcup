import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// GET /api/admin/settings — Get site settings
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.create({});
        }

        return apiResponse(settings);
    } catch (error) {
        console.error("Get settings error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/admin/settings — Update site settings
export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        // Remove fields that should not be updated directly
        delete body._id;
        delete body.__v;
        delete body.createdAt;

        // Add updatedBy
        body.updatedBy = authResult.user.email;

        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.create(body);
        } else {
            Object.assign(settings, body);
            await settings.save();
        }

        return apiResponse(settings, 200, "Đã lưu cài đặt thành công");
    } catch (error) {
        console.error("Update settings error:", error);
        return apiError("Có lỗi xảy ra khi lưu cài đặt", 500);
    }
}
