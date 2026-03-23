import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import TournamentsClient from "./TournamentsClient";

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
    const title = "Danh sách giải đấu eFootball";
    const description = "Khám phá các giải đấu eFootball chuyên nghiệp, nghiệp dư và các sự kiện cộng đồng tại Việt Nam. Tham gia thi đấu để nhận giải thưởng và leo bảng xếp hạng.";
    const imageUrl = toAbsoluteUrl(s.ogImage || "/assets/efootball_bg.webp", siteUrl);

    return {
        title,
        description,
        keywords: ["giải đấu eFootball", "eFootball Vietnam", "esports", "tournament", "thi đấu"],
        openGraph: {
            title: `${title} | ${s.siteName}`,
            description,
            url: `${siteUrl}/giai-dau`,
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

export default function GiaiDauPage() {
    return <TournamentsClient />;
}

