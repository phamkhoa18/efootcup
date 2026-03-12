"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy, Swords, Clock, Activity, ChevronRight, Upload, Camera, X,
    CheckCircle2, Loader2, Lock, MessageCircle, Hash, User as UserIcon
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";

/* ─── Player Info Card ─── */
function PlayerCard({ team, label, labelColor }: { team: any; label: string; labelColor: string }) {
    const captain = team?.captain;
    const playerName = captain?.nickname || captain?.name || team?.shortName || team?.name || "—";
    const efvId = captain?.efvId;
    const avatar = captain?.avatar;
    const initials = (captain?.name || team?.name || "?")
        .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <div className="flex-1 flex flex-col items-center text-center min-w-0 px-1">
            {/* Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                {avatar ? (
                    <img src={avatar} alt={playerName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm sm:text-base font-bold text-slate-400">{initials}</span>
                )}
            </div>
            {/* Label */}
            <span className={`text-[8px] font-bold uppercase tracking-widest mt-2 ${labelColor}`}>{label}</span>
            {/* Name */}
            <p className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate max-w-full mt-0.5 leading-tight">
                {playerName}
            </p>
            {/* EFV ID */}
            {efvId ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded mt-1">
                    <Hash className="w-2.5 h-2.5" />EFV-{efvId}
                </span>
            ) : (
                <span className="text-[9px] text-gray-300 mt-1">—</span>
            )}
        </div>
    );
}

