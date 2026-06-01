"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Shield, Zap, Triangle, Expand, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchManagers, getPlayerImageUrl } from "@/lib/efvn-api";
import type { ManagerSummary, PaginationMeta, ManagerFilterParams } from "@/lib/efvn-types";

const PLAYSTYLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    quickCounter: { label: "Quick Counter", icon: <Zap className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50" },
    possessionGame: { label: "Possession", icon: <Triangle className="w-3.5 h-3.5" />, color: "text-emerald-600 bg-emerald-50" },
    longBallCounter: { label: "Long Ball Counter", icon: <Shield className="w-3.5 h-3.5" />, color: "text-orange-600 bg-orange-50" },
    outWide: { label: "Out Wide", icon: <Expand className="w-3.5 h-3.5" />, color: "text-purple-600 bg-purple-50" },
    longBall: { label: "Long Ball", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-600 bg-amber-50" },
};

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function getBestStyle(prof: Record<string, number> | undefined) {
    if (!prof) return null;
    let best = { key: "", val: 0 };
    for (const [k, v] of Object.entries(prof)) {
        if (v > best.val) best = { key: k, val: v };
    }
    return best.val > 0 ? best : null;
}

export default function ManagersPage() {
    const [query, setQuery] = useState("");
    const [formation, setFormation] = useState("");
    const [playstyle, setPlaystyle] = useState("");
    const [page, setPage] = useState(1);
    const [managers, setManagers] = useState<ManagerSummary[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadManagers = useCallback(async (p: number = page) => {
        setLoading(true);
        setError("");
        try {
            const params: ManagerFilterParams = {
                page: p,
                limit: 20,
                q: query || undefined,
                formation: formation || undefined,
                playstyle: playstyle || undefined,
            };
            const res = await fetchManagers(params);
            setManagers(res.data || []);
            setMeta(res.meta || null);
        } catch {
            setError("Không thể tải dữ liệu HLV.");
        } finally {
            setLoading(false);
        }
    }, [query, formation, playstyle, page]);

    useEffect(() => { loadManagers(); }, [loadManagers]);

    const applyFilters = () => { setPage(1); loadManagers(1); };
    const resetFilters = () => { setQuery(""); setFormation(""); setPlaystyle(""); setPage(1); };
    const gotoPage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-efb-blue" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.14, 0.06] }} transition={{ duration: 8, repeat: Infinity }}
                        className="absolute -top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-yellow-300/25 to-transparent rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 pt-10 pb-8">
                    <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="text-2xl sm:text-3xl font-extralight text-white mb-2">
                        Danh sách <span className="font-semibold text-efb-yellow">HLV</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                        className="text-sm text-white/40 max-w-md">
                        Khám phá HLV và chiến thuật phù hợp cho đội bóng của bạn.
                    </motion.p>
                    {meta && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                            className="mt-4 inline-flex bg-white/[0.08] backdrop-blur-sm rounded-xl px-4 py-2 border border-white/[0.1]">
                            <span className="text-lg font-bold text-white">{meta.total.toLocaleString()}</span>
                            <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold ml-2 self-center">HLV</span>
                        </motion.div>
                    )}
                </div>
                <svg viewBox="0 0 1440 40" fill="none" className="w-full block relative z-10">
                    <path d="M0 40H1440V10C1440 10 1200 40 720 40C240 40 0 10 0 10V40Z" fill="white" />
                </svg>
            </section>

            <section className="max-w-[1200px] mx-auto px-6 lg:px-8 -mt-1 pb-16">
                {/* Filters */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="card-white rounded-2xl p-5 mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-efb-text-secondary mb-1.5 block">Tên HLV</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                <Input value={query} onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                    placeholder="Tìm kiếm..." className="pl-9 h-10 bg-efb-bg-alt border-efb-border" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-efb-text-secondary mb-1.5 block">Đội hình</label>
                            <Select value={formation} onValueChange={setFormation}>
                                <SelectTrigger className="h-10 bg-efb-bg-alt border-efb-border"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Tất cả</SelectItem>
                                    {["4-3-3", "4-2-3-1", "4-4-2", "4-2-1-3", "3-2-2-3", "3-4-3", "4-1-2-3", "4-3-1-2", "4-1-3-2", "5-4-1"].map(f => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-efb-text-secondary mb-1.5 block">Phong cách</label>
                            <Select value={playstyle} onValueChange={setPlaystyle}>
                                <SelectTrigger className="h-10 bg-efb-bg-alt border-efb-border"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Tất cả</SelectItem>
                                    <SelectItem value="quickCounter">Quick Counter</SelectItem>
                                    <SelectItem value="possessionGame">Possession Game</SelectItem>
                                    <SelectItem value="longBallCounter">Long Ball Counter</SelectItem>
                                    <SelectItem value="outWide">Out Wide</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={applyFilters} className="h-10 flex-1 bg-efb-blue hover:bg-efb-blue-light text-white rounded-xl">
                                <Search className="w-4 h-4 mr-1.5" />Tìm
                            </Button>
                            <Button onClick={resetFilters} variant="ghost" className="h-10 rounded-xl text-efb-text-muted">
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {error && <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 mb-6">{error}</div>}

                {/* Manager Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="card-white rounded-2xl p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-12 h-12 rounded-xl" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-3/4 mb-1" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : managers.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-efb-text-secondary">Không tìm thấy HLV nào.</p>
                        <Button onClick={resetFilters} variant="outline" className="mt-4 rounded-xl">
                            <RotateCcw className="w-4 h-4 mr-2" />Đặt lại
                        </Button>
                    </div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {managers.map((manager) => {
                            const best = getBestStyle(manager.playstyleProficiency);
                            const bestInfo = best ? PLAYSTYLE_LABELS[best.key] : null;
                            return (
                                <motion.div key={manager.efhubId || manager._id} variants={cardVariants}
                                    className="card-white rounded-2xl p-5 hover-lift">
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-efb-bg-alt flex items-center justify-center border border-efb-border-light">
                                            {manager.imageUrl ? (
                                                <img src={getPlayerImageUrl(manager.imageUrl)} alt={manager.name} className="w-10 h-10 object-cover rounded-lg" />
                                            ) : (
                                                <Shield className="w-5 h-5 text-efb-text-muted" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-efb-text truncate">{manager.name}</h3>
                                            <div className="text-[11px] text-efb-text-muted">{manager.team || manager.nationality || "Unknown"}</div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                                            {manager.formation || "N/A"}
                                        </Badge>
                                    </div>

                                    {/* Best playstyle */}
                                    {bestInfo && (
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold mb-3 ${bestInfo.color}`}>
                                            {bestInfo.icon}
                                            {bestInfo.label}
                                            <span className="font-bold ml-1">{best?.val}</span>
                                        </div>
                                    )}

                                    {/* Playstyle bars */}
                                    {manager.playstyleProficiency && (
                                        <div className="space-y-1.5">
                                            {Object.entries(manager.playstyleProficiency).map(([key, val]) => {
                                                const info = PLAYSTYLE_LABELS[key];
                                                if (!info) return null;
                                                return (
                                                    <div key={key}>
                                                        <div className="flex justify-between text-[10px] mb-0.5">
                                                            <span className="text-efb-text-muted">{info.label}</span>
                                                            <span className="font-semibold text-efb-text-secondary">{val}</span>
                                                        </div>
                                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                className="h-full bg-efb-blue rounded-full"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, val)}%` }}
                                                                transition={{ duration: 0.6, delay: 0.1 }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && !loading && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg"
                            disabled={page <= 1} onClick={() => gotoPage(page - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-efb-text-secondary px-3">
                            Trang <span className="font-semibold text-efb-text">{page}</span> / {meta.totalPages}
                        </span>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg"
                            disabled={page >= meta.totalPages} onClick={() => gotoPage(page + 1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </section>
        </>
    );
}
