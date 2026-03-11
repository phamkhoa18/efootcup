"use client";
import { toast } from "sonner";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
    Trophy, Users, Calendar, MapPin, Flame, Share2, ChevronRight, ChevronLeft, ChevronsUpDown, Check,
    Gamepad2, Award, FileText, UserPlus, Clock, Shield, Swords, Camera, MapPinned, Facebook,
    Loader2, Globe, CheckCircle2, Eye, Ban, DollarSign, Phone, Mail, MessageCircle,
    LogIn, AlertCircle, Info, X, Watch, CreditCard, Upload, ExternalLink, Wallet, Image as ImageIcon, User,
    Zap, Target, ArrowRight, Search
} from "lucide-react";
import { tournamentAPI, tournamentPaymentAPI, paymentConfigAPI } from "@/lib/api";
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

const platformLabels: Record<string, string> = {
    cross_platform: "Đa nền tảng",
    ps4: "PS4",
    ps5: "PS5",
    pc: "PC",
    mobile: "Mobile",
    xbox: "Xbox",
    console: "Console",
};

const tabs = [
    { key: "overview", label: "Tổng quan", icon: FileText },
    { key: "bracket", label: "Sơ đồ thi đấu", icon: Swords },
    { key: "players", label: "Danh sách VĐV", icon: Users },
    { key: "schedule", label: "Lịch thi đấu", icon: Calendar },
];

const UNIT_HEIGHT = 110;

const MatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => {
    const isWalkover = match.status === "walkover";
    const isBye = match.status === "bye";
    const bracketNumber = match.bracketPosition?.y !== undefined ? match.bracketPosition.y + 1 : (match.matchNumber || 0);

    const isMatchScheduled = !isWalkover && !isBye && (!match.homeTeam || !match.awayTeam);

    const homeName = match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.name || (isWalkover || isBye ? "Tự do" : "Chờ kết quả");
    const awayName = match.awayTeam?.name || match.awayTeam?.shortName || match.p2?.name || (isWalkover || isBye ? "Tự do" : "Chờ kết quả");
    const homeScore = (isWalkover || isBye) ? "" : (match.homeScore ?? match.p1?.score ?? "");
    const awayScore = (isWalkover || isBye) ? "" : (match.awayScore ?? match.p2?.score ?? "");
    const isCompleted = match.status === "completed" || match.status === "Kết thúc" || isWalkover;
    const isLive = match.status === "live" || match.status === "Đang diễn ra";
    const homeWin = isCompleted && (match.winner === (match.homeTeam?._id || match.homeTeam?.id) || (homeScore !== "" && awayScore !== "" && Number(homeScore) > Number(awayScore)));
    const awayWin = isCompleted && (match.winner === (match.awayTeam?._id || match.awayTeam?.id) || (homeScore !== "" && awayScore !== "" && Number(awayScore) > Number(homeScore)));

    // Reworked: Player name big on top, team name small below
    const homeP1 = match.homeTeam?.player1 || match.p1?.name || "Chờ kết quả";
    const homeP2 = match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? match.homeTeam.player2 : "";
    const awayP1 = match.awayTeam?.player1 || match.p2?.name || "Chờ kết quả";
    const awayP2 = match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? match.awayTeam.player2 : "";
    const homeEfvId = match.homeTeam?.efvId;
    const awayEfvId = match.awayTeam?.efvId;

    // BYE match - compact single-team card with BYE badge
    if (isBye) {
        const byeP1 = match.homeTeam?.player1 || match.p1?.name || "Tự do";
        const byeP2 = match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? match.homeTeam.player2 : "";
        const byeTeamName = match.homeTeam?.name || match.homeTeam?.shortName || "";
        const byeEfvId = match.homeTeam?.efvId;

        return (
            <div className="flex items-center relative z-20 w-[200px]">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                    {bracketNumber}
                </div>
                <div className="w-full bg-gradient-to-r from-gray-50 to-white rounded-[6px] border border-dashed border-gray-200 flex flex-col justify-center overflow-hidden z-20 relative px-2.5 py-1.5 h-[88px] opacity-70">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            {byeEfvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{byeEfvId}</span>}
                            <span className="truncate text-[11px] text-gray-700 font-semibold">{byeP1}</span>
                        </div>
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded-full ml-1 flex-shrink-0">BYE</span>
                    </div>
                    {byeP2 && <span className="truncate text-[10px] text-gray-500">{byeP2}</span>}
                    {byeTeamName && <span className="truncate text-[8px] text-gray-400 mt-0.5">{byeTeamName}</span>}
                    <div className="mt-1 pt-1 border-t border-dashed border-gray-200">
                        <span className="text-[10px] text-gray-300 italic">— Không có đối thủ —</span>
                    </div>
                </div>
            </div>
        );
    }

    if (isWalkover) {
        return (
            <div className="flex items-center relative z-20 w-[200px]">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                    {bracketNumber}
                </div>
                <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    onClick={onClick}
                    className="w-full bg-white rounded-[6px] border border-[#E2E8F0] shadow-sm flex flex-col justify-center cursor-pointer overflow-hidden z-20 relative px-2.5 py-2 h-[50px]"
                >
                    <span className={`truncate text-[12px] font-bold text-gray-800 ${!match.homeTeam && !match.p1 ? "text-gray-400 italic font-medium" : ""}`}>
                        {homeEfvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{homeEfvId}</span>}
                        {homeP1}
                    </span>
                    {homeP2 && <span className="truncate text-[11px] text-gray-700 font-semibold">{homeP2}</span>}
                    <span className="text-[9px] text-gray-400 truncate mt-0.5">{homeName}</span>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex items-center relative z-20 w-[200px]">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                {bracketNumber}
            </div>

            <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                onClick={onClick}
                className="w-full bg-white rounded-[6px] border border-[#E2E8F0] shadow-sm flex flex-col cursor-pointer overflow-hidden z-20 group relative"
            >
                {isLive && (
                    <div className="absolute top-0 right-0 left-0 bg-red-500 text-white text-[7px] font-bold text-center py-[1px] uppercase tracking-wider flex items-center justify-center gap-1 z-10">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
                    </div>
                )}

                {/* Home */}
                <div className={`px-2.5 py-1.5 flex flex-col ${homeWin ? "bg-blue-50/30" : ""} ${isLive ? 'mt-[12px]' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.2] flex-1">
                            <span className={`truncate text-[12px] ${homeWin ? "text-blue-700 font-bold" : "text-gray-900 font-semibold"} ${!match.homeTeam && !match.p1 ? "text-gray-400 italic font-normal" : ""}`}>
                                {homeEfvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{homeEfvId}</span>}
                                {homeP1}
                            </span>
                            {homeP2 && (
                                <span className={`truncate text-[11px] ${homeWin ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{homeP2}</span>
                            )}
                            <span className="text-[9px] text-gray-400 truncate mt-0.5">{homeName}</span>
                        </div>
                        <span className={`text-[13px] tabular-nums ml-1 mt-0.5 ${homeWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{homeScore}</span>
                    </div>
                </div>

                <div className="h-px bg-[#E2E8F0] w-full" />

                {/* Away */}
                <div className={`px-2.5 py-1.5 flex flex-col ${awayWin ? "bg-blue-50/30" : ""}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.2] flex-1">
                            <span className={`truncate text-[12px] ${awayWin ? "text-blue-700 font-bold" : "text-gray-900 font-semibold"} ${!match.awayTeam && !match.p2 ? "text-gray-400 italic font-normal" : ""}`}>
                                {awayEfvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{awayEfvId}</span>}
                                {awayP1}
                            </span>
                            {awayP2 && (
                                <span className={`truncate text-[11px] ${awayWin ? "text-blue-600 font-semibold" : "text-gray-700 font-medium"}`}>{awayP2}</span>
                            )}
                            <span className="text-[9px] text-gray-400 truncate mt-0.5">{awayName}</span>
                        </div>
                        <span className={`text-[13px] tabular-nums ml-1 mt-0.5 ${awayWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{awayScore}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const MatchDetailViewModal = ({ match, tournament, onClose, user, myRegistration }: { match: any; tournament: any; onClose: () => void; user?: any; myRegistration?: any }) => {
    const homeScore = match.homeScore ?? "";
    const awayScore = match.awayScore ?? "";

    // Check if user is part of this match
    const userTeamId = (myRegistration?.team?._id || myRegistration?.team)?.toString?.();
    const isUserInMatch = userTeamId && (
        (match.homeTeam?._id || match.homeTeam)?.toString?.() === userTeamId ||
        (match.awayTeam?._id || match.awayTeam)?.toString?.() === userTeamId
    );
    const isLiveMatch = match.status === "live" || match.status === "scheduled";
    const canSubmitResult = user && isUserInMatch && match.status !== "completed";

    // Auto-open submit form when match is live/scheduled and user is a participant
    const [showSubmitForm, setShowSubmitForm] = useState(!!user && !!isUserInMatch && isLiveMatch);
    const [submitHomeScore, setSubmitHomeScore] = useState("");
    const [submitAwayScore, setSubmitAwayScore] = useState("");
    const [submitNotes, setSubmitNotes] = useState("");
    const [submitScreenshots, setSubmitScreenshots] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingShot, setIsUploadingShot] = useState(false);

    // Check if user already submitted
    const mySubmission = match.resultSubmissions?.find(
        (s: any) => s.user?.toString?.() === user?._id?.toString?.() || s.user?._id?.toString?.() === user?._id?.toString?.()
    );

    const formatNameStr = (team: any, pFallback: any) => {
        const p1 = team?.player1 || pFallback?.name || "Tự do";
        const p2 = team?.player2 && team.player2 !== "TBD" ? ` / ${team.player2}` : "";
        return `${p1}${p2}`;
    };

    const hName = formatNameStr(match.homeTeam, match.p1);
    const aName = formatNameStr(match.awayTeam, match.p2);

    const handleUploadScreenshot = async (file: File) => {
        setIsUploadingShot(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "screenshot");
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
            const res = await fetch("/api/upload", { method: "POST", headers, body: formData });
            const data = await res.json();
            const url = data.data?.url || data.url;
            if (url) setSubmitScreenshots(prev => [...prev, url]);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setIsUploadingShot(false);
        }
    };

    const handleSubmitResult = async () => {
        if (submitHomeScore === "" || submitAwayScore === "") {
            toast.error("Vui lòng nhập tỉ số");
            return;
        }
        setIsSubmitting(true);
        try {
            const savedToken = localStorage.getItem("efootcup_token");
            const res = await fetch(`/api/tournaments/${tournament?._id || tournament?.slug}/matches/submit-result`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
                },
                body: JSON.stringify({
                    matchId: match._id,
                    homeScore: Number(submitHomeScore),
                    awayScore: Number(submitAwayScore),
                    screenshots: submitScreenshots,
                    notes: submitNotes,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Gửi kết quả thành công! Quản lý sẽ xem xét.");
                setShowSubmitForm(false);
            } else {
                toast.error(data.message || "Có lỗi xảy ra");
            }
        } catch {
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        {match.status === "scheduled" && (
                            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" /> Chờ thi đấu
                            </div>
                        )}
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        {/* Score display - centered */}
                        <div className={`p-5 sm:p-6 text-center ${match.status === 'completed' ? 'bg-gradient-to-b from-gray-900 to-gray-800' : match.status === 'live' ? 'bg-gradient-to-b from-red-600 to-red-700' : 'bg-gradient-to-b from-gray-50 to-gray-100'}`}>
                            <div className="flex items-center justify-center gap-4 sm:gap-8">
                                {/* Home */}
                                <div className="flex-1 text-right min-w-0">
                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                        {match.homeTeam?.efvId != null && (
                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-900/40 border border-amber-700/30 px-1.5 py-px rounded flex-shrink-0">#{match.homeTeam.efvId}</span>
                                        )}
                                        <span className={`text-sm sm:text-base font-bold truncate ${match.status === 'completed' || match.status === 'live' ? (match.homeScore > match.awayScore ? 'text-white' : 'text-white/50') : 'text-gray-800'}`}>
                                            {match.homeTeam?.player1 || match.p1?.name || "Chờ..."}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] sm:text-xs truncate ${match.status === 'completed' || match.status === 'live' ? 'text-white/40' : 'text-gray-400'}`}>
                                        {match.homeTeam?.name || match.homeTeam?.shortName || ""}
                                    </p>
                                </div>

                                {/* Score */}
                                <div className="flex-shrink-0">
                                    <div className={`text-2xl sm:text-3xl font-black tabular-nums tracking-wider ${match.status === 'completed' || match.status === 'live' ? 'text-white' : 'text-gray-300'}`}>
                                        {match.status === 'completed' || match.status === 'live'
                                            ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
                                            : 'VS'}
                                    </div>
                                </div>

                                {/* Away */}
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`text-sm sm:text-base font-bold truncate ${match.status === 'completed' || match.status === 'live' ? (match.awayScore > match.homeScore ? 'text-white' : 'text-white/50') : 'text-gray-800'}`}>
                                            {match.awayTeam?.player1 || match.p2?.name || "Chờ..."}
                                        </span>
                                        {match.awayTeam?.efvId != null && (
                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-900/40 border border-amber-700/30 px-1.5 py-px rounded flex-shrink-0">#{match.awayTeam.efvId}</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] sm:text-xs truncate ${match.status === 'completed' || match.status === 'live' ? 'text-white/40' : 'text-gray-400'}`}>
                                        {match.awayTeam?.name || match.awayTeam?.shortName || ""}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Player details row */}
                        <div className="grid grid-cols-2 divide-x divide-gray-100 bg-white">
                            <div className={`p-3 sm:p-4 ${match.homeScore > match.awayScore ? 'bg-blue-50/50' : ''}`}>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Đội nhà</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{match.homeTeam?.player1 || match.p1?.name || "—"}</p>
                                {match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" && (
                                    <p className="text-xs text-gray-500 mt-0.5">ID: {match.homeTeam.player2}</p>
                                )}
                                {match.homeTeam?.name && <p className="text-[10px] text-gray-400 mt-1">{match.homeTeam.name}</p>}
                            </div>
                            <div className={`p-3 sm:p-4 ${match.awayScore > match.homeScore ? 'bg-blue-50/50' : ''}`}>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Đội khách</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{match.awayTeam?.player1 || match.p2?.name || "—"}</p>
                                {match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" && (
                                    <p className="text-xs text-gray-500 mt-0.5">ID: {match.awayTeam.player2}</p>
                                )}
                                {match.awayTeam?.name && <p className="text-[10px] text-gray-400 mt-1">{match.awayTeam.name}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Existing Result Submissions */}
                    {match.resultSubmissions && match.resultSubmissions.length > 0 && (
                        <div className="mt-5">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-efb-blue" />
                                Kết quả đã nhận ({match.resultSubmissions.length})
                            </h4>
                            <div className="space-y-3">
                                {match.resultSubmissions.map((sub: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-600">
                                                {sub.user === user?._id || sub.user?._id === user?._id ? "Bạn đã gửi" : "VĐV đã gửi"}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("vi-VN") : ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="font-bold text-gray-800">{match.homeTeam?.shortName || "H"}</span>
                                            <span className="text-lg font-black text-efb-blue">{sub.homeScore}</span>
                                            <span className="text-gray-300">-</span>
                                            <span className="text-lg font-black text-efb-blue">{sub.awayScore}</span>
                                            <span className="font-bold text-gray-800">{match.awayTeam?.shortName || "A"}</span>
                                        </div>
                                        {sub.notes && <p className="text-xs text-gray-500 mt-2 italic">"{sub.notes}"</p>}
                                        {sub.screenshots && sub.screenshots.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {sub.screenshots.map((s: string, si: number) => (
                                                    <img key={si} src={s} alt="SS" className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => window.open(s, "_blank")} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Result Button / Form */}
                    {canSubmitResult && (
                        <div className="mt-5">
                            {!showSubmitForm ? (
                                <button
                                    onClick={() => {
                                        if (mySubmission) {
                                            setSubmitHomeScore(String(mySubmission.homeScore));
                                            setSubmitAwayScore(String(mySubmission.awayScore));
                                            setSubmitNotes(mySubmission.notes || "");
                                            setSubmitScreenshots(mySubmission.screenshots || []);
                                        }
                                        setShowSubmitForm(true);
                                    }}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-efb-blue to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    {mySubmission ? "Cập nhật kết quả" : "Gửi kết quả trận đấu"}
                                </button>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border-2 border-efb-blue/30 bg-blue-50/30">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-efb-blue" />
                                        {mySubmission ? "Cập nhật kết quả" : "Gửi kết quả trận đấu"}
                                    </h4>

                                    {/* Score inputs */}
                                    <div className="flex items-center justify-center gap-4 mb-5">
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-gray-500 mb-1.5">{match.homeTeam?.shortName || match.homeTeam?.name || "Home"}</p>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={submitHomeScore}
                                                onChange={e => setSubmitHomeScore(e.target.value)}
                                                className="w-20 h-14 text-center text-2xl font-black rounded-xl border-2 border-gray-200 focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/20 outline-none bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="text-2xl font-light text-gray-300 mt-5">—</span>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-gray-500 mb-1.5">{match.awayTeam?.shortName || match.awayTeam?.name || "Away"}</p>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={submitAwayScore}
                                                onChange={e => setSubmitAwayScore(e.target.value)}
                                                className="w-20 h-14 text-center text-2xl font-black rounded-xl border-2 border-gray-200 focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/20 outline-none bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Screenshots */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block">Hình ảnh minh chứng (tối đa 3)</label>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {submitScreenshots.map((s, i) => (
                                                <div key={i} className="relative group">
                                                    <img src={s} alt="SS" className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setSubmitScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {submitScreenshots.length < 3 && (
                                                <label className="cursor-pointer">
                                                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-efb-blue hover:bg-blue-50/30 flex flex-col items-center justify-center transition-all">
                                                        {isUploadingShot ? (
                                                            <Loader2 className="w-5 h-5 animate-spin text-efb-blue" />
                                                        ) : (
                                                            <>
                                                                <Camera className="w-5 h-5 text-gray-400" />
                                                                <span className="text-[9px] text-gray-400 mt-1">Thêm ảnh</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <input type="file" accept="image/*" className="hidden" disabled={isUploadingShot} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadScreenshot(f); e.target.value = ""; }} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Ghi chú</label>
                                        <textarea
                                            value={submitNotes}
                                            onChange={e => setSubmitNotes(e.target.value)}
                                            placeholder="Mô tả ngắn về trận đấu (tùy chọn)..."
                                            maxLength={500}
                                            rows={2}
                                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/20 outline-none resize-none"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowSubmitForm(false)}
                                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSubmitResult}
                                            disabled={isSubmitting || submitHomeScore === "" || submitAwayScore === ""}
                                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-efb-blue to-indigo-600 text-white text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {isSubmitting ? "Đang gửi..." : "Xác nhận gửi"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
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

    // Payment state
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [selectedPayMethod, setSelectedPayMethod] = useState<string | null>(null);
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [isSubmittingProof, setIsSubmittingProof] = useState(false);
    const [showPaymentSection, setShowPaymentSection] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);

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
        dateOfBirth: "", facebookName: "", facebookLink: "", nickname: "", province: "",
        personalPhoto: "", teamLineupPhoto: "",
    });
    const [regStep, setRegStep] = useState(1);
    const [showRegDialog, setShowRegDialog] = useState(false);
    const [uploadingPersonal, setUploadingPersonal] = useState(false);
    const [uploadingLineup, setUploadingLineup] = useState(false);
    const [regCountry, setRegCountry] = useState('Việt Nam');
    const [vnProvinces, setVnProvinces] = useState<{ name: string; code: number }[]>([]);
    const [provinceOpen, setProvinceOpen] = useState(false);
    const [countries, setCountries] = useState<{ name: string; code: string }[]>([]);
    const [countryOpen, setCountryOpen] = useState(false);
    const [bracketSearch, setBracketSearch] = useState("");
    const [playerSearch, setPlayerSearch] = useState("");
    const [playerPage, setPlayerPage] = useState(1);
    const [playerData, setPlayerData] = useState<{ teams: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } } | null>(null);
    const [playerLoading, setPlayerLoading] = useState(false);
    const playerSearchTimer = useRef<NodeJS.Timeout | null>(null);
    const [scheduleFilter, setScheduleFilter] = useState<'all' | 'live' | 'completed' | 'upcoming'>('all');
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [lineupViewTeam, setLineupViewTeam] = useState<any>(null);

    // Fetch paginated teams from server
    const fetchPlayerTeams = useCallback(async (page: number, search: string) => {
        setPlayerLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "100" });
            if (search.trim()) params.set("search", search.trim());
            const res = await fetch(`/api/tournaments/${id}/teams?${params}`);
            const json = await res.json();
            if (json.success) {
                setPlayerData(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch teams:", e);
        } finally {
            setPlayerLoading(false);
        }
    }, [id]);

    // Fetch when tab is active, page changes
    useEffect(() => {
        if (activeTab === "players") {
            fetchPlayerTeams(playerPage, playerSearch);
        }
    }, [activeTab, playerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced search
    const handlePlayerSearchChange = (value: string) => {
        setPlayerSearch(value);
        if (playerSearchTimer.current) clearTimeout(playerSearchTimer.current);
        playerSearchTimer.current = setTimeout(() => {
            setPlayerPage(1);
            fetchPlayerTeams(1, value);
        }, 400);
    };

    useEffect(() => {
        if (user) {
            setRegForm((prev) => ({
                ...prev,
                playerName: prev.playerName || user.name || "",
                email: user.email || prev.email || "",
                gamerId: prev.gamerId || user.gamerId || "",
                phone: prev.phone || user.phone || "",
                dateOfBirth: prev.dateOfBirth || user.dateOfBirth || "",
                province: prev.province || user.province || "",
                nickname: prev.nickname || user.nickname || "",
                facebookName: prev.facebookName || user.facebookName || "",
                facebookLink: prev.facebookLink || user.facebookLink || "",
            }));
            if (user.country) setRegCountry(user.country);
        }
    }, [user]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get("tab");
        if (tab && tabs.some(t => t.key === tab)) setActiveTab(tab);
        if (!initialData) loadTournament();
    }, [id]);

    useEffect(() => {
        if (isAuthenticated && id) checkMyRegistration();
    }, [isAuthenticated, id]);

    const handleRegisterClick = () => {
        if (!isAuthenticated) {
            router.push(`/dang-nhap?redirect=/giai-dau/${id}`);
            return;
        }
        if (myRegistration) {
            if (myRegistration.status === 'approved') {
                toast.info('Bạn đã được duyệt vào giải đấu này!');
                return;
            }
            // Free tournament: no payment needed, just show status
            if (!t.entryFee || t.entryFee <= 0) {
                toast.info('Đăng ký của bạn đang chờ Manager duyệt.');
                return;
            }
            // Paid tournament: open payment/status dialog
            setShowPaymentDialog(true);
            if (paymentMethods.length === 0) loadPaymentMethods();
            return;
        }
        setShowRegDialog(true);
    };

    const handleCancelRegistration = async () => {
        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký?')) return;
        try {
            const res = await tournamentAPI.cancelRegistration(id);
            if (res.success) {
                toast.success('Hủy đăng ký thành công!');
                setMyRegistration(null);
                setShowPaymentDialog(false);
                setSelectedPayMethod(null);
            } else {
                toast.error(res.message || 'Hủy thất bại');
            }
        } catch {
            toast.error('Có lỗi xảy ra');
        }
    };

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
        if ((activeTab === "bracket" || activeTab === "schedule") && !brackets) loadBrackets();
    }, [activeTab]);

    // Load payment methods and auto-show dialog when needed
    useEffect(() => {
        if (myRegistration && data?.tournament?.entryFee > 0 && myRegistration.paymentStatus !== "paid"
            && myRegistration.paymentStatus !== "confirmed"
            && myRegistration.paymentStatus !== "pending_verification"
            && myRegistration.status !== "rejected" && myRegistration.status !== "cancelled") {
            loadPaymentMethods();
            setShowPaymentDialog(true);
        }
    }, [myRegistration, data]);

    const loadPaymentMethods = async () => {
        try {
            const res = await paymentConfigAPI.getPublicConfig();
            if (res.success) {
                setPaymentMethods(res.data?.methods || []);
            }
        } catch (e) {
            console.error("Load payment methods error:", e);
        }
    };

    const handleSelectPaymentMethod = async (method: any) => {
        if (method.mode === "auto") {
            setIsPaymentLoading(true);
            try {
                const res = await tournamentPaymentAPI.createPayment(id, method.id);
                if (res.success && res.data?.payUrl) {
                    // Always redirect to payment URL (new or existing pending link)
                    if (res.message?.includes("đang chờ")) {
                        toast.info("Đang chuyển đến trang thanh toán đã tạo trước đó...");
                    }
                    window.location.href = res.data.payUrl;
                } else if (!res.success && res.message?.includes("đã thanh toán")) {
                    toast.success("Bạn đã thanh toán thành công! Trang sẽ được tải lại.");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    toast.error(res.message || "Lỗi tạo thanh toán. Vui lòng thử lại.");
                }
            } catch (e) {
                toast.error("Có lỗi xảy ra khi tạo thanh toán. Vui lòng thử lại.");
            } finally {
                setIsPaymentLoading(false);
            }
        } else {
            setSelectedPayMethod(method.id);
        }
    };

    // Generate VietQR URL for quick payment
    const getVietQRUrl = (method: any) => {
        if (!method?.accountNumber || !method?.bankName) return null;
        const t = data?.tournament;
        if (!t) return null;
        // VietQR format: https://img.vietqr.io/image/{bankId}-{accountNo}-compact.png?amount=X&addInfo=Y&accountName=Z
        const bankMapping: Record<string, string> = {
            'Vietcombank': 'VCB', 'vietcombank': 'VCB',
            'Techcombank': 'TCB', 'techcombank': 'TCB',
            'MB Bank': 'MB', 'mbbank': 'MB', 'MB': 'MB',
            'VPBank': 'VPB', 'vpbank': 'VPB',
            'ACB': 'ACB', 'acb': 'ACB',
            'Sacombank': 'STB', 'sacombank': 'STB',
            'BIDV': 'BIDV', 'bidv': 'BIDV',
            'Agribank': 'VBA', 'agribank': 'VBA',
            'VietinBank': 'ICB', 'vietinbank': 'ICB',
            'TPBank': 'TPB', 'tpbank': 'TPB',
            'Momo': 'MOMO', 'momo': 'MOMO',
            'VIB': 'VIB', 'vib': 'VIB',
            'SHB': 'SHB', 'shb': 'SHB',
            'HDBank': 'HDB', 'hdbank': 'HDB',
            'OCB': 'OCB', 'ocb': 'OCB',
            'MSB': 'MSB', 'msb': 'MSB',
            'Eximbank': 'EIB', 'eximbank': 'EIB',
            'LienVietPostBank': 'LPB', 'lienvietpostbank': 'LPB',
            'DongA Bank': 'DAB', 'donga bank': 'DAB',
            'NamA Bank': 'NAB', 'nama bank': 'NAB',
            'BaoViet Bank': 'BVB', 'baoviet bank': 'BVB',
        };
        const bankId = bankMapping[method.bankName] || method.bankName;
        const amount = t.entryFee || 0;
        const addInfo = encodeURIComponent(`${t.title} - ${myRegistration?.playerName || user?.name || ''}`);
        const accountName = encodeURIComponent(method.accountName || '');
        return `https://img.vietqr.io/image/${bankId}-${method.accountNumber}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
    };

    const handleSubmitPaymentProof = async () => {
        if (!paymentProofFile) return;
        setIsSubmittingProof(true);
        try {
            const formData = new FormData();
            formData.append("file", paymentProofFile);
            formData.append("type", "payment_proof");
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                headers,
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) {
                toast.error("Lỗi upload ảnh minh chứng");
                return;
            }

            const res = await tournamentPaymentAPI.submitProof(id, {
                paymentProof: uploadData.data.url,
                paymentMethod: selectedPayMethod || "bank_transfer",
            });
            if (res.success) {
                toast.success("Đã gửi minh chứng thành công! Đợi xác nhận.");
                setMyRegistration({ ...myRegistration, paymentStatus: "pending_verification" });
                setPaymentProofFile(null);
                setShowPaymentDialog(false);
            } else {
                toast.error(res.message || "Gửi minh chứng thất bại");
            }
        } catch (e) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSubmittingProof(false);
        }
    };

    /* ---- Client-side image compressor (canvas-based, no deps) ---- */
    /* Always compress to ensure small file size → 100% upload success */
    const compressImage = (file: File, maxDim = 1280, quality = 0.7): Promise<File> =>
        new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality,
                );
            };
            img.onerror = () => resolve(file); // can't decode → send original
            img.src = URL.createObjectURL(file);
        });

    const handleUploadRegImage = async (file: File, field: 'personalPhoto' | 'teamLineupPhoto') => {
        const setter = field === 'personalPhoto' ? setUploadingPersonal : setUploadingLineup;
        setter(true);
        try {
            // Compress large images automatically (no size limit)
            let toUpload: File = file;
            // Only attempt compression if it looks like an image
            if (file.type.startsWith('image/') || /\.(jpe?g|jfif|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i.test(file.name)) {
                toUpload = await compressImage(file);
            }

            // For screenshots / screen captures the browser may give a blob name
            // like "image.png" with correct MIME but no real extension — that's fine.

            const formData = new FormData();
            formData.append('file', toUpload);
            formData.append('type', 'registration');
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;

            // Retry up to 3 times for transient errors (403, 5xx, network)
            let lastError = '';
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const res = await fetch('/api/upload', { method: 'POST', headers, body: formData });

                    if (res.ok) {
                        const data = await res.json();
                        const url = data.data?.url || data.url;
                        if (url) {
                            const bustUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                            setRegForm(prev => ({ ...prev, [field]: bustUrl }));
                            return; // success — exit
                        }
                        lastError = data.message || 'Không nhận được URL';
                        break; // don't retry on logical errors
                    }

                    lastError = `HTTP ${res.status}`;
                    if (res.status === 401) {
                        toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
                        return; // don't retry auth errors
                    }
                    // Retry on 403, 408, 429, 5xx
                    if (![403, 408, 429, 500, 502, 503, 504].includes(res.status)) break;
                } catch (networkErr) {
                    lastError = 'Lỗi mạng';
                }
                // Wait before retry (500ms, 1500ms)
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
            }

            // All retries failed — show warning but DON'T block
            console.error(`Upload failed after retries: ${lastError}`);
            toast.warning(`Tải ảnh lên chưa thành công (${lastError}). Bạn vẫn có thể đăng ký, admin sẽ hỗ trợ sau.`, { duration: 5000 });
        } catch (err) {
            console.error('Upload error:', err);
            toast.warning('Có lỗi khi tải ảnh lên. Bạn vẫn có thể đăng ký, admin sẽ hỗ trợ sau.', { duration: 5000 });
        } finally {
            setter(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) return;

        // Warn about missing photos but don't block submission — admin can handle later
        if (!regForm.personalPhoto || !regForm.teamLineupPhoto) {
            const missing = [
                !regForm.personalPhoto && 'hình cá nhân',
                !regForm.teamLineupPhoto && 'hình đội hình',
            ].filter(Boolean).join(' và ');
            toast.warning(`Thiếu ${missing} — đăng ký vẫn được gửi, admin sẽ liên hệ bổ sung sau.`);
        }

        setIsRegistering(true);
        try {
            // Strip cache-bust params from photo URLs before saving
            const cleanUrl = (u: string) => u ? u.split('?')[0] : '';
            const res = await tournamentAPI.register(id, {
                ...regForm,
                personalPhoto: cleanUrl(regForm.personalPhoto),
                teamLineupPhoto: cleanUrl(regForm.teamLineupPhoto),
                teamShortName: regForm.teamShortName.toUpperCase(),
                playerName: regForm.playerName || user?.name,
                phone: regForm.phone,
                email: regForm.email || user?.email,
            });
            if (res.success) {
                setMyRegistration(res.data);
                setShowRegDialog(false);

                // Save reg info to profile for auto-fill next time
                try {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    const savedToken = localStorage.getItem('efootcup_token');
                    if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
                    await fetch('/api/auth/me', {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({
                            phone: regForm.phone,
                            gamerId: regForm.gamerId,
                            dateOfBirth: regForm.dateOfBirth,
                            country: regCountry,
                            province: regForm.province,
                            nickname: regForm.nickname,
                            facebookName: regForm.facebookName,
                            facebookLink: regForm.facebookLink,
                        }),
                    });
                } catch { /* silent */ }

                if (t.entryFee > 0) {
                    toast.success('Đăng ký thành công! Vui lòng thanh toán lệ phí.');
                    loadPaymentMethods();
                    setTimeout(() => setShowPaymentDialog(true), 300);
                } else {
                    toast.success('Đăng ký thành công! Chờ phê duyệt.');
                }
            } else {
                toast.error(res.message || "Đăng ký thất bại.");
            }
        } catch {
            toast.error("Có lỗi xảy ra.");
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
        .map(([name, roundMatches]) => ({
            name,
            matches: roundMatches
        }))
        .filter(round => round.matches.length > 0);

    return (
        <>
            <section className="relative pt-24 pb-14">
                {/* Bright Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <Image src={"/assets/efootball_bg.webp"} alt="" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A3D91]/70 via-[#1E40AF]/50 to-white" />
                </div>

                <div className="max-w-[1200px] mx-auto px-6 relative z-10">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-5">
                        <Link href="/" className="hover:text-white/80 transition-colors">Trang chủ</Link>
                        <ChevronRight className="w-3 h-3 text-white/30" />
                        <Link href="/giai-dau" className="hover:text-white/80 transition-colors">Giải đấu</Link>
                        <ChevronRight className="w-3 h-3 text-white/30" />
                        <span className="text-white/80">{t.title}</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white rounded-2xl p-5 sm:p-6 -mb-8 relative z-20 shadow-xl border border-gray-100/50"
                    >
                        {/* Badges */}
                        <div className="flex gap-1.5 mb-3 flex-wrap">
                            <Badge className={`${sty.bgClass} border text-[10px] font-semibold px-2.5 py-0.5 gap-1 rounded-full`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'ongoing' ? 'bg-white animate-pulse' : t.status === 'completed' ? 'bg-emerald-500' : t.status === 'registration' ? 'bg-amber-900' : 'bg-gray-400'}`} />
                                {sty.label}
                            </Badge>
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] rounded-full px-2.5 py-0.5">{formatLabels[t.format] || t.format}</Badge>
                            <Badge className="bg-gray-50 text-gray-500 border-gray-100 text-[10px] rounded-full px-2.5 py-0.5">{platformLabels[t.platform] || t.platform}</Badge>
                            {t.entryFee > 0 && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] rounded-full px-2.5 py-0.5">{Number(t.entryFee).toLocaleString("vi-VN")} ₫</Badge>}
                            {t.entryFee <= 0 && <Badge className="bg-green-50 text-green-600 border-green-100 text-[10px] rounded-full px-2.5 py-0.5">Miễn phí</Badge>}
                        </div>

                        {/* Title */}
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">{t.title}</h1>

                        {/* Meta info - compact inline */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-gray-500 mb-4">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-400" />{formatDate(t.schedule?.tournamentStart)} - {formatDate(t.schedule?.tournamentEnd)}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400" />{t.isOnline ? "Online" : (t.location || "Chưa xác định")}</span>
                            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-gray-400" />{(t.views || 0).toLocaleString()} lượt xem</span>
                        </div>

                        {/* Progress bar - compact */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-medium text-gray-400">Số đội đăng ký</span>
                                <span className="text-[11px] font-semibold text-efb-blue">{t.currentTeams}/{t.maxTeams} đội</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((t.currentTeams / t.maxTeams) * 100, 100)}%` }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                    className={`h-full rounded-full ${(t.currentTeams / t.maxTeams) >= 0.8 ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-gradient-to-r from-blue-400 to-indigo-500"}`}
                                />
                            </div>
                            {(t.currentTeams / t.maxTeams) >= 0.8 && t.status === "registration" && (
                                <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1"><Flame className="w-3 h-3" /> Sắp hết slot!</p>
                            )}
                        </div>

                        {/* Stats Row - light & compact */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-blue-50/60 rounded-xl px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                    <Users className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-[10px] text-blue-500/70 font-medium uppercase tracking-wider">Đội</span>
                                </div>
                                <div className="text-gray-900">
                                    <span className="text-lg font-bold tabular-nums">{t.currentTeams}</span>
                                    <span className="text-xs text-gray-400 font-medium">/{t.maxTeams}</span>
                                </div>
                            </div>
                            <div className="bg-amber-50/60 rounded-xl px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] text-amber-500/70 font-medium uppercase tracking-wider">Giải thưởng</span>
                                </div>
                                <div className="text-amber-700 text-sm font-bold truncate">
                                    {t.prize?.total
                                        ? (typeof t.prize.total === 'number'
                                            ? Number(t.prize.total).toLocaleString("vi-VN") + ' VNĐ'
                                            : t.prize.total)
                                        : "—"}
                                </div>
                            </div>
                            <div className="bg-emerald-50/60 rounded-xl px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider">Lệ phí</span>
                                </div>
                                <div className={`text-sm font-bold ${t.entryFee > 0 ? "text-emerald-700" : "text-green-600"}`}>
                                    {t.entryFee > 0 ? `${Number(t.entryFee).toLocaleString("vi-VN")} ₫` : "Miễn phí"}
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons - compact */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                            {t.status === "registration" ? (
                                checkingRegistration ? (
                                    <Button disabled className="bg-gray-100 text-gray-400 rounded-lg h-9 text-xs px-4"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang kiểm tra...</Button>
                                ) : myRegistration ? (
                                    myRegistration.status === 'approved' ? (
                                        <Button disabled className="bg-emerald-500 text-white rounded-lg h-9 text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Đã được duyệt</Button>
                                    ) : (
                                        <>
                                            <Button onClick={handleRegisterClick} className={`${!t.entryFee || t.entryFee <= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-lg h-9 text-xs`}>
                                                {!t.entryFee || t.entryFee <= 0 ? (
                                                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Đang chờ duyệt</>
                                                ) : myRegistration.paymentStatus === 'paid' || myRegistration.paymentStatus === 'confirmed' ? (
                                                    <><Clock className="w-3.5 h-3.5 mr-1.5" /> Xem trạng thái</>
                                                ) : myRegistration.paymentStatus === 'pending_verification' ? (
                                                    <><Clock className="w-3.5 h-3.5 mr-1.5" /> Chờ xác nhận</>
                                                ) : (
                                                    <><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Thanh toán</>
                                                )}
                                            </Button>
                                            <Button variant="outline" onClick={handleCancelRegistration} className="rounded-lg text-red-500 border-red-200 hover:bg-red-50 h-9 text-xs">
                                                <X className="w-3.5 h-3.5 mr-1" /> Hủy
                                            </Button>
                                        </>
                                    )
                                ) : (
                                    <Button
                                        onClick={handleRegisterClick}
                                        className="bg-gradient-to-r from-efb-blue to-indigo-600 hover:from-efb-blue/90 hover:to-indigo-600/90 text-white rounded-lg h-9 px-5 text-xs font-semibold shadow-sm shadow-blue-500/15 hover:shadow-md transition-all"
                                    >
                                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Đăng ký tham gia
                                    </Button>
                                )
                            ) : t.status === "ongoing" ? (
                                <Badge className="bg-red-500 text-white border-0 h-9 px-3 text-xs font-medium rounded-lg"><Flame className="w-3.5 h-3.5 mr-1.5" /> Đang diễn ra</Badge>
                            ) : t.status === "completed" ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 h-9 px-3 text-xs font-medium rounded-lg"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Đã kết thúc</Badge>
                            ) : null}
                            <Button
                                variant="outline"
                                className="rounded-lg h-9 text-xs border-gray-200 hover:bg-gray-50"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("Đã sao chép link giải đấu!");
                                }}
                            >
                                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Chia sẻ
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="pt-4 pb-16 bg-white">
                <div className="max-w-[1200px] mx-auto px-6">
                    <div className="sticky top-16 z-30 bg-white border-b overflow-x-auto flex gap-1 no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${activeTab === tab.key ? "border-efb-blue text-efb-blue" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6">
                        {activeTab === "overview" && (
                            <div className="grid lg:grid-cols-3 gap-5">
                                <div className="lg:col-span-2 space-y-4">
                                    {t.description && (
                                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-blue-500" />Giới thiệu</h3>
                                            <div className="text-[13px] text-gray-600 whitespace-pre-line leading-relaxed break-words overflow-hidden" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: t.description.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-efb-blue hover:underline break-all">$1</a>') }} />
                                        </div>
                                    )}

                                    {/* Rules */}
                                    {t.rules && (
                                        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                            <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-amber-500" />Thể lệ</h3>
                                            <div className="text-[13px] text-gray-600 whitespace-pre-line leading-relaxed break-words overflow-hidden" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: t.rules.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-efb-blue hover:underline break-all">$1</a>') }} />
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                        <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-3"><Gamepad2 className="w-4 h-4 text-indigo-500" />Thông tin giải đấu</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {[
                                                { label: "Hình thức", value: formatLabels[t.format] || t.format, icon: Trophy, color: "text-blue-600 bg-blue-50" },
                                                { label: "Platform", value: platformLabels[t.platform] || t.platform || "—", icon: Gamepad2, color: "text-indigo-600 bg-indigo-50" },
                                                { label: "Thời lượng trận", value: `${t.settings?.matchDuration || "—"} phút`, icon: Clock, color: "text-amber-600 bg-amber-50" },
                                                { label: "Hiệp phụ", value: t.settings?.extraTime ? "Có" : "Không", icon: Zap, color: "text-orange-600 bg-orange-50" },
                                                { label: "Luân lưu (Pen)", value: t.settings?.penalties ? "Có" : "Không", icon: Target, color: "text-red-600 bg-red-50" },
                                                { label: "Số lượt/vòng", value: `${t.settings?.legsPerRound || 1} lượt`, icon: ArrowRight, color: "text-emerald-600 bg-emerald-50" },
                                            ].map((item) => (
                                                <div key={item.label} className={`${item.color.split(" ")[1]} rounded-xl p-3.5`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <item.icon className={`w-3.5 h-3.5 ${item.color.split(" ")[0]}`} />
                                                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{item.label}</span>
                                                    </div>
                                                    <div className={`text-sm font-semibold ${item.color.split(" ")[0]}`}>{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Schedule Timeline */}
                                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                        <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-blue-500" />Lịch trình</h3>
                                        <div className="space-y-3">
                                            {[
                                                { label: "Bắt đầu đăng ký", date: t.schedule?.registrationStart, icon: UserPlus, color: "bg-blue-500" },
                                                { label: "Hạn đăng ký", date: t.schedule?.registrationDeadline, icon: Clock, color: "bg-amber-500" },
                                                { label: "Bắt đầu giải đấu", date: t.schedule?.tournamentStart, icon: Flame, color: "bg-red-500" },
                                                { label: "Kết thúc giải đấu", date: t.schedule?.tournamentEnd, icon: CheckCircle2, color: "bg-emerald-500" },
                                            ].filter(item => item.date).map((item, i, arr) => (
                                                <div key={item.label} className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 ${item.color} rounded-lg flex items-center justify-center shrink-0`}>
                                                        <item.icon className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <span className="text-[13px] text-gray-600">{item.label}</span>
                                                        <span className="text-[13px] font-semibold text-gray-900">{formatDate(item.date!)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-4">
                                    {/* Registration CTA Card */}
                                    {t.status === "registration" && !myRegistration && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-gradient-to-br from-[#0A3D91] to-[#4338CA] rounded-2xl p-6 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                                            <div className="relative z-10">
                                                <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 border border-white/10">
                                                    <Trophy className="w-5 h-5 text-yellow-300" />
                                                </div>
                                                <h3 className="text-base font-semibold mb-1">Đăng ký tham gia</h3>
                                                <p className="text-white/60 text-xs mb-4">Tham gia thi đấu cùng cộng đồng eFootball</p>

                                                <div className="space-y-2 mb-5">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-white/60">Slot còn lại</span>
                                                        <span className="font-semibold">{Math.max(t.maxTeams - t.currentTeams, 0)} / {t.maxTeams}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full" style={{ width: `${Math.min((t.currentTeams / t.maxTeams) * 100, 100)}%` }} />
                                                    </div>
                                                    {t.entryFee > 0 && (
                                                        <div className="flex justify-between text-sm mt-2">
                                                            <span className="text-white/60">Lệ phí</span>
                                                            <span className="font-semibold text-yellow-300">{Number(t.entryFee).toLocaleString("vi-VN")} ₫</span>
                                                        </div>
                                                    )}
                                                    {t.entryFee <= 0 && (
                                                        <div className="flex justify-between text-sm mt-2">
                                                            <span className="text-white/60">Lệ phí</span>
                                                            <span className="font-semibold text-emerald-300">Miễn phí</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={handleRegisterClick}
                                                    className="w-full h-10 bg-white text-efb-blue hover:bg-white/90 font-semibold rounded-xl shadow-md transition-all group text-sm"
                                                >
                                                    <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                                    Đăng ký ngay
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Already registered card */}
                                    {myRegistration && (
                                        <div className={`rounded-2xl p-5 border-2 ${myRegistration.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {myRegistration.status === 'approved'
                                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                    : <Clock className="w-5 h-5 text-amber-600" />
                                                }
                                                <h3 className={`font-semibold text-sm ${myRegistration.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {myRegistration.status === 'approved' ? 'Đã được duyệt' : 'Đang chờ duyệt'}
                                                </h3>
                                            </div>
                                            <p className={`text-sm ${myRegistration.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {myRegistration.status === 'approved'
                                                    ? 'Bạn đã được duyệt tham gia giải đấu này.'
                                                    : 'Đăng ký của bạn đang được xem xét.'}
                                            </p>
                                        </div>
                                    )}

                                    {prizes.length > 0 && (
                                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                            <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-amber-500" />Giải thưởng</h3>
                                            <div className="space-y-2">
                                                {prizes.map(p => (
                                                    <div key={p.place} className={`flex justify-between items-center p-3 rounded-lg bg-gradient-to-r ${p.color}/10 border border-gray-100`}>
                                                        <span className="text-[13px] font-semibold text-gray-800">{p.place}</span>
                                                        <span className="text-[13px] font-bold text-gray-900">{typeof p.amount === 'number' ? `${Number(p.amount).toLocaleString("vi-VN")} ₫` : p.amount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                        <h3 className="font-semibold text-[13px] text-gray-900 flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-blue-500" />Thông tin</h3>
                                        <div className="space-y-2.5 text-[13px]">
                                            {t.createdBy?.name && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Ban tổ chức</span>
                                                    <span className="font-semibold text-gray-900">{t.createdBy.name}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Hình thức</span>
                                                <span className="font-semibold text-gray-900">{t.isOnline ? "Online" : "Offline"}</span>
                                            </div>
                                            {t.location && !t.isOnline && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Địa điểm</span>
                                                    <span className="font-semibold text-gray-900 text-right max-w-[180px]">{t.location}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Tối đa</span>
                                                <span className="font-semibold text-gray-900">{t.maxTeams} đội</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "bracket" && (
                            <div>
                                {/* Search bar for bracket */}
                                <div className="mb-4 relative max-w-xs">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder="Tìm đối thủ, đội..."
                                        value={bracketSearch}
                                        onChange={(e) => setBracketSearch(e.target.value)}
                                        className="pl-9 h-9 text-sm rounded-lg border-gray-200"
                                    />
                                </div>
                                <div className="bg-[#FDFDFD] rounded-2xl border p-8 overflow-auto min-h-[500px] relative shadow-inner" ref={scrollContainerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
                                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(#E2E8F0 1.2px, transparent 1.2px)`, backgroundSize: '32px 32px' }} />
                                    <div className="inline-flex p-12 min-w-full relative z-10">
                                        {bracketRounds.map((round, rIndex) => {
                                            const isLastRound = rIndex === bracketRounds.length - 1;
                                            const scale = Math.pow(2, rIndex);
                                            const GAP = 128;
                                            const halfGap = GAP / 2;

                                            return (
                                                <div key={rIndex} className="flex">
                                                    <div className="flex flex-col w-[200px]">
                                                        <div className="h-10 flex items-center justify-center mb-12">
                                                            <div className="w-[140px] py-1.5 rounded-sm bg-[#FEEBDB] flex items-center justify-center">
                                                                <span className="text-[12px] font-bold text-gray-800">{round.name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="relative flex-1">
                                                            {round.matches.map((match: any, mIdx: number) => {
                                                                const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
                                                                const yOffset = topPadding + (match.bracketPosition?.y || 0) * UNIT_HEIGHT * scale;

                                                                // Highlight matching search
                                                                const matchesSearch = bracketSearch.trim() === "" || [
                                                                    match.homeTeam?.name, match.homeTeam?.shortName, match.homeTeam?.player1, match.homeTeam?.player2,
                                                                    match.awayTeam?.name, match.awayTeam?.shortName, match.awayTeam?.player1, match.awayTeam?.player2,
                                                                    match.p1?.name, match.p2?.name,
                                                                    match.homeTeam?.efvId != null ? String(match.homeTeam.efvId) : null,
                                                                    match.awayTeam?.efvId != null ? String(match.awayTeam.efvId) : null,
                                                                ].some(v => v && v.toLowerCase().includes(bracketSearch.toLowerCase()));

                                                                return (
                                                                    <div
                                                                        key={match._id || match.id}
                                                                        className={`absolute left-0 flex items-center transition-opacity ${matchesSearch ? 'opacity-100' : 'opacity-20'}`}
                                                                        style={{
                                                                            top: `${yOffset}px`,
                                                                            height: `${UNIT_HEIGHT}px`,
                                                                            width: '100%'
                                                                        }}
                                                                    >
                                                                        <MatchCard match={match} onClick={() => setSelectedMatch(match)} />

                                                                        {/* Connector lines to next round */}
                                                                        {match.nextMatch && !isLastRound && (() => {
                                                                            const bY = match.bracketPosition?.y ?? 0;
                                                                            const isTop = bY % 2 === 0;
                                                                            const vLen = (UNIT_HEIGHT * scale) / 2;

                                                                            return (
                                                                                <>
                                                                                    {/* Horizontal stub from card to midpoint */}
                                                                                    <div
                                                                                        className="absolute bg-[#CBD5E1]"
                                                                                        style={{
                                                                                            right: `-${halfGap}px`,
                                                                                            width: `${halfGap}px`,
                                                                                            height: '1px',
                                                                                            top: '50%',
                                                                                        }}
                                                                                    />
                                                                                    {/* Vertical line from this match to sibling */}
                                                                                    <div
                                                                                        className="absolute bg-[#CBD5E1]"
                                                                                        style={{
                                                                                            right: `-${halfGap}px`,
                                                                                            width: '1px',
                                                                                            height: `${vLen}px`,
                                                                                            ...(isTop
                                                                                                ? { top: '50%' }
                                                                                                : { bottom: '50%' }
                                                                                            ),
                                                                                        }}
                                                                                    />
                                                                                    {/* Horizontal line from midpoint to next round (only for the top match of each pair) */}
                                                                                    {isTop && (
                                                                                        <div
                                                                                            className="absolute bg-[#CBD5E1]"
                                                                                            style={{
                                                                                                right: `-${GAP}px`,
                                                                                                width: `${halfGap}px`,
                                                                                                height: '1px',
                                                                                                top: `calc(50% + ${vLen}px)`,
                                                                                            }}
                                                                                        />
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}

                                                                        {/* Incoming line from previous round */}
                                                                        {rIndex > 0 && (
                                                                            <div
                                                                                className="absolute bg-[#CBD5E1]"
                                                                                style={{
                                                                                    left: `-${halfGap}px`,
                                                                                    width: `${halfGap}px`,
                                                                                    height: '1px',
                                                                                    top: '50%',
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div style={{ width: `${GAP}px` }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "players" && (
                            <div className="space-y-4">
                                {/* Header + Search */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Danh sách VĐV</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{playerData?.pagination?.total ?? teams.length} đội / vận động viên tham gia</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                placeholder="Tìm VĐV, đội..."
                                                value={playerSearch}
                                                onChange={(e) => handlePlayerSearchChange(e.target.value)}
                                                className="pl-9 h-9 text-sm rounded-lg border-gray-200 w-[200px]"
                                            />
                                        </div>
                                        {t.efvTier && (
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${t.efvTier === 'efv_1000' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                t.efvTier === 'efv_500' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                    'bg-blue-100 text-blue-700 border border-blue-200'
                                                }`}>
                                                {t.efvTier === 'efv_250' ? 'EFV 250' : t.efvTier === 'efv_500' ? 'EFV 500' : 'EFV 1000'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Table — scrollable on mobile */}
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    {playerLoading && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-efb-blue" />
                                            <span className="ml-2 text-sm text-gray-400">Đang tải...</span>
                                        </div>
                                    )}

                                    {!playerLoading && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm" style={{ minWidth: '600px' }}>
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] uppercase tracking-wider">
                                                        <th className="px-3 sm:px-4 py-3 text-center w-10 sm:w-14">#</th>
                                                        <th className="px-3 sm:px-4 py-3 text-center w-16 sm:w-20 text-amber-300">EFV ID</th>
                                                        <th className="px-3 sm:px-4 py-3 text-left">VĐV / Đội</th>
                                                        <th className="px-2 sm:px-3 py-3 text-center w-10 sm:w-14">P</th>
                                                        <th className="px-2 sm:px-3 py-3 text-center w-10 sm:w-14">W</th>
                                                        <th className="px-2 sm:px-3 py-3 text-center w-10 sm:w-14">D</th>
                                                        <th className="px-2 sm:px-3 py-3 text-center w-10 sm:w-14">L</th>
                                                        <th className="px-3 sm:px-4 py-3 text-center w-16 sm:w-20">Điểm</th>
                                                        {t.efvTier && <th className="px-3 sm:px-4 py-3 text-center w-16 sm:w-24">EFV</th>}
                                                        <th className="px-2 sm:px-3 py-3 text-center w-12 sm:w-16">Đội hình</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(playerData?.teams || []).map((team: any, pageIdx: number) => {
                                                        const pg = playerData?.pagination;
                                                        const i = ((pg?.page || 1) - 1) * (pg?.limit || 100) + pageIdx;
                                                        const reg = team._reg || {};
                                                        const playerName = reg.playerName || team.captain?.name || "—";
                                                        const isTop1 = i === 0 && t.status === 'completed';
                                                        const isTop2 = i === 1 && t.status === 'completed';
                                                        const avatarSrc = reg?.user?.avatar || reg?.personalPhoto || team.logo || null;

                                                        const getEfvPts = () => {
                                                            if (!t.efvTier) return null;
                                                            const table: Record<string, Record<string, number>> = {
                                                                efv_250: { champion: 250, runner_up: 200, top_4: 150, top_8: 100, top_16: 50, top_32: 40, participant: 30 },
                                                                efv_500: { champion: 500, runner_up: 400, top_4: 300, top_8: 200, top_16: 100, top_32: 70, participant: 50 },
                                                                efv_1000: { champion: 1000, runner_up: 800, top_4: 600, top_8: 400, top_16: 200, top_32: 150, participant: 100 },
                                                            };
                                                            if (t.status !== 'completed') return table[t.efvTier]?.participant ?? 0;
                                                            const placement = i === 0 ? 'champion' : i === 1 ? 'runner_up' : i <= 3 ? 'top_4' : i <= 7 ? 'top_8' : i <= 15 ? 'top_16' : i <= 31 ? 'top_32' : 'participant';
                                                            return table[t.efvTier]?.[placement] ?? 0;
                                                        };
                                                        const efvPts = getEfvPts();
                                                        const placement = t.status === 'completed' ? (i === 0 ? '🥇' : i === 1 ? '🥈' : i <= 3 ? '🥉' : '') : '';

                                                        return (
                                                            <tr key={team._id} className={`border-b border-gray-50 last:border-0 transition-colors ${reg?.user?.efvId ? 'hover:bg-blue-50/30 cursor-pointer' : ''} ${isTop1 ? 'bg-amber-50/40' : isTop2 ? 'bg-gray-50/40' : ''}`}
                                                                onClick={() => {
                                                                    if (reg?.user?.efvId) {
                                                                        router.push(`/profile/${reg.user.efvId}`);
                                                                    }
                                                                }}
                                                            >
                                                                <td className="px-3 sm:px-4 py-3 text-center">
                                                                    {isTop1 ? (
                                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-[10px] font-bold shadow-sm">1</span>
                                                                    ) : isTop2 ? (
                                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white text-[10px] font-bold shadow-sm">2</span>
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-slate-400">{i + 1}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 sm:px-4 py-3 text-center">
                                                                    {reg?.user?.efvId != null ? (
                                                                        <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 sm:px-2 py-0.5 rounded-md tabular-nums">#{reg.user.efvId}</span>
                                                                    ) : (
                                                                        <span className="text-[11px] text-gray-300">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 sm:px-4 py-3">
                                                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                            {avatarSrc ? <img src={avatarSrc} className="w-full h-full object-cover" alt="" /> : <Users className="w-4 h-4 text-gray-300" />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <p className="text-[13px] sm:text-[14px] font-semibold text-gray-900 truncate">{playerName}</p>
                                                                                {placement && <span className="text-xs sm:text-sm">{placement}</span>}
                                                                            </div>
                                                                            <p className="text-[10px] sm:text-[11px] text-gray-400 truncate mt-0.5">{team.name}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium text-gray-600">{team.stats?.played || 0}</td>
                                                                <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-bold text-emerald-600">{team.stats?.wins || 0}</td>
                                                                <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium text-gray-500">{team.stats?.draws || 0}</td>
                                                                <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm font-medium text-rose-500">{team.stats?.losses || 0}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-center">
                                                                    <span className="inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 sm:h-7 rounded-lg bg-blue-50 text-efb-blue font-bold text-[11px] sm:text-xs px-1.5 sm:px-2">
                                                                        {team.stats?.points || 0}
                                                                    </span>
                                                                </td>
                                                                {t.efvTier && (
                                                                    <td className="px-3 sm:px-4 py-3 text-center">
                                                                        <span className={`inline-flex items-center justify-center min-w-[36px] sm:min-w-[40px] h-6 sm:h-7 rounded-lg font-bold text-[11px] sm:text-xs px-1.5 sm:px-2 ${i === 0 && t.status === 'completed' ? 'bg-amber-100 text-amber-700' :
                                                                            i === 1 && t.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                                                i <= 3 && t.status === 'completed' ? 'bg-orange-50 text-orange-600' :
                                                                                    'bg-purple-50 text-purple-600'
                                                                            }`}>
                                                                            +{efvPts}
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                <td className="px-2 sm:px-3 py-3 text-center">
                                                                    {reg?.teamLineupPhoto ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); setLineupViewTeam({ name: playerName, teamName: team.name, photo: reg.teamLineupPhoto, personalPhoto: reg?.personalPhoto || avatarSrc }); }}
                                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-600 transition-all"
                                                                            title="Xem đội hình"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-200 text-[11px]">—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {!playerLoading && (!playerData?.teams || playerData.teams.length === 0) && (
                                        <div className="text-center py-16">
                                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400">{playerSearch.trim() ? 'Không tìm thấy VĐV nào' : 'Chưa có đội nào tham gia giải đấu này'}</p>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {playerData && playerData.pagination.totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-100 gap-2">
                                            <p className="text-xs text-gray-400">
                                                Hiển thị {((playerData.pagination.page - 1) * playerData.pagination.limit) + 1}–{Math.min(playerData.pagination.page * playerData.pagination.limit, playerData.pagination.total)} / {playerData.pagination.total} VĐV
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setPlayerPage(p => Math.max(1, p - 1))}
                                                    disabled={playerData.pagination.page <= 1}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Trước
                                                </button>
                                                {Array.from({ length: playerData.pagination.totalPages }, (_, idx) => idx + 1).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPlayerPage(p)}
                                                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${p === playerData.pagination.page
                                                            ? 'bg-efb-blue text-white shadow-sm'
                                                            : 'text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setPlayerPage(p => Math.min(playerData.pagination.totalPages, p + 1))}
                                                    disabled={playerData.pagination.page >= playerData.pagination.totalPages}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "schedule" && (() => {
                            const scheduleMatches = brackets?.matches || matches;
                            const roundMap: Record<string, any[]> = {};
                            scheduleMatches.filter((m: any) => m.status !== 'walkover' && m.status !== 'bye').forEach((m: any) => {
                                const rn = m.roundName || `Vòng ${m.round}`;
                                if (!roundMap[rn]) roundMap[rn] = [];
                                roundMap[rn].push(m);
                            });
                            const roundEntries = Object.entries(roundMap).sort(([, a], [, b]) => (a[0]?.round ?? 0) - (b[0]?.round ?? 0));

                            const allSchedMatches = roundEntries.flatMap(([, rm]) => rm);
                            const completedCount = allSchedMatches.filter((m: any) => m.status === 'completed').length;
                            const liveCount = allSchedMatches.filter((m: any) => m.status === 'live').length;
                            const totalCount = allSchedMatches.length;

                            const matchesFilter = (m: any) => {
                                if (bracketSearch.trim()) {
                                    const q = bracketSearch.toLowerCase();
                                    const fields = [m.homeTeam?.name, m.homeTeam?.shortName, m.homeTeam?.player1, m.homeTeam?.player2, m.awayTeam?.name, m.awayTeam?.shortName, m.awayTeam?.player1, m.awayTeam?.player2, m.homeTeam?.efvId != null ? String(m.homeTeam.efvId) : null, m.awayTeam?.efvId != null ? String(m.awayTeam.efvId) : null, m.matchNumber != null ? String(m.matchNumber) : null];
                                    if (!fields.some(v => v && v.toLowerCase().includes(q))) return false;
                                }
                                if (scheduleFilter === 'live') return m.status === 'live';
                                if (scheduleFilter === 'completed') return m.status === 'completed';
                                if (scheduleFilter === 'upcoming') return m.status !== 'completed' && m.status !== 'live';
                                return true;
                            };

                            return (
                                <div className="space-y-0">
                                    {/* Header + Search */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-efb-blue" /> Lịch thi đấu
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5 ml-7">
                                                {completedCount}/{totalCount} trận đã kết thúc
                                                {liveCount > 0 && <span className="text-red-500 font-semibold ml-2">• {liveCount} LIVE</span>}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <Input placeholder="Tìm VĐV, team, EFV ID..." value={bracketSearch} onChange={(e) => setBracketSearch(e.target.value)} className="pl-9 h-9 text-sm rounded-lg border-gray-200 w-[220px] focus:border-efb-blue" />
                                            {bracketSearch && <button onClick={() => setBracketSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
                                        </div>
                                    </div>

                                    {/* Filter Tabs */}
                                    <div className="flex gap-1.5 mb-4 flex-wrap">
                                        {([
                                            { key: 'all' as const, label: 'Tất cả', count: totalCount },
                                            ...(liveCount > 0 ? [{ key: 'live' as const, label: '🔴 LIVE', count: liveCount }] : []),
                                            { key: 'completed' as const, label: 'Kết thúc', count: completedCount },
                                            { key: 'upcoming' as const, label: 'Chưa đấu', count: totalCount - completedCount - liveCount },
                                        ]).map(f => (
                                            <button key={f.key} onClick={() => setScheduleFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${scheduleFilter === f.key ? (f.key === 'live' ? 'bg-red-500 text-white shadow-sm' : 'bg-efb-blue text-white shadow-sm') : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}`}>
                                                {f.label} <span className="opacity-70 ml-0.5">({f.count})</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Info bar */}
                                    <div className="flex items-center justify-between bg-blue-50/60 px-4 py-2.5 rounded-xl border border-blue-100 mb-4">
                                        <div className="flex items-center gap-4 text-xs text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5 text-blue-400" />
                                                <span>Hình thức: <span className="font-semibold text-gray-800">{t.format === 'round_robin' ? 'Vòng tròn' : t.format === 'group_stage' ? 'Vòng bảng' : 'Loại trực tiếp'}</span></span>
                                            </div>
                                            <span className="hidden sm:inline text-blue-500 font-semibold">{completedCount}/{totalCount} trận hoàn thành</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px]">
                                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Xong</span>
                                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE</span>
                                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-blue-300" /> Chờ</span>
                                        </div>
                                    </div>

                                    {/* Match Table */}
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                        {roundEntries.length === 0 ? (
                                            <div className="text-center py-20 bg-gray-50/50">
                                                <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                                <h3 className="text-gray-700 font-semibold mb-1">Chưa có lịch thi đấu</h3>
                                                <p className="text-gray-400 text-sm">Lịch sẽ được cập nhật khi giải đấu bắt đầu.</p>
                                            </div>
                                        ) : (<>
                                            {/* Desktop */}
                                            <div className="hidden sm:block overflow-x-auto">
                                                {roundEntries.map(([roundName, roundMatches]) => {
                                                    const filtered = roundMatches.filter(matchesFilter);
                                                    if (filtered.length === 0) return null;
                                                    return (
                                                        <div key={roundName}>
                                                            <div className="bg-[#D9EAF7] flex items-center justify-center py-2.5 px-4 border-b border-white">
                                                                <span className="text-red-500 font-bold text-sm">{roundName}</span>
                                                                <span className="text-gray-600 font-semibold text-sm ml-1.5">| {t.title}</span>
                                                            </div>
                                                            <div className="grid grid-cols-12 gap-4 py-2 px-4 border-b border-gray-200 font-bold text-[11px] text-gray-500 bg-gray-50/80 uppercase tracking-wider">
                                                                <div className="col-span-1">#</div>
                                                                <div className="col-span-2">CLB</div>
                                                                <div className="col-span-4">Cặp đấu</div>
                                                                <div className="col-span-2 text-center">Kết quả</div>
                                                                <div className="col-span-1 text-center">Ngày</div>
                                                                <div className="col-span-2 text-center">Trạng thái</div>
                                                            </div>
                                                            <div className="divide-y divide-gray-50">
                                                                {filtered.map((m: any) => {
                                                                    const homeName = m.homeTeam?.name || "Chờ kết quả";
                                                                    const awayName = m.awayTeam?.name || "Chờ kết quả";
                                                                    const p1Name = m.homeTeam?.player1 || "—";
                                                                    const p1Sub = m.homeTeam?.player2 && m.homeTeam.player2 !== "TBD" ? ` / ${m.homeTeam.player2}` : "";
                                                                    const p2Name = m.awayTeam?.player1 || "—";
                                                                    const p2Sub = m.awayTeam?.player2 && m.awayTeam.player2 !== "TBD" ? ` / ${m.awayTeam.player2}` : "";
                                                                    const isCompleted = m.status === 'completed';
                                                                    const isLive = m.status === 'live';
                                                                    const isHomeWin = isCompleted && (m.winner === (m.homeTeam?._id || m.homeTeam?.id) || (m.homeScore || 0) > (m.awayScore || 0));
                                                                    const isAwayWin = isCompleted && (m.winner === (m.awayTeam?._id || m.awayTeam?.id) || (m.awayScore || 0) > (m.homeScore || 0));
                                                                    return (
                                                                        <div key={m._id} className={`grid grid-cols-12 gap-4 items-center py-2.5 px-4 hover:bg-blue-50/30 transition-colors cursor-pointer ${isLive ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedMatch(m)}>
                                                                            <div className="col-span-1 text-gray-900 font-bold text-sm">{m.matchNumber}</div>
                                                                            <div className="col-span-2 flex flex-col gap-1.5">
                                                                                <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                                                                    {m.homeTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.homeTeam.efvId}</span>}
                                                                                    <span className="truncate">{homeName}</span>
                                                                                </div>
                                                                                <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                                                    {m.awayTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.awayTeam.efvId}</span>}
                                                                                    <span className="truncate">{awayName}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="col-span-4 flex flex-col gap-1.5 text-[13px] font-medium">
                                                                                <div className={`truncate ${isCompleted ? (isHomeWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : isLive ? "text-gray-800" : "text-purple-600"}`}>{p1Name}{p1Sub}</div>
                                                                                <div className={`truncate ${isCompleted ? (isAwayWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : isLive ? "text-gray-800" : "text-purple-600"}`}>{p2Name}{p2Sub}</div>
                                                                            </div>
                                                                            <div className="col-span-2 flex justify-center">
                                                                                {isCompleted || isLive ? (
                                                                                    <div className={`px-3 py-1 rounded-lg text-sm font-black tabular-nums tracking-wider ${isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-900 text-white'}`}>{m.homeScore ?? 0} - {m.awayScore ?? 0}</div>
                                                                                ) : (<span className="text-gray-300 text-sm font-bold">VS</span>)}
                                                                            </div>
                                                                            <div className="col-span-1 text-center text-[10px] text-gray-400">
                                                                                {m.scheduledAt ? (<div className="flex flex-col items-center"><span>{new Date(m.scheduledAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span><span className="text-gray-300">{new Date(m.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>) : (<span className="text-gray-300">—</span>)}
                                                                            </div>
                                                                            <div className="col-span-2 flex items-center justify-center">
                                                                                <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : isLive ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" : "bg-blue-50/50 border border-blue-100 text-blue-400"}`}>
                                                                                    {isCompleted ? "Kết thúc" : isLive ? "🔴 LIVE" : "Chờ thi đấu"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Mobile */}
                                            <div className="sm:hidden">
                                                {roundEntries.map(([roundName, roundMatches]) => {
                                                    const filtered = roundMatches.filter(matchesFilter);
                                                    if (filtered.length === 0) return null;
                                                    return (
                                                        <div key={roundName}>
                                                            <div className="bg-[#D9EAF7] flex items-center justify-center py-2 px-4 border-b border-white">
                                                                <span className="text-red-500 font-bold text-xs">{roundName}</span>
                                                                <span className="text-gray-600 font-semibold text-xs ml-1.5">| {t.title}</span>
                                                            </div>
                                                            <div className="divide-y divide-gray-50">
                                                                {filtered.map((m: any) => {
                                                                    const homePlayer = m.homeTeam?.player1 || "Chờ kết quả";
                                                                    const awayPlayer = m.awayTeam?.player1 || "Chờ kết quả";
                                                                    const homeCLB = m.homeTeam?.name || "";
                                                                    const awayCLB = m.awayTeam?.name || "";
                                                                    const homeEfvId = m.homeTeam?.efvId;
                                                                    const awayEfvId = m.awayTeam?.efvId;
                                                                    const isCompleted = m.status === 'completed';
                                                                    const isLive = m.status === 'live';
                                                                    const homeWin = isCompleted && (m.winner === (m.homeTeam?._id || m.homeTeam?.id) || (m.homeScore ?? 0) > (m.awayScore ?? 0));
                                                                    const awayWin = isCompleted && (m.winner === (m.awayTeam?._id || m.awayTeam?.id) || (m.awayScore ?? 0) > (m.homeScore ?? 0));
                                                                    return (
                                                                        <div key={m._id} className={`px-4 py-3 cursor-pointer active:bg-gray-50 transition-colors ${isLive ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedMatch(m)}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">#{m.matchNumber}</span>
                                                                                    {m.scheduledAt && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                                                                                </div>
                                                                                <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600" : isLive ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50/50 text-blue-400"}`}>
                                                                                    {isCompleted ? "Kết thúc" : isLive ? "🔴 LIVE" : "Chờ đấu"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`flex-1 min-w-0 text-right ${homeWin ? '' : isCompleted ? 'opacity-50' : ''}`}>
                                                                                    <div className="flex items-center justify-end gap-1 mb-0.5">
                                                                                        {homeEfvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{homeEfvId}</span>}
                                                                                        <span className={`text-xs font-bold truncate ${homeWin ? 'text-blue-700' : 'text-gray-800'}`}>{homePlayer}</span>
                                                                                    </div>
                                                                                    {homeCLB && <p className="text-[9px] text-gray-400 truncate">{homeCLB}</p>}
                                                                                </div>
                                                                                <div className={`flex-shrink-0 w-[60px] text-center py-1 rounded-lg ${isCompleted ? 'bg-gray-900 text-white' : isLive ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-300'}`}>
                                                                                    <span className="text-sm font-black tabular-nums tracking-wider">{isCompleted || isLive ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : 'VS'}</span>
                                                                                </div>
                                                                                <div className={`flex-1 min-w-0 text-left ${awayWin ? '' : isCompleted ? 'opacity-50' : ''}`}>
                                                                                    <div className="flex items-center gap-1 mb-0.5">
                                                                                        <span className={`text-xs font-bold truncate ${awayWin ? 'text-blue-700' : 'text-gray-800'}`}>{awayPlayer}</span>
                                                                                        {awayEfvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{awayEfvId}</span>}
                                                                                    </div>
                                                                                    {awayCLB && <p className="text-[9px] text-gray-400 truncate">{awayCLB}</p>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* No results */}
                                            {roundEntries.every(([, rm]) => rm.filter(matchesFilter).length === 0) && (
                                                <div className="text-center py-12">
                                                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Không tìm thấy trận đấu phù hợp</p>
                                                    {bracketSearch && <button onClick={() => setBracketSearch("")} className="text-xs text-efb-blue hover:underline mt-1">Xóa tìm kiếm</button>}
                                                </div>
                                            )}
                                        </>)}
                                    </div>
                                </div>
                            );
                        })()}

                    </div>
                </div>
            </section>


            {/* ===== Player Profile Dialog ===== */}
            <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
                <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl border-0 shadow-2xl">
                    {selectedPlayer && (() => {
                        const { team, reg, placement, playerName } = selectedPlayer;
                        const placementLabel = t.status === 'completed'
                            ? (placement === 0 ? '🥇 Vô địch' : placement === 1 ? '🥈 Á quân' : placement <= 3 ? '🥉 Top 4' : `#${placement + 1}`)
                            : `#${placement + 1}`;

                        return (
                            <>
                                {/* Header with gradient */}
                                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 pt-6 pb-5 text-white relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_60%)]" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                                {team.logo ? <img src={team.logo} className="w-full h-full rounded-xl object-cover" alt="" /> : <User className="w-6 h-6 text-white/70" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold truncate">{playerName}</h3>
                                                <p className="text-white/60 text-xs truncate">{team.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-semibold bg-white/15 backdrop-blur px-2 py-1 rounded-md">{placementLabel}</span>
                                            {t.efvTier && t.status === 'completed' && (() => {
                                                const table: Record<string, Record<string, number>> = {
                                                    efv_250: { champion: 250, runner_up: 200, top_4: 150, top_8: 100, top_16: 50, top_32: 40, participant: 30 },
                                                    efv_500: { champion: 500, runner_up: 400, top_4: 300, top_8: 200, top_16: 100, top_32: 70, participant: 50 },
                                                    efv_1000: { champion: 1000, runner_up: 800, top_4: 600, top_8: 400, top_16: 200, top_32: 150, participant: 100 },
                                                };
                                                const p = placement === 0 ? 'champion' : placement === 1 ? 'runner_up' : placement <= 3 ? 'top_4' : placement <= 7 ? 'top_8' : placement <= 15 ? 'top_16' : placement <= 31 ? 'top_32' : 'participant';
                                                const pts = table[t.efvTier]?.[p] ?? 0;
                                                return <span className="text-[10px] font-semibold bg-amber-400/20 text-amber-200 px-2 py-1 rounded-md">+{pts} EFV</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-5 space-y-4">
                                    {/* Stats */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: "Trận", value: team.stats?.played || 0, color: "text-gray-700" },
                                            { label: "Thắng", value: team.stats?.wins || 0, color: "text-emerald-600" },
                                            { label: "Hòa", value: team.stats?.draws || 0, color: "text-gray-500" },
                                            { label: "Thua", value: team.stats?.losses || 0, color: "text-rose-500" },
                                        ].map(s => (
                                            <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                                                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Player Info */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Thông tin</h4>
                                        <div className="space-y-2 text-[13px]">
                                            {reg?.nickname && (
                                                <div className="flex justify-between items-center"><span className="text-gray-400">Nickname</span><span className="font-semibold text-gray-900">{reg.nickname}</span></div>
                                            )}
                                            {reg?.gamerId && (
                                                <div className="flex justify-between items-center"><span className="text-gray-400">Gamer ID</span><span className="font-semibold text-gray-900">{reg.gamerId}</span></div>
                                            )}
                                            {(reg?.facebookName || reg?.facebookLink) && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" />Facebook</span>
                                                    {reg.facebookLink ? (
                                                        <a href={reg.facebookLink} target="_blank" className="font-semibold text-blue-600 hover:underline text-right truncate max-w-[180px]">{reg.facebookName || 'Xem'}</a>
                                                    ) : (
                                                        <span className="font-semibold text-gray-900">{reg.facebookName}</span>
                                                    )}
                                                </div>
                                            )}
                                            {reg?.phone && (
                                                <div className="flex justify-between items-center"><span className="text-gray-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />SĐT</span><span className="font-semibold text-gray-900">{reg.phone}</span></div>
                                            )}
                                            {reg?.email && (
                                                <div className="flex justify-between items-center"><span className="text-gray-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</span><span className="font-semibold text-gray-900 truncate max-w-[180px]">{reg.email}</span></div>
                                            )}
                                            {reg?.province && (
                                                <div className="flex justify-between items-center"><span className="text-gray-400">Tỉnh/TP</span><span className="font-semibold text-gray-900">{reg.province}</span></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Points info */}
                                    {team.stats?.points !== undefined && (
                                        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                                            <span className="text-xs text-blue-600 font-medium">Tổng điểm</span>
                                            <span className="text-lg font-bold text-blue-700">{team.stats.points}</span>
                                        </div>
                                    )}

                                    {/* View full profile button */}
                                    {reg?.user?.efvId && (
                                        <Link
                                            href={`/profile/${reg.user.efvId}`}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-efb-blue to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Xem profile đầy đủ
                                        </Link>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* ===== Registration Dialog ===== */}
            <Dialog open={showRegDialog} onOpenChange={(open) => { setShowRegDialog(open); if (!open) setRegStep(1); }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                        <div className="px-6 pt-6 pb-3">
                            <DialogHeader className="space-y-1">
                                <DialogTitle className="text-lg font-semibold text-gray-900 tracking-tight">Đăng ký thi đấu</DialogTitle>
                                <DialogDescription className="text-[13px] text-gray-400 font-normal">Điền đầy đủ thông tin bên dưới</DialogDescription>
                            </DialogHeader>
                        </div>
                        {/* Step indicator - clean horizontal */}
                        <div className="px-6 pb-4">
                            <div className="flex items-center gap-0">
                                {[{ step: 1, label: "Cá nhân" }, { step: 2, label: "Game" }, { step: 3, label: "Xác nhận" }].map((s, i) => (
                                    <div key={s.step} className="flex items-center flex-1">
                                        <button type="button" onClick={() => { if (s.step < regStep) setRegStep(s.step); }} className="flex items-center gap-2.5 group">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${regStep === s.step ? 'bg-efb-blue text-white ring-4 ring-blue-100 scale-110' :
                                                regStep > s.step ? 'bg-efb-blue text-white' :
                                                    'bg-gray-100 text-gray-400'
                                                }`}>
                                                {regStep > s.step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                                            </div>
                                            <span className={`text-xs font-medium transition-colors hidden sm:inline ${regStep === s.step ? 'text-efb-blue' :
                                                regStep > s.step ? 'text-gray-600' :
                                                    'text-gray-400'
                                                }`}>{s.label}</span>
                                        </button>
                                        {i < 2 && (
                                            <div className="flex-1 mx-3 h-0.5 rounded-full bg-gray-100 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ease-out ${regStep > s.step ? 'w-full bg-efb-blue' : 'w-0 bg-transparent'}`} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handleRegister} className="px-6 py-6 space-y-5">
                        <AnimatePresence mode="wait">
                            {regStep === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Họ và tên VĐV <span className="text-red-400">*</span></Label><Input placeholder="Nguyễn Văn A" value={regForm.playerName} onChange={e => setRegForm({ ...regForm, playerName: e.target.value })} required className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Ngày sinh <span className="text-red-400">*</span></Label><DatePicker value={regForm.dateOfBirth ? new Date(regForm.dateOfBirth + 'T00:00:00') : undefined} onChange={(date) => setRegForm({ ...regForm, dateOfBirth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '' })} placeholder="dd/mm/yyyy" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Số điện thoại <span className="text-red-400">*</span></Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="090xxxxxxx" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} required className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Email <span className="text-[10px] text-gray-400">(không thể thay đổi)</span></Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input type="email" value={regForm.email} readOnly tabIndex={-1} className="h-11 pl-10 rounded-lg border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed text-sm" /></div></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-gray-500">Quốc gia <span className="text-red-400">*</span></Label>
                                            <Popover open={countryOpen} onOpenChange={(open) => { setCountryOpen(open); if (open && countries.length === 0) { fetch('https://restcountries.com/v3.1/all?fields=name,cca2').then(r => r.json()).then((data: { name: { common: string }; cca2: string }[]) => { const sorted = data.map(c => ({ name: c.name.common, code: c.cca2 })).sort((a, b) => { if (a.name === 'Vietnam') return -1; if (b.name === 'Vietnam') return 1; return a.name.localeCompare(b.name); }); const vnIdx = sorted.findIndex(c => c.code === 'VN'); if (vnIdx > 0) { const vn = sorted.splice(vnIdx, 1)[0]; vn.name = 'Việt Nam'; sorted.unshift(vn); } setCountries(sorted); }).catch(() => { setCountries([{ name: 'Việt Nam', code: 'VN' }, { name: 'Japan', code: 'JP' }, { name: 'South Korea', code: 'KR' }, { name: 'Thailand', code: 'TH' }]); }); } }}>
                                                <PopoverTrigger asChild>
                                                    <button type="button" className={`flex h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all hover:bg-white focus:outline-none focus:border-efb-blue focus:bg-white ${!regCountry ? 'text-gray-400' : 'text-gray-900'}`}>
                                                        <div className="flex items-center gap-2 truncate">
                                                            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                            <span className="truncate">{regCountry || 'Chọn quốc gia...'}</span>
                                                        </div>
                                                        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[280px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Tìm quốc gia..." />
                                                        <CommandList>
                                                            <CommandEmpty>Không tìm thấy</CommandEmpty>
                                                            <CommandGroup>
                                                                {countries.map(c => (
                                                                    <CommandItem key={c.code} value={c.name} onSelect={() => { setRegCountry(c.name); setRegForm(prev => ({ ...prev, province: '' })); setCountryOpen(false); }}>
                                                                        <Check className={`w-3.5 h-3.5 mr-2 ${regCountry === c.name ? 'opacity-100' : 'opacity-0'}`} />
                                                                        {c.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-gray-500">Tỉnh / Thành phố <span className="text-red-400">*</span></Label>
                                            {regCountry === 'Việt Nam' ? (
                                                <Popover open={provinceOpen} onOpenChange={(open) => { setProvinceOpen(open); if (open && vnProvinces.length === 0) { fetch('https://provinces.open-api.vn/api/p/').then(r => r.json()).then((data: { name: string; code: number }[]) => setVnProvinces(data)).catch(() => { }); } }}>
                                                    <PopoverTrigger asChild>
                                                        <button type="button" className={`flex h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all hover:bg-white focus:outline-none focus:border-efb-blue focus:bg-white ${!regForm.province ? 'text-gray-400' : 'text-gray-900'}`}>
                                                            <div className="flex items-center gap-2 truncate">
                                                                <MapPinned className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                <span className="truncate">{regForm.province || 'Chọn tỉnh thành...'}</span>
                                                            </div>
                                                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[280px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Tìm tỉnh thành..." />
                                                            <CommandList>
                                                                <CommandEmpty>Không tìm thấy</CommandEmpty>
                                                                <CommandGroup>
                                                                    {vnProvinces.map(p => (
                                                                        <CommandItem key={p.code} value={p.name} onSelect={() => { setRegForm(prev => ({ ...prev, province: p.name })); setProvinceOpen(false); }}>
                                                                            <Check className={`w-3.5 h-3.5 mr-2 ${regForm.province === p.name ? 'opacity-100' : 'opacity-0'}`} />
                                                                            {p.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                <div className="relative">
                                                    <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input placeholder="Nhập tên thành phố..." value={regForm.province} onChange={e => setRegForm({ ...regForm, province: e.target.value })} className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-3 flex justify-end"><Button type="button" onClick={() => { if (!regForm.playerName.trim() || !regForm.phone.trim() || !regForm.dateOfBirth) { toast.error('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Ngày sinh'); return; } setRegStep(2); }} className="h-11 px-8 bg-efb-blue text-white rounded-lg font-medium flex items-center gap-2">Tiếp theo <ChevronRight className="w-4 h-4" /></Button></div>
                                </motion.div>
                            )}
                            {regStep === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">ID Game (Konami ID) <span className="text-red-400">*</span></Label><Input placeholder="efoot-1234..." value={regForm.gamerId} onChange={e => setRegForm({ ...regForm, gamerId: e.target.value })} required className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Nickname eFootball <span className="text-red-400">*</span></Label><Input placeholder="Tên trong game" value={regForm.nickname} onChange={e => setRegForm({ ...regForm, nickname: e.target.value })} required className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Facebook <span className="text-red-400">*</span></Label><div className="relative"><Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Tên Facebook" value={regForm.facebookName} onChange={e => setRegForm({ ...regForm, facebookName: e.target.value })} required className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Link Facebook <span className="text-red-400">*</span></Label><div className="relative"><ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="https://facebook.com/..." value={regForm.facebookLink} onChange={e => setRegForm({ ...regForm, facebookLink: e.target.value })} required className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Tên Team <span className="text-[10px] font-normal text-gray-400">(không bắt buộc)</span></Label><Input placeholder="VD: FC Saigon, Team Hanoi..." value={regForm.teamName} onChange={e => setRegForm({ ...regForm, teamName: e.target.value })} className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" maxLength={100} /></div>
                                    </div>
                                    <div className="pt-3 flex justify-between">
                                        <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="h-11 px-6 rounded-lg font-medium border-gray-200 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Quay lại</Button>
                                        <Button type="button" onClick={() => { if (!regForm.gamerId.trim() || !regForm.nickname.trim() || !regForm.facebookName.trim() || !regForm.facebookLink.trim()) { toast.error('Vui lòng nhập đầy đủ ID Game, Nickname, Facebook và Link Facebook'); return; } setRegStep(3); }} className="h-11 px-8 bg-efb-blue text-white rounded-lg font-medium flex items-center gap-2">Tiếp theo <ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </motion.div>
                            )}
                            {regStep === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
                                    <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Hình cá nhân (rõ mặt) <span className="text-red-500">*</span></Label><div className="flex items-start gap-4">{regForm.personalPhoto ? (<div className="relative"><img src={regForm.personalPhoto} alt="Ảnh" className="w-24 h-24 object-cover rounded-xl border-2 border-emerald-300" /><button type="button" onClick={() => setRegForm(prev => ({ ...prev, personalPhoto: '' }))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"><X className="w-3.5 h-3.5" /></button></div>) : (<label className="cursor-pointer flex-1"><div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-red-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all bg-red-50/30">{uploadingPersonal ? <Loader2 className="w-5 h-5 animate-spin text-efb-blue" /> : <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Camera className="w-5 h-5 text-efb-blue" /></div>}<div><p className="text-sm font-medium text-gray-700">Tải ảnh cá nhân <span className="text-red-500 text-xs">(bắt buộc)</span></p><p className="text-[11px] text-gray-400">Mọi định dạng ảnh — Tự động nén</p></div></div><input type="file" accept="image/*" className="hidden" disabled={uploadingPersonal} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRegImage(f, 'personalPhoto'); e.target.value = ''; }} /></label>)}</div></div>
                                    <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Hình đội hình thẻ thi đấu <span className="text-red-500">*</span></Label><div className="flex items-start gap-4">{regForm.teamLineupPhoto ? (<div className="relative"><img src={regForm.teamLineupPhoto} alt="Đội hình" className="w-40 h-24 object-cover rounded-xl border-2 border-emerald-300" /><button type="button" onClick={() => setRegForm(prev => ({ ...prev, teamLineupPhoto: '' }))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"><X className="w-3.5 h-3.5" /></button></div>) : (<label className="cursor-pointer flex-1"><div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-red-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all bg-red-50/30">{uploadingLineup ? <Loader2 className="w-5 h-5 animate-spin text-efb-blue" /> : <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-emerald-600" /></div>}<div><p className="text-sm font-medium text-gray-700">Tải ảnh đội hình <span className="text-red-500 text-xs">(bắt buộc)</span></p><p className="text-[11px] text-gray-400">Mọi định dạng ảnh — Tự động nén</p></div></div><input type="file" accept="image/*" className="hidden" disabled={uploadingLineup} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRegImage(f, 'teamLineupPhoto'); e.target.value = ''; }} /></label>)}</div></div>
                                    {t.entryFee > 0 && (<div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3"><DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0" /><div><p className="text-xs font-medium text-amber-800">Lệ phí: {t.entryFee?.toLocaleString('vi-VN')} {t.currency || 'VNĐ'}</p><p className="text-[10px] text-amber-600/70 mt-0.5">Thanh toán sau đăng ký.</p></div></div>)}
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tóm tắt</p><div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm"><div><span className="text-gray-400">Họ tên:</span> <span className="font-medium text-gray-700">{regForm.playerName}</span></div><div><span className="text-gray-400">SĐT:</span> <span className="font-medium text-gray-700">{regForm.phone}</span></div><div><span className="text-gray-400">ID Game:</span> <span className="font-medium text-gray-700">{regForm.gamerId}</span></div>{regForm.teamName && <div><span className="text-gray-400">Team:</span> <span className="font-medium text-gray-700">{regForm.teamName}</span></div>}{regForm.nickname && <div><span className="text-gray-400">Nickname:</span> <span className="font-medium text-gray-700">{regForm.nickname}</span></div>}{regForm.province && <div><span className="text-gray-400">Tỉnh/TP:</span> <span className="font-medium text-gray-700">{regForm.province}</span></div>}</div></div>
                                    <div className="pt-3 flex justify-between"><Button type="button" variant="outline" onClick={() => setRegStep(2)} className="h-11 px-6 rounded-lg font-medium border-gray-200 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Quay lại</Button><Button type="submit" className="h-11 px-8 bg-gradient-to-r from-efb-blue to-blue-600 text-white rounded-lg font-medium shadow-sm flex items-center gap-2" disabled={isRegistering}>{isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Xác nhận <ChevronRight className="w-4 h-4" /></>}</Button></div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <p className="text-center text-[10px] text-gray-400 leading-relaxed">Bằng việc nhấn đăng ký, bạn đồng ý với thể lệ giải đấu.</p>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ===== Payment Dialog ===== */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <CreditCard className="w-4.5 h-4.5 text-amber-600" />
                                </div>
                                Thanh toán lệ phí
                            </DialogTitle>
                            <DialogDescription className="text-[13px] text-gray-500">Hoàn tất thanh toán để xác nhận đăng ký</DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 flex items-center justify-between p-3 bg-white/80 rounded-xl border border-amber-100">
                            <div>
                                <p className="text-xs text-gray-400">Giải đấu</p>
                                <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{t.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Lệ phí</p>
                                <p className="text-lg font-bold text-amber-600">{t.entryFee?.toLocaleString('vi-VN')} <span className="text-xs font-medium">{t.currency || 'VNĐ'}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        {/* Status banners */}
                        {myRegistration?.paymentStatus === 'paid' || myRegistration?.paymentStatus === 'confirmed' ? (
                            <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Đã thanh toán thành công</p>
                                    <p className="text-xs text-green-600 mt-0.5">Đăng ký của bạn đang chờ Manager duyệt.</p>
                                </div>
                            </div>
                        ) : myRegistration?.paymentStatus === 'pending_verification' ? (
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
                                <Clock className="w-6 h-6 text-orange-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-orange-800">Đang chờ xác nhận thanh toán</p>
                                    <p className="text-xs text-orange-600 mt-0.5">Minh chứng của bạn đang được kiểm tra.</p>
                                </div>
                            </div>
                        ) : t.entryFee <= 0 ? (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                                <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Giải đấu miễn phí</p>
                                    <p className="text-xs text-blue-600 mt-0.5">Đăng ký của bạn đang chờ duyệt.</p>
                                </div>
                            </div>
                        ) : null}

                        {/* Payment Methods - only show if unpaid and has entry fee */}
                        {myRegistration?.paymentStatus === 'unpaid' && t.entryFee > 0 && (
                            <>
                                {!selectedPayMethod ? (
                                    <div className="space-y-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chọn phương thức thanh toán</p>
                                        {paymentMethods.length === 0 ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                <span className="text-sm text-gray-400 ml-2">Đang tải...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {paymentMethods.map((method: any) => (
                                                    <button key={method.id || method._id} type="button" onClick={() => handleSelectPaymentMethod(method)} disabled={isPaymentLoading} className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all text-left group">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center flex-shrink-0 transition-colors">
                                                            {method.mode === 'auto' ? <Wallet className="w-5 h-5 text-efb-blue" /> : <CreditCard className="w-5 h-5 text-gray-500 group-hover:text-efb-blue" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800">{method.name || method.bankName || 'Chuyển khoản'}</p>
                                                            <p className="text-xs text-gray-400">{method.mode === 'auto' ? 'Thanh toán tự động' : `${method.bankName || ''} • ${method.accountNumber || ''}`}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-efb-blue transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <button type="button" onClick={() => setSelectedPayMethod(null)} className="flex items-center gap-1.5 text-sm text-efb-blue hover:underline">
                                            <ChevronLeft className="w-4 h-4" /> Chọn phương thức khác
                                        </button>

                                        {/* Bank info */}
                                        {(() => {
                                            const m = paymentMethods.find((pm: any) => pm.id === selectedPayMethod || pm._id === selectedPayMethod); if (!m) return null; const qrUrl = getVietQRUrl(m); return (
                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2.5">
                                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông tin chuyển khoản</p>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div><span className="text-gray-400">Ngân hàng:</span></div>
                                                            <div><span className="font-medium text-gray-800">{m.bankName}</span></div>
                                                            <div><span className="text-gray-400">Số TK:</span></div>
                                                            <div><span className="font-medium text-gray-800 select-all">{m.accountNumber}</span></div>
                                                            <div><span className="text-gray-400">Chủ TK:</span></div>
                                                            <div><span className="font-medium text-gray-800">{m.accountName}</span></div>
                                                            <div><span className="text-gray-400">Số tiền:</span></div>
                                                            <div><span className="font-bold text-amber-600">{t.entryFee?.toLocaleString('vi-VN')} {t.currency || 'VNĐ'}</span></div>
                                                        </div>
                                                        <div className="pt-1">
                                                            <p className="text-xs text-gray-400">Nội dung CK:</p>
                                                            <p className="text-sm font-medium text-efb-blue select-all bg-blue-50 px-2 py-1 rounded mt-1">{t.title} - {myRegistration?.playerName}</p>
                                                        </div>
                                                    </div>

                                                    {qrUrl && (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <p className="text-xs text-gray-400">Quét mã QR để thanh toán nhanh</p>
                                                            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                                                <img src={qrUrl} alt="VietQR" className="w-48 h-48 object-contain" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Upload proof */}
                                                    <div className="space-y-2.5">
                                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tải lên minh chứng thanh toán</p>
                                                        {paymentProofFile ? (
                                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
                                                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-800 truncate">{paymentProofFile.name}</p>
                                                                    <p className="text-xs text-gray-400">{(paymentProofFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                                                </div>
                                                                <button type="button" onClick={() => setPaymentProofFile(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        ) : (
                                                            <label className="cursor-pointer block">
                                                                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all">
                                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Upload className="w-5 h-5 text-efb-blue" /></div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-700">Chọn ảnh minh chứng</p>
                                                                        <p className="text-[11px] text-gray-400">Screenshot chuyển khoản — JPG, PNG</p>
                                                                    </div>
                                                                </div>
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setPaymentProofFile(e.target.files[0]); e.target.value = ''; }} />
                                                            </label>
                                                        )}

                                                        <Button onClick={handleSubmitPaymentProof} disabled={!paymentProofFile || isSubmittingProof} className="w-full h-11 bg-gradient-to-r from-efb-blue to-blue-600 text-white rounded-xl font-medium">
                                                            {isSubmittingProof ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang gửi...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Gửi minh chứng</>}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <button type="button" onClick={handleCancelRegistration} className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1">
                            Hủy đăng ký giải đấu
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {selectedMatch && <MatchDetailViewModal match={selectedMatch} tournament={t} onClose={() => setSelectedMatch(null)} user={user} myRegistration={myRegistration} />}

            {/* Lineup Viewer Dialog */}
            <Dialog open={!!lineupViewTeam} onOpenChange={(open) => !open && setLineupViewTeam(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50/60 to-white">
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-500" /> Đội hình thi đấu
                        </DialogTitle>
                        {lineupViewTeam && (
                            <div className="flex items-center gap-3 mt-3">
                                {lineupViewTeam.personalPhoto && (
                                    <img src={lineupViewTeam.personalPhoto} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-blue-200" />
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{lineupViewTeam.name}</p>
                                    <p className="text-[11px] text-gray-400">{lineupViewTeam.teamName}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {lineupViewTeam?.photo && (
                        <div className="p-4">
                            <img
                                src={lineupViewTeam.photo}
                                alt={`Đội hình - ${lineupViewTeam.name}`}
                                className="w-full rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => window.open(lineupViewTeam.photo, '_blank')}
                            />
                            <p className="text-center text-[10px] text-gray-400 mt-2">Nhấn vào ảnh để xem kích thước đầy đủ</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
