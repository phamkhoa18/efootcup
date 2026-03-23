import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAbsoluteUrl(url: string, siteUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export async function generateMetadata({
    params,
}: {
    params: { id: string };
}): Promise<Metadata> {
    try {
        const { id } = await params;
        const [siteSettings] = await Promise.all([getSiteSettings(), dbConnect()]);
        const siteUrl = siteSettings.siteUrl || "https://efootball.vn";

        const user = await User.findById(id)
            .select("name nickname teamName avatar efvId")
            .lean();

        if (!user) {
            return {
                title: "Người chơi không tồn tại",
            };
        }

        const u = user as any;
        const displayName = u.nickname ? `${u.name} "${u.nickname}"` : u.name;
        const title = `${displayName} - Hồ sơ VĐV`;
        const description = u.teamName
            ? `Xem hồ sơ của ${displayName} (${u.teamName}) - EFV ID #${u.efvId} trên ${siteSettings.siteName}. Thống kê thi đấu, điểm EFV và lịch sử giải đấu.`
            : `Xem hồ sơ của ${displayName} - EFV ID #${u.efvId} trên ${siteSettings.siteName}. Thống kê thi đấu, điểm EFV và lịch sử giải đấu.`;

        const rawImage = u.avatar || siteSettings.ogImage || "/assets/efootball_bg.webp";
        const imageUrl = toAbsoluteUrl(rawImage, siteUrl);
        const pageUrl = `${siteUrl}/profile/${id}`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                url: pageUrl,
                siteName: siteSettings.siteName,
                images: [
                    {
                        url: imageUrl,
                        width: 1200,
                        height: 630,
                        alt: displayName,
                    },
                ],
                locale: "vi_VN",
                type: "profile",
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error("Profile metadata error:", error);
        return {
            title: "Hồ sơ VĐV",
        };
    }
}

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
