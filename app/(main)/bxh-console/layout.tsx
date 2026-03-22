import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
    const s = await getSiteSettings();
    const title = "Bảng Xếp Hạng Console - Vietnam Efootball Rankings";
    const description = "Bảng xếp hạng quốc gia các VĐV bộ môn eFootball Console/PC Việt Nam. Tra cứu thông tin, điểm số và thứ hạng của các VĐV hàng đầu.";
    const imageUrl = s.bxhConsoleOgImage || "/assets/seo-bxh-console.jpg";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${s.siteUrl || "https://efootball.vn"}/bxh-console`,
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

export default function BXHConsoleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
