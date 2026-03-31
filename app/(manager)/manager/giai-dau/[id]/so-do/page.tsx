"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Users, Search, X, Copy, QrCode, Share2, Check, CheckCircle2, Info, Loader2, Download, ArrowUp, ArrowDown, Shuffle, Hash, RotateCcw, Sparkles, FileBarChart, Eye, ImageIcon, MessageSquare, Clock, User, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { useBracketSwap } from "@/hooks/useBracketSwap";
import SwapFloatingBar from "@/components/SwapFloatingBar";
import { useAuth } from "@/contexts/AuthContext";

const UNIT_HEIGHT = 110;

// --- Components ---

const MatchCard = ({ match, onClick, isSwapMode, selectedTeamId, swappedTeamIds, onTeamSelect }: {
    match: any; onClick: () => void;
    isSwapMode?: boolean; selectedTeamId?: string | null;
    swappedTeamIds?: Set<string>;
    onTeamSelect?: (teamId: string, teamName: string) => void;
}) => {
    const homeTeamId = match.homeTeam?._id || match.homeTeam?.id || '';
    const awayTeamId = match.awayTeam?._id || match.awayTeam?.id || '';
    // DEBUG - remove after fixing
    if (isSwapMode) console.log('[SWAP DEBUG] MatchCard render:', { isSwapMode, homeTeamId, awayTeamId, status: match.status, hasOnTeamSelect: !!onTeamSelect });
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

    // BYE match - compact single-team card with BYE badge
    if (isBye) {
        const p1Name = match.homeTeam?.player1 || match.p1?.name || "Tự do";
        const p2Name = match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? match.homeTeam.player2 : "";
        const teamName = match.homeTeam?.name || match.homeTeam?.shortName || "";

        return (
            <div className="flex items-center relative z-20 w-[200px]">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                    {bracketNumber}
                </div>
                <div className="w-full bg-gradient-to-r from-gray-50 to-white rounded-[6px] border border-dashed border-gray-200 flex flex-col justify-center overflow-hidden z-20 relative px-2.5 py-1.5 h-[88px] opacity-70">
                    {/* Top row: player info */}
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{match.homeTeam.efvId}</span>}
                            <span className="truncate text-[11px] text-gray-700 font-semibold">{p1Name}</span>
                        </div>
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded-full ml-1 flex-shrink-0">BYE</span>
                    </div>
                    {p2Name && <span className="truncate text-[10px] text-gray-500">{p2Name}</span>}
                    {teamName && <span className="truncate text-[8px] text-gray-400 mt-0.5">{teamName}</span>}
                    {/* Bottom row: empty opponent placeholder */}
                    <div className="mt-1 pt-1 border-t border-dashed border-gray-200">
                        <span className="text-[10px] text-gray-300 italic">— Không có đối thủ —</span>
                    </div>
                </div>
            </div>
        );
    }

    if (isWalkover) {
        const hName = match.homeTeam?.name || match.homeTeam?.shortName || match.p1?.ingame || "Tự do";
        const p1Name = match.homeTeam?.player1 || match.p1?.name || "";
        const p2Name = match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? match.homeTeam.player2 : "";

        return (
            <div className="flex items-center relative z-20 w-[200px]">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-bold text-gray-500 z-30">
                    {bracketNumber}
                </div>

                <motion.div
                    whileHover={!isSwapMode ? { y: -2, scale: 1.02 } : undefined}
                    onClick={() => { if (!isSwapMode) onClick(); }}
                    className={`w-full bg-white rounded-[6px] border border-[#E2E8F0] shadow-sm flex flex-col cursor-pointer overflow-hidden z-20 relative px-2 py-1.5 h-[44px] ${isSwapMode ? 'opacity-40 pointer-events-none' : ''}`}
                >
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">
                        {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{match.homeTeam.efvId}</span>}
                        {hName}
                    </span>
                    <div className="flex flex-col items-center">
                        <span className={`truncate text-[11px] text-gray-800 font-bold ${!match.homeTeam && !match.p1 ? "text-gray-400 italic font-medium" : ""}`}>
                            {p1Name || (!match.homeTeam ? "Tự do" : "...")}{p2Name ? ` / ${p2Name}` : ""}
                        </span>
                    </div>
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
                whileHover={!isSwapMode ? { y: -2, scale: 1.02 } : undefined}
                onClick={(e: any) => {
                    console.log('[SWAP DEBUG] motion.div clicked, isSwapMode=', isSwapMode);
                    if (isSwapMode) { e.stopPropagation(); return; }
                    onClick();
                }}
                className={`w-full bg-white rounded-[6px] border shadow-sm flex flex-col overflow-hidden z-20 group relative ${isSwapMode ? 'border-dashed border-blue-300 ring-1 ring-blue-100' : 'border-[#E2E8F0] cursor-pointer'}`}
            >
                {isLive && (
                    <div className="absolute top-0 right-0 left-0 bg-red-500 text-white text-[7px] font-bold text-center py-[1px] uppercase tracking-wider flex items-center justify-center gap-1 z-10">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
                    </div>
                )}

                <div
                    className={`p-1.5 flex flex-col ${homeWin ? "bg-blue-50/20" : ""} ${isLive ? 'mt-[10px]' : ''} ${isSwapMode && homeTeamId ? 'cursor-pointer transition-all hover:bg-blue-50/50 active:scale-[0.97]' : ''} ${isSwapMode && homeTeamId === selectedTeamId ? '!bg-blue-100/80 ring-2 ring-inset ring-blue-500 rounded-t-[5px]' : ''} ${isSwapMode && swappedTeamIds?.has(homeTeamId) && homeTeamId !== selectedTeamId ? '!bg-amber-50/60' : ''}`}
                    onClick={(e: any) => {
                        console.log('[SWAP DEBUG] home team clicked, isSwapMode=', isSwapMode, 'homeTeamId=', homeTeamId);
                        if (!isSwapMode || !homeTeamId) return;
                        e.stopPropagation();
                        onTeamSelect?.(homeTeamId, match.homeTeam?.player1 || homeName);
                    }}
                >
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">
                        {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{match.homeTeam.efvId}</span>}
                        {match.homeTeam?.seed != null && match.homeTeam.seed > 0 && <span className="text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded mr-1" title={`Hạt giống số ${match.homeTeam.seed}`}>Seed {match.homeTeam.seed}</span>}
                        {homeName}
                    </span>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.1]">
                            <span className={`truncate text-[11px] ${homeWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"} ${!match.homeTeam && !match.p1 ? "text-gray-400 italic" : ""}`}>
                                {match.homeTeam?.player1 || match.p1?.name || "Chờ kết quả"}{match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? ` / ${match.homeTeam.player2}` : ""}
                            </span>
                        </div>
                        <span className={`text-[12px] tabular-nums ml-1 ${homeWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{homeScore}</span>
                    </div>
                </div>

                <div className="h-px bg-[#E2E8F0] w-full" />

                <div
                    className={`p-1.5 flex flex-col ${awayWin ? "bg-blue-50/20" : ""} ${isSwapMode && awayTeamId ? 'cursor-pointer transition-all hover:bg-blue-50/50 active:scale-[0.97]' : ''} ${isSwapMode && awayTeamId === selectedTeamId ? '!bg-blue-100/80 ring-2 ring-inset ring-blue-500 rounded-b-[5px]' : ''} ${isSwapMode && swappedTeamIds?.has(awayTeamId) && awayTeamId !== selectedTeamId ? '!bg-amber-50/60' : ''}`}
                    onClick={(e: any) => {
                        if (!isSwapMode || !awayTeamId) return;
                        e.stopPropagation();
                        onTeamSelect?.(awayTeamId, match.awayTeam?.player1 || awayName);
                    }}
                >
                    <span className="text-[8px] text-gray-400 font-bold text-center mb-0.5">
                        {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded mr-1">#{match.awayTeam.efvId}</span>}
                        {match.awayTeam?.seed != null && match.awayTeam.seed > 0 && <span className="text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded mr-1" title={`Hạt giống số ${match.awayTeam.seed}`}>Seed {match.awayTeam.seed}</span>}
                        {awayName}
                    </span>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col min-w-0 pr-1 leading-[1.1]">
                            <span className={`truncate text-[11px] ${awayWin ? "text-blue-700 font-bold" : "text-gray-800 font-medium"} ${!match.awayTeam && !match.p2 ? "text-gray-400 italic" : ""}`}>
                                {match.awayTeam?.player1 || match.p2?.name || "Chờ kết quả"}{match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? ` / ${match.awayTeam.player2}` : ""}
                            </span>
                        </div>
                        <span className={`text-[12px] tabular-nums ml-1 ${awayWin ? "text-blue-600 font-bold" : "text-gray-400 font-semibold"}`}>{awayScore}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const ClearIcon = () => (
    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
        <X className="w-3 h-3" />
    </div>
);

// --- Modals ---

const MatchDetailModal = ({ match, tournament, onClose, onSaved }: { match: any; tournament: any; onClose: () => void; onSaved: () => void }) => {
    const [homeScore, setHomeScore] = useState(match.homeScore ?? "");
    const [awayScore, setAwayScore] = useState(match.awayScore ?? "");
    const [status, setStatus] = useState(match.status || "scheduled");
    const [selectedWinner, setSelectedWinner] = useState<'home' | 'away' | null>(
        match.homeScore > match.awayScore ? 'home' : (match.awayScore > match.homeScore ? 'away' : null)
    );
    const [sets, setSets] = useState<{homeScore: string; awayScore: string}[]>(
        match.sets && match.sets.length > 0
            ? match.sets.map((s: any) => ({ homeScore: String(s.homeScore), awayScore: String(s.awayScore) }))
            : [{ homeScore: match.homeScore ?? "", awayScore: match.awayScore ?? "" }]
    );
    const [isSaving, setIsSaving] = useState(false);
    const [matchTime, setMatchTime] = useState(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const formatNameStr = (team: any, pFallback: any) => {
        const p1 = team?.player1 || pFallback?.name || "Tự do";
        const p2 = team?.player2 && team.player2 !== "TBD" ? ` / ${team.player2}` : "";
        return `${p1}${p2}`;
    };

    const hName = formatNameStr(match.homeTeam, match.p1);
    const aName = formatNameStr(match.awayTeam, match.p2);

    useEffect(() => {
        if (sets.length > 1) {
            let hWins = 0;
            let aWins = 0;
            sets.forEach(s => {
                if (s.homeScore !== "" && s.awayScore !== "") {
                    const h = Number(s.homeScore);
                    const a = Number(s.awayScore);
                    if (h > a) hWins++;
                    else if (a > h) aWins++;
                }
            });
            setHomeScore(String(hWins));
            setAwayScore(String(aWins));
            if (hWins > aWins) setSelectedWinner('home');
            else if (aWins > hWins) setSelectedWinner('away');
        } else if (sets.length === 1) {
            setHomeScore(sets[0].homeScore);
            setAwayScore(sets[0].awayScore);
            const h = Number(sets[0].homeScore);
            const a = Number(sets[0].awayScore);
            if (sets[0].homeScore !== "" && sets[0].awayScore !== "") {
                if (h > a) setSelectedWinner('home');
                else if (a > h) setSelectedWinner('away');
            }
        }
    }, [sets]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let resolvedWinnerId = null;
            if (selectedWinner === 'home') resolvedWinnerId = match.homeTeam?._id;
            if (selectedWinner === 'away') resolvedWinnerId = match.awayTeam?._id;

            const payload: any = {
                matchId: match._id || match.id,
                homeScore: homeScore === "" ? 0 : Number(homeScore),
                awayScore: awayScore === "" ? 0 : Number(awayScore),
                status: status === 'completed' && homeScore === "" && awayScore === "" ? "scheduled" : status, // slight safe guard
                sets: sets.filter(s => s.homeScore !== "" || s.awayScore !== "").map(s => ({
                    homeScore: s.homeScore === "" ? 0 : Number(s.homeScore),
                    awayScore: s.awayScore === "" ? 0 : Number(s.awayScore),
                }))
            };

            if (matchTime) {
                payload.scheduledAt = new Date(matchTime).toISOString();
            }

            // If the user checked it as completed, make sure we have status complete
            if (homeScore !== "" && awayScore !== "") {
                payload.status = "completed";
            }

            // Check if entered score mismatches with player submissions
            if (match.resultSubmissions && match.resultSubmissions.length > 0) {
                const matchesAny = match.resultSubmissions.some((sub: any) => 
                    sub.homeScore === payload.homeScore && sub.awayScore === payload.awayScore
                );
                
                if (!matchesAny) {
                    if (!confirm("Kết quả khác với người chơi đã gửi, bạn có chắc chắn nhập kết quả này không?")) {
                        setIsSaving(false);
                        return;
                    }
                }
            }

            const res = await tournamentAPI.updateMatch(tournament._id, payload);
            if (res.success) {
                onSaved();
                onClose();
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Bạn có chắc muốn hủy kết quả trận đấu này? Đội thắng sẽ bị rút khỏi vòng tiếp theo.")) return;
        setIsSaving(true);
        try {
            const payload = {
                matchId: match._id || match.id,
                homeScore: 0,
                awayScore: 0,
                status: "scheduled",
            };
            const res = await tournamentAPI.updateMatch(tournament._id, payload);
            if (res.success) {
                toast.success("Đã hủy kết quả trận đấu");
                onSaved();
                onClose();
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSaving(false);
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
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Cập nhật trận đấu</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 pb-2 overflow-y-auto custom-scrollbar flex-1">
                    {/* Blue Info Box */}
                    <div className="bg-[#F0F7FF] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-y-2 mb-6">
                        <div>
                            <div className="font-bold text-gray-900 text-sm mb-1">{tournament?.title || "Giải đấu"}</div>
                            <div className="text-gray-500 text-xs flex flex-wrap items-center gap-4 sm:gap-6">
                                <span>Hình thức thi đấu: <span className="text-gray-900 font-semibold">{tournament?.format === 'round_robin' ? 'Vòng tròn' : "Loại trực tiếp"}</span></span>
                                <span>Vòng đấu: <span className="text-gray-900 font-semibold">{match.roundName || `Vòng ${match.round}`}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-dashed border-gray-200 rounded-lg p-4 sm:p-5 bg-white relative">
                        {/* Scoreboard Table - Premium Sticky Layout */}
                        <div className="rounded-xl border border-gray-200 overflow-x-auto custom-scrollbar bg-white shadow-sm mt-2 relative w-full">
                            <div className="min-w-max flex flex-col">
                                {/* Header Row */}
                                <div className="flex items-center bg-gray-50 border-b border-gray-200">
                                    <div className="w-[160px] sm:w-[220px] sticky left-0 z-10 bg-gray-50 py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-200 flex-shrink-0">VĐV / Đội</div>
                                    <div className="flex items-center">
                                        {sets.map((_, index) => (
                                            <div key={`header-s${index}`} className="w-14 text-center text-[11px] font-bold text-gray-400 uppercase py-2 border-l border-gray-100">
                                                S{index + 1}
                                            </div>
                                        ))}
                                        {sets.length > 1 && (
                                            <div className="w-14 text-center text-[11px] font-bold text-orange-400 uppercase py-2 border-l border-orange-100">
                                                Tổng
                                            </div>
                                        )}
                                        <div className="w-24 text-center text-[11px] font-bold text-gray-400 uppercase py-2 border-l border-gray-100">
                                            Tùy chọn
                                        </div>
                                    </div>
                                </div>

                                {/* Home Row */}
                                <div className="flex items-center border-b border-gray-100">
                                    {/* Player Name - Sticky */}
                                    <div className="w-[160px] sm:w-[220px] sticky left-0 z-10 bg-white py-3 px-3 flex items-center justify-between min-w-0 border-r border-gray-100 flex-shrink-0">
                                        <div className="flex items-center gap-2 min-w-0 mr-1.5">
                                            {match.homeTeam?.logo && <img src={match.homeTeam.logo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-100" />}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {match.homeTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.homeTeam.efvId}</span>}
                                                    <span className="text-[13px] font-semibold text-gray-900 truncate inline-block max-w-[90px] sm:max-w-none align-bottom leading-tight">{match.homeTeam?.player1 || match.p1?.name || "Tự do"}{match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? ` / ${match.homeTeam.player2}` : ""}</span>
                                                </div>
                                                {match.homeTeam?.shortName && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{match.homeTeam.shortName}</div>}
                                            </div>
                                        </div>
                                        <ClearIcon />
                                    </div>
                                    
                                    {/* Score Cells */}
                                    <div className="flex items-center">
                                        {sets.map((set, index) => (
                                            <div key={`home-score-${index}`} className="w-14 border-l border-gray-100 py-1.5 px-1.5">
                                                <input
                                                    type="number"
                                                    value={set.homeScore}
                                                    onChange={(e) => {
                                                        const newSets = [...sets];
                                                        newSets[index] = { ...newSets[index], homeScore: e.target.value };
                                                        setSets(newSets);
                                                    }}
                                                    placeholder="0"
                                                    className="w-full h-11 text-center font-bold text-lg rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                                                />
                                            </div>
                                        ))}
                                        {sets.length > 1 && (
                                            <div className="w-14 border-l border-orange-100 py-1.5 px-1.5">
                                                <div className="w-full h-11 flex items-center justify-center font-black text-xl text-orange-600 bg-orange-50 rounded-md border border-orange-100">
                                                    {homeScore || 0}
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-24 border-l border-gray-100 flex items-center justify-center gap-1.5 py-1.5 px-2">
                                            <button
                                                onClick={() => setSets([...sets, { homeScore: "", awayScore: "" }])}
                                                className="flex-1 h-11 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-lg transition-colors border border-blue-100 flex items-center justify-center"
                                                title="Thêm Set"
                                            >+</button>
                                            <button
                                                onClick={() => sets.length > 1 && setSets(sets.slice(0, -1))}
                                                className={`flex-1 h-11 rounded-md font-bold text-lg transition-colors border flex items-center justify-center ${sets.length > 1 ? 'bg-red-50 text-red-500 hover:bg-red-100 border-red-100' : 'bg-gray-50 text-gray-300 border-gray-200 opacity-40 cursor-not-allowed'}`}
                                                disabled={sets.length <= 1}
                                                title="Xóa Set cuối"
                                            >-</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Away Row */}
                                <div className="flex items-center">
                                    {/* Player Name - Sticky */}
                                    <div className="w-[160px] sm:w-[220px] sticky left-0 z-10 bg-white py-3 px-3 flex items-center justify-between min-w-0 border-r border-gray-100 flex-shrink-0">
                                        <div className="flex items-center gap-2 min-w-0 mr-1.5">
                                            {match.awayTeam?.logo && <img src={match.awayTeam.logo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-100" />}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {match.awayTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                                    <span className="text-[13px] font-semibold text-gray-900 truncate inline-block max-w-[90px] sm:max-w-none align-bottom leading-tight">{match.awayTeam?.player1 || match.p2?.name || "Tự do"}{match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? ` / ${match.awayTeam.player2}` : ""}</span>
                                                </div>
                                                {match.awayTeam?.shortName && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{match.awayTeam.shortName}</div>}
                                            </div>
                                        </div>
                                        <ClearIcon />
                                    </div>
                                    
                                    {/* Score Cells */}
                                    <div className="flex items-center">
                                        {sets.map((set, index) => (
                                            <div key={`away-score-${index}`} className="w-14 border-l border-gray-100 py-1.5 px-1.5">
                                                <input
                                                    type="number"
                                                    value={set.awayScore}
                                                    onChange={(e) => {
                                                        const newSets = [...sets];
                                                        newSets[index] = { ...newSets[index], awayScore: e.target.value };
                                                        setSets(newSets);
                                                    }}
                                                    placeholder="0"
                                                    className="w-full h-11 text-center font-bold text-lg rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                                                />
                                            </div>
                                        ))}
                                        {sets.length > 1 && (
                                            <div className="w-14 border-l border-orange-100 py-1.5 px-1.5">
                                                <div className="w-full h-11 flex items-center justify-center font-black text-xl text-orange-600 bg-orange-50 rounded-md border border-orange-100">
                                                    {awayScore || 0}
                                                </div>
                                            </div>
                                        )}
                                        {/* Placeholder to align with +/- buttons above */}
                                        <div className="w-24 border-l border-gray-100"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Winner Toggle */}
                        <div className="mt-8 mb-4 flex flex-col items-center">
                            <div className="text-sm font-bold text-gray-900 mb-3">Chọn đội thắng</div>
                            <div className="flex w-full max-w-lg border border-orange-200 rounded-md overflow-hidden bg-white">
                                <button
                                    onClick={() => setSelectedWinner('home')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center gap-1 ${selectedWinner === 'home' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'} border-r border-orange-100`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.homeTeam.efvId}</span>}
                                        <span>{match.homeTeam?.player1 || match.p1?.name || "Tự do"}{match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? ` / ${match.homeTeam.player2}` : ""}</span>
                                    </div>
                                    {match.homeTeam?.shortName && <span className="text-[10px] text-gray-400">{match.homeTeam.shortName}</span>}
                                </button>
                                <button
                                    onClick={() => setSelectedWinner('away')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center gap-1 ${selectedWinner === 'away' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                        <span>{match.awayTeam?.player1 || match.p2?.name || "Tự do"}{match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? ` / ${match.awayTeam.player2}` : ""}</span>
                                    </div>
                                    {match.awayTeam?.shortName && <span className="text-[10px] text-gray-400">{match.awayTeam.shortName}</span>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Thời gian thi đấu (Giờ/Phút)</label>
                            <Input
                                type="datetime-local"
                                value={matchTime}
                                onChange={(e) => setMatchTime(e.target.value)}
                                className="w-full border-gray-200 shadow-sm rounded-md h-10 text-gray-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Sân thi đấu</label>
                            <Input className="w-full border-gray-200 shadow-sm rounded-md h-10" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Trọng tài</label>
                            <Input className="w-full border-gray-200 shadow-sm rounded-md h-10" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">Token chấm điểm <Info className="w-3.5 h-3.5 text-gray-400" /></label>
                            <Select>
                                <SelectTrigger className="w-full text-gray-500 bg-white border-gray-200 shadow-sm focus:ring-0 rounded-md h-10">
                                    <SelectValue placeholder="Không có token hợp lệ" />
                                </SelectTrigger>
                                <SelectContent><SelectItem value="none">Không có</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Player Submitted Results */}
                    {match.resultSubmissions && match.resultSubmissions.length > 0 ? (
                        <div className="mt-6 sm:mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                                    <FileBarChart className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        Kết quả VĐV đã gửi
                                        <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {match.resultSubmissions.length}
                                        </span>
                                    </h4>
                                    <p className="text-[10px] text-gray-400">Kết quả do VĐV tự gửi lên để xác nhận</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {match.resultSubmissions.map((sub: any, idx: number) => {
                                    const isFromHome = sub.team?.toString?.() === (match.homeTeam?._id || match.homeTeam)?.toString?.();
                                    const submitterTeam = isFromHome ? match.homeTeam : match.awayTeam;
                                    const submitterTeamName = submitterTeam?.name || submitterTeam?.shortName || "";

                                    // Use enriched userData from API, fallback to team data
                                    const userData = sub.userData || {};
                                    const displayName = userData.name || submitterTeam?.player1 || (isFromHome ? match.p1?.name : match.p2?.name) || "VĐV";
                                    const displayEfvId = userData.efvId ?? submitterTeam?.efvId ?? null;
                                    const displayAvatar = userData.personalPhoto || userData.avatar || '';
                                    const displayGameId = userData.gamerId || '';
                                    const displayNickname = userData.nickname || '';

                                    return (
                                        <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                            {/* Submission Header — Full Player Info */}
                                            <div className={`px-4 py-3 ${isFromHome ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100' : 'bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100'}`}>
                                                <div className="flex items-start gap-3">
                                                    {/* Avatar */}
                                                    <div className="flex-shrink-0">
                                                        {displayAvatar ? (
                                                            <img 
                                                                src={displayAvatar} 
                                                                alt={displayName}
                                                                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => setViewingImage(displayAvatar)}
                                                            />
                                                        ) : (
                                                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${isFromHome ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-rose-100 text-rose-700 border-2 border-rose-200'}`}>
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                            {displayEfvId != null && (
                                                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-px rounded flex-shrink-0">
                                                                    #{displayEfvId}
                                                                </span>
                                                            )}
                                                            <span className="text-sm font-bold text-gray-900 truncate">{displayName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                                                            {displayGameId && (
                                                                <span className="flex items-center gap-1">
                                                                    🎮 <span className="font-semibold text-gray-600">{displayGameId}</span>
                                                                </span>
                                                            )}
                                                            {displayNickname && displayNickname !== displayGameId && (
                                                                <span className="flex items-center gap-1">
                                                                    · {displayNickname}
                                                                </span>
                                                            )}
                                                            {submitterTeamName && (
                                                                <span className="flex items-center gap-1">
                                                                    · {submitterTeamName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Timestamp */}
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="hidden sm:inline">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("vi-VN") : ""}</span>
                                                        <span className="sm:hidden">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Score Display */}
                                            <div className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-3 sm:gap-5">
                                                    <div className="text-center flex-1">
                                                        <div className="mb-1.5">
                                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                                {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.homeTeam.efvId}</span>}
                                                                <span className="text-[10px] font-bold text-gray-600 truncate">{match.homeTeam?.player1 || match.p1?.name || "Đội nhà"}</span>
                                                            </div>
                                                            {match.homeTeam?.shortName && <p className="text-[9px] text-gray-400">{match.homeTeam.shortName}</p>}
                                                        </div>
                                                        <span className={`text-2xl sm:text-3xl font-black inline-block min-w-[48px] py-1.5 px-3 rounded-xl ${
                                                            sub.homeScore > sub.awayScore 
                                                                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' 
                                                                : 'text-gray-600 bg-gray-50 border border-gray-200'
                                                        }`}>
                                                            {sub.homeScore}
                                                        </span>
                                                    </div>
                                                    <span className="text-xl text-gray-200 font-light mt-4">—</span>
                                                    <div className="text-center flex-1">
                                                        <div className="mb-1.5">
                                                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                                                {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                                                <span className="text-[10px] font-bold text-gray-600 truncate">{match.awayTeam?.player1 || match.p2?.name || "Đội khách"}</span>
                                                            </div>
                                                            {match.awayTeam?.shortName && <p className="text-[9px] text-gray-400">{match.awayTeam.shortName}</p>}
                                                        </div>
                                                        <span className={`text-2xl sm:text-3xl font-black inline-block min-w-[48px] py-1.5 px-3 rounded-xl ${
                                                            sub.awayScore > sub.homeScore 
                                                                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' 
                                                                : 'text-gray-600 bg-gray-50 border border-gray-200'
                                                        }`}>
                                                            {sub.awayScore}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {sub.notes && (
                                                    <div className="mt-4 flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                                                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-xs text-gray-600 italic leading-relaxed">"{sub.notes}"</p>
                                                    </div>
                                                )}

                                                {/* Screenshots */}
                                                {sub.screenshots && sub.screenshots.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <ImageIcon className="w-3 h-3" />
                                                            Hình ảnh minh chứng ({sub.screenshots.length})
                                                        </p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {sub.screenshots.map((s: string, si: number) => (
                                                                <div 
                                                                    key={si} 
                                                                    className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-100 hover:border-blue-300 transition-all aspect-square"
                                                                    onClick={() => setViewingImage(s)}
                                                                >
                                                                    <img 
                                                                        src={s} 
                                                                        alt={`Minh chứng ${si + 1}`} 
                                                                        className="w-full h-full object-cover" 
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 mb-4 text-center">
                            <div className="text-gray-500 font-medium mb-1">Chưa có kết quả VĐV gửi lên</div>
                            <div className="text-xs text-gray-400">Kết quả sẽ hiển thị khi VĐV gửi ảnh chụp màn hình kết quả trận đấu.</div>
                        </div>
                    )}
                </div>

                {/* Fullscreen Image Viewer */}
                <AnimatePresence>
                    {viewingImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                            onClick={() => setViewingImage(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                                className="relative max-w-full max-h-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img src={viewingImage} alt="Fullsize" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                                <button
                                    onClick={() => setViewingImage(null)}
                                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <a
                                    href={viewingImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-white/90 text-gray-700 text-xs font-bold hover:bg-white transition-colors shadow-lg flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download className="w-3.5 h-3.5" /> Mở gốc
                                </a>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer fixed */}
                <div className="border-t border-gray-100 p-4 bg-white flex items-center justify-between flex-shrink-0">
                    <div>
                        {match.status === "completed" && (
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                disabled={isSaving}
                                className="px-5 h-10 rounded border-red-200 text-red-600 font-bold hover:bg-red-50 hover:border-red-300"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hủy kết quả"}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="px-6 h-10 rounded border-gray-200 text-gray-700 font-bold hover:bg-gray-50">
                            Đóng
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-[#81A8FF] px-8 h-10 rounded text-white font-bold hover:bg-[#6e97f5]">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ShareTournamentModal = ({ tournamentName, onClose }: { tournamentName: string; onClose: () => void }) => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-8 relative"
            >
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="mb-8 pr-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Chia sẻ giải đấu</h2>
                    <p className="text-gray-500 text-[15px] leading-relaxed">
                        Mọi người có thể theo dõi kết quả giải đấu và đăng ký tham gia
                    </p>
                </div>
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="w-[180px] h-[180px] flex items-center justify-center bg-white border border-gray-100 rounded-xl">
                            <QrCode className="w-[140px] h-[140px] text-gray-900" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">{tournamentName}</h4>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 truncate font-medium">
                                {shareUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="w-[52px] h-[52px] flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:border-efb-blue hover:bg-blue-50 transition-all group"
                            >
                                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-400 group-hover:text-efb-blue" />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <Button onClick={onClose} variant="outline" className="h-11 px-8 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50">
                        Đóng
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- Bracket Creator with Seeding ---

const BracketCreator = ({ tournamentId, tournament, onCreated }: { tournamentId: string; tournament: any; onCreated: () => void }) => {
    const [teams, setTeams] = useState<any[]>([]);
    const [seedMap, setSeedMap] = useState<Record<string, number | null>>({});
    const [seedMode, setSeedMode] = useState<'random' | 'manual'>('random');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        loadTeams();
    }, [tournamentId]);

    const loadTeams = async () => {
        setIsLoading(true);
        try {
            const res = await tournamentAPI.getById(tournamentId);
            if (res.success) {
                const rawTeams = res.data?.teams || [];
                const regs = res.data?.registrations || [];
                const teamMap = new Map();
                regs.forEach((r: any) => { if (r.team) teamMap.set(r.team.toString(), r); });

                const t = rawTeams.map((team: any) => {
                    const r = teamMap.get(team._id.toString());
                    if (r) {
                        return { ...team, player1Name: r.playerName, player2Name: r.player2Name, player2EfvId: r.player2User?.efvId };
                    }
                    return team;
                });
                
                setTeams(t);
                const map: Record<string, number | null> = {};
                t.forEach((team: any) => { map[team._id] = team.seed ?? null; });
                setSeedMap(map);
                // Auto-switch to manual mode if any seeds are loaded from DB
                if (t.some((team: any) => team.seed != null && team.seed > 0)) {
                    setSeedMode('manual');
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTeams = teams.filter(t => {
        if (!searchTerm.trim()) return true;
        const s = searchTerm.toLowerCase();
        return (
            t.name?.toLowerCase().includes(s) ||
            t.shortName?.toLowerCase().includes(s) ||
            t.captain?.name?.toLowerCase().includes(s) ||
            t.captain?.gamerId?.toLowerCase().includes(s) ||
            String(t.captain?.efvId || '').includes(s.replace(/^#/, ''))
        );
    });
    const totalPages = Math.max(1, Math.ceil(filteredTeams.length / ITEMS_PER_PAGE));
    const paginatedTeams = filteredTeams.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const assignedSeeds = Object.values(seedMap).filter(v => v != null && v > 0);

    const setSeed = (teamId: string, value: number | null) => {
        setSeedMap(prev => ({ ...prev, [teamId]: value }));
    };

    const autoAssignSeeds = () => {
        const count = Math.max(1, Math.floor(teams.length / 4));
        const newMap: Record<string, number | null> = {};
        teams.forEach((t, i) => { newMap[t._id] = i < count ? i + 1 : null; });
        setSeedMap(newMap);
        toast.success(`Đã gán tự động ${count} hạt giống (¼ số đội)`);
    };

    const clearAllSeeds = () => {
        const newMap: Record<string, number | null> = {};
        teams.forEach(t => { newMap[t._id] = null; });
        setSeedMap(newMap);
    };

    // Save seeds to DB
    const saveSeeds = async () => {
        setIsSaving(true);
        try {
            const seedsPayload = Object.entries(seedMap).map(([teamId, seed]) => ({
                teamId,
                seed: seed && seed > 0 ? seed : null,
            }));
            const res = await tournamentAPI.updateTeamSeed(tournamentId, { seeds: seedsPayload });
            if (res.success) {
                toast.success('💾 Đã lưu hạt giống thành công!');
            } else {
                toast.error(res.message || 'Lỗi lưu hạt giống');
            }
        } catch (e) {
            console.error(e);
            toast.error('Có lỗi xảy ra khi lưu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        setIsCreating(true);
        try {
            // Auto-save seeds to DB before generating
            if (seedMode === 'manual') {
                const seedsPayload = Object.entries(seedMap).map(([teamId, seed]) => ({
                    teamId,
                    seed: seed && seed > 0 ? seed : null,
                }));
                await tournamentAPI.updateTeamSeed(tournamentId, { seeds: seedsPayload });
            }

            const payload: any = {};
            if (seedMode === 'manual') {
                const seeded = teams
                    .filter(t => seedMap[t._id] != null && seedMap[t._id]! > 0)
                    .sort((a, b) => (seedMap[a._id] || 999) - (seedMap[b._id] || 999));
                const nonSeeded = teams.filter(t => !seedMap[t._id] || seedMap[t._id]! <= 0);
                for (let i = nonSeeded.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [nonSeeded[i], nonSeeded[j]] = [nonSeeded[j], nonSeeded[i]];
                }
                payload.seeds = [...seeded, ...nonSeeded].map(t => t._id);
            }
            const res = await tournamentAPI.generateBrackets(tournamentId, payload);
            if (res.success) {
                toast.success(`Đã tạo sơ đồ thi đấu với ${res.data?.totalMatches || 0} trận!`);
                onCreated();
            } else {
                toast.error(res.message || "Lỗi tạo sơ đồ");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#FDFDFD] rounded-[24px] border border-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    if (teams.length < 2) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#FDFDFD] rounded-[24px] border border-gray-100">
                <div className="text-center">
                    <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Chưa đủ đội</h3>
                    <p className="text-sm text-gray-400">Cần ít nhất 2 đội được duyệt để tạo sơ đồ thi đấu</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#FDFDFD] rounded-[24px] border border-gray-100 p-8 overflow-auto">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                        <Swords className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Tạo sơ đồ thi đấu</h2>
                    <p className="text-sm text-gray-400">
                        {teams.length} đội tham gia · Loại trực tiếp (Single Elimination)
                    </p>
                </div>

                {/* Seed Mode Toggle */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-blue-500" /> Chế độ hạt giống
                    </h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setSeedMode('random')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${seedMode === 'random'
                                ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:border-gray-200'}`}
                        >
                            <Shuffle className="w-4 h-4" /> Ngẫu nhiên
                        </button>
                        <button
                            onClick={() => setSeedMode('manual')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${seedMode === 'manual'
                                ? 'bg-amber-50 text-amber-700 border-2 border-amber-200'
                                : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:border-gray-200'}`}
                        >
                            <Hash className="w-4 h-4" /> Chọn hạt giống thủ công
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        {seedMode === 'random'
                            ? 'Đội sẽ được xếp ngẫu nhiên khi tạo sơ đồ. Hạt giống #1 sẽ gặp hạt giống thấp nhất.'
                            : 'Chọn số hạt giống cho các VĐV mạnh để họ không gặp nhau sớm. Nhập từ 1 trở lên, không giới hạn số lượng.'}
                    </p>
                </div>

                {/* Manual Seed Table */}
                {seedMode === 'manual' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                        {/* Table toolbar */}
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex-1 relative w-full sm:w-auto">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm VĐV theo tên, EFV ID, đội..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    <span className="font-bold text-amber-600">{assignedSeeds.length}</span> hạt giống
                                </span>
                                <button
                                    onClick={saveSeeds}
                                    disabled={isSaving}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Lưu
                                </button>
                                <button
                                    onClick={autoAssignSeeds}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition-colors flex items-center gap-1"
                                >
                                    <Sparkles className="w-3 h-3" /> Tự động (¼)
                                </button>
                                <button
                                    onClick={clearAllSeeds}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 font-semibold transition-colors"
                                >
                                    Xóa hết
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-12">STT</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">VĐV / Đội</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">Hạt giống</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedTeams.map((team, idx) => {
                                        const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                                        const currentSeed = seedMap[team._id];
                                        const hasSeed = currentSeed != null && currentSeed > 0;

                                        return (
                                            <tr key={team._id} className={`hover:bg-gray-50/50 transition-colors ${hasSeed ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-4 py-3 text-gray-400 text-xs font-medium">{globalIdx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {(team.captain?.avatar || team.captain?.personalPhoto) ? (
                                                            <img src={team.captain.avatar || team.captain.personalPhoto} alt={team.captain.name || ''} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 border border-blue-200/50">
                                                                {(team.captain?.name || team.name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {team.captain?.efvId != null && (
                                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-px rounded flex-shrink-0">#{team.captain.efvId}</span>
                                                                )}
                                                                <span className="text-sm font-semibold text-gray-900 truncate">
                                                                    {team.player1Name || team.captain?.name || team.name || '—'}
                                                                    {team.player2Name && <span className="text-gray-500 font-medium"> / {team.player2Name}</span>}
                                                                    {team.player2EfvId != null && (
                                                                        <span className="ml-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded flex-shrink-0 tabular-nums">#{team.player2EfvId}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                                {team.name}{team.shortName ? ` (${team.shortName})` : ''}
                                                                {team.captain?.gamerId ? ` · ${team.captain.gamerId}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={currentSeed || ''}
                                                            placeholder="—"
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? null : parseInt(e.target.value);
                                                                if (val !== null && val < 0) return;
                                                                if (val !== null && val > 0) {
                                                                    const duplicate = Object.entries(seedMap).find(
                                                                        ([tid, sv]) => tid !== team._id && sv === val
                                                                    );
                                                                    if (duplicate) {
                                                                        const dupTeam = teams.find(t => t._id === duplicate[0]);
                                                                        toast.info(`Hạt giống #${val} đã chuyển từ ${dupTeam?.name || '?'} sang ${team.name}`);
                                                                        setSeedMap(prev => ({ ...prev, [duplicate[0]]: null, [team._id]: val }));
                                                                        return;
                                                                    }
                                                                }
                                                                setSeed(team._id, val);
                                                            }}
                                                            className={`w-16 h-8 text-center text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${hasSeed
                                                                ? 'border-amber-300 bg-amber-50 text-amber-700 font-bold focus:ring-amber-200'
                                                                : 'border-gray-200 bg-white text-gray-400 focus:ring-blue-200 focus:border-blue-300'
                                                                }`}
                                                        />
                                                        {hasSeed && (
                                                            <button
                                                                onClick={() => setSeed(team._id, null)}
                                                                className="w-6 h-6 rounded-md bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                                                title="Xóa hạt giống"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    Trang {currentPage}/{totalPages} · {filteredTeams.length} đội
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-30 font-medium transition-colors"
                                    >
                                        ← Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                        Math.max(0, currentPage - 3),
                                        Math.min(totalPages, currentPage + 2)
                                    ).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 text-xs rounded-lg font-bold transition-colors ${page === currentPage
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-30 font-medium transition-colors"
                                    >
                                        Sau →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Seed Summary */}
                        {assignedSeeds.length > 0 && (
                            <div className="p-4 border-t border-gray-100 bg-amber-50/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs font-bold text-amber-800">Hạt giống đã chọn ({assignedSeeds.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(seedMap)
                                        .filter(([, v]) => v != null && v > 0)
                                        .sort(([, a], [, b]) => (a || 0) - (b || 0))
                                        .map(([teamId, seedNum]) => {
                                            const t = teams.find(t => t._id === teamId);
                                            const playerName = t?.captain?.name || t?.name || '?';
                                            return (
                                                <span key={teamId} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-amber-200 text-xs">
                                                    <span className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">#{seedNum}</span>
                                                    {t?.captain?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{t.captain.efvId}</span>}
                                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{playerName}</span>
                                                </span>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isCreating}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-2xl text-base font-bold shadow-lg shadow-blue-200 transition-all"
                >
                    {isCreating ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tạo sơ đồ...</>
                    ) : (
                        <><Swords className="w-5 h-5 mr-2" /> Tạo sơ đồ thi đấu</>
                    )}
                </Button>
            </div>
        </div>
    );
};


export default function SoDoThiDauPage() {
    const params = useParams();
    const id = params.id as string;
    const { user } = useAuth();

    const [search, setSearch] = useState("");
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [tournament, setTournament] = useState<any>(null);
    const [bracketRounds, setBracketRounds] = useState<{ name: string; matches: any[] }[]>([]);

    const handleDownloadPDF = async () => {
        const element = document.getElementById("bracket-capture-area");
        if (!element) return;

        setIsLoading(true);
        try {
            // Brackets are horizontal usually, so use landscape 'l'
            const canvas = await toCanvas(element, {
                backgroundColor: '#fdfdfd',
                pixelRatio: 2,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF(canvas.width > canvas.height ? "l" : "p", "mm", "a4");

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.setFontSize(16);
            pdf.text(`Sơ đồ thi đấu: ${tournament?.title || id}`, 10, 10);

            pdf.addImage(imgData, "PNG", 0, 15, pdfWidth, pdfHeight);
            pdf.save(`So_do_thi_dau_${tournament?.title?.replace(/\s+/g, '_') || id}.pdf`);
        } catch (error) {
            console.error("Bracket PDF error:", error);
            toast.error("Lỗi khi tạo PDF sơ đồ.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tRes, bRes] = await Promise.all([
                tournamentAPI.getById(id),
                tournamentAPI.getBrackets(id),
            ]);

            if (tRes.success) {
                setTournament(tRes.data?.tournament || tRes.data);
            }

            // Group matches by round
            const matches = bRes.success ? (bRes.data?.matches || bRes.data || []) : [];
            const roundMap: Record<string, any[]> = {};
            matches.forEach((m: any) => {
                const rn = m.roundName || `Vòng ${m.round}`;
                if (!roundMap[rn]) roundMap[rn] = [];
                roundMap[rn].push(m);
            });

            // Sort by round number
            const sorted = Object.entries(roundMap)
                .sort(([, a], [, b]) => {
                    const roundA = a[0]?.round ?? 0;
                    const roundB = b[0]?.round ?? 0;
                    return roundA - roundB;
                })
                .map(([name, roundMatches]) => ({
                    name,
                    matches: roundMatches as any[]
                }))
                .filter(round => (round.matches as any[]).length > 0);

            setBracketRounds(sorted as any);
        } catch (e) {
            console.error("Load bracket error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // filteredRounds is used only for the empty-state check (show BracketCreator)
    const filteredRounds = bracketRounds;

    const swap = useBracketSwap(id, bracketRounds, loadData);

    const totalTeams = bracketRounds.reduce((sum, r) => sum + r.matches.filter((m: any) => m.status !== 'walkover').length, 0);
    const totalRounds = bracketRounds.length;
    const tournamentName = tournament?.title || "Giải đấu";

    const isOwner = user?._id === (tournament?.createdBy?._id || tournament?.createdBy);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#1E293B] tracking-tight">Sơ đồ thi đấu</h1>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {totalTeams} trận · {totalRounds} vòng đấu
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[120px] max-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm VĐV..."
                            className="bg-slate-50 pl-9 pr-3 py-2 border border-transparent rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:border-efb-blue transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {isOwner && (
                        <>
                            <Button
                                onClick={swap.isSwapMode ? swap.exitSwapMode : swap.enterSwapMode}
                                variant={swap.isSwapMode ? "default" : "outline"}
                                className={`h-9 sm:h-11 px-3 sm:px-5 rounded-xl font-bold flex items-center gap-1.5 text-xs sm:text-sm transition-all ${swap.isSwapMode ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-1 shadow-lg shadow-blue-200' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                            >
                                <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{swap.isSwapMode ? 'Thoát' : 'Sắp xếp'}</span>
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!confirm('Bạn có chắc muốn tạo lại sơ đồ? Toàn bộ kết quả sẽ bị xóa.')) return;
                                    const res = await tournamentAPI.generateBrackets(id, { force: true });
                                    if (res.success) {
                                        toast.success('Đã tạo lại sơ đồ!');
                                        loadData();
                                    } else {
                                        toast.error(res.message || 'Lỗi tạo lại');
                                    }
                                }}
                                variant="outline"
                                className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold flex items-center gap-1.5 text-xs sm:text-sm"
                            >
                                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Tạo lại</span>
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={handleDownloadPDF}
                        disabled={isLoading}
                        variant="outline"
                        className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        <span className="hidden sm:inline">Tải PDF</span>
                    </Button>
                    <Button
                        onClick={() => setIsShareModalOpen(true)}
                        className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl bg-efb-blue text-white hover:bg-efb-blue-light font-bold flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Chia sẻ</span>
                    </Button>
                </div>
            </div>

            {/* Tournament Stage */}
            {filteredRounds.length === 0 ? (
                <BracketCreator tournamentId={id} tournament={tournament} onCreated={loadData} />
            ) : (
                <div id="bracket-capture-area" className="flex-1 overflow-auto bg-[#FDFDFD] rounded-[24px] border border-gray-100 relative custom-scrollbar shadow-inner">
                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(#E2E8F0 1.2px, transparent 1.2px)`, backgroundSize: '32px 32px' }} />
                    <div className="inline-flex p-12 min-w-full relative z-10">
                        {swap.displayRounds.map((round, rIndex) => {
                            const isLastRound = rIndex === swap.displayRounds.length - 1;
                            const scale = Math.pow(2, rIndex);
                            const GAP = 128;

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

                                                // Search highlight
                                                const matchesSearch = search.trim() === '' || [
                                                    match.homeTeam?.name, match.homeTeam?.shortName, match.homeTeam?.player1, match.homeTeam?.player2,
                                                    match.awayTeam?.name, match.awayTeam?.shortName, match.awayTeam?.player1, match.awayTeam?.player2,
                                                    match.p1?.name, match.p2?.name,
                                                    match.homeTeam?.efvId != null ? String(match.homeTeam.efvId) : null,
                                                    match.awayTeam?.efvId != null ? String(match.awayTeam.efvId) : null,
                                                ].some(v => v && v.toLowerCase().includes(search.toLowerCase()));

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
                                                        <MatchCard
                                                            match={match}
                                                            onClick={() => { if (!swap.isSwapMode) setSelectedMatch(match); }}
                                                            isSwapMode={swap.isSwapMode && match.status !== 'completed' && match.status !== 'walkover' && match.status !== 'bye'}
                                                            selectedTeamId={swap.selectedTeamId}
                                                            swappedTeamIds={swap.swappedTeamIds}
                                                            onTeamSelect={swap.handleTeamSelect}
                                                        />

                                                        {/* Connector lines to next round */}
                                                        {match.nextMatch && !isLastRound && (() => {
                                                            const bY = match.bracketPosition?.y ?? 0;
                                                            const isTop = bY % 2 === 0;
                                                            const vLen = (UNIT_HEIGHT * scale) / 2;
                                                            const halfGap = GAP / 2;

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
                                                                    left: `-${GAP / 2}px`,
                                                                    width: `${GAP / 2}px`,
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
                                    {/* Spacer between rounds */}
                                    <div style={{ width: `${GAP}px` }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Swap Floating Bar */}
            <SwapFloatingBar
                isSwapMode={swap.isSwapMode}
                selectedTeamId={swap.selectedTeamId}
                pendingSwaps={swap.pendingSwaps}
                isSaving={swap.isSaving}
                onUndo={swap.undoLastSwap}
                onCancel={swap.exitSwapMode}
                onSave={swap.handleBatchSave}
            />

            {/* Modals Container */}
            <AnimatePresence>
                {selectedMatch && tournament && (
                    <MatchDetailModal
                        match={selectedMatch}
                        tournament={tournament}
                        onClose={() => setSelectedMatch(null)}
                        onSaved={loadData}
                    />
                )}
                {isShareModalOpen && <ShareTournamentModal tournamentName={tournamentName} onClose={() => setIsShareModalOpen(false)} />}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 7px; height: 7px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #F8FAFC; }
            `}</style>
        </div>
    );
}
