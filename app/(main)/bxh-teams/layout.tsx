import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
    const s = await getSiteSettings();
    const title = "Bảng Xếp Hạng Đội Tuyển - Vietnam Efootball Rankings";
    const description = "Bảng xếp hạng top các đội tuyển (teams) bộ môn eFootball Việt Nam. Khám phá thành tích, điểm số và thông tin các câu lạc bộ eFootball xuất sắc.";
    const imageUrl = s.bxhTeamsOgImage || "/assets/seo-bxh-teams.jpg";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${s.siteUrl || "https://efootball.vn"}/bxh-teams`,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
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

export default function BXHTeamsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
