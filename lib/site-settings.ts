import dbConnect from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";

export interface PublicSiteSettings {
    siteName: string;
    siteTagline: string;
    siteDescription: string;
    siteUrl: string;
    logo: string;
    logoDark: string;
    favicon: string;
    appleTouchIcon: string;
    ogImage: string;
    bxhMobileOgImage?: string;
    bxhConsoleOgImage?: string;
    bxhTeamsOgImage?: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    socialFacebook: string;
    socialYoutube: string;
    socialTiktok: string;
    socialDiscord: string;
    socialTwitter: string;
    socialInstagram: string;
    socialTelegram: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    copyrightText: string;
    maintenanceMode: boolean;
    googleAnalyticsId: string;
    facebookPixelId: string;
    customHeadCode: string;
    customFooterCode: string;
}

// Default values
const defaults: PublicSiteSettings = {
    siteName: "Efootball Vietnam",
    siteTagline: "Nền tảng giải đấu eFootball hàng đầu Việt Nam",
    siteDescription: "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam.",
    siteUrl: "https://efootball.vn",
    logo: "",
    logoDark: "",
    favicon: "",
    appleTouchIcon: "",
    ogImage: "/assets/efootball_bg.webp",
    bxhMobileOgImage: "/assets/efootball_bg.webp",
    bxhConsoleOgImage: "/assets/efootball_bg.webp",
    bxhTeamsOgImage: "/assets/efootball_bg.webp",
    seoTitle: "eFootball VN - Tổ Chức Giải Đấu eFootball Chuyên Nghiệp",
    seoDescription: "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam. Kết nối đam mê, chinh phục giải đấu.",
    seoKeywords: ["eFootball", "giải đấu", "tournament", "esports", "Việt Nam"],
    socialFacebook: "",
    socialYoutube: "",
    socialTiktok: "",
    socialDiscord: "",
    socialTwitter: "",
    socialInstagram: "",
    socialTelegram: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    copyrightText: "© 2026 eFootball Cup VN. Mọi quyền được bảo lưu.",
    maintenanceMode: false,
    googleAnalyticsId: "",
    facebookPixelId: "",
    customHeadCode: "",
    customFooterCode: "",
};

/**
 * Fetch site settings from database (server-side only).
 * Used in generateMetadata and server components.
 * Returns defaults if DB is unavailable.
 */
export async function getSiteSettings(): Promise<PublicSiteSettings> {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne().lean();
        if (!settings) return defaults;

        return {
            siteName: settings.siteName || defaults.siteName,
            siteTagline: settings.siteTagline || defaults.siteTagline,
            siteDescription: settings.siteDescription || defaults.siteDescription,
            siteUrl: settings.siteUrl || defaults.siteUrl,
            logo: settings.logo || defaults.logo,
            logoDark: settings.logoDark || defaults.logoDark,
            favicon: settings.favicon || defaults.favicon,
            appleTouchIcon: settings.appleTouchIcon || defaults.appleTouchIcon,
            ogImage: settings.ogImage || defaults.ogImage,
            bxhMobileOgImage: settings.bxhMobileOgImage || defaults.bxhMobileOgImage,
            bxhConsoleOgImage: settings.bxhConsoleOgImage || defaults.bxhConsoleOgImage,
            bxhTeamsOgImage: settings.bxhTeamsOgImage || defaults.bxhTeamsOgImage,
            seoTitle: settings.seoTitle || defaults.seoTitle,
            seoDescription: settings.seoDescription || defaults.seoDescription,
            seoKeywords: settings.seoKeywords?.length ? settings.seoKeywords : defaults.seoKeywords,
            socialFacebook: settings.socialFacebook || "",
            socialYoutube: settings.socialYoutube || "",
            socialTiktok: settings.socialTiktok || "",
            socialDiscord: settings.socialDiscord || "",
            socialTwitter: settings.socialTwitter || "",
            socialInstagram: settings.socialInstagram || "",
            socialTelegram: settings.socialTelegram || "",
            contactEmail: settings.contactEmail || "",
            contactPhone: settings.contactPhone || "",
            contactAddress: settings.contactAddress || "",
            copyrightText: settings.copyrightText || defaults.copyrightText,
            maintenanceMode: settings.maintenanceMode || false,
            googleAnalyticsId: settings.googleAnalyticsId || "",
            facebookPixelId: settings.facebookPixelId || "",
            customHeadCode: settings.customHeadCode || "",
            customFooterCode: settings.customFooterCode || "",
        };
    } catch (error) {
        console.error("getSiteSettings error:", error);
        return defaults;
    }
}
