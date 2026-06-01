"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, SlidersHorizontal, ChevronLeft, ChevronRight,
    RotateCcw, Filter, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { fetchPlayers, getPlayerImageUrl } from "@/lib/efvn-api";
import type { PlayerSummary, PaginationMeta, PlayerFilterParams } from "@/lib/efvn-types";

const POSITIONS = ["GK", "CB", "LB", "RB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "SS", "CF"];
const CARD_TYPES = ["Standard", "Highlight", "Featured", "Epic", "Big Time", "Show Time", "Legendary"];
const PLAYSTYLES = [
    "Goal Poacher", "Fox in the Box", "Deep-Lying Forward", "Creative Playmaker",
    "Box To Box", "The Destroyer", "Build Up", "Offensive Full-back", "Cross Specialist"
];

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

// Clean minimal background for the card containers (if images are transparent)
function getCardBackground(cardType: string) {
    switch (cardType) {
        case "Epic": return "bg-gradient-to-b from-[#1b3d2b] to-[#0a1a12]";
        case "Big Time": return "bg-gradient-to-b from-[#4a1c1c] to-[#1a0a0a]";
        case "Show Time": return "bg-gradient-to-b from-[#3b1c4a] to-[#1a0a24]";
        case "Highlight": return "bg-gradient-to-b from-[#2a1b3d] to-[#10081c]";
        case "Featured": return "bg-gradient-to-b from-[#1a2b3c] to-[#0a111a]";
        case "Legendary": return "bg-gradient-to-b from-[#4a3b1c] to-[#241b0a]";
        default: return "bg-gradient-to-b from-[#1e2328] to-[#111417]"; // Standard
    }
}

// Text colors based on OVR to make it pop like EFHUB
function getOvrTextColor(ovr: number) {
    if (ovr >= 95) return "text-[#fadb5f]"; // Gold/Yellow
    if (ovr >= 90) return "text-[#e0bbe4]"; // Light purple
    if (ovr >= 85) return "text-[#6dd5ed]"; // Light blue
    return "text-white";
}

export default function PlayersListClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filter state
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [position, setPosition] = useState(searchParams.get("position") || "");
    const [cardType, setCardType] = useState(searchParams.get("cardType") || "");
    const [playstyle, setPlaystyle] = useState(searchParams.get("playstyle") || "");
    const [nationality, setNationality] = useState(searchParams.get("nationality") || "");
    const [club, setClub] = useState(searchParams.get("club") || "");
    const [foot, setFoot] = useState(searchParams.get("foot") || "");
    const [minOvr, setMinOvr] = useState(Number(searchParams.get("minOvr")) || 70);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "overall.max");
    const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");

    // Data state
    const [players, setPlayers] = useState<PlayerSummary[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);

    const loadPlayers = useCallback(async (p: number = page) => {
        setLoading(true);
        setError("");
        try {
            const params: PlayerFilterParams = {
                page: p,
                limit: 30, // Increased limit for smaller cards
                q: query || undefined,
                position: position || undefined,
                cardType: cardType || undefined,
                playstyle: playstyle || undefined,
                nationality: nationality || undefined,
                club: club || undefined,
                foot: foot || undefined,
                minOvr: minOvr > 70 ? minOvr : undefined,
                sortBy: sortBy as PlayerFilterParams["sortBy"],
                sortOrder: sortOrder as PlayerFilterParams["sortOrder"],
            };
            const res = await fetchPlayers(params);
            setPlayers(res.data || []);
            setMeta(res.meta || null);
        } catch {
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [query, position, cardType, playstyle, nationality, club, foot, minOvr, sortBy, sortOrder, page]);

    useEffect(() => {
        loadPlayers();
    }, [loadPlayers]);

    const syncUrl = (newPage: number) => {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (position) params.set("position", position);
        if (cardType) params.set("cardType", cardType);
        if (playstyle) params.set("playstyle", playstyle);
        if (nationality) params.set("nationality", nationality);
        if (club) params.set("club", club);
        if (foot) params.set("foot", foot);
        if (minOvr > 70) params.set("minOvr", String(minOvr));
        if (sortBy !== "overall.max") params.set("sortBy", sortBy);
        if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
        if (newPage > 1) params.set("page", String(newPage));
        const qs = params.toString();
        router.replace(`/players${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    const applyFilters = () => {
        setPage(1);
        syncUrl(1);
        setFilterOpen(false);
    };

    const resetFilters = () => {
        setQuery(""); setPosition(""); setCardType(""); setPlaystyle("");
        setNationality(""); setClub(""); setFoot(""); setMinOvr(70);
        setSortBy("overall.max"); setSortOrder("desc"); setPage(1);
        router.replace("/players", { scroll: false });
    };

    const gotoPage = (p: number) => {
        setPage(p);
        syncUrl(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const hasActiveFilters = position || cardType || playstyle || nationality || club || foot || minOvr > 70 || query;

    // ─── Filter sidebar content (shared between desktop & mobile sheet) ───
    const FilterContent = () => (
        <div className="space-y-6 text-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-widest text-efb-blue flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc nâng cao
            </h3>

            {/* Search */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Tên cầu thủ</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        placeholder="Tìm kiếm..."
                        className="pl-9 h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-efb-blue rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Nationality & Club */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-2 block">Quốc gia</label>
                    <Input
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Argentina"
                        className="h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-efb-blue rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-2 block">CLB</label>
                    <Input
                        value={club}
                        onChange={(e) => setClub(e.target.value)}
                        placeholder="Barcelona"
                        className="h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-efb-blue rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Position chips */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Vị trí</label>
                <div className="grid grid-cols-4 gap-1.5">
                    <button
                        onClick={() => setPosition("")}
                        className={`text-[10px] font-bold py-1.5 rounded-md transition-all border ${
                            !position ? "bg-efb-blue text-white border-efb-blue shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-efb-blue hover:text-efb-blue"
                        }`}
                    >
                        ALL
                    </button>
                    {POSITIONS.map((pos) => (
                        <button
                            key={pos}
                            onClick={() => setPosition(pos === position ? "" : pos)}
                            className={`text-[10px] font-bold py-1.5 rounded-md transition-all border ${
                                position === pos ? "bg-efb-blue text-white border-efb-blue shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-efb-blue hover:text-efb-blue"
                            }`}
                        >
                            {pos}
                        </button>
                    ))}
                </div>
            </div>

            {/* OVR Range */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>OVR tối thiểu</span>
                    <span className="text-efb-blue font-bold">{minOvr}+</span>
                </label>
                <input
                    type="range"
                    min={70}
                    max={105}
                    step={1}
                    value={minOvr}
                    onChange={(e) => setMinOvr(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-efb-blue"
                />
            </div>

            {/* Card type */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Loại thẻ</label>
                <Select value={cardType} onValueChange={setCardType}>
                    <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 focus:ring-efb-blue rounded-lg text-sm">
                        <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                        <SelectItem value=" ">Tất cả</SelectItem>
                        {CARD_TYPES.map((c) => (
                            <SelectItem key={c} value={c} className="focus:bg-gray-50 focus:text-efb-blue text-sm">{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Playstyle */}
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phong cách chơi</label>
                <Select value={playstyle} onValueChange={setPlaystyle}>
                    <SelectTrigger className="h-9 bg-white border-gray-200 text-gray-900 focus:ring-efb-blue rounded-lg text-sm">
                        <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                        <SelectItem value=" ">Tất cả</SelectItem>
                        {PLAYSTYLES.map((p) => (
                            <SelectItem key={p} value={p} className="focus:bg-gray-50 focus:text-efb-blue text-sm">{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
                <Button onClick={applyFilters} className="w-full h-10 bg-efb-blue hover:bg-efb-blue-light text-white font-bold text-sm rounded-lg shadow-sm">
                    <Search className="w-4 h-4 mr-2" />
                    TÌM KIẾM
                </Button>
                {hasActiveFilters && (
                    <Button onClick={resetFilters} variant="ghost" className="w-full h-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm">
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        Đặt lại
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f3f4f6] font-sans">
            {/* ─── Main Layout ─── */}
            <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col xl:flex-row gap-6">

                    {/* ─── Filter Sidebar (Desktop) ─── */}
                    <aside className="hidden xl:block xl:w-[280px] xl:flex-shrink-0">
                        <div className="bg-white border border-gray-200/60 rounded-xl p-5 sticky top-[calc(4rem+3rem+1.5rem)] shadow-sm">
                            <FilterContent />
                        </div>
                    </aside>

                    {/* ─── Mobile Filter Button + Sheet ─── */}
                    <div className="xl:hidden flex items-center justify-between mb-4">
                        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-9 rounded-lg bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:text-efb-blue gap-2 shadow-sm text-sm">
                                    <Filter className="w-4 h-4" />
                                    Bộ lọc
                                    {hasActiveFilters && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-efb-blue ml-1" />
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] p-5 overflow-y-auto bg-white border-r-gray-200">
                                <FilterContent />
                            </SheetContent>
                        </Sheet>

                        {/* Sort select on mobile */}
                        <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => {
                            const [sb, so] = v.split(":");
                            setSortBy(sb); setSortOrder(so);
                        }}>
                            <SelectTrigger className="h-9 w-[130px] bg-white border-gray-200 text-gray-800 rounded-lg text-xs shadow-sm">
                                <SelectValue placeholder="Sắp xếp" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                                <SelectItem value="overall.max:desc" className="focus:bg-gray-50 focus:text-efb-blue">OVR cao nhất</SelectItem>
                                <SelectItem value="overall.max:asc" className="focus:bg-gray-50 focus:text-efb-blue">OVR thấp nhất</SelectItem>
                                <SelectItem value="name:asc" className="focus:bg-gray-50 focus:text-efb-blue">Tên A → Z</SelectItem>
                                <SelectItem value="updatedAt:desc" className="focus:bg-gray-50 focus:text-efb-blue">Mới cập nhật</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ─── Main Content ─── */}
                    <main className="flex-1 min-w-0">
                        {/* Results header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                    Players Database
                                </h1>
                                <p className="text-xs text-gray-500 mt-1">
                                    {loading ? "Đang tải dữ liệu..." : meta ? `Hiển thị ${meta.total.toLocaleString()} kết quả · Trang ${meta.page}/${meta.totalPages}` : ""}
                                </p>
                            </div>

                            {/* Sort (desktop) */}
                            <div className="hidden xl:block">
                                <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => {
                                    const [sb, so] = v.split(":");
                                    setSortBy(sb); setSortOrder(so);
                                }}>
                                    <SelectTrigger className="h-9 w-[160px] bg-white border-gray-200 text-gray-800 hover:border-gray-300 rounded-lg text-sm transition-colors shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                                        <SelectItem value="overall.max:desc" className="focus:bg-gray-50 focus:text-efb-blue text-sm">OVR cao nhất</SelectItem>
                                        <SelectItem value="overall.max:asc" className="focus:bg-gray-50 focus:text-efb-blue text-sm">OVR thấp nhất</SelectItem>
                                        <SelectItem value="name:asc" className="focus:bg-gray-50 focus:text-efb-blue text-sm">Tên A → Z</SelectItem>
                                        <SelectItem value="updatedAt:desc" className="focus:bg-gray-50 focus:text-efb-blue text-sm">Mới cập nhật</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600 mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                {error}
                            </div>
                        )}

                        {/* ─── Player Grid / Skeleton ─── */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                                {Array.from({ length: 18 }).map((_, i) => (
                                    <div key={i} className="aspect-[5/7] bg-gray-200/60 rounded-xl overflow-hidden shadow-sm animate-pulse" />
                                ))}
                            </div>
                        ) : players.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-20 bg-white border border-gray-200/60 rounded-xl shadow-sm"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Không tìm thấy cầu thủ</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto">Vui lòng điều chỉnh bộ lọc để xem các kết quả khác.</p>
                                <Button onClick={resetFilters} variant="outline" className="mt-6 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg h-10 px-6">
                                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                    Xóa Bộ Lọc
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
                            >
                                {players.map((player) => {
                                    const ovr = player.overall?.max || player.overall?.base || 0;
                                    const rawImage = player.images?.card || player.images?.portrait || player.images?.thumbnail;
                                    const imageUrl = getPlayerImageUrl(rawImage);
                                    
                                    const bgGradient = getCardBackground(player.cardType);
                                    const ovrTextColor = getOvrTextColor(ovr);

                                    return (
                                        <motion.div key={player.efhubId || player._id} variants={cardVariants}>
                                            <Link
                                                href={`/players/${player.efhubId || player._id}`}
                                                className={`group relative block w-full aspect-[45/64] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border border-black/5 ${bgGradient}`}
                                            >
                                                {/* Image */}
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={player.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className="w-12 h-12 text-white/20" />
                                                    </div>
                                                )}

                                                {/* Dark Overlay for Text Readability at Bottom */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

                                                {/* Top Left: OVR and Position (Always visible, EFHUB Style) */}
                                                <div className="absolute top-2 left-2 flex flex-col items-center drop-shadow-md">
                                                    <span className={`text-[22px] sm:text-[26px] font-black leading-none tracking-tighter ${ovrTextColor}`}>
                                                        {ovr}
                                                    </span>
                                                    <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase mt-0.5 tracking-wide">
                                                        {player.positions?.[0] || "N/A"}
                                                    </span>
                                                </div>

                                                {/* Bottom: Name */}
                                                <div className="absolute bottom-2 left-0 right-0 px-2 text-center">
                                                    <div className="font-black text-xs sm:text-sm text-white truncate drop-shadow-lg">
                                                        {player.shortName || player.name}
                                                    </div>
                                                    
                                                    {/* Rating stars placeholder (EFHUB style visual element) */}
                                                    <div className="flex justify-center gap-[1px] mt-1 opacity-80">
                                                        {[...Array(5)].map((_, i) => (
                                                            <div key={i} className="w-1.5 h-1.5 bg-[#fadb5f] rounded-full" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}

                        {/* ─── Pagination ─── */}
                        {meta && meta.totalPages > 1 && !loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="mt-8 flex items-center justify-center gap-1.5 pb-8"
                            >
                                <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0 rounded-md bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                                    disabled={page <= 1}
                                    onClick={() => gotoPage(page - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>

                                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                                    let p: number;
                                    if (meta.totalPages <= 5) {
                                        p = i + 1;
                                    } else if (page <= 3) {
                                        p = i + 1;
                                    } else if (page >= meta.totalPages - 2) {
                                        p = meta.totalPages - 4 + i;
                                    } else {
                                        p = page - 2 + i;
                                    }
                                    return (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "outline"}
                                            className={`h-8 w-8 p-0 rounded-md text-xs font-bold transition-colors shadow-sm ${
                                                page === p 
                                                    ? "bg-efb-blue text-white border-transparent" 
                                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                            onClick={() => gotoPage(p)}
                                        >
                                            {p}
                                        </Button>
                                    );
                                })}

                                <Button
                                    variant="outline"
                                    className="h-8 w-8 p-0 rounded-md bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                                    disabled={page >= (meta?.totalPages || 1)}
                                    onClick={() => gotoPage(page + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
