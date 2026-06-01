"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    User, Share2, Camera, Settings, ChevronDown, Plus, Minus,
    RotateCcw, Save, BookOpen, Search, X, Clipboard, Check,
    ArrowUp, ArrowUpRight, ArrowRight, ArrowDown, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPlayerDetail, fetchPlayerSimilar, fetchPlayers, getPlayerImageUrl } from "@/lib/efvn-api";
import type { PlayerDetail, PlayerSummary } from "@/lib/efvn-types";
import {
    BUILD_ORDER, BUILD_LABELS, BUILD_EFFECTS, type BuildCategory, type BuildPreset,
    emptyAllocations, encodeBuild, decodeBuild,
    deriveStatsAtLevel, applyBuildBonuses, applyCondition,
    applyPresetBuild,
} from "@/lib/player-calc";

/* ═══════ Saved Build type ═══════ */
type SavedBuild = {
    id: string; name: string; level: number; condition: string;
    allocations: Record<BuildCategory, number>; createdAt: string;
};

/* ═══════ Color helpers ═══════ */
function sBadge(v: number) {
    if (v >= 90) return "bg-[#06b6d4] text-white";
    if (v >= 80) return "bg-[#22c55e] text-white";
    if (v >= 70) return "bg-[#eab308] text-black";
    if (v >= 60) return "bg-[#f97316] text-white";
    return "bg-[#ef4444] text-white";
}
function sText(v: number) {
    if (v >= 90) return "text-[#06b6d4]";
    if (v >= 80) return "text-[#22c55e]";
    if (v >= 70) return "text-[#ca8a04]";
    if (v >= 60) return "text-[#ea580c]";
    return "text-[#dc2626]";
}
function condClr(c: string) {
    return ({ A: "text-[#22c55e]", B: "text-[#06b6d4]", C: "text-[#eab308]", D: "text-[#f97316]", E: "text-[#ef4444]" } as Record<string, string>)[c.toUpperCase()] || "text-gray-500";
}

/* ═══════ Stat groups ═══════ */
const ATK = [
    { l: "Offensive Awareness", k: "offensiveAwareness" }, { l: "Ball Control", k: "ballControl" },
    { l: "Dribbling", k: "dribbling" }, { l: "Tight Possession", k: "tightPossession" },
    { l: "Low Pass", k: "lowPass" }, { l: "Lofted Pass", k: "loftedPass" },
    { l: "Finishing", k: "finishing" }, { l: "Heading", k: "heading" },
    { l: "Place Kicking", k: "setPieceTaking" }, { l: "Curl", k: "curl" },
];
const DEF_STATS = [
    { l: "Defensive Awareness", k: "defensiveAwareness" }, { l: "Defensive Engagement", k: "trackingBack" },
    { l: "Tackling", k: "ballWinning" }, { l: "Aggression", k: "aggression" },
    { l: "Goalkeeping", k: "gkAwareness" }, { l: "GK Catching", k: "gkCatching" },
    { l: "GK Clearing", k: "gkClearing" }, { l: "GK Reflexes", k: "gkReflexes" }, { l: "GK Reach", k: "gkReach" },
];
const PHY = [
    { l: "Speed", k: "speed" }, { l: "Acceleration", k: "acceleration" },
    { l: "Kicking Power", k: "kickingPower" }, { l: "Jump", k: "jump" },
    { l: "Physical Contact", k: "physicalContact" }, { l: "Balance", k: "balance" }, { l: "Stamina", k: "stamina" },
];

/* ═══════ Position grid ═══════ */
const ALL_POS = ["CF", "SS", "LWF", "RWF", "AMF", "CMF", "DMF", "LMF", "RMF", "CB", "LB", "RB", "GK"];
const POS_GRID = [
    { p: "LWF", r: 0, c: 0 }, { p: "SS", r: 0, c: 1 }, { p: "RWF", r: 0, c: 2 },
    { p: "LMF", r: 1, c: 0 }, { p: "CF", r: 1, c: 1 }, { p: "RMF", r: 1, c: 2 },
    { p: "CMF", r: 2, c: 0 }, { p: "AMF", r: 2, c: 1 }, { p: "DMF", r: 2, c: 2 },
    { p: "LB", r: 3, c: 0 }, { p: "CB", r: 3, c: 1 }, { p: "RB", r: 3, c: 2 },
    { p: "GK", r: 4, c: 1 },
];
const POS_GROUPS: Record<string, string[]> = {
    atk: ["CF", "SS", "LWF", "RWF"], mid: ["AMF", "CMF", "DMF", "LMF", "RMF"],
    def: ["CB", "LB", "RB"], gk: ["GK"],
};
const GROUP_ORDER = ["atk", "mid", "def", "gk"];
function getGroup(p: string) { return Object.keys(POS_GROUPS).find(g => POS_GROUPS[g].includes(p)) || "mid"; }
function estimateOvr(pos: string, mainPos: string, positions: string[], ovr: number, base: number) {
    if (pos === mainPos) return ovr;
    if (positions.includes(pos)) return Math.max(base, ovr - 3);
    const mg = getGroup(mainPos), tg = getGroup(pos);
    if (mg === tg) return Math.max(40, ovr - 8);
    const dist = Math.abs(GROUP_ORDER.indexOf(mg) - GROUP_ORDER.indexOf(tg));
    return Math.max(40, ovr - 8 - dist * 6);
}