/* ─── VS / Score Center ─── */
function VsCenter({ match }: { match: any }) {
    if (match.status === "live" || match.status === "completed") {
        return (
            <div className="flex flex-col items-center justify-center gap-0.5 px-2 min-w-[80px]">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-gray-900 tabular-nums">{match.homeScore ?? 0}</span>
                    <span className="text-sm font-light text-gray-300">:</span>
                    <span className="text-2xl font-black text-gray-900 tabular-nums">{match.awayScore ?? 0}</span>
                </div>
                {match.status === "live" && (
                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider animate-pulse">Đang diễn ra</span>
                )}
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center gap-1 px-2 min-w-[80px]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200/50">
                <span className="text-[9px] font-black text-white tracking-tight">VS</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-semibold tabular-nums">
                    {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                </span>
            </div>
            <span className="text-[9px] text-gray-300 font-medium">
                {match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString("vi-VN") : "Sắp diễn ra"}
            </span>
        </div>
    );
}

/* ─── Submit Result Form (inline) ─── */
interface SubmitFormProps {
    match: any;
    myTeam?: any;
    opponent?: any;
    isHome?: boolean;
    userId?: string;
    onClose: () => void;
    onSubmitted?: () => void;
    /* Tournament detail modal context (optional overrides) */
    tournamentId?: string;
    homeName?: string;
    awayName?: string;
    homeAvatar?: string;
    awayAvatar?: string;
    homeEfvId?: number | string | null;
    awayEfvId?: number | string | null;
    initialHomeScore?: string;
    initialAwayScore?: string;
    initialNotes?: string;
    initialScreenshots?: string[];
    /** When true, homeScore/awayScore map directly to match homeScore/awayScore (no isHome swap) */
    directScoreMode?: boolean;
}

export function SubmitResultForm({
    match, myTeam, opponent, isHome, userId, onClose, onSubmitted,
    tournamentId, homeName: _homeName, awayName: _awayName,
    homeAvatar: _homeAvatar, awayAvatar: _awayAvatar,
    homeEfvId: _homeEfvId, awayEfvId: _awayEfvId,
    initialHomeScore, initialAwayScore, initialNotes, initialScreenshots,
    directScoreMode,
}: SubmitFormProps) {
    const [homeScore, setHomeScore] = React.useState(initialHomeScore ?? "");
    const [awayScore, setAwayScore] = React.useState(initialAwayScore ?? "");
    const [notes, setNotes] = React.useState(initialNotes ?? "");
    const [screenshots, setScreenshots] = React.useState<string[]>(initialScreenshots ?? []);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isUploadingShot, setIsUploadingShot] = React.useState(false);

    const myCaptain = myTeam?.captain;
    const oppCaptain = opponent?.captain;

    /* Resolve display names — prefer explicit overrides, then captain, then team */
    const resolvedHomeName = _homeName || myCaptain?.nickname || myCaptain?.name || myTeam?.shortName || "—";
    const resolvedAwayName = _awayName || oppCaptain?.nickname || oppCaptain?.name || opponent?.shortName || "—";
    const resolvedHomeAvatar = _homeAvatar ?? myCaptain?.avatar;
    const resolvedAwayAvatar = _awayAvatar ?? oppCaptain?.avatar;
    const resolvedHomeEfvId = _homeEfvId !== undefined ? _homeEfvId : myCaptain?.efvId;
    const resolvedAwayEfvId = _awayEfvId !== undefined ? _awayEfvId : oppCaptain?.efvId;
    const resolvedHomeInitials = (resolvedHomeName || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const resolvedAwayInitials = (resolvedAwayName || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const effectiveTournamentId = tournamentId || match.tournament?._id;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const tk = localStorage.getItem("efootcup_token");
            const myScore = Number(homeScore);
            const oppScore = Number(awayScore);
            const { toast } = await import("sonner");

            let finalHomeScore: number;
            let finalAwayScore: number;
            if (directScoreMode) {
                finalHomeScore = myScore;
                finalAwayScore = oppScore;
            } else {
                finalHomeScore = isHome ? myScore : oppScore;
                finalAwayScore = isHome ? oppScore : myScore;
            }

            const res = await fetch(`/api/tournaments/${effectiveTournamentId}/matches/submit-result`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
                body: JSON.stringify({
                    matchId: match._id,
                    homeScore: finalHomeScore,
                    awayScore: finalAwayScore,
                    screenshots,
                    notes,
                }),
            });
            const d = await res.json();
            if (d.success) {
                toast.success("Gửi kết quả thành công!");
                onClose();
                onSubmitted?.();
            } else {
                toast.error(d.message || "Có lỗi xảy ra");
            }
        } catch {
            const { toast } = await import("sonner");
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-500" /> Gửi kết quả trận đấu
                </h4>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            {/* Full Player Info + Score Inputs */}
            <div className="flex items-stretch justify-between gap-2 py-2">
                {/* My Player Card + Score */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0 px-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-blue-100">
                        {resolvedHomeAvatar ? (
                            <img src={resolvedHomeAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm sm:text-base font-bold text-blue-300">
                                {resolvedHomeInitials}
                            </span>
                        )}
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-2 text-blue-500">{directScoreMode ? 'Đội nhà' : 'Bạn'}</span>
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate max-w-full mt-0.5 leading-tight">
                        {resolvedHomeName}
                    </p>
                    {resolvedHomeEfvId ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded mt-1">
                            <Hash className="w-2.5 h-2.5" />EFV-{resolvedHomeEfvId}
                        </span>
                    ) : (
                        <span className="text-[9px] text-gray-300 mt-1">—</span>
                    )}
                    {/* Score input */}
                    <input type="number" min="0" max="99" value={homeScore} onChange={e => setHomeScore(e.target.value)} className="w-14 h-11 text-center text-lg font-black rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none bg-white transition-colors mt-3" placeholder="0" />
                </div>

                {/* VS divider */}
                <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <span className="text-[8px] font-black text-white">VS</span>
                    </div>
                    <span className="text-lg font-light text-gray-200 mt-auto mb-2">—</span>
                </div>

                {/* Opponent Player Card + Score */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0 px-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-md bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-red-100">
                        {resolvedAwayAvatar ? (
                            <img src={resolvedAwayAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm sm:text-base font-bold text-red-300">
                                {resolvedAwayInitials}
                            </span>
                        )}
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-2 text-red-400">{directScoreMode ? 'Đội khách' : 'Đối thủ'}</span>
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate max-w-full mt-0.5 leading-tight">
                        {resolvedAwayName}
                    </p>
                    {resolvedAwayEfvId ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded mt-1">
                            <Hash className="w-2.5 h-2.5" />EFV-{resolvedAwayEfvId}
                        </span>
                    ) : (
                        <span className="text-[9px] text-gray-300 mt-1">—</span>
                    )}
                    {/* Score input */}
                    <input type="number" min="0" max="99" value={awayScore} onChange={e => setAwayScore(e.target.value)} className="w-14 h-11 text-center text-lg font-black rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none bg-white transition-colors mt-3" placeholder="0" />
                </div>
            </div>

            {/* Screenshots */}
            <div>
                <label className="text-[10px] font-semibold text-gray-400 mb-1.5 block">Ảnh minh chứng <span className="text-red-500">*</span> (tối đa 3)</label>
                <div className="flex items-center gap-2 flex-wrap">
                    {screenshots.map((s, i) => (
                        <div key={i} className="relative group">
                            <img src={s} alt="SS" className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200" />
                            <button type="button" onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                        </div>
                    ))}
                    {screenshots.length < 3 && (
                        <label className="cursor-pointer">
                            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center transition-all">
                                {isUploadingShot ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <><Camera className="w-4 h-4 text-gray-400" /><span className="text-[8px] text-gray-400 mt-0.5">Thêm ảnh</span></>}
                            </div>
                            <input type="file" accept="image/*" className="hidden" disabled={isUploadingShot} onChange={async e => {
                                const f = e.target.files?.[0]; if (!f) return;
                                const { toast } = await import("sonner");
                                setIsUploadingShot(true);
                                try {
                                    // Auto-compress image
                                    const compressed = await compressImage(f);
                                    const fd = new FormData(); fd.append("file", compressed); fd.append("type", "screenshot");
                                    const hdrs: any = {}; const tk = localStorage.getItem("efootcup_token"); if (tk) hdrs.Authorization = `Bearer ${tk}`;
                                    const r = await fetch("/api/upload", { method: "POST", headers: hdrs, body: fd });
                                    if (!r.ok) {
                                        const errData = await r.json().catch(() => null);
                                        toast.error(errData?.message || `Upload lỗi (${r.status})`);
                                        return;
                                    }
                                    const d = await r.json(); const url = d.data?.url || d.url;
                                    if (url) {
                                        setScreenshots(prev => [...prev, url]);
                                    } else {
                                        toast.error("Upload thất bại, vui lòng thử lại");
                                    }
                                } catch (err) {
                                    console.error("Upload error:", err);
                                    toast.error("Lỗi kết nối, vui lòng thử lại");
                                } finally { setIsUploadingShot(false); }
                                e.target.value = "";
                            }} />
                        </label>
                    )}
                </div>
            </div>

            <div>
                <label className="text-[10px] font-semibold text-gray-400 mb-1.5 block">Ghi chú <span className="text-red-500">*</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nhập tên VĐV dành chiến thắng hoặc nội dung báo cáo." maxLength={500} rows={2} className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:border-blue-500 outline-none resize-none transition-colors ${notes.trim() === '' ? 'border-gray-200' : 'border-gray-200'}`} />
            </div>

            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button disabled={isSubmitting || homeScore === "" || awayScore === "" || screenshots.length === 0 || notes.trim() === ""} onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 hover:shadow-md transition-all">
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isSubmitting ? "Đang gửi..." : "Xác nhận gửi"}
                </button>
            </div>
            {(screenshots.length === 0 || notes.trim() === "") && (
                <div className="space-y-0.5">
                    {screenshots.length === 0 && (
                        <p className="text-[10px] text-red-500 font-medium text-center">⚠ Vui lòng đính kèm ít nhất 1 ảnh minh chứng</p>
                    )}
                    {notes.trim() === "" && (
                        <p className="text-[10px] text-red-500 font-medium text-center">⚠ Vui lòng nhập ghi chú</p>
                    )}
                </div>
            )}
        </motion.div>
    );
}

import React from "react";

/* ─── Main Match Card ─── */
interface MatchCardProps {
    match: any;
    myTeam: any;
    opponent: any;
    isHome: boolean;
    user: any;
    submitMatchId: string | null;
    setSubmitMatchId: (id: string | null) => void;
    onSubmitted?: () => void;
}

export default function MatchCard({ match, myTeam, opponent, isHome, user, submitMatchId, setSubmitMatchId, onSubmitted }: MatchCardProps) {
    const hasOfficialScore = match.homeScore !== null && match.homeScore !== undefined && match.awayScore !== null && match.awayScore !== undefined;
    const myExistingSub = match.resultSubmissions?.find(
        (s: any) => s.user?.toString?.() === user?._id?.toString?.() || s.user?._id?.toString?.() === user?._id?.toString?.()
    );
    const myCaptain = myTeam?.captain;
    const oppCaptain = opponent?.captain;

    return (
        <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
            {/* Top gradient accent */}
            {match.status === "live" && <div className="h-0.5 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />}

            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100/80">
                <Link href={`/giai-dau/${match.tournament?.slug || match.tournament?._id}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors min-w-0">
                    <Trophy className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="text-[10px] font-medium text-gray-400 truncate max-w-[160px]">{match.tournament?.title}</span>
                </Link>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {match.roundName || `Vòng ${match.round}`}
                    </span>
                    {match.status === "live" && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                            <Activity className="w-2.5 h-2.5" /> LIVE
                        </span>
                    )}
                </div>
            </div>

            {/* Players area */}
            <div className="flex items-center justify-between px-4 py-5">
                <PlayerCard team={myTeam} label="Bạn" labelColor="text-blue-500" />
                <VsCenter match={match} />
                <PlayerCard team={opponent} label="Đối thủ" labelColor="text-red-400" />
            </div>

            {/* Action Footer */}
            <div className="px-4 pb-4 pt-1 border-t border-gray-50">
                {(() => {
                    // STATE 1: completed / official score
                    if (match.status === "completed" || hasOfficialScore) {
                        return (
                            <div className="space-y-2">
                                <div className="px-3 py-3 bg-blue-50/80 border border-blue-100 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Kết quả chính thức</p>
                                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Đã khóa</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-[10px] font-semibold text-blue-700 truncate">{myCaptain?.nickname || myCaptain?.name || myTeam?.shortName || "BẠN"}</span>
                                            {myCaptain?.efvId && <span className="text-[8px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">EFV-{myCaptain.efvId}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 px-3">
                                            <span className="text-lg font-black text-blue-800">{isHome ? match.homeScore : match.awayScore}</span>
                                            <span className="text-gray-300">—</span>
                                            <span className="text-lg font-black text-blue-800">{isHome ? match.awayScore : match.homeScore}</span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                                            {oppCaptain?.efvId && <span className="text-[8px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">EFV-{oppCaptain.efvId}</span>}
                                            <span className="text-[10px] font-semibold text-blue-700 truncate">{oppCaptain?.nickname || oppCaptain?.name || opponent?.shortName || "ĐỐI THỦ"}</span>
                                        </div>
                                    </div>
                                </div>
                                {myExistingSub && myExistingSub.screenshots?.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap px-1">
                                        {myExistingSub.screenshots.map((s: string, si: number) => (
                                            <img key={si} src={s} alt="Minh chứng" className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => window.open(s, "_blank")} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    // STATE 2: already submitted
                    if (myExistingSub) {
                        return (
                            <div className="space-y-2">
                                <div className="px-3 py-3 bg-emerald-50/80 border border-emerald-100 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã gửi kết quả — chờ quản lý duyệt</p>
                                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-100 px-1.5 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Đã gửi</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-[10px] font-semibold text-emerald-700 truncate">{myCaptain?.nickname || myCaptain?.name || myTeam?.shortName || "BẠN"}</span>
                                            {myCaptain?.efvId && <span className="text-[8px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">EFV-{myCaptain.efvId}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 px-3">
                                            <span className="text-lg font-black text-emerald-800">{isHome ? myExistingSub.homeScore : myExistingSub.awayScore}</span>
                                            <span className="text-gray-300">—</span>
                                            <span className="text-lg font-black text-emerald-800">{isHome ? myExistingSub.awayScore : myExistingSub.homeScore}</span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                                            {oppCaptain?.efvId && <span className="text-[8px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">EFV-{oppCaptain.efvId}</span>}
                                            <span className="text-[10px] font-semibold text-emerald-700 truncate">{oppCaptain?.nickname || oppCaptain?.name || opponent?.shortName || "ĐỐI THỦ"}</span>
                                        </div>
                                    </div>
                                </div>
                                {myExistingSub.notes && (
                                    <p className="text-[10px] text-gray-500 italic px-1 flex items-center gap-1"><MessageCircle className="w-3 h-3 text-gray-400 flex-shrink-0" /> {myExistingSub.notes}</p>
                                )}
                                {myExistingSub.screenshots?.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap px-1">
                                        <p className="text-[9px] text-gray-400 font-semibold w-full mb-0.5">Ảnh minh chứng:</p>
                                        {myExistingSub.screenshots.map((s: string, si: number) => (
                                            <img key={si} src={s} alt="Minh chứng" className="w-14 h-14 rounded-lg object-cover border-2 border-emerald-200 cursor-pointer hover:opacity-80 hover:shadow-md transition-all" onClick={() => window.open(s, "_blank")} />
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end">
                                    <Link href={`/giai-dau/${match.tournament?.slug || match.tournament?._id}?tab=schedule`} className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-blue-600">
                                        Chi tiết <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        );
                    }
                    // STATE 3: submit form open
                    if (submitMatchId === match._id) {
                        return (
                            <SubmitResultForm
                                match={match} myTeam={myTeam} opponent={opponent} isHome={isHome} userId={user?._id}
                                onClose={() => setSubmitMatchId(null)}
                                onSubmitted={onSubmitted}
                            />
                        );
                    }
                    // Default: show submit button
                    return (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-medium italic">
                                {match.status === "live" ? "Vui lòng báo cáo kết quả sau trận" : "Chuẩn bị thi đấu"}
                            </span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSubmitMatchId(match._id)} className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all">
                                    <Upload className="w-3 h-3" /> Gửi kết quả
                                </button>
                                <Link href={`/giai-dau/${match.tournament?.slug || match.tournament?._id}?tab=schedule`} className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-blue-600">
                                    Chi tiết <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
