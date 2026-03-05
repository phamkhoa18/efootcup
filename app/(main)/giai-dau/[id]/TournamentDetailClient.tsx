"use client";
import { toast } from "sonner";

import { useState, useEffect, useRef } from "react";
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
    LogIn, AlertCircle, Info, X, Watch, CreditCard, Upload, ExternalLink, Wallet, Image as ImageIcon, User
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

const tabs = [
    { key: "overview", label: "Tổng quan", icon: FileText },
    { key: "bracket", label: "Sơ đồ thi đấu", icon: Swords },
    { key: "players", label: "Danh sách VĐV", icon: Users },
    { key: "schedule", label: "Lịch thi đấu", icon: Calendar },
];

const UNIT_HEIGHT = 110;

const MatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => {
    const isWalkover = match.status === "walkover";
    const bracketNumber = match.bracketPosition?.y !== undefined ? match.bracketPosition.y + 1 : (match.matchNumber || 0);

    const isMatchScheduled = !isWalkover && (!match.homeTeam || !match.awayTeam);

    const homeName = match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.name || (isWalkover ? "Tự do" : "Chờ kết quả");
    const awayName = match.awayTeam?.name || match.awayTeam?.shortName || match.p2?.name || (isWalkover ? "Tự do" : "Chờ kết quả");
    const homeScore = isWalkover ? "0" : (match.homeScore ?? match.p1?.score ?? "");
    const awayScore = isWalkover ? "0" : (match.awayScore ?? match.p2?.score ?? "");
    const isCompleted = match.status === "completed" || match.status === "Kết thúc" || isWalkover;
    const isLive = match.status === "live" || match.status === "Đang diễn ra";
    const homeWin = isCompleted && (match.winner === (match.homeTeam?._id || match.homeTeam?.id) || (homeScore !== "" && awayScore !== "" && Number(homeScore) > Number(awayScore)));
    const awayWin = isCompleted && (match.winner === (match.awayTeam?._id || match.awayTeam?.id) || (homeScore !== "" && awayScore !== "" && Number(awayScore) > Number(homeScore)));

    if (isWalkover) {
        const hName = match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.ingame || "Tự do";
        const p1Name = match.homeTeam?.player1 || match.p1?.name || "";
        const p2Name = match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? match.homeTeam.player2 : "";

        return (
            <div className="flex items-center relative z-20 w-[180px]">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                    {bracketNumber}
                </div>

                <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    onClick={onClick}
                    className="w-full bg-white rounded-[6px] border border-[#E2E8F0] shadow-sm flex flex-col justify-center cursor-pointer overflow-hidden z-20 relative px-2 py-1.5 h-[44px]"
                >
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">{hName}</span>
                    <div className="flex flex-col items-center">
                        <span className={`truncate text-[11px] text-gray-800 font-bold ${!match.homeTeam && !match.p1 ? "text-gray-400 italic font-medium" : ""}`}>
                            {p1Name || (!match.homeTeam ? "Tự do" : "...")}
                        </span>
                        {p2Name && (
                            <span className="truncate text-[10px] text-gray-700 font-bold mt-0.5">
                                {p2Name}
                            </span>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex items-center relative z-20 w-[180px]">
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

                <div className={`p-1.5 flex flex-col ${homeWin ? "bg-blue-50/20" : ""} ${isLive ? 'mt-[10px]' : ''}`}>
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">{homeName}</span>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.1]">
                            <span className={`truncate text-[11px] ${homeWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"} ${!match.homeTeam && !match.p1 ? "text-gray-400 italic" : ""}`}>
                                {match.homeTeam?.player1 || match.p1?.name || "Chờ kết quả"}
                            </span>
                            {match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" && (
                                <span className={`truncate text-[11px] mt-0.5 ${homeWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"}`}>
                                    {match.homeTeam.player2}
                                </span>
                            )}
                        </div>
                        <span className={`text-[12px] tabular-nums ml-1 ${homeWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{homeScore}</span>
                    </div>
                </div>

                <div className="h-px bg-[#E2E8F0] w-full" />

                <div className={`p-1.5 flex flex-col ${awayWin ? "bg-blue-50/20" : ""}`}>
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">{awayName}</span>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.1]">
                            <span className={`truncate text-[11px] ${awayWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"} ${!match.awayTeam && !match.p2 ? "text-gray-400 italic" : ""}`}>
                                {match.awayTeam?.player1 || match.p2?.name || "Chờ kết quả"}
                            </span>
                            {match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" && (
                                <span className={`truncate text-[11px] mt-0.5 ${awayWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"}`}>
                                    {match.awayTeam.player2}
                                </span>
                            )}
                        </div>
                        <span className={`text-[12px] tabular-nums ml-1 ${awayWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{awayScore}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const MatchDetailViewModal = ({ match, tournament, onClose, user, myRegistration }: { match: any; tournament: any; onClose: () => void; user?: any; myRegistration?: any }) => {
    const homeScore = match.homeScore ?? "";
    const awayScore = match.awayScore ?? "";

    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const [submitHomeScore, setSubmitHomeScore] = useState("");
    const [submitAwayScore, setSubmitAwayScore] = useState("");
    const [submitNotes, setSubmitNotes] = useState("");
    const [submitScreenshots, setSubmitScreenshots] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingShot, setIsUploadingShot] = useState(false);

    // Check if user is part of this match
    const userTeamId = (myRegistration?.team?._id || myRegistration?.team)?.toString?.();
    const isUserInMatch = userTeamId && (
        (match.homeTeam?._id || match.homeTeam)?.toString?.() === userTeamId ||
        (match.awayTeam?._id || match.awayTeam)?.toString?.() === userTeamId
    );
    const canSubmitResult = user && isUserInMatch && match.status !== "completed";

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
            formData.append("type", "registration");
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
            // Any non-approved state: open payment/status dialog
            setShowPaymentDialog(true);
            if (paymentMethods.length === 0 && t.entryFee > 0) loadPaymentMethods();
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
        if (activeTab === "bracket" && !brackets) loadBrackets();
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
                    window.location.href = res.data.payUrl;
                } else {
                    toast.error(res.message || "Lỗi tạo thanh toán");
                }
            } catch (e) {
                toast.error("Có lỗi xảy ra khi tạo thanh toán");
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

    const handleUploadRegImage = async (file: File, field: 'personalPhoto' | 'teamLineupPhoto') => {
        const setter = field === 'personalPhoto' ? setUploadingPersonal : setUploadingLineup;
        setter(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'registration');
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
            const res = await fetch('/api/upload', { method: 'POST', headers, body: formData });
            const data = await res.json();
            const url = data.data?.url || data.url;
            if (url) {
                setRegForm(prev => ({ ...prev, [field]: url }));
            } else {
                toast.error(data.message || 'Upload thất bại');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Có lỗi khi tải ảnh lên');
        } finally {
            setter(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) return;
        setIsRegistering(true);
        try {
            const res = await tournamentAPI.register(id, {
                ...regForm,
                teamShortName: regForm.teamShortName.toUpperCase(),
                playerName: regForm.playerName || user?.name,
                phone: regForm.phone,
                email: regForm.email || user?.email,
            });
            if (res.success) {
                setMyRegistration(res.data);
                setShowRegDialog(false);
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
            matches: roundMatches.filter(m => m.status !== "walkover")
        }))
        .filter(round => round.matches.length > 0);

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
                            {t.status === "registration" && (
                                checkingRegistration ? (
                                    <Button disabled className="bg-gray-300 text-white rounded-xl"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra...</Button>
                                ) : myRegistration ? (
                                    myRegistration.status === 'approved' ? (
                                        <Button disabled className="bg-green-500 text-white rounded-xl"><CheckCircle2 className="w-4 h-4 mr-2" /> Đã được duyệt</Button>
                                    ) : (
                                        <>
                                            <Button onClick={handleRegisterClick} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                                                {myRegistration.paymentStatus === 'paid' || myRegistration.paymentStatus === 'confirmed' || t.entryFee <= 0 ? (
                                                    <><Clock className="w-4 h-4 mr-2" /> Xem trạng thái đăng ký</>
                                                ) : myRegistration.paymentStatus === 'pending_verification' ? (
                                                    <><Clock className="w-4 h-4 mr-2" /> Xem trạng thái thanh toán</>
                                                ) : (
                                                    <><CreditCard className="w-4 h-4 mr-2" /> Thanh toán lệ phí</>
                                                )}
                                            </Button>
                                            <Button variant="outline" onClick={handleCancelRegistration} className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300">
                                                <X className="w-4 h-4 mr-2" /> Hủy đăng ký
                                            </Button>
                                        </>
                                    )
                                ) : (
                                    <Button onClick={handleRegisterClick} className="bg-efb-blue text-white rounded-xl"><UserPlus className="w-4 h-4 mr-2" /> Đăng ký ngay</Button>
                                )
                            )}
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
                                        return (
                                            <div key={rIndex} className="flex">
                                                <div className="flex flex-col w-[180px]">
                                                    <div className="h-10 flex items-center justify-center mb-12">
                                                        <div className="w-[140px] py-1.5 rounded-sm bg-[#FEEBDB] flex items-center justify-center">
                                                            <span className="text-[12px] font-bold text-gray-800">{round.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="relative flex-1">
                                                        {round.matches.map((match: any, mIdx: any) => {
                                                            const scale = Math.pow(2, rIndex);
                                                            const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
                                                            const yOffset = topPadding + (match.bracketPosition?.y || 0) * UNIT_HEIGHT * scale;

                                                            return (
                                                                <div
                                                                    key={match._id || match.id}
                                                                    className="absolute left-0 flex items-center"
                                                                    style={{
                                                                        top: `${yOffset}px`,
                                                                        height: `${UNIT_HEIGHT}px`,
                                                                        width: '100%'
                                                                    }}
                                                                >
                                                                    <MatchCard match={match} onClick={() => setSelectedMatch(match)} />

                                                                    {match.nextMatch && (
                                                                        <>
                                                                            <div className="absolute right-[-40px] w-[40px] h-px bg-[#CBD5E1]" />
                                                                            <div
                                                                                className="absolute right-[-40px] w-px bg-[#CBD5E1]"
                                                                                style={{
                                                                                    height: `${(UNIT_HEIGHT * scale) / 2}px`,
                                                                                    top: (match.bracketPosition?.y % 2 === 0) ? '50%' : 'auto',
                                                                                    bottom: (match.bracketPosition?.y % 2 !== 0) ? '50%' : 'auto'
                                                                                }}
                                                                            />
                                                                            {(match.bracketPosition?.y % 2 === 0) && (
                                                                                <div
                                                                                    className="absolute right-[-128px] w-[88px] h-px bg-[#CBD5E1]"
                                                                                    style={{ top: 'calc(50% + ' + ((UNIT_HEIGHT * scale) / 2) + 'px)' }}
                                                                                />
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {/* Left connector for Round 2+ (to catch Byes) */}
                                                                    {rIndex > 0 && <div className="absolute left-[-40px] w-[40px] h-px bg-[#CBD5E1]" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="w-[128px]" />
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
                                {matches.filter((m: any) => m.status !== 'walkover').map((m: any) => (
                                    <div key={m._id} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-sm transition-all" onClick={() => setSelectedMatch(m)}>
                                        <div className="w-20 text-center"><div className="font-bold text-sm">{m.scheduledDate ? formatDate(m.scheduledDate) : "TBD"}</div><div className="text-[10px] text-gray-400">{m.roundName || `Vòng ${m.round}`}</div></div>
                                        <div className="flex-1 font-medium">{m.homeTeam?.name || "TBD"} vs {m.awayTeam?.name || "TBD"}</div>
                                        <div className="font-bold">{m.status === 'completed' ? `${m.homeScore} - ${m.awayScore}` : '—'}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                </div>
            </section>


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
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Ngày sinh</Label><DatePicker value={regForm.dateOfBirth ? new Date(regForm.dateOfBirth + 'T00:00:00') : undefined} onChange={(date) => setRegForm({ ...regForm, dateOfBirth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '' })} placeholder="dd/mm/yyyy" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Số điện thoại <span className="text-red-400">*</span></Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="090xxxxxxx" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} required className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input type="email" placeholder="email@example.com" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-gray-500">Quốc gia</Label>
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
                                            <Label className="text-xs font-medium text-gray-500">Tỉnh / Thành phố</Label>
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
                                    <div className="pt-3 flex justify-end"><Button type="button" onClick={() => { if (!regForm.playerName.trim() || !regForm.phone.trim()) { toast.error('Vui lòng nhập Họ tên và Số điện thoại'); return; } setRegStep(2); }} className="h-11 px-8 bg-efb-blue text-white rounded-lg font-medium flex items-center gap-2">Tiếp theo <ChevronRight className="w-4 h-4" /></Button></div>
                                </motion.div>
                            )}
                            {regStep === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">ID Game (Konami ID) <span className="text-red-400">*</span></Label><Input placeholder="efoot-1234..." value={regForm.gamerId} onChange={e => setRegForm({ ...regForm, gamerId: e.target.value })} required className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Nickname eFootball</Label><Input placeholder="Tên trong game" value={regForm.nickname} onChange={e => setRegForm({ ...regForm, nickname: e.target.value })} className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Facebook</Label><div className="relative"><Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Tên Facebook" value={regForm.facebookName} onChange={e => setRegForm({ ...regForm, facebookName: e.target.value })} className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Link Facebook</Label><div className="relative"><ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="https://facebook.com/..." value={regForm.facebookLink} onChange={e => setRegForm({ ...regForm, facebookLink: e.target.value })} className="h-11 pl-10 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Tên đội bóng <span className="text-red-400">*</span></Label><Input placeholder="Manchester United" value={regForm.teamName} onChange={e => setRegForm({ ...regForm, teamName: e.target.value })} required className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Viết tắt (4 ký tự) <span className="text-red-400">*</span></Label><Input placeholder="MU" value={regForm.teamShortName} onChange={e => setRegForm({ ...regForm, teamShortName: e.target.value.toUpperCase() })} required maxLength={4} className="h-11 rounded-lg border-gray-200 focus:border-efb-blue bg-gray-50/50 focus:bg-white transition-all text-sm uppercase" /></div>
                                    </div>
                                    <div className="pt-3 flex justify-between">
                                        <Button type="button" variant="outline" onClick={() => setRegStep(1)} className="h-11 px-6 rounded-lg font-medium border-gray-200 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Quay lại</Button>
                                        <Button type="button" onClick={() => { if (!regForm.gamerId.trim() || !regForm.teamName.trim() || !regForm.teamShortName.trim()) { toast.error('Vui lòng nhập ID Game, Tên đội và Viết tắt'); return; } setRegStep(3); }} className="h-11 px-8 bg-efb-blue text-white rounded-lg font-medium flex items-center gap-2">Tiếp theo <ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </motion.div>
                            )}
                            {regStep === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
                                    <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Hình cá nhân (rõ mặt)</Label><div className="flex items-start gap-4">{regForm.personalPhoto ? (<div className="relative group"><img src={regForm.personalPhoto} alt="Ảnh" className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200" /><button type="button" onClick={() => setRegForm(prev => ({ ...prev, personalPhoto: '' }))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-3.5 h-3.5" /></button></div>) : (<label className="cursor-pointer flex-1"><div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all">{uploadingPersonal ? <Loader2 className="w-5 h-5 animate-spin text-efb-blue" /> : <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Camera className="w-5 h-5 text-efb-blue" /></div>}<div><p className="text-sm font-medium text-gray-700">Tải ảnh cá nhân</p><p className="text-[11px] text-gray-400">JPG, PNG — tối đa 5MB</p></div></div><input type="file" accept="image/*" className="hidden" disabled={uploadingPersonal} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRegImage(f, 'personalPhoto'); e.target.value = ''; }} /></label>)}</div></div>
                                    <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-500">Hình đội hình thẻ thi đấu</Label><div className="flex items-start gap-4">{regForm.teamLineupPhoto ? (<div className="relative group"><img src={regForm.teamLineupPhoto} alt="Đội hình" className="w-40 h-24 object-cover rounded-xl border-2 border-gray-200" /><button type="button" onClick={() => setRegForm(prev => ({ ...prev, teamLineupPhoto: '' }))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-3.5 h-3.5" /></button></div>) : (<label className="cursor-pointer flex-1"><div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-efb-blue hover:bg-blue-50/30 transition-all">{uploadingLineup ? <Loader2 className="w-5 h-5 animate-spin text-efb-blue" /> : <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-emerald-600" /></div>}<div><p className="text-sm font-medium text-gray-700">Tải ảnh đội hình</p><p className="text-[11px] text-gray-400">Screenshot — JPG, PNG (tối đa 5MB)</p></div></div><input type="file" accept="image/*" className="hidden" disabled={uploadingLineup} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadRegImage(f, 'teamLineupPhoto'); e.target.value = ''; }} /></label>)}</div></div>
                                    {t.entryFee > 0 && (<div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3"><DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0" /><div><p className="text-xs font-medium text-amber-800">Lệ phí: {t.entryFee?.toLocaleString('vi-VN')} {t.currency || 'VNĐ'}</p><p className="text-[10px] text-amber-600/70 mt-0.5">Thanh toán sau đăng ký.</p></div></div>)}
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2"><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tóm tắt</p><div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm"><div><span className="text-gray-400">Họ tên:</span> <span className="font-medium text-gray-700">{regForm.playerName}</span></div><div><span className="text-gray-400">SĐT:</span> <span className="font-medium text-gray-700">{regForm.phone}</span></div><div><span className="text-gray-400">ID Game:</span> <span className="font-medium text-gray-700">{regForm.gamerId}</span></div><div><span className="text-gray-400">Đội:</span> <span className="font-medium text-gray-700">{regForm.teamName} ({regForm.teamShortName})</span></div>{regForm.nickname && <div><span className="text-gray-400">Nickname:</span> <span className="font-medium text-gray-700">{regForm.nickname}</span></div>}{regForm.province && <div><span className="text-gray-400">Tỉnh/TP:</span> <span className="font-medium text-gray-700">{regForm.province}</span></div>}</div></div>
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
        </>
    );
}