const PM_F = [
    { l: "Arm Length", k: "armLength" }, { l: "Shoulder Width", k: "shoulderWidth" },
    { l: "Neck Length", k: "neckLength" }, { l: "Chest", k: "chestMeasurement" },
    { l: "Neck Size", k: "neckSize" }, { l: "Shoulder Height", k: "shoulderHeight" },
    { l: "Leg Length", k: "legLength" }, { l: "Thigh Size", k: "thighSize" },
    { l: "Waist Size", k: "waistSize" }, { l: "Arm Size", k: "armSize" }, { l: "Calf Size", k: "calfSize" },
];
const PH_F = [
    { l: "Leg Coverage Radius", k: "legCoverageRadius" }, { l: "Arm Coverage Radius", k: "armCoverageRadius" },
    { l: "Jumping Height", k: "jumpingHeight" }, { l: "Torso Collision", k: "torsoCollision" },
    { l: "Dribble Height", k: "dribbleHeight" },
];

const IMPACT: Record<string, string[]> = {
    GK: ["gkAwareness", "gkReflexes", "gkCatching", "gkReach", "gkClearing"],
    CB: ["defensiveAwareness", "ballWinning", "trackingBack", "physicalContact", "speed"],
    LB: ["defensiveAwareness", "ballWinning", "speed", "acceleration", "stamina"],
    RB: ["defensiveAwareness", "ballWinning", "speed", "acceleration", "stamina"],
    DMF: ["ballControl", "lowPass", "defensiveAwareness", "ballWinning", "stamina"],
    CMF: ["ballControl", "tightPossession", "lowPass", "loftedPass", "stamina", "dribbling"],
    AMF: ["ballControl", "tightPossession", "lowPass", "loftedPass", "dribbling", "offensiveAwareness"],
    LMF: ["ballControl", "speed", "lowPass", "dribbling", "stamina"],
    RMF: ["ballControl", "speed", "lowPass", "dribbling", "stamina"],
    CF: ["offensiveAwareness", "finishing", "speed", "acceleration", "dribbling", "kickingPower"],
    SS: ["offensiveAwareness", "finishing", "speed", "acceleration", "dribbling", "ballControl"],
    LWF: ["offensiveAwareness", "finishing", "speed", "dribbling", "acceleration"],
    RWF: ["offensiveAwareness", "finishing", "speed", "dribbling", "acceleration"],
};

