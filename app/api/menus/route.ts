import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import SiteMenu from "@/models/SiteMenu";
import { apiResponse, apiError } from "@/lib/auth";

// GET /api/menus?location=navbar — public endpoint to get menu by location
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const location = searchParams.get("location") || "navbar";

        const menu = await SiteMenu.findOne({ location });

        // Return only visible items
        const items = (menu?.items || [])
            .filter((item: any) => item.isVisible)
            .sort((a: any, b: any) => a.order - b.order)
            .map((item: any) => ({
                label: item.label,
                href: item.href,
                icon: item.icon || "",
                openInNewTab: item.openInNewTab || false,
                children: (item.children || [])
                    .filter((child: any) => child.isVisible)
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((child: any) => ({
                        label: child.label,
                        href: child.href,
                        icon: child.icon || "",
                        openInNewTab: child.openInNewTab || false,
                    })),
            }));

        return apiResponse({ items });
    } catch (error: any) {
        console.error("Get public menu error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
