import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

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
    const title = "Bảng Xếp Hạng 2v2 - Vietnam Efootball Rankings";
    const description = "Bảng xếp hạng quốc gia thể thức 2v2 bộ môn eFootball Việt Nam. Tra cứu điểm số, thứ hạng của các đội thi đấu xuất sắc nhất.";
    const rawImage = s.bxhMobileOgImage || s.ogImage || "/assets/efootball_bg.webp";
    const imageUrl = toAbsoluteUrl(rawImage, siteUrl);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${siteUrl}/bxh-2v2`,
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

export default function BXH2v2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
