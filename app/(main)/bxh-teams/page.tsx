"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Search, Trophy, Crown, Medal, ChevronLeft, ChevronRight,
    Users, Shield, Award, Loader2
} from "lucide-react";
import Image from "next/image";

type TeamEntry = {
    _id: string;
    rank: number;
    clubName: string;
    leader: string;
    point: number;
    logo: string;
};

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function BXHTeamsPage() {
    const toDirectImageUrl = (url: string): string => {
        if (!url) return url;
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
        if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
        const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
        if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
        return url;
    };
    const [allData, setAllData] = useState<TeamEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    useEffect(() => {
        fetch("/api/bxh-teams")
            .then((r) => r.json())
            .then((d) => {
                if (d.success !== false) {
                    const raw = d.data?.data || [];
                    const sorted = [...raw].sort((a: any, b: any) => (Number(b.point) || 0) - (Number(a.point) || 0));
                    sorted.forEach((t: any, i: number) => { t.rank = i + 1; });
                    setAllData(sorted);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!Array.isArray(allData)) return [];
        if (!search.trim()) return allData;
        const q = search.toLowerCase();
        return allData.filter((t) =>
            String(t.clubName).toLowerCase().includes(q) ||
            String(t.leader || "").toLowerCase().includes(q)
        );
    }, [search, allData]);

    const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / perPage));
    const currentPage = Math.min(page, totalPages);
    const paged = Array.isArray(filtered) ? filtered.slice((currentPage - 1) * perPage, currentPage * perPage) : [];
    const top3 = Array.isArray(allData) ? allData.slice(0, 3) : [];

    useEffect(() => { setPage(1); }, [search, perPage]);

    const pageRange = useMemo(() => {
        const range: number[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        for (let i = start; i <= end; i++) range.push(i);
        return range;
    }, [currentPage, totalPages]);

    return (
        <div className="overflow-x-hidden pt-16 bg-slate-50 min-h-screen">
            {/* ═══ HERO ═══ */}
            <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-40 overflow-hidden flex flex-col justify-center min-h-[450px]">
                <div className="absolute inset-0 bg-[#0f172a] pointer-events-none">
                    <Image
                        src="/assets/efootball_bg.webp"
                        alt="BXH Teams Background"
                        fill
                        className="object-cover opacity-30 object-[center_30%]"
                        priority
                        quality={100}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/60 via-[#0f172a]/85 to-slate-50" />
                    <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.04]" />
                    {/* Animated accent orbs */}
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
                </div>

                <div className="max-w-[1100px] mx-auto px-6 relative z-10 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-5 py-2 mb-6 font-bold text-[12px] md:text-[13px] tracking-[0.2em] uppercase border border-orange-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                        <Shield size={14} className="text-orange-500" /> BXH TEAMS
                    </div>
                    <h1 className="text-[clamp(36px,8vw,72px)] font-black mb-5 leading-[1.05] tracking-tight text-white drop-shadow-2xl">
                        Bảng Xếp Hạng <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-200 via-amber-400 to-orange-600 drop-shadow-none">Teams Rankings</span>
                    </h1>
                    <p className="text-slate-300 max-w-[650px] mx-auto text-[15px] sm:text-[17px] font-medium leading-relaxed drop-shadow-md">
                        {Array.isArray(allData) && allData.length > 0
                            ? `Bảng xếp hạng quy tụ ${allData.length} đội xuất sắc nhất hệ thống.`
                            : "Đang tải dữ liệu..."
                        }
                    </p>
                </div>
            </section>

            {/* ═══ TOP 3 PODIUM ═══ */}
            {!search.trim() && top3.length >= 3 && (
                <section className="pb-10 -mt-16 lg:-mt-24 relative z-20">
                    <div className="max-w-[960px] mx-auto px-4 sm:px-6">
                        <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
                            {[1, 0, 2].map((oi, vi) => {
                                const t = top3[oi];
                                const isFirst = oi === 0;
                                const isSecond = oi === 1;
                                const cardBg = isFirst
                                    ? "bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
                                    : "bg-gradient-to-br from-white via-slate-50 to-slate-100";
                                const textColor = isFirst ? "text-white" : "text-slate-800";
                                const subColor = isFirst ? "text-slate-300" : "text-slate-500";
                                const pointColor = isFirst ? "text-amber-400" : isSecond ? "text-slate-700" : "text-orange-600";
                                const borderColor = isFirst
                                    ? "border-amber-500/30 shadow-[0_12px_48px_rgba(245,158,11,0.25)]"
                                    : isSecond
                                    ? "border-slate-200 shadow-[0_8px_32px_rgba(100,116,139,0.15)]"
                                    : "border-orange-200/60 shadow-[0_8px_32px_rgba(234,88,12,0.12)]";
                                const rankBadge = isFirst
                                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                                    : isSecond
                                    ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                                    : "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
                                const height = isFirst ? "min-h-[240px] sm:min-h-[310px]" : "min-h-[200px] sm:min-h-[270px]";
                                return (
                                    <div key={oi} className={`${vi === 1 ? "order-2" : vi === 0 ? "order-1" : "order-3"}`}>
                                        <div className={`${cardBg} ${borderColor} ${height} border rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-between relative overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl duration-300 group`}>
                                            <div className={`absolute top-2 left-2 sm:top-3 sm:left-3 ${rankBadge} w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-[13px] sm:text-[16px] shadow-lg z-10`}>
                                                {oi + 1}
                                            </div>
                                            {isFirst && <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/15 rounded-full blur-[60px]" /></div>}
                                            <div className="mt-7 sm:mt-9 mb-3 sm:mb-4 relative z-10">
                                                {t.logo ? (
                                                    <img src={toDirectImageUrl(t.logo)} alt={t.clubName}
                                                        className={`${isFirst ? "w-16 h-16 sm:w-20 sm:h-20" : "w-14 h-14 sm:w-16 sm:h-16"} rounded-[6px] object-cover border-2 ${isFirst ? "border-amber-400/50" : "border-slate-200"} shadow-lg group-hover:scale-105 transition-transform duration-300`}
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : (
                                                    <div className={`${isFirst ? "w-16 h-16 sm:w-20 sm:h-20" : "w-14 h-14 sm:w-16 sm:h-16"} rounded-[6px] ${isFirst ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-200"} border-2 flex items-center justify-center`}>
                                                        <Shield className={`${isFirst ? "w-8 h-8 text-white/50" : "w-7 h-7 text-slate-300"}`} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center flex-1 flex flex-col justify-center relative z-10 w-full px-1">
                                                <h3 className={`font-extrabold ${isFirst ? "text-[12px] sm:text-[16px]" : "text-[11px] sm:text-[14px]"} ${textColor} leading-tight mb-1`} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                    {t.clubName}
                                                </h3>
                                                <p className={`text-[9px] sm:text-[11px] ${subColor} font-medium mb-2 sm:mb-3 truncate`}>
                                                    {t.leader}
                                                </p>
                                            </div>
                                            <div className="text-center relative z-10 pb-1">
                                                <div className={`font-black ${isFirst ? "text-2xl sm:text-4xl" : "text-xl sm:text-3xl"} ${pointColor} leading-none tracking-tight`}>
                                                    {String(t.point)}
                                                </div>
                                                <span className={`text-[7px] sm:text-[9px] ${subColor} font-bold tracking-[0.15em] uppercase mt-0.5 block`}>ĐIỂM</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ STATS + SEARCH ═══ */}
            <section className="pb-4 mt-6">
                <div className="max-w-[960px] mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:justify-center">
                        {[
                            { icon: Users, label: "Tổng đội", value: Array.isArray(allData) ? allData.length : 0, color: "bg-orange-500 text-white" },
                            { icon: Trophy, label: "Top Điểm", value: Array.isArray(allData) && allData[0] ? String(allData[0].point) : "—", color: "bg-amber-500 text-white" },
                            { icon: Shield, label: "Kết quả", value: Array.isArray(filtered) ? filtered.length : 0, color: "bg-violet-500 text-white" },
                            { icon: Award, label: "Trang", value: `${currentPage}/${totalPages}`, color: "bg-emerald-500 text-white" },
                        ].map((s, i) => (
                            <div key={i} className={`${s.color} rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg border border-white/20 hover:-translate-y-0.5 transition-transform`}>
                                <s.icon size={16} strokeWidth={2} />
                                <span className="font-semibold text-[15px] tracking-tight">{String(s.value)}</span>
                                <span className="text-[11px] opacity-90 font-medium tracking-wide">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mt-6">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên đội, leader..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-md border border-slate-200 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {PER_PAGE_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPerPage(n)}
                                    className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${perPage === n
                                        ? "bg-orange-600 text-white border-orange-600 shadow-orange-200"
                                        : "bg-white text-slate-500 hover:bg-slate-100 border-slate-200"
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ LEADERBOARD TABLE ═══ */}
            <section className="pb-24">
                <div className="max-w-[960px] mx-auto px-4 sm:px-6">
                    {loading ? (
                        <div className="bg-white rounded-2xl py-20 text-center shadow-xl border border-slate-200">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-orange-500" />
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : paged.length === 0 ? (
                        <div className="bg-white rounded-2xl py-20 text-center shadow-xl border border-slate-200">
                            <Search size={36} className="mx-auto mb-4 text-slate-300" />
                            <p className="text-lg text-slate-500 font-semibold">Không tìm thấy kết quả</p>
                            <p className="text-sm text-slate-400 mt-1">Thử từ khóa khác</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[55px]">#</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[76px]">Logo</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên CLB</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[160px]">Leader</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px]">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.map((t, idx) => {
                                            const r = Number(t.rank);
                                            const isTop1 = r === 1;
                                            const isTop2 = r === 2;
                                            const isTop3r = r === 3;

                                            const rowBg =
                                                isTop1 ? "bg-gradient-to-r from-amber-50 via-orange-50 to-white" :
                                                    isTop2 ? "bg-gradient-to-r from-slate-50 to-white" :
                                                        isTop3r ? "bg-gradient-to-r from-orange-50/60 to-white" :
                                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                                            return (
                                                <tr key={t._id || idx} className={`${rowBg} border-b border-slate-100 last:border-b-0 hover:bg-orange-50/50 transition-colors group`}>
                                                    {/* Rank */}
                                                    <td className="px-4 py-3 text-center">
                                                        {isTop1 ? (
                                                            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
                                                                <Crown size={14} className="text-white" />
                                                            </div>
                                                        ) : isTop2 ? (
                                                            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-md">
                                                                <Medal size={14} className="text-white" />
                                                            </div>
                                                        ) : isTop3r ? (
                                                            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-md">
                                                                <Medal size={14} className="text-white" />
                                                            </div>
                                                        ) : r > 0 ? (
                                                            <span className="text-[14px] font-bold text-slate-400">{r}</span>
                                                        ) : (
                                                            <span className="text-[14px] font-bold text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    {/* Logo */}
                                                    <td className="px-3 py-3 text-center">
                                                        {t.logo ? (
                                                            <img
                                                                src={toDirectImageUrl(t.logo)}
                                                                alt={t.clubName}
                                                                className="w-12 h-12 rounded-[4px] object-cover border border-slate-200 shadow-sm mx-auto"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-[4px] bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center border border-orange-200 mx-auto">
                                                                <Shield className="w-5 h-5 text-orange-400" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Club Name */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="font-bold text-[14px] text-slate-800 group-hover:text-orange-600 transition-colors">
                                                            {t.clubName}
                                                        </p>
                                                    </td>
                                                    {/* Leader */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="text-[13px] text-slate-600 font-medium">{t.leader || "—"}</span>
                                                    </td>
                                                    {/* Points */}
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`font-extrabold text-[16px] ${isTop1 ? "text-orange-600" :
                                                            isTop2 ? "text-slate-600" :
                                                                isTop3r ? "text-orange-700" :
                                                                    "text-slate-800"
                                                            }`}>{String(t.point)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-5 py-4 bg-slate-50 border-t border-slate-100 gap-3">
                                <p className="text-[12px] text-slate-400 font-medium">
                                    <span className="text-slate-700 font-bold">{(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, Array.isArray(filtered) ? filtered.length : 0)}</span> / {Array.isArray(filtered) ? filtered.length : 0} đội
                                </p>
                                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-25 transition-all shadow-sm">
                                        <ChevronLeft size={16} />
                                    </button>
                                    {pageRange[0] > 1 && (
                                        <>
                                            <button onClick={() => setPage(1)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-slate-500 hover:bg-slate-100 transition-all shadow-sm">1</button>
                                            {pageRange[0] > 2 && <span className="text-slate-300 px-0.5">⋯</span>}
                                        </>
                                    )}
                                    {pageRange.map((n) => (
                                        <button key={n} onClick={() => setPage(n)}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[11px] sm:text-[12px] font-bold transition-all shadow-sm ${n === currentPage ? "bg-orange-600 text-white shadow-orange-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                                                }`}>
                                            {n}
                                        </button>
                                    ))}
                                    {pageRange[pageRange.length - 1] < totalPages && (
                                        <>
                                            {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="text-slate-300 px-0.5">⋯</span>}
                                            <button onClick={() => setPage(totalPages)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-slate-500 hover:bg-slate-100 transition-all shadow-sm">{totalPages}</button>
                                        </>
                                    )}
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-25 transition-all shadow-sm">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
