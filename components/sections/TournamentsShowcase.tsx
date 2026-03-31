"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
    Gamepad2,
    CreditCard,
    MapPin,
    Loader2,
} from "lucide-react";

const statusConfig: Record<string, { label: string; icon: typeof Flame; bgClass: string }> = {
    registration: { label: "Đăng ký", icon: Clock, bgClass: "bg-amber-400 text-amber-900 border-transparent" },
    ongoing: { label: "Đang diễn ra", icon: Flame, bgClass: "bg-red-500 text-white border-transparent" },
    completed: { label: "Đã kết thúc", icon: CheckCircle2, bgClass: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    draft: { label: "Nháp", icon: Clock, bgClass: "bg-gray-200 text-gray-600 border-transparent" },
    cancelled: { label: "Đã hủy", icon: Clock, bgClass: "bg-red-100 text-red-600 border-transparent" },
};

const formatLabels: Record<string, string> = {
    single_elimination: "Loại trực tiếp",
    double_elimination: "Loại kép",
    round_robin: "Vòng tròn",
    swiss: "Swiss System",
    group_stage: "Vòng bảng",
};

export function TournamentsShowcase() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tournaments?limit=3&sort=-createdAt")
            .then((r) => r.json())
            .then((data) => {
                if (data.success) {
                    setTournaments(data.data?.tournaments || []);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

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
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="text-center py-16">
                        <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Chưa có giải đấu nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {tournaments.map((t, i) => {
                            const stCfg = statusConfig[t.status] || statusConfig.draft;
                            const StatusIcon = stCfg.icon;
                            const prizeTotal = t.prize?.total;
                            const prizeStr = typeof prizeTotal === "number"
                                ? `${prizeTotal.toLocaleString("vi-VN")} ₫`
                                : prizeTotal || "—";

                            return (
                                <motion.div
                                    key={t._id}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                >
                                    <Link href={`/giai-dau/${t._id}`} className="block group">
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-400">
                                            {/* Image */}
                                            <div className="relative h-48 overflow-hidden">
                                                <Image
                                                    src={t.banner || t.thumbnail || "/assets/efootball_bg.webp"}
                                                    alt={t.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                                                {/* Status Badge */}
                                                <div className="absolute top-3.5 left-3.5">
                                                    <Badge className={`${stCfg.bgClass} border font-semibold text-[11px] px-2.5 py-0.5 shadow-sm`}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {stCfg.label}
                                                    </Badge>
                                                </div>

                                                {/* Teams count overlay */}
                                                <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                                                    <Users className="w-3 h-3 text-white/70" />
                                                    <span className="text-[11px] text-white font-medium">{t.currentTeams || 0}/{t.maxTeams || 0}</span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5">
                                                <h3 className="text-[16px] font-semibold text-efb-dark mb-3.5 group-hover:text-efb-blue transition-colors duration-200 line-clamp-1">
                                                    {t.title}
                                                </h3>

                                                <div className="space-y-2.5">
                                                    {[
                                                        { icon: Gamepad2, label: "Thể thức", value: `${t.teamSize >= 2 ? '2vs2' : '1vs1'} - ${formatLabels[t.format] || t.format}` },
                                                        { icon: Calendar, label: "Thời gian", value: `${formatDate(t.schedule?.tournamentStart)} - ${formatDate(t.schedule?.tournamentEnd)}` },
                                                        { icon: MapPin, label: "Hình thức", value: t.isOnline ? "Online" : (t.location || "Offline") },
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

                                                {/* Prize + Fee */}
                                                <div className="mt-4 pt-3.5 border-t border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-[11px] text-efb-text-muted font-medium">Giải thưởng</span>
                                                        </div>
                                                        <span className="text-gradient font-semibold text-[15px]">
                                                            {prizeStr}
                                                        </span>
                                                    </div>
                                                    {t.entryFee > 0 && (
                                                        <div className="flex items-center justify-between mt-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span className="text-[11px] text-efb-text-muted font-medium">Lệ phí</span>
                                                            </div>
                                                            <span className="text-[13px] text-emerald-600 font-medium">
                                                                {Number(t.entryFee).toLocaleString("vi-VN")} ₫
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
