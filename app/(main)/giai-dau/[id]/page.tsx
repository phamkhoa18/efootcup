import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import TournamentDetailClient from "./TournamentDetailClient";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Tournament from "@/models/Tournament";
import Match from "@/models/Match";
import Team from "@/models/Team";
import Registration from "@/models/Registration";

// Force dynamic so SEO always reflects latest tournament data
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAbsoluteUrl(url: string, siteUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

async function getTournamentData(id: string) {
    try {
        await dbConnect();

        // id có thể là ObjectId hoặc slug (vd: "efv500-efootball-mobile-season-1-mmyxvppv")
        const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
        const tournament = await Tournament.findOne(query)
            .populate("createdBy", "name email avatar")
            .lean();
        if (!tournament) return null;

        // Dùng ObjectId thực từ tournament, không dùng id gốc (có thể là slug)
        const tournamentId = tournament._id;

        const [teams, registrations, matches] = await Promise.all([
            Team.find({ tournament: tournamentId })
                .populate("captain", "name avatar efvId gamerId personalPhoto")
                .sort({ "stats.points": -1, "stats.goalDifference": -1 })
                .lean(),
            Registration.find({ tournament: tournamentId })
                .populate("user", "name email avatar efvId")
                .sort({ createdAt: -1 })
                .lean(),
            Match.find({ tournament: tournamentId })
                .populate("homeTeam", "name shortName logo efvId seed")
                .populate("awayTeam", "name shortName logo efvId seed")
                .populate("winner", "name shortName")
                .sort({ round: 1, matchNumber: 1 })
                .lean(),
        ]);

        return {
            tournament,
            teams,
            registrations,
            matches,
            stats: {
                totalTeams: teams.length,
                totalMatches: matches.length,
                completedMatches: matches.filter((m) => m.status === "completed").length,
                pendingRegistrations: registrations.filter((r) => r.status === "pending").length,
                totalRegistrations: registrations.length,
            },
        };
    } catch (error) {
        console.error("Failed to fetch tournament data from DB:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { id } = await params;
    const [data, siteSettings] = await Promise.all([
        getTournamentData(id),
        getSiteSettings(),
    ]);

    if (!data || !data.tournament) {
        return {
            title: "Không tìm thấy giải đấu",
        };
    }

    const t = data.tournament;
    const siteUrl = siteSettings.siteUrl || "https://efootball.vn";

    const description = t.description
        ? t.description.replace(/<[^>]*>/g, "").substring(0, 160)
        : `Tham gia giải đấu ${t.title} trên ${siteSettings.siteName}. ${t.maxTeams} đội, giải thưởng ${t.prize?.total || "hấp dẫn"}.`;

    // Tournament image: banner → thumbnail → site ogImage → default
    const rawImage = t.banner || t.thumbnail || siteSettings.ogImage || "/assets/efootball_bg.webp";
    const imageUrl = toAbsoluteUrl(rawImage, siteUrl);
    const pageUrl = `${siteUrl}/giai-dau/${id}`;

    // Build keywords from tournament data
    const keywords = [
        t.title,
        "eFootball",
        "giải đấu",
        t.platform,
        t.mode === "mobile" ? "Mobile" : t.mode === "pc" ? "Console" : "",
        siteSettings.siteName,
        "esports",
        "Việt Nam",
    ].filter(Boolean);

    return {
        title: t.title,
        description,
        keywords,
        openGraph: {
            title: t.title,
            description,
            url: pageUrl,
            siteName: siteSettings.siteName,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: t.title,
                },
            ],
            locale: "vi_VN",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t.title,
            description,
            images: [imageUrl],
        },
    };
}

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const data = await getTournamentData(id);

    if (!data || !data.tournament) {
        return notFound();
    }

    return <TournamentDetailClient initialData={JSON.parse(JSON.stringify(data))} id={id} />;
}
