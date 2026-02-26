import { Metadata } from "next";
import { notFound } from "next/navigation";
import TournamentDetailClient from "./TournamentDetailClient";

// Force dynamic since we have real-time views and updates
export const revalidate = 60; // Revalidate every minute

async function getTournamentData(id: string) {
    // Determine the base URL for server-side fetching.
    // Relative URLs don't work in server components, so we must be absolute.
    const port = process.env.PORT || "3000";
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;

    // We try local addresses first because they are most reliable for server-to-self communication
    const localUrls = [
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
        "http://127.0.0.1:3333", // Fallback for common deployment ports
        "http://localhost:3333"
    ];

    // If there's an environment variable, we consider it too (usually at the end as external DNS might fail on server)
    if (envUrl) {
        localUrls.unshift(envUrl); // Try the configured one first if user provided it
    }

    for (const baseUrl of localUrls) {
        try {
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const res = await fetch(`${cleanBaseUrl}/api/tournaments/${id}`, {
                next: { revalidate: 60 },
                signal: AbortSignal.timeout(2000)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) return data.data;
            }
        } catch (error) {
            // Silently fail and try next URL unless it's the last one
            if (baseUrl === localUrls[localUrls.length - 1] && !envUrl) {
                console.error("Failed to fetch tournament data from all local addresses.");
            }
        }
    }

    return null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { id } = await params;
    const data = await getTournamentData(id);

    if (!data || !data.tournament) {
        return {
            title: "Không tìm thấy giải đấu",
        };
    }

    const t = data.tournament;
    const description = t.description
        ? t.description.substring(0, 160)
        : `Tham gia giải đấu ${t.title} trên eFootCup VN. ${t.maxTeams} đội, giải thưởng ${t.prize?.total || "hấp dẫn"}.`;

    return {
        title: t.title,
        description: description,
        openGraph: {
            title: t.title,
            description: description,
            images: [t.banner || t.thumbnail || "/assets/efootball_bg.webp"],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t.title,
            description: description,
            images: [t.banner || t.thumbnail || "/assets/efootball_bg.webp"],
        },
    };
}

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const data = await getTournamentData(id);

    if (!data || !data.tournament) {
        return notFound();
    }

    return <TournamentDetailClient initialData={data} id={id} />;
}
