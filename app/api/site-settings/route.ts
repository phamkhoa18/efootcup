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
        const publicSettings = {
            // Website Identity
            siteName: settings.siteName || "eFootCup Vietnam",
            siteTagline: settings.siteTagline || "",
            siteDescription: settings.siteDescription || "",
            siteUrl: settings.siteUrl || "",

            // Branding
            logo: settings.logo || "",
            logoDark: settings.logoDark || "",
            favicon: settings.favicon || "",
            appleTouchIcon: settings.appleTouchIcon || "",
            ogImage: settings.ogImage || "/assets/efootball_bg.webp",

            // SEO
            seoTitle: settings.seoTitle || "",
            seoDescription: settings.seoDescription || "",
            seoKeywords: settings.seoKeywords || [],

            // Social Media
            socialFacebook: settings.socialFacebook || "",
            socialYoutube: settings.socialYoutube || "",
            socialTiktok: settings.socialTiktok || "",
            socialDiscord: settings.socialDiscord || "",
            socialTwitter: settings.socialTwitter || "",
            socialInstagram: settings.socialInstagram || "",
            socialTelegram: settings.socialTelegram || "",

            // Contact
            contactEmail: settings.contactEmail || "",
            contactPhone: settings.contactPhone || "",
            contactAddress: settings.contactAddress || "",

            // Public Advanced
            copyrightText: settings.copyrightText || "",
            maintenanceMode: settings.maintenanceMode || false,
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
