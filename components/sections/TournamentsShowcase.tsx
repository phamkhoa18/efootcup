"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Trophy,
    Users,
    Calendar,
    ArrowRight,
    Flame,
    Clock,
    CheckCircle2,
    Sparkles,
} from "lucide-react";

const tournaments = [
    {
        id: 1,
        title: "eFootball Cup VN Season 5",
        status: "live",
        statusLabel: "Đang diễn ra",
        format: "Loại trực tiếp",
        teams: 32,
        prize: "10,000,000 VNĐ",
        date: "15/03 - 30/03/2026",
        image: "/assets/efootball_bg.webp",
    },
    {
        id: 2,
        title: "Saigon eFootball League",
        status: "upcoming",
        statusLabel: "Sắp diễn ra",
        format: "Vòng tròn + Playoff",
        teams: 16,
        prize: "5,000,000 VNĐ",
        date: "01/04 - 15/04/2026",
        image: "/assets/efootball_bg_cl2.webp",
    },
    {
        id: 3,
        title: "University Cup 2026",
        status: "completed",
        statusLabel: "Đã kết thúc",
        format: "Chia bảng",
        teams: 24,
        prize: "8,000,000 VNĐ",
        date: "01/02 - 28/02/2026",
        image: "/assets/efootball_bg.webp",
    },
];

const statusConfig: Record<string, { icon: typeof Flame; bgClass: string }> = {
    live: { icon: Flame, bgClass: "bg-red-500 text-white border-transparent" },
    upcoming: { icon: Clock, bgClass: "bg-amber-400 text-amber-900 border-transparent" },
    completed: { icon: CheckCircle2, bgClass: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

export function TournamentsShowcase() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} className="py-20 lg:py-28 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/80 relative overflow-hidden">
            {/* Decorations */}
            <div className="absolute top-0 right-[10%] w-52 h-52 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-[8%] w-48 h-48 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold tracking-wider uppercase mb-5">
                            <Sparkles className="w-3 h-3" />
                            Nổi bật
                        </span>
                        <h2 className="text-[32px] sm:text-[40px] lg:text-[52px] font-extralight text-efb-dark leading-tight tracking-tight">
                            Giải đấu
                            <br />
                            <span className="text-gradient-warm font-medium">nổi bật</span>
                        </h2>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        <Button
                            variant="outline"
                            className="border-gray-200 text-efb-text-secondary hover:text-efb-blue hover:border-blue-200 font-medium rounded-xl group"
                            asChild
                        >
                            <Link href="/giai-dau">
                                Xem tất cả
                                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </Button>
                    </motion.div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tournaments.map((t, i) => {
                        const statusCfg = statusConfig[t.status];
                        const StatusIcon = statusCfg.icon;

                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: 24 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                            >
                                <Link href={`/giai-dau/${t.id}`} className="block group">
                                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-400">
                                        {/* Image */}
                                        <div className="relative h-48 overflow-hidden">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${t.image})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                                            {/* Status Badge */}
                                            <div className="absolute top-3.5 left-3.5">
                                                <Badge className={`${statusCfg.bgClass} border font-semibold text-[11px] px-2.5 py-0.5 shadow-sm`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {t.statusLabel}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            <h3 className="text-[16px] font-semibold text-efb-dark mb-3.5 group-hover:text-efb-blue transition-colors duration-200">
                                                {t.title}
                                            </h3>

                                            <div className="space-y-2.5">
                                                {[
                                                    { icon: Trophy, label: "Thể thức", value: t.format },
                                                    { icon: Users, label: "Đội", value: `${t.teams} đội` },
                                                    { icon: Calendar, label: "Thời gian", value: t.date },
                                                ].map((item) => (
                                                    <div key={item.label} className="flex items-center justify-between text-[13px]">
                                                        <span className="text-efb-text-muted flex items-center gap-1.5">
                                                            <item.icon className="w-3.5 h-3.5" />
                                                            {item.label}
                                                        </span>
                                                        <span className="text-efb-text-secondary font-medium">
                                                            {item.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Prize */}
                                            <div className="mt-4 pt-3.5 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-efb-text-muted uppercase tracking-wider font-medium">
                                                        Giải thưởng
                                                    </span>
                                                    <span className="text-gradient font-bold text-[17px]">
                                                        {t.prize}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
