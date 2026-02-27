"use client";
import { useState, useEffect, useMemo } from "react";
import {
    Search, Trophy, Crown, Medal, ChevronLeft, ChevronRight,
    Users, ExternalLink, Gamepad2, Award,
} from "lucide-react";
import Image from "next/image";

type Player = {
    rank: number | string;
    id: string; // This maps to gamerId in DB
    _id?: string;
    name: string;
    facebook: string;
    team: string;
    nickname: string;
    points: number | string;
};

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function BXHPage() {
    const [allData, setAllData] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    useEffect(() => {
        fetch("/api/bxh")
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
                        alt="BXH Background"
                        fill
                        className="object-cover opacity-50 object-[center_30%]"
                        priority
                        quality={100}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/50 via-[#020617]/80 to-slate-50" />
                    <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.05]" />
                </div>

                <div className="max-w-[1100px] mx-auto px-6 relative z-10 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 rounded-full px-5 py-2 mb-6 font-bold text-[12px] md:text-[13px] tracking-[0.2em] uppercase border border-amber-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                        <Trophy size={14} className="text-amber-500" /> Bảng Xếp Hạng Quốc Gia
                    </div>
                    <h1 className="text-[clamp(36px,8vw,72px)] font-black mb-5 leading-[1.05] tracking-tight text-white drop-shadow-2xl">
                        Vietnam <br className="sm:hidden" /> Efootball <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-none">Rankings</span>
                    </h1>
                    <p className="text-slate-300 max-w-[650px] mx-auto text-[15px] sm:text-[17px] font-medium leading-relaxed drop-shadow-md">
                        {Array.isArray(allData) && allData.length > 0 ? `Chiêm ngưỡng bảng phong thần quy tụ ${allData.length} VĐV xuất sắc nhất trên lãnh thổ Việt Nam.` : "Đang tải dữ liệu..."}
                    </p>
                </div>
            </section>

            {/* ═══ TOP 3 PODIUM — solid bright cards ═══ */}
            {!search.trim() && top3.length >= 3 && (
                <section className="pb-8 -mt-16 lg:-mt-24 relative z-20">
                    <div className="max-w-[920px] mx-auto px-6">
                        <div className="flex items-end justify-center gap-2 sm:gap-4">
                            {[1, 0, 2].map((oi, vi) => {
                                const p = top3[oi];
                                const configs = [
                                    { bg: "bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500", textMain: "text-amber-950", textSub: "text-amber-900/60", h: "h-[180px] sm:h-[240px]", shadow: "shadow-[0_8px_40px_rgba(250,204,21,0.35)]" },
                                    { bg: "bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400", textMain: "text-slate-800", textSub: "text-slate-600/70", h: "h-[155px] sm:h-[200px]", shadow: "shadow-[0_8px_30px_rgba(148,163,184,0.25)]" },
                                    { bg: "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700", textMain: "text-amber-100", textSub: "text-amber-200/60", h: "h-[145px] sm:h-[190px]", shadow: "shadow-[0_8px_30px_rgba(217,119,6,0.25)]" },
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
                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:justify-center">
                        {[
                            { icon: Users, label: "Tổng VĐV", value: Array.isArray(allData) ? allData.length : 0, color: "bg-blue-500 text-white" },
                            { icon: Trophy, label: "Top Điểm", value: Array.isArray(allData) && allData[0] ? String(allData[0].points) : "—", color: "bg-amber-500 text-white" },
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

                    {/* Search + per page */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mt-6">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên, nickname, team, ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-efb-blue shadow-md border border-slate-200 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {PER_PAGE_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPerPage(n)}
                                    className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm border ${perPage === n
                                        ? "bg-blue-600 text-white border-blue-600 shadow-blue-200"
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

            {/* ═══ LEADERBOARD — solid white cards ═══ */}
            <section className="pb-24">
                <div className="max-w-[920px] mx-auto px-6">

                    {loading ? (
                        <div className="bg-white rounded-2xl py-20 text-center shadow-xl border border-slate-200">
                            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
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

                            {/* Rows */}
                            {paged.map((p, idx) => {
                                const r = Number(p.rank);
                                const isTop1 = r === 1;
                                const isTop2 = r === 2;
                                const isTop3 = r === 3;

                                const rowBg =
                                    isTop1 ? "bg-gradient-to-r from-yellow-50 via-amber-50 to-white" :
                                        isTop2 ? "bg-gradient-to-r from-slate-50 to-white" :
                                            isTop3 ? "bg-gradient-to-r from-amber-50/60 to-white" :
                                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                                return (
                                    <div
                                        key={p._id || idx}
                                        className={`${rowBg} border-b border-slate-100 last:border-b-0 hover:bg-blue-50/50 transition-colors inline-block w-full`}
                                    >
                                        {/* Desktop */}
                                        <div className="hidden md:grid grid-cols-[55px_120px_1fr_120px_120px_90px_45px] px-5 py-3.5 items-center group">
                                            {/* Rank */}
                                            <div className="flex justify-center">
                                                {isTop1 ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-md">
                                                        <Crown size={14} className="text-white" />
                                                    </div>
                                                ) : isTop2 ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-md">
                                                        <Medal size={14} className="text-white" />
                                                    </div>
                                                ) : isTop3 ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-md">
                                                        <Medal size={14} className="text-white" />
                                                    </div>
                                                ) : r > 0 ? (
                                                    <span className="text-[14px] font-bold text-slate-400">{r}</span>
                                                ) : (
                                                    <span className="text-[14px] font-bold text-slate-300">-</span>
                                                )}
                                            </div>
                                            {/* ID */}
                                            <span className="text-[12px] text-indigo-500 font-mono font-medium truncate pr-2">{p.id}</span>
                                            {/* Name */}
                                            <p className="font-semibold text-[14px] text-slate-800 truncate group-hover:text-blue-600 transition-colors pr-2">{p.name}</p>
                                            {/* Team */}
                                            <div className="pr-2">
                                                {p.team ? (
                                                    <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium border border-indigo-100 block truncate text-center">{p.team}</span>
                                                ) : (
                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                )}
                                            </div>
                                            {/* Nickname */}
                                            <span className="text-[13px] text-slate-600 font-medium truncate pr-2">{p.nickname || "—"}</span>
                                            {/* Points */}
                                            <div className="text-right">
                                                <span className={`font-extrabold text-[16px] ${isTop1 ? "text-amber-600" :
                                                    isTop2 ? "text-slate-600" :
                                                        isTop3 ? "text-amber-700" :
                                                            "text-slate-800"
                                                    }`}>{String(p.points)}</span>
                                            </div>
                                            {/* FB */}
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
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-yellow-400 to-amber-600">
                                                            <Crown size={18} />
                                                        </div>
                                                    ) : isTop2 ? (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-slate-300 to-slate-500">
                                                            <Medal size={18} />
                                                        </div>
                                                    ) : isTop3 ? (
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white bg-gradient-to-br from-amber-400 to-amber-700">
                                                            <Medal size={18} />
                                                        </div>
                                                    ) : r > 0 ? (
                                                        <span className="text-[16px] font-bold text-slate-400 text-center w-full">{r}</span>
                                                    ) : (
                                                        <span className="text-[16px] font-bold text-slate-300 text-center w-full">-</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[14px] text-slate-800 truncate leading-tight">{p.name} {p.nickname ? <span className="text-slate-500 font-normal">({p.nickname})</span> : ""}</p>
                                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                                        <span className="text-[10px] text-indigo-500 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{p.id}</span>
                                                        {p.team && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{p.team}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`font-extrabold text-[18px] ${r <= 3 ? "text-amber-600" : "text-slate-800"}`}>{String(p.points)}</span>
                                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest">ĐIỂM</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Pagination inside card */}
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
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all shadow-sm ${n === currentPage ? "bg-blue-600 text-white shadow-blue-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
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
        </div>
    );
}
