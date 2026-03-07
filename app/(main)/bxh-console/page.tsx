"use client";
import { useState, useEffect, useMemo } from "react";
import {
    Search, Trophy, Crown, Medal, ChevronLeft, ChevronRight,
    Users, ExternalLink, Gamepad2, Award, X, CheckCircle2, XCircle,
    Loader2, Monitor,
} from "lucide-react";
import Image from "next/image";
import { PLACEMENT_LABELS, EFV_TIER_WINDOWS, getTierLabel } from "@/lib/efv-points";

type Player = {
    rank: number | string;
    id: string;
    _id?: string;
    name: string;
    facebook: string;
    team: string;
    nickname: string;
    points: number | string;
    pointsEfv50?: number;
    pointsEfv100?: number;
    pointsEfv200?: number;
};

type PointLog = {
    _id: string;
    tournamentTitle: string;
    efvTier: string;
    placement: string;
    points: number;
    teamName: string;
    awardedAt: string;
    isActive: boolean;
};

type HistoryData = {
    user: { name: string; efvId: number };
    logs: PointLog[];
    activeTotal: number;
    tierPoints: Record<string, number>;
    tierWindows: Record<string, number>;
    totalLogs: number;
} | null;

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function BXHConsolePage() {
    const [allData, setAllData] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    useEffect(() => {
        fetch("/api/bxh?mode=pc")
            .then((r) => r.json())
            .then((d) => {
                if (d.success !== false) {
                    setAllData(d.data?.data || []);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!Array.isArray(allData)) return [];
        if (!search.trim()) return allData;
        const q = search.toLowerCase();
        return allData.filter((p) =>
            String(p.name).toLowerCase().includes(q) ||
            String(p.nickname || "").toLowerCase().includes(q) ||
            String(p.team || "").toLowerCase().includes(q) ||
            String(p.id).toLowerCase().includes(q)
        );
    }, [search, allData]);

    const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / perPage));
    const currentPage = Math.min(page, totalPages);
    const paged = Array.isArray(filtered) ? filtered.slice((currentPage - 1) * perPage, currentPage * perPage) : [];
    const top3 = Array.isArray(allData) ? allData.slice(0, 3) : [];

    useEffect(() => { setPage(1); }, [search, perPage]);

    // History modal
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryData>(null);

    const openHistory = async (player: Player) => {
        const efvId = player.id;
        if (!efvId) return;
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryData(null);
        try {
            const res = await fetch(`/api/bxh/${efvId}/history?mode=pc`);
            const json = await res.json();
            if (json.success !== false && json.data) {
                setHistoryData(json.data);
            }
        } catch (err) {
            console.error("Failed to load history:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

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
                <div className="absolute inset-0 bg-[#020617] pointer-events-none">
                    <Image
                        src="/assets/efootball_bg.webp"
                        alt="BXH Console Background"
                        fill
                        className="object-cover opacity-50 object-[center_30%]"
                        priority
                        quality={100}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/50 via-[#020617]/80 to-slate-50" />
                    <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.05]" />
                </div>

                <div className="max-w-[1100px] mx-auto px-6 relative z-10 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 rounded-full px-5 py-2 mb-6 font-bold text-[12px] md:text-[13px] tracking-[0.2em] uppercase border border-cyan-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                        <Monitor size={14} className="text-cyan-500" /> BXH Console
                    </div>
                    <h1 className="text-[clamp(36px,8vw,72px)] font-black mb-5 leading-[1.05] tracking-tight text-white drop-shadow-2xl">
                        Vietnam <br className="sm:hidden" /> Efootball <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-teal-400 to-cyan-600 drop-shadow-none">Console Rankings</span>
                    </h1>
                    <p className="text-slate-300 max-w-[650px] mx-auto text-[15px] sm:text-[17px] font-medium leading-relaxed drop-shadow-md">
                        {Array.isArray(allData) && allData.length > 0 ? `Bảng xếp hạng quy tụ ${allData.length} VĐV Console xuất sắc nhất.` : "Đang tải dữ liệu..."}
                    </p>
                </div>
            </section>

            {/* ═══ TOP 3 PODIUM ═══ */}
            {!search.trim() && top3.length >= 3 && (
                <section className="pb-8 -mt-16 lg:-mt-24 relative z-20">
                    <div className="max-w-[920px] mx-auto px-6">
                        <div className="flex items-end justify-center gap-2 sm:gap-4">
                            {[1, 0, 2].map((oi, vi) => {
                                const p = top3[oi];
                                const configs = [
                                    { bg: "bg-gradient-to-b from-cyan-300 via-teal-400 to-cyan-600", textMain: "text-cyan-950", textSub: "text-cyan-900/60", h: "h-[180px] sm:h-[240px]", shadow: "shadow-[0_8px_40px_rgba(6,182,212,0.35)]" },
                                    { bg: "bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400", textMain: "text-slate-800", textSub: "text-slate-600/70", h: "h-[155px] sm:h-[200px]", shadow: "shadow-[0_8px_30px_rgba(148,163,184,0.25)]" },
                                    { bg: "bg-gradient-to-b from-teal-400 via-teal-500 to-teal-700", textMain: "text-teal-100", textSub: "text-teal-200/60", h: "h-[145px] sm:h-[190px]", shadow: "shadow-[0_8px_30px_rgba(13,148,136,0.25)]" },
                                ];
                                const c = configs[oi];
                                return (
                                    <div key={oi} className={`flex-1 min-w-0 ${vi === 1 ? "order-2" : vi === 0 ? "order-1" : "order-3"}`}>
                                        <div className={`${c.bg} ${c.shadow} ${c.h} rounded-xl sm:rounded-2xl px-2 sm:px-5 py-3 sm:py-5 text-center flex flex-col items-center justify-end relative overflow-hidden transition-transform hover:-translate-y-2`}>
                                            <span className={`text-2xl sm:text-5xl mb-1 sm:mb-2 drop-shadow-sm`}>{["🥇", "🥈", "🥉"][oi]}</span>
                                            <h3 className={`font-semibold tracking-tight text-[11px] sm:text-[15px] ${c.textMain} truncate w-full`}>{p.nickname || p.name}</h3>
                                            <div className={`font-bold tracking-tight text-lg sm:text-3xl ${c.textMain} leading-tight`}>{String(p.points)}</div>
                                            <span className={`text-[7px] sm:text-[9px] ${c.textSub} font-medium tracking-[0.05em] uppercase`}>ĐIỂM</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ SEARCH + CONTROLS ═══ */}
            <section className="pb-4 mt-6">
                <div className="max-w-[920px] mx-auto px-6">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:justify-center">
                        {[
                            { icon: Users, label: "Tổng VĐV", value: Array.isArray(allData) ? allData.length : 0, color: "bg-teal-500 text-white" },
                            { icon: Trophy, label: "Top Điểm", value: Array.isArray(allData) && allData[0] ? String(allData[0].points) : "—", color: "bg-cyan-500 text-white" },
                            { icon: Gamepad2, label: "Kết quả", value: Array.isArray(filtered) ? filtered.length : 0, color: "bg-violet-500 text-white" },
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
                                placeholder="Tìm tên, nickname, team, ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-md border border-slate-200 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {PER_PAGE_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPerPage(n)}
                                    className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${perPage === n
                                        ? "bg-teal-600 text-white border-teal-600 shadow-teal-200"
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

            {/* ═══ LEADERBOARD ═══ */}
            <section className="pb-24">
                <div className="max-w-[920px] mx-auto px-6">
                    {loading ? (
                        <div className="bg-white rounded-2xl py-20 text-center shadow-xl border border-slate-200">
                            <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : paged.length === 0 ? (
                        <div className="bg-white rounded-2xl py-20 text-center shadow-xl border border-slate-200">
                            <Search size={36} className="mx-auto mb-4 text-slate-300" />
                            <p className="text-lg text-slate-500 font-semibold">Không tìm thấy kết quả</p>
                            <p className="text-sm text-slate-400 mt-1">Thử từ khóa khác</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                            {/* Table header */}
                            <div className="hidden md:grid grid-cols-[55px_120px_1fr_120px_120px_90px_45px] px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                                <span className="text-center">#</span>
                                <span>ID Gamers</span>
                                <span>Họ Tên VĐV</span>
                                <span>Team</span>
                                <span>Nickname</span>
                                <span className="text-right">Điểm</span>
                                <span className="text-center">FB</span>
                            </div>

                            {paged.map((p, idx) => {
                                const r = Number(p.rank);
                                const isTop1 = r === 1;
                                const isTop2 = r === 2;
                                const isTop3r = r === 3;

                                const rowBg =
                                    isTop1 ? "bg-gradient-to-r from-cyan-50 via-teal-50 to-white" :
                                        isTop2 ? "bg-gradient-to-r from-slate-50 to-white" :
                                            isTop3r ? "bg-gradient-to-r from-teal-50/60 to-white" :
                                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                                return (
                                    <div
                                        key={p._id || idx}
                                        onClick={() => openHistory(p)}
                                        className={`${rowBg} border-b border-slate-100 last:border-b-0 hover:bg-teal-50/50 transition-colors inline-block w-full cursor-pointer`}
                                    >
                                        {/* Desktop */}
                                        <div className="hidden md:grid grid-cols-[55px_120px_1fr_120px_120px_90px_45px] px-5 py-3.5 items-center group">
                                            <div className="flex justify-center">
                                                {isTop1 ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-md">
                                                        <Crown size={14} className="text-white" />
                                                    </div>
                                                ) : isTop2 ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-md">
                                                        <Medal size={14} className="text-white" />
                                                    </div>
                                                ) : isTop3r ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-md">
                                                        <Medal size={14} className="text-white" />
                                                    </div>
                                                ) : r > 0 ? (
                                                    <span className="text-[14px] font-bold text-slate-400">{r}</span>
                                                ) : (
                                                    <span className="text-[14px] font-bold text-slate-300">-</span>
                                                )}
                                            </div>
                                            <span className="text-[12px] text-teal-600 font-mono font-medium truncate pr-2">{p.id}</span>
                                            <p className="font-semibold text-[14px] text-slate-800 truncate group-hover:text-teal-600 transition-colors pr-2">
                                                <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded mr-1.5 border border-teal-100">{p.id}</span>
                                                {p.name}
                                            </p>
                                            <div className="pr-2">
                                                {p.team ? (
                                                    <span className="text-[11px] bg-teal-50 text-teal-600 px-2 py-1 rounded-full font-medium border border-teal-100 block truncate text-center">{p.team}</span>
                                                ) : (
                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                )}
                                            </div>
                                            <span className="text-[13px] text-slate-600 font-medium truncate pr-2">{p.nickname || "—"}</span>
                                            <div className="text-right">
                                                <span className={`font-extrabold text-[16px] ${isTop1 ? "text-cyan-600" :
                                                    isTop2 ? "text-slate-600" :
                                                        isTop3r ? "text-teal-700" :
                                                            "text-slate-800"
                                                    }`}>{String(p.points)}</span>
                                            </div>
                                            <div className="flex justify-center">
                                                {p.facebook ? (
                                                    <a href={String(p.facebook)} target="_blank" rel="noopener" className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 hover:scale-110 transition-all border border-blue-100">
                                                        <ExternalLink size={13} />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-200">—</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile */}
                                        <div className="md:hidden px-4 py-3.5 flex flex-col w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 shrink-0 flex justify-center">
                                                    {isTop1 ? (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-cyan-400 to-teal-600">
                                                            <Crown size={18} />
                                                        </div>
                                                    ) : isTop2 ? (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-slate-300 to-slate-500">
                                                            <Medal size={18} />
                                                        </div>
                                                    ) : isTop3r ? (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-teal-400 to-teal-700">
                                                            <Medal size={18} />
                                                        </div>
                                                    ) : r > 0 ? (
                                                        <span className="text-[16px] font-bold text-slate-400 text-center w-full">{r}</span>
                                                    ) : (
                                                        <span className="text-[16px] font-bold text-slate-300 text-center w-full">-</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[14px] text-slate-800 truncate leading-tight">
                                                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1 py-0.5 rounded mr-1 border border-teal-100">{p.id}</span>
                                                        {p.name} {p.nickname ? <span className="text-slate-500 font-normal">({p.nickname})</span> : ""}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                                        <span className="text-[10px] text-teal-600 font-mono bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">{p.id}</span>
                                                        {p.team && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{p.team}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`font-extrabold text-[18px] ${r <= 3 ? "text-cyan-600" : "text-slate-800"}`}>{String(p.points)}</span>
                                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest">ĐIỂM</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-slate-50 border-t border-slate-100 gap-3">
                                <p className="text-[12px] text-slate-400 font-medium">
                                    <span className="text-slate-700 font-bold">{(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, Array.isArray(filtered) ? filtered.length : 0)}</span> / {Array.isArray(filtered) ? filtered.length : 0} VĐV
                                </p>
                                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-25 transition-all shadow-sm">
                                        <ChevronLeft size={16} />
                                    </button>
                                    {pageRange[0] > 1 && (
                                        <>
                                            <button onClick={() => setPage(1)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-500 hover:bg-slate-100 transition-all shadow-sm">1</button>
                                            {pageRange[0] > 2 && <span className="text-slate-300 px-0.5">⋯</span>}
                                        </>
                                    )}
                                    {pageRange.map((n) => (
                                        <button key={n} onClick={() => setPage(n)}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all shadow-sm ${n === currentPage ? "bg-teal-600 text-white shadow-teal-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                                                }`}>
                                            {n}
                                        </button>
                                    ))}
                                    {pageRange[pageRange.length - 1] < totalPages && (
                                        <>
                                            {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="text-slate-300 px-0.5">⋯</span>}
                                            <button onClick={() => setPage(totalPages)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-500 hover:bg-slate-100 transition-all shadow-sm">{totalPages}</button>
                                        </>
                                    )}
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-25 transition-all shadow-sm">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══ HISTORY MODAL ═══ */}
            {historyOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-white">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-cyan-500" />
                                    {historyData?.user?.name || "Đang tải..."}
                                </h3>
                                {historyData?.user?.efvId != null && (
                                    <p className="text-xs text-slate-500 mt-0.5">EFV-ID: #{historyData.user.efvId}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setHistoryOpen(false)}
                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                                </div>
                            ) : !historyData || historyData.logs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Monitor className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Chưa có lịch sử điểm EFV Console</p>
                                    <p className="text-xs text-slate-400 mt-1">VĐV này chưa tham gia giải EFV Console nào</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Per-tier breakdown */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-center">
                                            <p className="text-[10px] text-teal-500 font-bold uppercase tracking-wide">EFV 50</p>
                                            <p className="text-lg font-black text-teal-700">{historyData.tierPoints?.efv_50 ?? 0}</p>
                                            <p className="text-[9px] text-teal-400">Top {EFV_TIER_WINDOWS.efv_50} giải</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-center">
                                            <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-wide">EFV 100</p>
                                            <p className="text-lg font-black text-cyan-700">{historyData.tierPoints?.efv_100 ?? 0}</p>
                                            <p className="text-[9px] text-cyan-400">Top {EFV_TIER_WINDOWS.efv_100} giải</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                                            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wide">EFV 200</p>
                                            <p className="text-lg font-black text-rose-700">{historyData.tierPoints?.efv_200 ?? 0}</p>
                                            <p className="text-[9px] text-rose-400">Top {EFV_TIER_WINDOWS.efv_200} giải</p>
                                        </div>
                                    </div>
                                    {/* Total */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200">
                                        <div>
                                            <p className="text-xs text-cyan-700 font-medium">BXH Tổng Console</p>
                                            <p className="text-xs text-cyan-600/70 mt-0.5">= EFV50 + EFV100 + EFV200</p>
                                        </div>
                                        <div className="text-3xl font-black text-cyan-600">
                                            {historyData.activeTotal}
                                        </div>
                                    </div>

                                    {/* Logs */}
                                    <div className="space-y-2">
                                        {historyData.logs.map((log) => {
                                            const tierLabel = getTierLabel(log.efvTier);
                                            const placementLabel = PLACEMENT_LABELS[log.placement] || log.placement;

                                            return (
                                                <div key={log._id}>
                                                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${log.isActive
                                                        ? "bg-white border-slate-200 hover:border-teal-200"
                                                        : "bg-slate-50/50 border-slate-100 opacity-60"
                                                        }`}>
                                                        <div className="flex-shrink-0">
                                                            {log.isActive ? (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                                {log.tournamentTitle}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                                                    {tierLabel}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500">
                                                                    {placementLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className={`text-lg font-bold ${log.isActive ? "text-emerald-600" : "text-slate-400 line-through"
                                                                }`}>
                                                                +{log.points}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                Tính vào BXH
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                <XCircle className="w-3.5 h-3.5 text-slate-300" />
                                                Ngoài cửa sổ
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            EFV50: {EFV_TIER_WINDOWS.efv_50} giải · EFV100: {EFV_TIER_WINDOWS.efv_100} giải · EFV200: {EFV_TIER_WINDOWS.efv_200} giải
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
