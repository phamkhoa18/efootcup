"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Trophy,
    Users,
    Calendar,
    Search,
    Flame,
    Clock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List,
    ArrowUpDown,
    Loader2,
    Eye,
    Globe,
    MapPin,
    Ban,
    Wallet,
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";

const statusConfig: Record<string, { label: string; icon: typeof Flame; bgClass: string }> = {
    registration: { label: "Đang mở ĐK", icon: Clock, bgClass: "bg-amber-400 text-amber-900 border-transparent" },
    ongoing: { label: "Đang diễn ra", icon: Flame, bgClass: "bg-red-500 text-white border-transparent" },
    completed: { label: "Đã kết thúc", icon: CheckCircle2, bgClass: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    draft: { label: "Nháp", icon: Clock, bgClass: "bg-gray-100 text-gray-500 border-gray-200" },
    cancelled: { label: "Đã hủy", icon: Ban, bgClass: "bg-red-50 text-red-500 border-red-200" },
};

const formatLabels: Record<string, string> = {
    single_elimination: "Loại trực tiếp",
    double_elimination: "Loại kép",
    round_robin: "Vòng tròn",
    swiss: "Swiss System",
    group_stage: "Vòng bảng",
};

const filterTabs = [
    { key: "all", label: "Tất cả" },
    { key: "ongoing", label: "Đang diễn ra" },
    { key: "registration", label: "Đang mở ĐK" },
    { key: "completed", label: "Đã kết thúc" },
];

const sortOptions = [
    { key: "-createdAt", label: "Mới nhất" },
    { key: "createdAt", label: "Cũ nhất" },
    { key: "-views", label: "Nhiều lượt xem" },
    { key: "-currentTeams", label: "Nhiều đội nhất" },
];

const ITEMS_PER_PAGE = 9;

function TournamentListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlStatus = searchParams.get("status") || "all";
    const urlSearch = searchParams.get("q") || "";
    const urlSort = searchParams.get("sort") || "-createdAt";
    const urlFormat = searchParams.get("format") || "";

    const [tournaments, setTournaments] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchInput, setSearchInput] = useState(urlSearch);
    const [showSort, setShowSort] = useState(false);

    const updateURL = useCallback((updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value && value !== "all" && value !== "" && value !== "1" && key !== "page") {
                params.set(key, value);
            } else if (key === "page" && value !== "1") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        if (!("page" in updates)) params.delete("page");
        router.push(`/giai-dau?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const apiParams: Record<string, string> = {
                    page: String(urlPage),
                    limit: String(ITEMS_PER_PAGE),
                    sort: urlSort,
                };
                if (urlStatus !== "all") apiParams.status = urlStatus;
                if (urlSearch) apiParams.search = urlSearch;
                if (urlFormat) apiParams.format = urlFormat;
                const res = await tournamentAPI.getAll(apiParams);
                if (res.success) {
                    setTournaments(res.data.tournaments || []);
                    setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
                }
            } catch (error) {
                console.error("Failed to load tournaments:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [urlPage, urlStatus, urlSearch, urlSort, urlFormat]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== urlSearch) updateURL({ q: searchInput });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const goToPage = (p: number) => {
        updateURL({ page: String(p) });
        window.scrollTo({ top: 280, behavior: "smooth" });
    };

    const pageNumbers = (() => {
        const pages: (number | "...")[] = [];
        const tp = pagination.totalPages;
        const cp = urlPage;
        if (tp <= 7) {
            for (let i = 1; i <= tp; i++) pages.push(i);
        } else {
            pages.push(1);
            if (cp > 3) pages.push("...");
            for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
            if (cp < tp - 2) pages.push("...");
            pages.push(tp);
        }
        return pages;
    })();

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    return (
        <>
            <section className="relative pt-28 pb-14 overflow-hidden">
                <div className="absolute inset-0">
                    <Image src="/assets/efootball_bg_cl2.webp" alt="" fill className="object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A3D91]/70 via-[#1E40AF]/50 to-white" />
                </div>
                <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10 text-white">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-efb-yellow text-xs font-bold uppercase mb-4 backdrop-blur-sm"><Trophy className="w-3 h-3" />Giải đấu</span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight leading-tight mb-3">Danh sách <span className="font-bold text-efb-yellow">giải đấu</span></h1>
                        <p className="text-white/60 text-lg font-light max-w-lg">Khám phá và tham gia các giải đấu eFootball đang diễn ra trên toàn quốc</p>
                    </motion.div>
                </div>
            </section>

            <section className="pb-20 bg-white">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 -mt-6 relative z-10">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input placeholder="Tìm kiếm giải đấu..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10 h-11 rounded-xl border-gray-200 bg-gray-50/50" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                {filterTabs.map((tab) => (
                                    <button key={tab.key} onClick={() => updateURL({ status: tab.key })} className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${urlStatus === tab.key ? "bg-white text-efb-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-gray-400">{isLoading ? "Đang tải..." : `Hiển thị ${tournaments.length} / ${pagination.total} giải đấu`}</p>
                        <div className="relative">
                            <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-efb-blue transition-colors">
                                <ArrowUpDown className="w-3.5 h-3.5" /> {sortOptions.find(s => s.key === urlSort)?.label || "Mới nhất"}
                            </button>
                            {showSort && (
                                <div className="absolute right-0 top-full mt-2 w-44 bg-white border rounded-xl shadow-lg z-20 p-1">
                                    {sortOptions.map(opt => (
                                        <button key={opt.key} onClick={() => { updateURL({ sort: opt.key }); setShowSort(false); }} className={`w-full text-left px-3 py-2 text-xs rounded-lg ${urlSort === opt.key ? "bg-blue-50 text-efb-blue font-bold" : "hover:bg-gray-50"}`}>{opt.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tournaments.map((t, i) => {
                                const cfg = statusConfig[t.status] || statusConfig.draft;
                                const StatusIcon = cfg.icon;
                                return (
                                    <motion.div key={t._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                        <Link href={`/giai-dau/${t._id}`} className="block group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                                            <div className="relative h-44 overflow-hidden">
                                                <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: `url(${t.banner || t.thumbnail || "/assets/efootball_bg.webp"})` }} />
                                                <Badge className={`absolute top-4 left-4 ${cfg.bgClass}`}><StatusIcon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                                            </div>
                                            <div className="p-5">
                                                <h3 className="font-bold mb-3 group-hover:text-efb-blue transition-colors">{t.title}</h3>
                                                <div className="space-y-2 text-sm text-gray-500">
                                                    <div className="flex justify-between"><span>Thể thức</span><span className="font-medium text-gray-700">{t.teamSize >= 2 ? '2vs2' : '1vs1'} - {formatLabels[t.format] || t.format}</span></div>
                                                    <div className="flex justify-between"><span>Đội</span><span className="font-medium text-gray-700">{t.currentTeams || 0}/{t.maxTeams}</span></div>
                                                    <div className="flex justify-between"><span>Giải thưởng</span><span className="font-bold text-gradient">{t.prize?.total || "0 VNĐ"}</span></div>
                                                    <div className="flex justify-between items-center border-t border-dashed border-gray-100 pt-2 mt-1">
                                                        <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-gray-400" />Phí tham gia</span>
                                                        {t.entryFee > 0 ? (
                                                            <span className="font-bold text-amber-600">{Number(t.entryFee).toLocaleString("vi-VN")} {t.currency || "VNĐ"}</span>
                                                        ) : (
                                                            <span className="font-bold text-emerald-500">Miễn phí</span>
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

                    {/* Empty state */}
                    {!isLoading && tournaments.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
                                <Trophy className="w-9 h-9 text-gray-200" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1.5">Không tìm thấy giải đấu</h3>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto">
                                {urlSearch ? `Không có kết quả cho "${urlSearch}"` : "Hiện chưa có giải đấu nào ở trạng thái này"}
                            </p>
                            {(urlSearch || urlStatus !== "all") && (
                                <Button variant="outline" className="mt-5 rounded-xl" onClick={() => { setSearchInput(""); updateURL({ status: "all", q: "" }); }}>
                                    Xóa bộ lọc
                                </Button>
                            )}
                        </motion.div>
                    )}                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="mt-14 flex flex-col items-center gap-4">
                            {/* Page info */}
                            <p className="text-xs text-gray-400 font-medium tracking-wide">
                                Trang <span className="text-gray-700 font-bold">{urlPage}</span> / <span className="text-gray-700 font-bold">{pagination.totalPages}</span>
                                <span className="mx-2 text-gray-200">•</span>
                                <span>{pagination.total} giải đấu</span>
                            </p>

                            {/* Pagination controls */}
                            <nav className="flex items-center gap-1.5" aria-label="Phân trang">
                                {/* First page */}
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={urlPage === 1}
                                    className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-efb-blue hover:border-efb-blue hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-all duration-200"
                                    aria-label="Trang đầu"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 18l-6-6 6-6M12.5 18l-6-6 6-6" /></svg>
                                </button>

                                {/* Previous */}
                                <button
                                    onClick={() => goToPage(urlPage - 1)}
                                    disabled={urlPage === 1}
                                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:text-efb-blue hover:border-efb-blue hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-all duration-200"
                                    aria-label="Trang trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Trước</span>
                                </button>

                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {pageNumbers.map((p, i) =>
                                        p === "..." ? (
                                            <span key={`dots-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-300 text-sm select-none">•••</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => goToPage(p as number)}
                                                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${p === urlPage
                                                    ? "bg-gradient-to-br from-efb-blue to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                                                    : "text-gray-500 hover:text-efb-blue hover:bg-blue-50 border border-transparent hover:border-blue-200"
                                                    }`}
                                                aria-current={p === urlPage ? "page" : undefined}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                </div>

                                {/* Next */}
                                <button
                                    onClick={() => goToPage(urlPage + 1)}
                                    disabled={urlPage === pagination.totalPages}
                                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:text-efb-blue hover:border-efb-blue hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-all duration-200"
                                    aria-label="Trang sau"
                                >
                                    <span className="hidden sm:inline">Sau</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                {/* Last page */}
                                <button
                                    onClick={() => goToPage(pagination.totalPages)}
                                    disabled={urlPage === pagination.totalPages}
                                    className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-efb-blue hover:border-efb-blue hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-all duration-200"
                                    aria-label="Trang cuối"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 18l6-6-6-6M11.5 18l6-6-6-6" /></svg>
                                </button>
                            </nav>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

export default function TournamentsClient() {
    return (
        <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-efb-blue" /></div>}>
            <TournamentListContent />
        </Suspense>
    );
}
