import { Metadata } from "next";
import { notFound } from "next/navigation";
import TournamentDetailClient from "./TournamentDetailClient";

// Force dynamic since we have real-time views and updates
export const revalidate = 60; // Revalidate every minute

async function getTournamentData(id: string) {
    try {
        // Use full URL for server-side fetching in App Router
        // In local development, process.env.NEXT_PUBLIC_APP_URL might not be set
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const res = await fetch(`${baseUrl}/api/tournaments/${id}`, {
            next: { revalidate: 60 }
        });

        if (!res.ok) {
            // Fallback to absolute production URL if localhost fails (unlikely to help if local DNS is broken, but safer)
            if (baseUrl.includes('localhost')) {
                const prodRes = await fetch(`https://efootcup.efootball.vn/api/tournaments/${id}`, { next: { revalidate: 60 } });
                if (prodRes.ok) {
                    const data = await prodRes.json();
                    return data.success ? data.data : null;
                }
            }
            return null;
        }

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error("Fetch tournament data error:", error);

        // Final fallback: if localhost failed, try the production one once
        try {
            const prodRes = await fetch(`https://efootcup.efootball.vn/api/tournaments/${id}`, { next: { revalidate: 60 } });
            if (prodRes.ok) {
                const data = await prodRes.json();
                return data.success ? data.data : null;
            }
        } catch (e) { }

        return null;
    }
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
