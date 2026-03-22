import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { apiResponse, apiError, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne().lean();
        
        return apiResponse({
            bxhMobileOgImage: settings?.bxhMobileOgImage || "",
            bxhConsoleOgImage: settings?.bxhConsoleOgImage || "",
            bxhTeamsOgImage: settings?.bxhTeamsOgImage || "",
        });
    } catch (error) {
        console.error("Get SEO settings error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

export async function PUT(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ["manager", "admin"]);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const body = await req.json();

        const updates: any = {};
        if (body.bxhMobileOgImage !== undefined) updates.bxhMobileOgImage = body.bxhMobileOgImage;
        if (body.bxhConsoleOgImage !== undefined) updates.bxhConsoleOgImage = body.bxhConsoleOgImage;
        if (body.bxhTeamsOgImage !== undefined) updates.bxhTeamsOgImage = body.bxhTeamsOgImage;

        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.create(updates);
        } else {
            Object.assign(settings, updates);
            await settings.save();
        }

        return apiResponse(settings, 200, "Đã lưu cài đặt SEO thành công");
    } catch (error) {
        console.error("Update SEO settings error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
