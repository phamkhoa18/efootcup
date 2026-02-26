import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Base URL for links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Base pages
    const routes = [
        '',
        '/giai-dau',
        '/bxh',
        '/dang-nhap',
        '/dang-ky',
    ].map((route) => ({
        url: `${cleanBaseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    try {
        // Fetch all tournaments for sitemap
        const res = await fetch(`${baseUrl}/api/tournaments?limit=100`);
        const data = await res.json();

        if (data.success && data.data.tournaments) {
            const tournamentRoutes = data.data.tournaments.map((t: any) => ({
                url: `${baseUrl}/giai-dau/${t._id}`,
                lastModified: new Date(t.updatedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }));
            return [...routes, ...tournamentRoutes];
        }
    } catch (e) {
        console.error("Sitemap generation error:", e);
    }

    return routes;
}
