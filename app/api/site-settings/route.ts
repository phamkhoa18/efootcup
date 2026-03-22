import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";

/**
 * GET /api/site-settings — Public API to fetch site settings.
 * Returns only public-safe fields (no SMTP passwords, no admin-only configs).
 * Used by Navbar, Footer, and metadata generation.
 * Cached for 60 seconds via CDN/browser cache.
 */
export async function GET() {
    try {
        await dbConnect();
        let settings = await SiteSettings.findOne().lean();
        if (!settings) {
            settings = await SiteSettings.create({});
            settings = settings.toObject();
        }

        // Return only public-safe fields
        const s = settings as any;
        const publicSettings = {
            // Website Identity
            siteName: s.siteName || "EFV CUP Vietnam",
            siteTagline: s.siteTagline || "",
            siteDescription: s.siteDescription || "",
            siteUrl: s.siteUrl || "",

            // Branding
            logo: s.logo || "",
            logoDark: s.logoDark || "",
            favicon: s.favicon || "",
            appleTouchIcon: s.appleTouchIcon || "",
            ogImage: s.ogImage || "/assets/efootball_bg.webp",

            // SEO
            seoTitle: s.seoTitle || "",
            seoDescription: s.seoDescription || "",
            seoKeywords: s.seoKeywords || [],

            // Social Media
            socialFacebook: s.socialFacebook || "",
            socialYoutube: s.socialYoutube || "",
            socialTiktok: s.socialTiktok || "",
            socialDiscord: s.socialDiscord || "",
            socialTwitter: s.socialTwitter || "",
            socialInstagram: s.socialInstagram || "",
            socialTelegram: s.socialTelegram || "",

            // Contact
            contactEmail: s.contactEmail || "",
            contactPhone: s.contactPhone || "",
            contactAddress: s.contactAddress || "",

            // Public Advanced
            copyrightText: s.copyrightText || "",
            maintenanceMode: s.maintenanceMode || false,
        };

        return NextResponse.json(
            { success: true, data: publicSettings },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
                },
            }
        );
    } catch (error) {
        console.error("Public site settings error:", error);
        return NextResponse.json(
            { success: false, message: "Internal error" },
            { status: 500 }
        );
    }
}
