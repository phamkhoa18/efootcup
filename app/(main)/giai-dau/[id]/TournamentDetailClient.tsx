"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Trophy, Users, Calendar, MapPin, Flame, Share2, ChevronRight,
    Gamepad2, Award, FileText, UserPlus, Clock, Shield, Swords,
    Loader2, Globe, CheckCircle2, Eye, Ban, DollarSign, Phone, Mail, MessageCircle,
    LogIn, AlertCircle, Info, X, Watch
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/* ===== Config ===== */
const statusConfig: Record<string, { label: string; icon: typeof Flame; bgClass: string }> = {
    registration: { label: "Đang mở đăng ký", icon: Clock, bgClass: "bg-amber-400 text-amber-900 border-transparent" },
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

const tabs = [
    { key: "overview", label: "Tổng quan", icon: FileText },
    { key: "bracket", label: "Sơ đồ thi đấu", icon: Swords },
    { key: "players", label: "Danh sách VĐV", icon: Users },
    { key: "schedule", label: "Lịch thi đấu", icon: Calendar },
    { key: "register", label: "Đăng ký", icon: UserPlus },
];

const UNIT_HEIGHT = 110;

const MatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => {
    const homeName = match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.ingame || "TBD";
    const awayName = match.awayTeam?.name || match.awayTeam?.shortName || match.p2?.ingame || "TBD";
    const homeScore = match.homeScore ?? match.p1?.score ?? 0;
    const awayScore = match.awayScore ?? match.p2?.score ?? 0;
    const isCompleted = match.status === "completed" || match.status === "Kết thúc";
    const isLive = match.status === "live" || match.status === "Đang diễn ra";
    const homeWin = isCompleted && homeScore > awayScore;
    const awayWin = isCompleted && awayScore > homeScore;

    return (
        <motion.div
            whileHover={{ y: -2 }}
            onClick={onClick}
            className="w-[180px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden z-20 cursor-pointer hover:border-efb-blue/40 hover:shadow-md transition-all group relative"
        >
            {isLive && (
                <div className="bg-red-500 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    LIVE
                </div>
            )}
            <div className={`flex items-center justify-between px-3 py-2 text-[12px] ${homeWin ? "bg-blue-50/50" : ""}`}>
                <div className="flex flex-col min-w-0 pr-2">
                    <span className={`truncate font-bold leading-tight ${homeWin ? "text-efb-blue" : "text-efb-text-secondary"}`}>
                        {homeName}
                    </span>
                    {(match.homeTeam?.player1 || match.p1) && (
                        <span className={`truncate text-[9px] mt-0.5 ${homeWin ? "text-efb-blue/80" : "text-gray-400"}`}>
                            {match.homeTeam?.player1 || match.p1?.name} {match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? `& ${match.homeTeam.player2}` : ""}
                        </span>
                    )}
                </div>
                <span className="font-bold tabular-nums text-efb-text-muted">{homeScore}</span>
            </div>
            <div className="h-px bg-gray-50 mx-2" />
            <div className={`flex items-center justify-between px-3 py-2 text-[12px] ${awayWin ? "bg-blue-50/50" : ""}`}>
                <div className="flex flex-col min-w-0 pr-2">
                    <span className={`truncate font-bold leading-tight ${awayWin ? "text-efb-blue" : "text-efb-text-secondary"}`}>
                        {awayName}
                    </span>
                    {(match.awayTeam?.player1 || match.p2) && (
                        <span className={`truncate text-[9px] mt-0.5 ${awayWin ? "text-efb-blue/80" : "text-gray-400"}`}>
                            {match.awayTeam?.player1 || match.p2?.name} {match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? `& ${match.awayTeam.player2}` : ""}
                        </span>
                    )}
                </div>
                <span className="font-bold tabular-nums text-efb-text-muted">{awayScore}</span>
            </div>
        </motion.div>
    );
};

const MatchDetailViewModal = ({ match, tournament, onClose }: { match: any; tournament: any; onClose: () => void }) => {
    const homeScore = match.homeScore ?? "";
    const awayScore = match.awayScore ?? "";

    const formatNameStr = (team: any, pFallback: any) => {
        const p1 = team?.player1 || pFallback?.name || "Tự do";
        const p2 = team?.player2 && team.player2 !== "TBD" ? ` / ${team.player2}` : "";
        return `${p1}${p2}`;
    };

    const hName = formatNameStr(match.homeTeam, match.p1);
    const aName = formatNameStr(match.awayTeam, match.p2);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-4xl p-0 overflow-hidden border-0 rounded-[12px] shadow-2xl bg-white flex flex-col max-h-[90vh]"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Chi tiết trận đấu</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 pb-2 overflow-y-auto custom-scrollbar flex-1">
                    <div className="bg-[#F0F7FF] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-y-2 mb-6">
                        <div>
                            <div className="font-bold text-gray-900 text-sm mb-1">{tournament?.title || "Giải đấu"}</div>
                            <div className="text-gray-500 text-xs flex flex-wrap items-center gap-4 sm:gap-6">
                                <span>Hình thức: <span className="text-gray-900 font-semibold">{tournament?.format === 'round_robin' ? 'Vòng tròn' : "Loại trực tiếp"}</span></span>
                                <span>Vòng đấu: <span className="text-gray-900 font-semibold">{match.roundName || `Vòng ${match.round}`}</span></span>
                            </div>
                        </div>
                        {match.status === "completed" && (
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết thúc
                            </div>
                        )}
                        {match.status === "live" && (
                            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Đang diễn ra
                            </div>
                        )}
                    </div>
                    <div className="border border-solid border-gray-100 rounded-xl p-4 sm:p-5 bg-gray-50/50 shadow-inner">
                        <div className="flex justify-between text-sm font-bold text-gray-900 mb-4 px-1">
                            <div>VĐV / Đội thi đấu</div>
                            <div>Kết quả</div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className={`p-4 rounded-xl flex items-center justify-between border ${match.homeScore > match.awayScore ? "bg-blue-50/80 border-blue-200" : "bg-white border-gray-200"}`}>
                                <div>
                                    <div className={`font-bold ${match.homeScore > match.awayScore ? "text-efb-blue" : "text-gray-900"}`}>{match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.name || "Tự do"}</div>
                                    <div className="text-xs text-gray-500 mt-1">{hName}</div>
                                </div>
                                <div className="text-2xl font-black text-gray-900 pr-2">{homeScore}</div>
                            </div>
                            <div className={`p-4 rounded-xl flex items-center justify-between border ${match.awayScore > match.homeScore ? "bg-blue-50/80 border-blue-200" : "bg-white border-gray-200"}`}>
                                <div>
                                    <div className={`font-bold ${match.awayScore > match.homeScore ? "text-efb-blue" : "text-gray-900"}`}>{match.awayTeam?.name || match.awayTeam?.shortName || match.p2?.name || "Tự do"}</div>
                                    <div className="text-xs text-gray-500 mt-1">{aName}</div>
                                </div>
                                <div className="text-2xl font-black text-gray-900 pr-2">{awayScore}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="bg-white px-8 h-10 rounded-lg border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm transition-colors">Đóng</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function TournamentDetailClient({ initialData, id }: { initialData: any; id: string }) {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [data, setData] = useState<any>(initialData);
    const [brackets, setBrackets] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerMsg, setRegisterMsg] = useState<{ type: string; text: string } | null>(null);
    const [myRegistration, setMyRegistration] = useState<any>(null);
    const [checkingRegistration, setCheckingRegistration] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (scrollContainerRef.current) {
            setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
            setScrollLeft(scrollContainerRef.current.scrollLeft);
        }
    };
    const onMouseLeave = () => setIsDragging(false);
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const [regForm, setRegForm] = useState({
        teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", notes: "",
    });

    useEffect(() => {
        if (user) {
            setRegForm((prev) => ({
                ...prev,
                playerName: prev.playerName || user.name || "",
                email: prev.email || user.email || "",
                gamerId: prev.gamerId || user.gamerId || "",
                phone: prev.phone || user.phone || "",
            }));
        }
    }, [user]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get("tab");
        if (tab && tabs.some(t => t.key === tab)) setActiveTab(tab);
        if (!initialData) loadTournament();
    }, [id]);

    useEffect(() => {
        if (isAuthenticated && id && activeTab === "register") checkMyRegistration();
    }, [isAuthenticated, id, activeTab]);

    const loadTournament = async () => {
        try {
            const res = await tournamentAPI.getById(id);
            if (res.success) setData(res.data);
        } catch (e) {
            console.error("Load tour error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBrackets = async () => {
        try {
            const res = await tournamentAPI.getBrackets(id);
            if (res.success) setBrackets(res.data);
        } catch (e) {
            console.error("Load brackets error:", e);
        }
    };

    const checkMyRegistration = async () => {
        setCheckingRegistration(true);
        try {
            const res = await tournamentAPI.getRegistrations(id);
            if (res.success && res.data?.registrations) {
                const mine = res.data.registrations.find((r: any) => r.user?._id === user?._id || r.user === user?._id);
                setMyRegistration(mine || null);
            }
        } catch (e) {
            console.error("Check reg error:", e);
        } finally {
            setCheckingRegistration(false);
        }
    };

    useEffect(() => {
        if (activeTab === "bracket" && !brackets) loadBrackets();
    }, [activeTab]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) return;
        setIsRegistering(true);
        setRegisterMsg(null);
        try {
            const res = await tournamentAPI.register(id, {
                ...regForm,
                teamShortName: regForm.teamShortName.toUpperCase(),
                playerName: regForm.playerName || user?.name,
                email: regForm.email || user?.email,
            });
            if (res.success) {
                setRegisterMsg({ type: "success", text: "Đăng ký thành công! Chờ phê duyệt." });
                setMyRegistration(res.data);
            } else {
                setRegisterMsg({ type: "error", text: res.message || "Đăng ký thất bại." });
            }
        } catch {
            setRegisterMsg({ type: "error", text: "Có lỗi xảy ra." });
        } finally {
            setIsRegistering(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-efb-blue" /></div>;
    if (!data?.tournament) return <div className="text-center py-32"><h2 className="text-xl font-semibold">Không tìm thấy giải đấu</h2></div>;

    const t = data.tournament;
    const teams = data.teams || [];
    const matches = data.matches || [];
    const prizes = [];
    if (t.prize?.first) prizes.push({ place: "🥇 Vô địch", amount: t.prize.first, color: "from-yellow-400 to-amber-500" });
    if (t.prize?.second) prizes.push({ place: "🥈 Á quân", amount: t.prize.second, color: "from-gray-300 to-gray-400" });
    if (t.prize?.third) prizes.push({ place: "🥉 Hạng 3", amount: t.prize.third, color: "from-orange-400 to-orange-500" });

    const sty = statusConfig[t.status] || statusConfig.draft;
    const StatusIcon = sty.icon;

    const bracketMap: Record<string, any[]> = {};
    const bracketMatches = brackets?.matches || matches;
    bracketMatches.forEach((m: any) => {
        const rn = m.roundName || `Vòng ${m.round}`;
        if (!bracketMap[rn]) bracketMap[rn] = [];
        bracketMap[rn].push(m);
    });

    const bracketRounds = Object.entries(bracketMap)
        .sort(([, a], [, b]) => (a[0]?.round ?? 0) - (b[0]?.round ?? 0))
        .map(([name, roundMatches]) => ({ name, matches: roundMatches }));

    return (
        <>
            <section className="relative pt-24 pb-14">
                <div className="absolute inset-0 overflow-hidden">
                    <Image src={t.banner || t.thumbnail || "/assets/efootball_bg.webp"} alt="" fill className="object-cover opacity-60" priority />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A3D91]/70 via-[#1E40AF]/40 to-white" />
                </div>
                <div className="max-w-[1200px] mx-auto px-6 relative z-10">
                    <div className="flex items-center gap-2 text-xs text-white/60 mb-6">
                        <Link href="/">Trang chủ</Link><ChevronRight className="w-3 h-3" /><Link href="/giai-dau">Giải đấu</Link><ChevronRight className="w-3 h-3" /><span>{t.title}</span>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 sm:p-8 -mb-10 relative z-20 shadow-xl">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex gap-3 mb-3 flex-wrap">
                                    <Badge className={`${sty.bgClass} border`}>{sty.label}</Badge>
                                    <Badge className="bg-blue-50 text-efb-blue">{formatLabels[t.format] || t.format}</Badge>
                                    <Badge className="bg-gray-100">{t.platform}</Badge>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-efb-dark mb-3">{t.title}</h1>
                                <div className="flex flex-wrap gap-5 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(t.schedule?.tournamentStart)} - {formatDate(t.schedule?.tournamentEnd)}</span>
                                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{t.isOnline ? "Online" : t.location}</span>
                                    <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{t.views || 0} lượt xem</span>
                                </div>
                            </div>
                            <div className="flex gap-8 items-center">
                                <div className="text-center"><div className="text-2xl">{t.currentTeams}/{t.maxTeams}</div><div className="text-[10px] uppercase text-gray-400">Đội</div></div>
                                {t.prize?.total && <><div className="w-px h-10 bg-gray-100" /> <div className="text-center"><div className="text-xl font-bold text-gradient">{t.prize.total}</div><div className="text-[10px] uppercase text-gray-400">Giải thưởng</div></div></>}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                            {t.status === "registration" && <Button onClick={() => setActiveTab("register")} className="bg-efb-blue text-white rounded-xl"><UserPlus className="w-4 h-4 mr-2" /> Đăng ký ngay</Button>}
                            <Button variant="outline" className="rounded-xl"><Share2 className="w-4 h-4 mr-2" /> Chia sẻ</Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="pt-6 pb-20 bg-white">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="sticky top-16 z-30 bg-white border-b overflow-x-auto flex gap-1 no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.key ? "border-efb-blue text-efb-blue" : "border-transparent text-gray-400"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8">
                        {activeTab === "overview" && (
                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    {t.description && <div className="bg-white rounded-xl border p-6"><h3 className="font-bold mb-3">Giới thiệu</h3><p className="text-sm whitespace-pre-line">{t.description}</p></div>}
                                    {t.rules && <div className="bg-white rounded-xl border p-6"><h3 className="font-bold mb-3">Thể lệ</h3><p className="text-sm whitespace-pre-line">{t.rules}</p></div>}
                                    <div className="bg-white rounded-xl border p-6"><h3 className="font-bold mb-4">Cài đặt</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><div className="text-gray-400 text-xs">Thời lượng</div>{t.settings?.matchDuration} phút</div>
                                            <div><div className="text-gray-400 text-xs">Hiệp phụ/Pen</div>{t.settings?.extraTime ? "Có" : "Không"} / {t.settings?.penalties ? "Có" : "Không"}</div>
                                            <div><div className="text-gray-400 text-xs">Số lượt</div>{t.settings?.legsPerRound} lượt</div>
                                            <div><div className="text-gray-400 text-xs">Platform</div>{t.platform}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {prizes.length > 0 && <div className="bg-white border rounded-xl p-6"><h3 className="font-bold mb-4">Giải thưởng</h3>
                                        <div className="space-y-2">{prizes.map(p => <div key={p.place} className="flex justify-between p-2 bg-gray-50 rounded-lg text-sm"><span>{p.place}</span><span className="font-bold">{p.amount}</span></div>)}</div>
                                    </div>}
                                </div>
                            </div>
                        )}

                        {activeTab === "bracket" && (
                            <div className="bg-[#FDFDFD] rounded-2xl border p-8 overflow-auto min-h-[500px] relative shadow-inner" ref={scrollContainerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
                                <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(#E2E8F0 1.2px, transparent 1.2px)`, backgroundSize: '32px 32px' }} />
                                <div className="inline-flex p-12 min-w-full relative z-10">
                                    {bracketRounds.map((round, rIndex) => {
                                        const cellHeight = UNIT_HEIGHT * Math.pow(2, rIndex);
                                        const isLastRound = rIndex === bracketRounds.length - 1;

                                        return (
                                            <div key={rIndex} className="flex">
                                                <div className="flex flex-col w-[180px]">
                                                    <div className="h-10 flex items-center justify-center mb-12">
                                                        <div className="px-4 py-1.5 rounded-[10px] bg-white border border-gray-100 shadow-sm">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{round.name}</span>
                                                        </div>
                                                    </div>
                                                    {round.matches.map((match: any) => (
                                                        <div key={match._id || match.id} className="flex items-center justify-center relative" style={{ height: cellHeight }}>
                                                            <MatchCard match={match} onClick={() => setSelectedMatch(match)} />
                                                            {rIndex > 0 && <div className="absolute -left-16 w-16 h-[2px] bg-[#E2E8F0]" />}
                                                        </div>
                                                    ))}
                                                </div>
                                                {!isLastRound && (
                                                    <div className="w-[128px] flex flex-col pt-[92px]">
                                                        {Array.from({ length: Math.floor(round.matches.length / 2) }).map((_, i) => (
                                                            <div key={i} className="relative" style={{ height: cellHeight * 2 }}>
                                                                <div className="absolute left-0 top-1/4 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                                <div className="absolute left-0 top-3/4 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                                <div className="absolute left-1/2 top-1/4 w-[2px] bg-[#E2E8F0]" style={{ height: '50%' }} />
                                                                <div className="absolute left-1/2 top-1/2 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                            </div>
                                                        ))}
                                                        {/* Handle odd number of matches if needed, but bracket usually even */}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === "players" && (
                            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead className="bg-[#F8FAFC] border-b border-gray-100">
                                            <tr className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                                <th className="px-6 py-4 text-left w-16">#</th>
                                                <th className="px-6 py-4 text-left">Đội / Vận động viên</th>
                                                <th className="px-6 py-4 text-center">P</th>
                                                <th className="px-6 py-4 text-center">W</th>
                                                <th className="px-6 py-4 text-center">D</th>
                                                <th className="px-6 py-4 text-center">L</th>
                                                <th className="px-6 py-4 text-center">Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teams.map((team: any, i: number) => {
                                                const reg = data.registrations?.find((r: any) => r.team === team._id || r.team?._id === team._id) || {};
                                                return (
                                                    <tr key={team._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-400">{i + 1}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-efb-dark">{team.name}</div>
                                                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">VĐV: {reg.playerName || "—"}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium">{team.stats?.played || 0}</td>
                                                        <td className="px-6 py-4 text-center text-emerald-600 font-bold">{team.stats?.wins || 0}</td>
                                                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{team.stats?.draws || 0}</td>
                                                        <td className="px-6 py-4 text-center text-rose-500 font-medium">{team.stats?.losses || 0}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-efb-blue font-black text-xs">
                                                                {team.stats?.points || 0}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "schedule" && (
                            <div className="space-y-3">
                                {matches.map((m: any) => (
                                    <div key={m._id} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-sm transition-all" onClick={() => setSelectedMatch(m)}>
                                        <div className="w-20 text-center"><div className="font-bold text-sm">{m.scheduledDate ? formatDate(m.scheduledDate) : "TBD"}</div><div className="text-[10px] text-gray-400">{m.roundName || `Vòng ${m.round}`}</div></div>
                                        <div className="flex-1 font-medium">{m.homeTeam?.name || "TBD"} vs {m.awayTeam?.name || "TBD"}</div>
                                        <div className="font-bold">{m.status === 'completed' ? `${m.homeScore} - ${m.awayScore}` : '—'}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "register" && (
                            <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-8">
                                {t.status !== 'registration' ? <div className="text-center py-20 text-gray-400">Hiện đang đóng đăng ký</div> :
                                    !isAuthenticated ? <div className="text-center py-10"><Button onClick={() => router.push('/dang-nhap')}>Đăng nhập để đăng ký</Button></div> :
                                        myRegistration ? <div className="text-center py-10"><CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" /><h3>Bạn đã đăng ký: {myRegistration.status}</h3></div> :
                                            <form onSubmit={handleRegister} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><Label>Tên đội</Label><Input value={regForm.teamName} onChange={e => setRegForm({ ...regForm, teamName: e.target.value })} required className="rounded-xl" /></div>
                                                    <div><Label>Viết tắt</Label><Input value={regForm.teamShortName} onChange={e => setRegForm({ ...regForm, teamShortName: e.target.value })} required maxLength={4} className="rounded-xl" /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><Label>Tên VĐV</Label><Input value={regForm.playerName} onChange={e => setRegForm({ ...regForm, playerName: e.target.value })} required className="rounded-xl" /></div>
                                                    <div><Label>In-game ID</Label><Input value={regForm.gamerId} onChange={e => setRegForm({ ...regForm, gamerId: e.target.value })} required className="rounded-xl" /></div>
                                                </div>
                                                <Button type="submit" className="w-full bg-efb-blue text-white rounded-xl" disabled={isRegistering}>{isRegistering ? "Đang gửi..." : "Đăng ký ngay"}</Button>
                                                {registerMsg && <p className={`text-center text-sm mt-4 ${registerMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{registerMsg.text}</p>}
                                            </form>}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {selectedMatch && <MatchDetailViewModal match={selectedMatch} tournament={t} onClose={() => setSelectedMatch(null)} />}
        </>
    );
}
