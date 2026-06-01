"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowLeftRight, RotateCcw, ChevronDown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPlayers, fetchPlayerDetail, getPlayerImageUrl } from "@/lib/efvn-api";
import type { PlayerDetail, PlayerSummary } from "@/lib/efvn-types";

const STAT_ROWS = [
    ["Attacking Prowess", "offensiveAwareness"],
    ["Ball Control", "ballControl"],
    ["Dribbling", "dribbling"],
    ["Tight Possession", "tightPossession"],
    ["Finishing", "finishing"],
    ["Low Pass", "lowPass"],
    ["Lofted Pass", "loftedPass"],
    ["Speed", "speed"],
    ["Acceleration", "acceleration"],
    ["Kicking Power", "kickingPower"],
    ["Defensive Awareness", "defensiveAwareness"],
    ["Tackling", "ballWinning"],
    ["Aggression", "aggression"],
    ["Stamina", "stamina"],
    ["Physical Contact", "physicalContact"],
    ["Jump", "jump"],
    ["Balance", "balance"],
] as const;

function CompareContent() {
    const searchParams = useSearchParams();
    const initialP1 = searchParams.get("p1") || "";
    const initialP2 = searchParams.get("p2") || "";

    const [leftQuery, setLeftQuery] = useState(initialP1);
    const [rightQuery, setRightQuery] = useState(initialP2);
    const [leftPlayer, setLeftPlayer] = useState<PlayerDetail | null>(null);
    const [rightPlayer, setRightPlayer] = useState<PlayerDetail | null>(null);
    const [leftResults, setLeftResults] = useState<PlayerSummary[]>([]);
    const [rightResults, setRightResults] = useState<PlayerSummary[]>([]);
    const [loadingSlot, setLoadingSlot] = useState<"left" | "right" | null>(null);
    const [error, setError] = useState("");

    const searchPlayer = async (side: "left" | "right") => {
        const query = (side === "left" ? leftQuery : rightQuery).trim();
        if (!query) { setError("Nhập tên hoặc ID cầu thủ."); return; }

        setLoadingSlot(side);
        setError("");
        try {
            // Try search by name first
            const listRes = await fetchPlayers({ q: query, limit: 8, minOvr: 1 });
            const candidates = listRes.data || [];

            if (candidates.length > 0) {
                if (side === "left") setLeftResults(candidates);
                else setRightResults(candidates);
                // Auto-pick first result, then fetch full detail
                const detail = await fetchPlayerDetail(candidates[0].efhubId);
                if (side === "left") setLeftPlayer(detail.data);
                else setRightPlayer(detail.data);
            } else {
                // Try by ID
                const detail = await fetchPlayerDetail(query);
                if (detail.data) {
                    if (side === "left") { setLeftPlayer(detail.data); setLeftResults([]); }
                    else { setRightPlayer(detail.data); setRightResults([]); }
                } else {
                    setError("Không tìm thấy cầu thủ.");
                }
            }
        } catch {
            setError("Không tìm thấy cầu thủ.");
        } finally {
            setLoadingSlot(null);
        }
    };

    const pickPlayer = async (side: "left" | "right", p: PlayerSummary) => {
        setLoadingSlot(side);
        try {
            const detail = await fetchPlayerDetail(p.efhubId);
            if (side === "left") setLeftPlayer(detail.data);
            else setRightPlayer(detail.data);
        } catch {} finally { setLoadingSlot(null); }
    };

    const swapSides = () => {
        const tmpP = leftPlayer; setLeftPlayer(rightPlayer); setRightPlayer(tmpP);
        const tmpQ = leftQuery; setLeftQuery(rightQuery); setRightQuery(tmpQ);
        const tmpR = leftResults; setLeftResults(rightResults); setRightResults(tmpR);
    };

    const resetAll = () => {
        setLeftPlayer(null); setRightPlayer(null);
        setLeftQuery(""); setRightQuery("");
        setLeftResults([]); setRightResults([]);
        setError("");
    };

    const leftStats = leftPlayer?.stats?.maxLevel || {};
    const rightStats = rightPlayer?.stats?.maxLevel || {};
    const leftOvr = leftPlayer?.overall?.max || 0;
    const rightOvr = rightPlayer?.overall?.max || 0;

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
                        So sánh <span className="font-semibold text-efb-yellow">cầu thủ</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                        className="text-sm text-white/40 max-w-md">
                        Chọn 2 cầu thủ để so sánh chi tiết mọi chỉ số.
                    </motion.p>
                </div>
                <svg viewBox="0 0 1440 40" fill="none" className="w-full block relative z-10">
                    <path d="M0 40H1440V10C1440 10 1200 40 720 40C240 40 0 10 0 10V40Z" fill="white" />
                </svg>
            </section>

            <section className="max-w-[1200px] mx-auto px-6 lg:px-8 -mt-1 pb-16">
                {/* Action buttons */}
                <div className="flex gap-2 mb-6">
                    <Button onClick={swapSides} variant="outline" size="sm" className="rounded-xl gap-1.5"
                        disabled={!leftPlayer && !rightPlayer}>
                        <ArrowLeftRight className="w-3.5 h-3.5" />Đảo vị trí
                    </Button>
                    <Button onClick={resetAll} variant="ghost" size="sm" className="rounded-xl gap-1.5 text-efb-text-muted">
                        <RotateCcw className="w-3.5 h-3.5" />Đặt lại
                    </Button>
                </div>

                {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 mb-4">{error}</div>}

                {/* Search Panels */}
                <div className="grid gap-5 lg:grid-cols-2 mb-8">
                    {(["left", "right"] as const).map((side) => {
                        const query = side === "left" ? leftQuery : rightQuery;
                        const setQuery = side === "left" ? setLeftQuery : setRightQuery;
                        const player = side === "left" ? leftPlayer : rightPlayer;
                        const results = side === "left" ? leftResults : rightResults;
                        const isLoading = loadingSlot === side;

                        return (
                            <motion.div key={side} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: side === "left" ? 0.1 : 0.2 }}
                                className="card-white rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-efb-text">
                                        Cầu thủ {side === "left" ? "A" : "B"}
                                    </h3>
                                    <Badge variant="secondary" className="text-[10px]">{side.toUpperCase()}</Badge>
                                </div>

                                {/* Search input */}
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && searchPlayer(side)}
                                        placeholder="Nhập tên hoặc ID cầu thủ"
                                        className="h-10 bg-efb-bg-alt border-efb-border"
                                    />
                                    <Button onClick={() => searchPlayer(side)} disabled={isLoading}
                                        className="h-10 rounded-xl bg-efb-blue hover:bg-efb-blue-light text-white px-4">
                                        {isLoading ? "..." : <Search className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {/* Selected player */}
                                {player ? (
                                    <div className="p-3 bg-efb-bg-alt rounded-xl flex gap-3">
                                        <div className="w-16 h-20 bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                            {getPlayerImageUrl(player.images?.card || player.images?.portrait) ? (
                                                <img src={getPlayerImageUrl(player.images?.card || player.images?.portrait)} alt={player.name} className="w-full h-full object-cover" />
                                            ) : <div className="text-[10px] text-gray-300">N/A</div>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm text-efb-text">{player.name}</div>
                                            <div className="text-[11px] text-efb-text-muted">{player.positions?.[0]} · {player.club}</div>
                                            <Link href={`/players/${player.efhubId}`}
                                                className="text-[11px] font-semibold text-efb-blue hover:underline mt-1 inline-block">
                                                Chi tiết →
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-efb-bg-alt rounded-xl text-sm text-efb-text-muted text-center">
                                        Chưa chọn cầu thủ.
                                    </div>
                                )}

                                {/* Search results dropdown */}
                                {results.length > 1 && (
                                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                        {results.map((r) => (
                                            <button key={r.efhubId} type="button"
                                                className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                                                    player?.efhubId === r.efhubId
                                                        ? "bg-efb-blue/10 border border-efb-blue/30"
                                                        : "bg-efb-bg-alt hover:bg-gray-100 border border-transparent"
                                                }`}
                                                onClick={() => pickPlayer(side, r)}>
                                                <span className="font-semibold text-efb-text">{r.name}</span>
                                                <span className="text-efb-text-muted ml-2">{r.positions?.[0]} · OVR {r.overall?.max} · {r.club}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Comparison Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="card-white rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-efb-border flex items-center gap-2.5">
                        <div className="w-1 h-5 bg-efb-blue rounded-full" />
                        <h2 className="text-sm font-semibold text-efb-text">Bảng so sánh chỉ số</h2>
                    </div>

                    {!leftPlayer || !rightPlayer ? (
                        <div className="p-8 text-center text-sm text-efb-text-muted">
                            Chọn đủ 2 cầu thủ để hiển thị bảng so sánh chi tiết.
                        </div>
                    ) : (
                        <div className="divide-y divide-efb-border-light">
                            {/* Header */}
                            <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-efb-bg-alt text-[11px] font-bold uppercase text-efb-text-muted tracking-wider">
                                <div>Stat</div>
                                <div className="text-right">{leftPlayer.name.split(" ").pop()} ({leftOvr})</div>
                                <div className="text-right">{rightPlayer.name.split(" ").pop()} ({rightOvr})</div>
                                <div className="text-right">±</div>
                            </div>

                            {STAT_ROWS.map(([label, key]) => {
                                const left = leftStats[key] || 0;
                                const right = rightStats[key] || 0;
                                const diff = left - right;
                                return (
                                    <div key={label} className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-2 px-5 py-2.5 text-sm hover:bg-efb-bg-alt transition-colors">
                                        <div className="text-efb-text-secondary text-xs">{label}</div>
                                        <div className="text-right font-semibold text-efb-text">{left}</div>
                                        <div className="text-right font-semibold text-efb-text">{right}</div>
                                        <div className={`text-right font-bold text-xs ${
                                            diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-efb-text-muted"
                                        }`}>
                                            {diff > 0 ? `+${diff}` : diff === 0 ? "=" : diff}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </section>
        </>
    );
}

export default function ComparePage() {
    return (
        <Suspense>
            <CompareContent />
        </Suspense>
    );
}
