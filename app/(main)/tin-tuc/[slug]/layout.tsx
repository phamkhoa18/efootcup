import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAbsoluteUrl(url: string, siteUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
    params,
}: {
    params: { slug: string };
}): Promise<Metadata> {
    try {
        const { slug } = await params;
        const [siteSettings] = await Promise.all([getSiteSettings(), dbConnect()]);
        const siteUrl = siteSettings.siteUrl || "https://efootball.vn";

        const post = await Post.findOne({ slug, status: "published" })
            .select("title excerpt content coverImage tags category author publishedAt createdAt")
            .populate("author", "name")
            .lean();

        if (!post) {
            return {
                title: "Bài viết không tồn tại",
            };
        }

        const p = post as any;
        const title = p.title;
        const description = p.excerpt
            ? p.excerpt.substring(0, 160)
            : p.content
                ? stripHtml(p.content).substring(0, 160)
                : `Đọc bài viết "${p.title}" trên ${siteSettings.siteName}.`;

        const rawImage = p.coverImage || siteSettings.ogImage || "/assets/efootball_bg.webp";
        const imageUrl = toAbsoluteUrl(rawImage, siteUrl);
        const pageUrl = `${siteUrl}/tin-tuc/${slug}`;

        const keywords = [
            ...(p.tags || []),
            "eFootball",
            "tin tức",
            siteSettings.siteName,
        ];

        return {
            title,
            description,
            keywords,
            authors: p.author?.name ? [{ name: p.author.name }] : undefined,
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
                        alt: title,
                    },
                ],
                locale: "vi_VN",
                type: "article",
                publishedTime: p.publishedAt || p.createdAt,
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                images: [imageUrl],
            },
        };
    } catch (error) {
        console.error("Post metadata error:", error);
        return {
            title: "Tin tức",
        };
    }
}

export default function PostDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