/* ═══════ MAIN COMPONENT ═══════ */
export default function PlayerDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [player, setPlayer] = useState<PlayerDetail | null>(null);
    const [similar, setSimilar] = useState<PlayerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /* Interactive state */
    const [selectedPos, setSelectedPos] = useState("");
    const [level, setLevel] = useState(1);
    const [alloc, setAlloc] = useState<Record<BuildCategory, number>>(emptyAllocations());
    const [buildMode, setBuildMode] = useState<BuildPreset>("max");
    const [condition, setCondition] = useState("C");
    const [enableBuildBonuses, setEnableBuildBonuses] = useState(true);
    const [enableConditionEffect, setEnableConditionEffect] = useState(true);

    /* Panels */
    const [showPosDropdown, setShowPosDropdown] = useState(false);
    const [showMyBuilds, setShowMyBuilds] = useState(false);
    const [showCompare, setShowCompare] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copied, setCopied] = useState(false);

    /* Saved Builds */
    const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);

    /* Compare */
    const [compareQuery, setCompareQuery] = useState("");
    const [compareResults, setCompareResults] = useState<PlayerSummary[]>([]);
    const [comparePlayer, setComparePlayer] = useState<PlayerDetail | null>(null);
    const [compareLoading, setCompareLoading] = useState(false);

    /* Load player data */
    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError("");
        (async () => {
            try {
                const res = await fetchPlayerDetail(id);
                if (cancelled) return;
                const p = res.data;
                setPlayer(p);
                const maxLv = p.levels?.max || 1;
                const cap = Math.max(0, (maxLv - 1) * 2);
                const pos = p.positions?.[0] || "CMF";
                setSelectedPos(pos);
                setCondition(p.condition?.form || "C");

                // URL state sync: read from URL params
                const urlLv = parseInt(searchParams.get("lv") || "");
                const urlCond = searchParams.get("condition")?.toUpperCase();
                const urlBuild = searchParams.get("build");

                if (Number.isFinite(urlLv) && urlLv > 0) {
                    setLevel(Math.min(maxLv, urlLv));
                } else {
                    setLevel(maxLv);
                }
                if (urlCond && ["A", "B", "C", "D", "E"].includes(urlCond)) {
                    setCondition(urlCond);
                }
                if (urlBuild) {
                    setAlloc(decodeBuild(urlBuild));
                    setBuildMode("max"); // custom since loaded from URL
                } else {
                    setAlloc(applyPresetBuild("max", pos, cap));
                    setBuildMode("max");
                }

                // Load saved builds from localStorage
                try {
                    const raw = localStorage.getItem(`efvn_builds_${p.efhubId}`);
                    if (raw) setSavedBuilds(JSON.parse(raw));
                } catch { /* ignore */ }
            } catch { if (!cancelled) setError("Không tìm thấy cầu thủ."); }
            finally { if (!cancelled) setLoading(false); }
        })();
        fetchPlayerSimilar(id, 8).then(r => { if (!cancelled) setSimilar(r.data || []); }).catch(() => {});
        return () => { cancelled = true; };
    }, [id, searchParams]);

    /* Computed stats */
    const computed = useMemo(() => {
        if (!player) return null;
        const maxLv = player.levels?.max || 1;
        const cap = Math.max(0, (maxLv - 1) * 2);
        const used = BUILD_ORDER.reduce((s, k) => s + (alloc[k] || 0), 0);
        const derived = deriveStatsAtLevel(
            player.stats?.level1 || {}, player.stats?.maxLevel || player.stats?.level1 || {},
            level, maxLv, player.overall?.base || 0, player.overall?.max || 0,
        );
        const withBuild = enableBuildBonuses ? applyBuildBonuses(derived.stats, alloc) : derived.stats;
        const finalStats = enableConditionEffect ? applyCondition(withBuild, condition) : withBuild;

        const impactKeys = IMPACT[selectedPos] || IMPACT["CMF"];
        const baseAvg = impactKeys.reduce((s, k) => s + (derived.stats[k] || 0), 0) / impactKeys.length;
        const finalAvg = impactKeys.reduce((s, k) => s + (finalStats[k] || 0), 0) / impactKeys.length;
        const ovrBoost = Math.max(-8, Math.min(12, Math.round((finalAvg - baseAvg) / 2.8)));
        const condBoost = enableConditionEffect ? (condition === "A" ? 1 : condition === "B" ? 0 : condition === "D" ? -1 : condition === "E" ? -1 : 0) : 0;
        const finalOvr = Math.max(1, Math.min(120, derived.overall + ovrBoost + condBoost));

        return { stats: finalStats, baseStats: derived.stats, overall: finalOvr, level: derived.level, maxLv, pointsCap: cap, pointsUsed: used, remaining: cap - used };
    }, [player, level, alloc, condition, selectedPos, enableBuildBonuses, enableConditionEffect]);

    /* Compare player stats */
    const compareStats = useMemo(() => {
        if (!comparePlayer) return null;
        const maxLv = comparePlayer.levels?.max || 1;
        const derived = deriveStatsAtLevel(
            comparePlayer.stats?.level1 || {}, comparePlayer.stats?.maxLevel || comparePlayer.stats?.level1 || {},
            level, maxLv, comparePlayer.overall?.base || 0, comparePlayer.overall?.max || 0,
        );
        return { name: comparePlayer.name, overall: derived.overall, stats: derived.stats };
    }, [comparePlayer, level]);

    /* Actions */
    const adjustAlloc = useCallback((cat: BuildCategory, delta: number) => {
        setAlloc(prev => {
            const cur = prev[cat] || 0;
            const totalUsed = BUILD_ORDER.reduce((s, k) => s + (prev[k] || 0), 0);
            const cap = player ? Math.max(0, ((player.levels?.max || 1) - 1) * 2) : 0;
            if (delta > 0 && totalUsed >= cap) return prev;
            const newVal = Math.max(0, Math.min(20, cur + delta));
            if (newVal === cur) return prev;
            return { ...prev, [cat]: newVal };
        });
    }, [player]);

    const doPreset = useCallback((preset: BuildPreset) => {
        if (!player) return;
        const cap = Math.max(0, ((player.levels?.max || 1) - 1) * 2);
        setAlloc(applyPresetBuild(preset, selectedPos, cap));
        setBuildMode(preset);
    }, [player, selectedPos]);

    const resetBuild = useCallback(() => { setAlloc(emptyAllocations()); }, []);

    const changePosition = useCallback((pos: string) => {
        setSelectedPos(pos);
        setShowPosDropdown(false);
        if (buildMode === "smart" && player) {
            const cap = Math.max(0, ((player.levels?.max || 1) - 1) * 2);
            setAlloc(applyPresetBuild("smart", pos, cap));
        }
    }, [buildMode, player]);

    const changeLevel = useCallback((newLv: number) => {
        if (!player) return;
        setLevel(Math.max(1, Math.min(player.levels?.max || 1, newLv)));
    }, [player]);

    /* Save Build */
    const saveBuild = useCallback(() => {
        if (!player) return;
        const newBuild: SavedBuild = {
            id: `build-${Date.now()}`, name: `Build ${savedBuilds.length + 1}`,
            level, condition, allocations: alloc, createdAt: new Date().toISOString(),
        };
        const merged = [newBuild, ...savedBuilds].slice(0, 20);
        setSavedBuilds(merged);
        localStorage.setItem(`efvn_builds_${player.efhubId}`, JSON.stringify(merged));
        setShowMyBuilds(true);
    }, [player, level, condition, alloc, savedBuilds]);

    const loadBuild = useCallback((b: SavedBuild) => {
        setLevel(b.level); setCondition(b.condition); setAlloc(b.allocations);
    }, []);

    const deleteBuild = useCallback((buildId: string) => {
        if (!player) return;
        const filtered = savedBuilds.filter(b => b.id !== buildId);
        setSavedBuilds(filtered);
        localStorage.setItem(`efvn_builds_${player.efhubId}`, JSON.stringify(filtered));
    }, [player, savedBuilds]);

    /* Share Build */
    const shareBuild = useCallback(async () => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        url.searchParams.set("lv", String(level));
        url.searchParams.set("condition", condition);
        url.searchParams.set("build", encodeBuild(alloc));
        try { await navigator.clipboard.writeText(url.toString()); } catch { window.prompt("Copy link:", url.toString()); }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [level, condition, alloc]);

    /* Compare */
    const searchCompare = useCallback(async () => {
        const q = compareQuery.trim();
        if (!q) return;
        setCompareLoading(true);
        try {
            const res = await fetchPlayers({ q, limit: 6, page: 1 });
            setCompareResults(res.data || []);
            if (res.data?.length) {
                const detail = await fetchPlayerDetail(res.data[0].efhubId || (res.data[0] as any)._id);
                setComparePlayer(detail.data);
            }
        } catch { setCompareResults([]); }
        finally { setCompareLoading(false); }
    }, [compareQuery]);

    const selectCompare = useCallback(async (p: PlayerSummary) => {
        try {
            const detail = await fetchPlayerDetail(p.efhubId || (p as any)._id);
            setComparePlayer(detail.data);
        } catch { /* ignore */ }
    }, []);

    /* RENDER */
    if (loading) return <DetailSkeleton />;
    if (error || !player || !computed) return (
        <div className="max-w-[1100px] mx-auto px-6 py-20 text-center">
            <p className="text-gray-500">{error || "Không tìm thấy cầu thủ."}</p>
            <Button asChild variant="outline" className="mt-4"><Link href="/players">Quay lại</Link></Button>
        </div>
    );

    const mainPos = player.positions?.[0] || "N/A";
    const cardImg = getPlayerImageUrl(player.images?.card);
    const portraitImg = getPlayerImageUrl(player.images?.portrait);
    const playstyles = player.playstyles || (player.playingStyle ? [player.playingStyle] : []);
    const mainPS = player.playingStyle || playstyles[0] || "";
    const skills = player.skills || [];
    const pm = player.playerModel;
    const { stats, baseStats, overall, maxLv, pointsCap, pointsUsed, remaining } = computed;
    const ovrBase = player.overall?.base || 0;

    return (
        <div className="bg-white min-h-screen text-gray-900">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-4 pb-16">

                {/* ─── HEADER ─── */}
                <div className="flex items-start justify-between gap-4 mb-0.5">
                    <div>
                        <h1 className="text-[26px] sm:text-[32px] font-extrabold uppercase tracking-tight leading-tight">{player.name}</h1>
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-widest">{mainPS || "BUILD UP"}</p>
                    </div>
                    {cardImg && (
                        <div className="shrink-0 relative hidden sm:block">
                            <div className="w-[52px] h-[62px] rounded overflow-hidden shadow border border-gray-200"><img src={cardImg} alt="" className="w-full h-full object-cover" /></div>
                            <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">{overall}</div>
                        </div>
                    )}
                </div>

                {/* ─── NAV TABS ─── */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-5 overflow-x-auto">
                    <button onClick={() => setShowCompare(v => !v)} className={`hover:text-gray-900 transition-colors whitespace-nowrap ${showCompare ? "text-gray-900" : ""}`}>Compare</button>
                    <button onClick={() => setShowMyBuilds(v => !v)} className={`hover:text-gray-900 transition-colors whitespace-nowrap ${showMyBuilds ? "text-gray-900" : ""}`}>My Builds</button>
                    <button onClick={saveBuild} className="hover:text-gray-900 transition-colors whitespace-nowrap">Save Build</button>
                    <button onClick={shareBuild} className="hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-1">
                        {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied!</> : <><Share2 className="w-3 h-3" /> Share</>}
                    </button>
                    <button onClick={() => window.print()} className="hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-1"><Camera className="w-3 h-3" /> Screenshot</button>
                    <button onClick={() => setShowSettings(v => !v)} className={`hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-1 ${showSettings ? "text-gray-900" : ""}`}><Settings className="w-3 h-3" /> Settings</button>
                </div>

                {/* ─── COMPARE PANEL ─── */}
                {showCompare && (
                    <div className="mb-5 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-2">
                            <input value={compareQuery} onChange={e => setCompareQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchCompare()}
                                className="flex-1 h-8 border border-gray-200 rounded px-2 text-[13px] bg-white" placeholder="Nhập tên hoặc ID cầu thủ..." />
                            <button onClick={searchCompare} disabled={compareLoading} className="h-8 px-3 bg-blue-500 text-white text-[12px] font-semibold rounded hover:bg-blue-600 disabled:opacity-50 transition-colors">
                                {compareLoading ? "..." : "Tìm"}
                            </button>
                            <button onClick={() => { setShowCompare(false); setComparePlayer(null); setCompareResults([]); }} className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </div>
                        {compareResults.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {compareResults.map(p => (
                                    <button key={p.efhubId || (p as any)._id} onClick={() => selectCompare(p)}
                                        className={`px-2 py-1 rounded text-[11px] border transition-colors ${comparePlayer?.efhubId === p.efhubId ? "bg-blue-50 border-blue-400 text-blue-700 font-bold" : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"}`}>
                                        {p.name} ({p.overall?.max || 0})
                                    </button>
                                ))}
                            </div>
                        )}
                        {compareStats && <div className="mt-2 text-[11px] text-gray-500">So sánh với: <span className="font-bold text-gray-800">{compareStats.name}</span> (OVR {compareStats.overall})</div>}
                    </div>
                )}

                {/* ─── MY BUILDS PANEL ─── */}
                {showMyBuilds && (
                    <div className="mb-5 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Build Của Tôi ({savedBuilds.length})</span>
                            <button onClick={() => setShowMyBuilds(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </div>
                        {savedBuilds.length === 0 ? <p className="text-[12px] text-gray-400 italic">Chưa có build đã lưu. Bấm "Save Build" để lưu.</p> : (
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {savedBuilds.map(b => (
                                    <div key={b.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-2.5 py-1.5">
                                        <button onClick={() => loadBuild(b)} className="text-left flex-1">
                                            <div className="text-[12px] font-semibold text-gray-800">{b.name}</div>
                                            <div className="text-[10px] text-gray-400">Lv {b.level} | {b.condition} | {encodeBuild(b.allocations)}</div>
                                        </button>
                                        <button onClick={() => deleteBuild(b.id)} className="text-gray-300 hover:text-red-400 ml-2"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── SETTINGS PANEL ─── */}
                {showSettings && (
                    <div className="mb-5 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Tùy Chỉnh</span>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </div>
                        <label className="flex items-center justify-between py-1.5 text-[13px]">
                            <span className="text-gray-600">Áp dụng điểm Build vào chỉ số</span>
                            <input type="checkbox" checked={enableBuildBonuses} onChange={e => setEnableBuildBonuses(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                        </label>
                        <label className="flex items-center justify-between py-1.5 text-[13px]">
                            <span className="text-gray-600">Áp dụng Condition vào chỉ số</span>
                            <input type="checkbox" checked={enableConditionEffect} onChange={e => setEnableConditionEffect(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                        </label>
                        <button onClick={resetBuild} className="mt-2 w-full h-8 bg-gray-100 border border-gray-200 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors">Đặt Lại Build</button>
                    </div>
                )}

                {/* ─── HERO ROW ─── */}
                <div className="flex flex-col lg:flex-row gap-5 mb-8">
                    <div className="flex gap-3 shrink-0">
                        <div className="flex flex-col gap-2 pt-1">
                            {player.metaImages?.nationality ? <img src={player.metaImages.nationality} alt="" title={player.nationality} className="w-7 h-7 rounded-full border border-gray-200 object-cover" /> : <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center"><span className="text-[9px]">🏳</span></div>}
                            {player.metaImages?.club ? <img src={player.metaImages.club} alt="" title={player.club} className="w-7 h-7 rounded-full border border-gray-200 object-cover" /> : <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center"><span className="text-[9px]">⚽</span></div>}
                            {player.metaImages?.league && <img src={player.metaImages.league} alt="" title={player.league} className="w-7 h-7 rounded-full border border-gray-200 object-cover" />}
                        </div>
                        <div className="w-[150px] sm:w-[165px] shrink-0">
                            {cardImg ? <img src={cardImg} alt={player.name} className="w-full rounded shadow-md" /> : <div className="w-full aspect-[45/64] bg-gray-100 rounded flex items-center justify-center"><User className="w-12 h-12 text-gray-300" /></div>}
                            <div className="flex items-center gap-0.5 mt-1.5">
                                <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center"><User className="w-3 h-3 text-gray-400" /></div>
                                <div className="flex ml-0.5">{[1,2,3,4,5].map(i => <span key={i} className="text-[16px] text-yellow-400">★</span>)}</div>
                            </div>
                            <div className="flex gap-1.5 mt-1.5">
                                <select className="flex-1 h-7 bg-white border border-gray-200 rounded text-[11px] text-gray-600 px-0.5 cursor-pointer hover:border-gray-300">
                                    <option>Booster 1</option><option>Shooting +3</option><option>Passing +3</option><option>Dribbling +3</option><option>Defending +3</option><option>Physical +3</option><option>Speed +3</option>
                                </select>
                                <select className="flex-1 h-7 bg-white border border-gray-200 rounded text-[11px] text-gray-600 px-0.5 cursor-pointer hover:border-gray-300">
                                    <option>Booster 2</option><option>Shooting +3</option><option>Passing +3</option><option>Dribbling +3</option><option>Defending +3</option><option>Physical +3</option><option>Speed +3</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5 pt-1 min-w-[68px]">
                            {[{ l: "Height", v: player.height ? `${player.height}cm` : "—" }, { l: "Weight", v: player.weight ? `${player.weight}kg` : "—" }, { l: "Age", v: player.age ?? "—" }, { l: "Foot", v: player.foot || "—" }].map((x, i) => (
                                <div key={i}><div className="text-[10px] text-gray-400">{x.l}</div><div className="text-[14px] font-bold text-gray-800">{String(x.v)}</div></div>
                            ))}
                            <div><div className="text-[10px] text-gray-400">Condition</div><div className={`text-[14px] font-bold ${condClr(condition)}`}>{condition}</div></div>
                        </div>
                    </div>
                    <div className="flex-1 relative hidden lg:flex items-end justify-center overflow-hidden min-h-[220px]">
                        {portraitImg && <img src={portraitImg} alt="" className="h-full max-h-[280px] object-contain opacity-[0.12] select-none pointer-events-none" />}
                    </div>
                    <div className="w-full lg:w-[275px] shrink-0">
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="grid grid-cols-3 gap-[3px] p-3 bg-gray-50" style={{ gridTemplateRows: "repeat(5, 1fr)" }}>
                                {POS_GRID.map(({ p, r, c }) => {
                                    const isMain = p === mainPos, isPlay = player.positions?.includes(p), isSel = p === selectedPos;
                                    const posOvr = estimateOvr(p, mainPos, player.positions || [], overall, ovrBase);
                                    let bg = "bg-[#e5e7eb] text-gray-500";
                                    if (isSel) bg = "bg-[#2563eb] text-white ring-2 ring-blue-400";
                                    else if (isMain) bg = "bg-[#22c55e] text-white";
                                    else if (isPlay) bg = "bg-[#166534] text-white";
                                    return (
                                        <div key={p} style={{ gridRow: r + 1, gridColumn: c + 1 }}
                                            onClick={() => changePosition(p)}
                                            className={`flex flex-col items-center justify-center rounded py-1.5 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${bg}`}>
                                            <span className="text-[11px] font-bold uppercase leading-none">{p}</span>
                                            <span className="text-[13px] font-extrabold leading-none mt-0.5">{posOvr}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 p-2.5 border-t border-gray-200">
                                <button className="flex-1 h-7 bg-[#dbeafe] border border-[#93c5fd] text-[#2563eb] text-[11px] font-semibold rounded truncate px-2">{mainPS || "Playstyle"}</button>
                                <button className="flex-1 h-7 bg-[#dbeafe] border border-[#93c5fd] text-[#2563eb] text-[11px] font-semibold rounded">Position Boosters</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── BUILD PANEL + STATS ─── */}
                <div className="flex flex-col lg:flex-row gap-6 mb-8">
                    <div className="w-full lg:w-[280px] shrink-0 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                        {/* Position + Presets */}
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            <div className="relative">
                                <button onClick={() => setShowPosDropdown(!showPosDropdown)} className="h-7 px-2.5 bg-white border border-gray-200 rounded text-[12px] font-bold text-gray-700 flex items-center gap-1 hover:bg-gray-50 transition-colors">
                                    {selectedPos} <ChevronDown className="w-2.5 h-2.5" />
                                </button>
                                {showPosDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[80px]">
                                        {ALL_POS.map(pos => (
                                            <button key={pos} onClick={() => changePosition(pos)}
                                                className={`block w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-blue-50 transition-colors ${pos === selectedPos ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700"} ${player.positions?.includes(pos) ? "" : "text-gray-400"}`}>
                                                {pos} {player.positions?.includes(pos) ? "●" : ""}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {(["max", "smart", "attack", "creative", "defense", "goalkeeper"] as BuildPreset[]).map(p => (
                                <button key={p} onClick={() => doPreset(p)} className={`h-7 px-2 rounded text-[10px] font-bold transition-colors uppercase ${buildMode === p ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-blue-600 hover:bg-blue-50"}`}>
                                    {p === "goalkeeper" ? "GK" : p}
                                </button>
                            ))}
                            <button onClick={resetBuild} className="h-7 w-7 bg-white border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 transition-colors" title="Reset"><RotateCcw className="w-3 h-3 text-gray-500" /></button>
                        </div>
                        {/* Level + Points */}
                        <div className="flex items-center justify-between text-[12px] text-gray-500 mb-2">
                            <div className="flex items-center gap-1.5">
                                <span>Level Cap</span>
                                <div className="flex items-center border border-gray-200 rounded bg-white">
                                    <button onClick={() => changeLevel(level - 1)} disabled={level <= 1} className="w-5 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><Minus className="w-2.5 h-2.5" /></button>
                                    <input type="number" min={1} max={maxLv} value={level} onChange={e => changeLevel(parseInt(e.target.value) || 1)}
                                        className="w-8 h-6 text-center text-[12px] font-bold text-gray-800 border-x border-gray-200 bg-transparent" />
                                    <button onClick={() => changeLevel(level + 1)} disabled={level >= maxLv} className="w-5 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><Plus className="w-2.5 h-2.5" /></button>
                                </div>
                            </div>
                            <span>Points <span className="font-bold text-gray-800">{pointsUsed}</span><span className="text-gray-400"> / {pointsCap}</span></span>
                        </div>
                        {/* Level slider */}
                        {maxLv > 1 && (
                            <input type="range" min={1} max={maxLv} value={level} onChange={e => changeLevel(parseInt(e.target.value))}
                                className="w-full h-1.5 mb-3 accent-blue-500 cursor-pointer" />
                        )}
                        {/* Category sliders */}
                        <div className="space-y-1.5">
                            {BUILD_ORDER.map(cat => {
                                const val = alloc[cat] || 0;
                                return (
                                    <div key={cat} className="flex items-center gap-1.5">
                                        <button onClick={() => adjustAlloc(cat, -1)} disabled={val <= 0} className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[10px] mb-0.5">
                                                <span className="font-semibold text-gray-600 uppercase tracking-wide">{BUILD_LABELS[cat]}</span>
                                                <span className="font-bold text-gray-800">{val}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200" style={{ width: `${(val / 20) * 100}%` }} />
                                            </div>
                                        </div>
                                        <button onClick={() => adjustAlloc(cat, 1)} disabled={val >= 20 || remaining <= 0} className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Condition */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Condition</div>
                            <div className="flex gap-1">
                                {["A", "B", "C", "D", "E"].map(c => (
                                    <button key={c} onClick={() => setCondition(c)} className={`flex-1 h-6 text-[12px] font-bold rounded transition-colors ${condition === c ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"}`}>{c}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3-column stats */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                        <StatCol title="ATTACKING" items={ATK} stats={stats} base={baseStats} compare={compareStats?.stats} />
                        <StatCol title="DEFENDING" items={DEF_STATS} stats={stats} base={baseStats} compare={compareStats?.stats} />
                        <StatCol title="ATHLETICISM" items={PHY} stats={stats} base={baseStats} compare={compareStats?.stats} />
                    </div>
                </div>

                {/* ─── SKILLS + PLAYSTYLES + PLAYER MODEL + PHYSICS ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 mb-10">
                    <div>
                        <Sec>Skills</Sec>
                        {skills.length > 0 ? skills.map((s, i) => <div key={i} className="text-[13px] text-gray-600 py-[4px] border-b border-gray-50 capitalize">{s}</div>) : <p className="text-[12px] text-gray-400 italic">No skills</p>}
                    </div>
                    <div>
                        <Sec>Playstyles</Sec>
                        {playstyles.length > 0 ? playstyles.map((s, i) => <div key={i} className="text-[13px] text-gray-600 py-[4px] border-b border-gray-50 capitalize">{s}</div>) : <p className="text-[12px] text-gray-400 italic">No playstyles</p>}
                    </div>
                    <div>
                        <Sec>Player Model</Sec>
                        {pm ? PM_F.map(f => { const v = pm[f.k as keyof typeof pm]; if (v == null) return null; return <div key={f.k} className="flex justify-between py-[4px] border-b border-gray-50"><span className="text-[13px] text-gray-600">{f.l}</span><span className="text-[13px] font-bold text-gray-800">{v}</span></div>; }) : <p className="text-[12px] text-gray-400 italic">No data</p>}
                    </div>
                    <div>
                        <Sec>Physics</Sec>
                        {pm ? PH_F.map(f => { const v = pm[f.k as keyof typeof pm]; if (v == null) return null; return <div key={f.k} className="flex justify-between py-[4px] border-b border-gray-50"><span className="text-[13px] text-gray-600">{f.l}</span><span className="text-[13px] font-bold text-gray-800">{v}</span></div>; }) : <p className="text-[12px] text-gray-400 italic">No data</p>}
                    </div>
                </div>

                {/* ─── PLAYER INFO ─── */}
                <div className="mb-10">
                    <Sec>Player Info</Sec>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-3">
                        {[
                            { l: "Club", v: player.club }, { l: "League", v: player.league }, { l: "Nationality", v: player.nationality },
                            { l: "Card Type", v: player.cardType }, { l: "Rarity", v: player.rarity },
                            { l: "OVR (Base)", v: ovrBase }, { l: "OVR (Max)", v: player.overall?.max },
                            { l: "Current Level", v: player.levels?.current }, { l: "Max Level", v: maxLv },
                            { l: "Weak Foot Usage", v: player.weakFootUsage }, { l: "Weak Foot Accuracy", v: player.weakFootAccuracy },
                            { l: "Injury Resistance", v: player.condition?.injuryResistance }, { l: "Positions", v: player.positions?.join(", ") },
                        ].filter(x => x.v != null && x.v !== "").map((x, i) => (
                            <div key={i}><div className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">{x.l}</div><div className="text-[14px] font-semibold text-gray-800">{String(x.v)}</div></div>
                        ))}
                    </div>
                </div>

                {/* ─── SIMILAR ─── */}
                {similar.length > 0 && (
                    <div>
                        <Sec>Similar Players</Sec>
                        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {similar.map(p => {
                                const pImg = getPlayerImageUrl(p.images?.card || p.images?.portrait || p.images?.thumbnail);
                                return (
                                    <motion.div key={p.efhubId || (p as any)._id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                                        <Link href={`/players/${p.efhubId || (p as any)._id}`} className="group block rounded-lg overflow-hidden border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all">
                                            <div className="relative aspect-[45/64] bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center">
                                                {pImg ? <img src={pImg} alt={p.name} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-300" />}
                                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{p.overall?.max || 0}</div>
                                            </div>
                                            <div className="px-2 py-1.5">
                                                <div className="text-[12px] font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{p.name}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{p.positions?.[0]} · {p.club}</div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                )}
            </div>
            {showPosDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowPosDropdown(false)} />}
        </div>
    );
}

/* ─── Sub-components ─── */
function Sec({ children }: { children: React.ReactNode }) {
    return <h3 className="text-[14px] font-extrabold text-gray-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-200">{children}</h3>;
}

function StatCol({ title, items, stats, base, compare }: { title: string; items: { l: string; k: string }[]; stats: Record<string, number>; base: Record<string, number>; compare?: Record<string, number> | null }) {
    return (
        <div>
            <h3 className="text-[14px] font-extrabold text-gray-800 uppercase tracking-wider mb-2 pb-1 border-b border-gray-200">{title}</h3>
            {items.map(({ l, k }) => {
                const val = stats[k] || 0;
                const bv = base[k] || 0;
                const diff = val - bv;
                const cmpVal = compare?.[k];
                const cmpDiff = cmpVal != null ? val - cmpVal : null;
                return (
                    <div key={k} className="flex items-center justify-between py-[4px] border-b border-gray-50">
                        <span className={`text-[13px] font-medium ${sText(val)}`}>{l}</span>
                        <div className="flex items-center gap-1">
                            {diff !== 0 && <span className={`text-[10px] font-bold ${diff > 0 ? "text-green-500" : "text-red-400"}`}>{diff > 0 ? `+${diff}` : diff}</span>}
                            {cmpDiff != null && cmpDiff !== 0 && <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${cmpDiff > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{cmpDiff > 0 ? `↑${cmpDiff}` : `↓${Math.abs(cmpDiff)}`}</span>}
                            <span className={`inline-flex items-center justify-center w-8 h-[22px] text-[13px] font-bold rounded-[3px] ${sBadge(val)}`}>{val || "—"}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-[1100px] mx-auto px-6 pt-4 pb-16">
                <Skeleton className="h-8 w-64 mb-1.5" /><Skeleton className="h-3 w-28 mb-5" />
                <div className="flex flex-col lg:flex-row gap-5 mb-8">
                    <div className="flex gap-3"><div className="flex flex-col gap-2"><Skeleton className="w-7 h-7 rounded-full" /><Skeleton className="w-7 h-7 rounded-full" /></div><Skeleton className="w-[165px] aspect-[45/64] rounded" /><div className="space-y-3 pt-1">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-7 w-14" />)}</div></div>
                    <div className="flex-1" /><Skeleton className="w-full lg:w-[275px] h-[260px] rounded-lg" />
                </div>
                <div className="flex flex-col lg:flex-row gap-6"><Skeleton className="w-full lg:w-[280px] h-[400px] rounded-lg" /><div className="flex-1 grid grid-cols-3 gap-6">{[1,2,3].map(i=>(<div key={i} className="space-y-2"><Skeleton className="h-4 w-24 mb-2" />{Array.from({length:7}).map((_,j)=><Skeleton key={j} className="h-4 w-full" />)}</div>))}</div></div>
            </div>
        </div>
    );
}
