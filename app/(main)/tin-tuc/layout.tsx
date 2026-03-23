import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

// Force dynamic so SEO changes take effect immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAbsoluteUrl(url: string, siteUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export async function generateMetadata(): Promise<Metadata> {
    const s = await getSiteSettings();
    const siteUrl = s.siteUrl || "https://efootball.vn";
    const title = "Tin tức eFootball - Cập nhật mới nhất";
    const description = "Cập nhật tin tức eFootball mới nhất, hướng dẫn chiến thuật, thông báo giải đấu và mọi thông tin về cộng đồng eFootball Việt Nam.";
    const imageUrl = toAbsoluteUrl(s.ogImage || "/assets/efootball_bg.webp", siteUrl);

    return {
        title,
        description,
        keywords: ["tin tức eFootball", "eFootball Vietnam", "giải đấu", "esports", "PES", "cập nhật"],
        openGraph: {
            title,
            description,
            url: `${siteUrl}/tin-tuc`,
            siteName: s.siteName,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            locale: "vi_VN",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default function TinTucLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
