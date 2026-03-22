import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
    const s = await getSiteSettings();
    const title = "Bảng Xếp Hạng Mobile - Vietnam Efootball Rankings";
    const description = "Bảng xếp hạng quốc gia các VĐV bộ môn eFootball Mobile Việt Nam. Tra cứu điểm số, thứ hạng và lịch sử thi đấu của các vận động viên xuất sắc nhất.";
    const imageUrl = s.bxhMobileOgImage || "/assets/seo-bxh-mobile.jpg";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${s.siteUrl || "https://efootball.vn"}/bxh`,
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

export default function BXHMobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
