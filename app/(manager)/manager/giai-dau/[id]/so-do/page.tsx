"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Users, Search, X, Copy, QrCode, Share2, Check, CheckCircle2, Info, Loader2, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tournamentAPI } from "@/lib/api";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

const UNIT_HEIGHT = 110;

// --- Components ---

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
            whileHover={{ y: -2, scale: 1.02 }}
            onClick={onClick}
            className="w-[180px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden z-20 cursor-pointer hover:border-efb-blue/40 hover:shadow-md transition-all group"
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
    const [isSaving, setIsSaving] = useState(false);

    const formatNameStr = (team: any, pFallback: any) => {
        const p1 = team?.player1 || pFallback?.name || "Tự do";
        const p2 = team?.player2 && team.player2 !== "TBD" ? ` / ${team.player2}` : "";
        return `${p1}${p2}`;
    };

    const hName = formatNameStr(match.homeTeam, match.p1);
    const aName = formatNameStr(match.awayTeam, match.p2);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let resolvedWinnerId = null;
            if (selectedWinner === 'home') resolvedWinnerId = match.homeTeam?._id;
            if (selectedWinner === 'away') resolvedWinnerId = match.awayTeam?._id;

            const payload = {
                matchId: match._id || match.id,
                homeScore: homeScore === "" ? 0 : Number(homeScore),
                awayScore: awayScore === "" ? 0 : Number(awayScore),
                status: status === 'completed' && homeScore === "" && awayScore === "" ? "scheduled" : status, // slight safe guard
            };

            // If the user checked it as completed, make sure we have status complete
            if (homeScore !== "" && awayScore !== "") {
                payload.status = "completed";
            }

            const res = await tournamentAPI.updateMatch(tournament._id, payload);
            if (res.success) {
                onSaved();
                onClose();
            } else {
                alert(res.message);
            }
        } catch (e) {
            console.error(e);
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

                <div className="p-6 pb-2 overflow-y-auto custom-scrollbar flex-1">
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
                        {/* Headers */}
                        <div className="flex justify-between text-sm font-bold text-gray-900 mb-3 px-1">
                            <div>Tên VĐV</div>
                            <div>Kết quả</div>
                        </div>

                        {/* Player Inputs & Score */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Tên VĐV Column */}
                            <div className="flex-1 flex flex-col gap-3">
                                {/* Home Input */}
                                <div className="border border-gray-200 rounded-md px-3 h-10 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 truncate pr-2">{hName}</span>
                                    <ClearIcon />
                                </div>
                                <div className="border-b border-gray-100"></div>
                                {/* Away Input */}
                                <div className="border border-gray-200 rounded-md px-3 h-10 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 truncate pr-2">{aName}</span>
                                    <ClearIcon />
                                </div>
                            </div>

                            {/* Kết quả Column */}
                            <div className="w-full sm:w-[100px] flex flex-row sm:flex-col items-center sm:items-stretch gap-3">
                                <div className="flex flex-col gap-3 relative flex-1 sm:flex-none">
                                    <Input
                                        type="number"
                                        value={homeScore}
                                        onChange={(e) => {
                                            setHomeScore(e.target.value);
                                            if (Number(e.target.value) > Number(awayScore)) setSelectedWinner('home');
                                            else if (Number(e.target.value) < Number(awayScore)) setSelectedWinner('away');
                                        }}
                                        className="w-full h-10 text-center font-bold text-base rounded-md border-gray-200"
                                    />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium bg-white px-1 z-10 hidden sm:block">Set 1</div>
                                    <Input
                                        type="number"
                                        value={awayScore}
                                        onChange={(e) => {
                                            setAwayScore(e.target.value);
                                            if (Number(homeScore) > Number(e.target.value)) setSelectedWinner('home');
                                            else if (Number(homeScore) < Number(e.target.value)) setSelectedWinner('away');
                                        }}
                                        className="w-full h-10 text-center font-bold text-base rounded-md border-gray-200"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row overflow-hidden rounded border border-blue-100 h-[88px] sm:h-8 mt-0 sm:mt-1">
                                    <button className="flex-1 h-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center font-bold text-lg px-2 sm:px-0">+</button>
                                    <button className="flex-1 h-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-bold text-lg px-2 sm:px-0">-</button>
                                </div>
                            </div>
                        </div>

                        {/* Winner Toggle */}
                        <div className="mt-8 mb-4 flex flex-col items-center">
                            <div className="text-sm font-bold text-gray-900 mb-3">Chọn đội thắng</div>
                            <div className="flex w-full max-w-lg border border-orange-200 rounded-md overflow-hidden bg-white">
                                <button
                                    onClick={() => setSelectedWinner('home')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center ${selectedWinner === 'home' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'} border-r border-orange-100`}
                                >
                                    <span>{match.homeTeam?.player1 || match.p1?.name || "Tự do"}</span>
                                    {match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" && <span>{match.homeTeam.player2}</span>}
                                </button>
                                <button
                                    onClick={() => setSelectedWinner('away')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center ${selectedWinner === 'away' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'}`}
                                >
                                    <span>{match.awayTeam?.player1 || match.p2?.name || "Tự do"}</span>
                                    {match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" && <span>{match.awayTeam.player2}</span>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Thời gian</label>
                            <Select>
                                <SelectTrigger className="w-full text-gray-500 bg-white border-gray-200 shadow-sm focus:ring-0 rounded-md h-10">
                                    <SelectValue placeholder="Thời gian bắt đầu" />
                                </SelectTrigger>
                                <SelectContent><SelectItem value="now">Bây giờ</SelectItem></SelectContent>
                            </Select>
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

                    {/* History */}
                    <div className="mt-8 mb-4 text-center">
                        <div className="text-gray-500 font-medium mb-1">Chưa có lịch sử điểm số</div>
                        <div className="text-xs text-gray-400">Lịch sử điểm số chỉ hiển thị khi sử dụng tính năng chấm điểm của trọng tài.</div>
                    </div>
                </div>

                {/* Footer fixed */}
                <div className="border-t border-gray-100 p-4 bg-white flex justify-end gap-3 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} className="px-6 h-10 rounded border-gray-200 text-gray-700 font-bold hover:bg-gray-50">
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#81A8FF] px-8 h-10 rounded text-white font-bold hover:bg-[#6e97f5]">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                    </Button>
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

export default function SoDoThiDauPage() {
    const params = useParams();
    const id = params.id as string;

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
            alert("Lỗi khi tạo PDF sơ đồ.");
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
                .map(([name, roundMatches]) => ({ name, matches: roundMatches }));

            setBracketRounds(sorted);
        } catch (e) {
            console.error("Load bracket error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter by search
    const filteredRounds = search.trim()
        ? bracketRounds.map((r) => ({
            ...r,
            matches: r.matches.filter((m) => {
                const q = search.toLowerCase();
                const homeName = (m.homeTeam?.name || "").toLowerCase();
                const awayName = (m.awayTeam?.name || "").toLowerCase();
                return homeName.includes(q) || awayName.includes(q);
            }),
        })).filter((r) => r.matches.length > 0)
        : bracketRounds;

    const totalTeams = bracketRounds.reduce((sum, r) => sum + r.matches.length, 0);
    const totalRounds = bracketRounds.length;
    const tournamentName = tournament?.title || "Giải đấu";

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

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm VĐV..."
                            className="bg-slate-50 pl-10 pr-4 py-2.5 border border-transparent rounded-[14px] text-sm w-[160px] lg:w-[200px] focus:outline-none focus:bg-white focus:border-efb-blue transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleDownloadPDF}
                        disabled={isLoading}
                        variant="outline"
                        className="h-11 px-5 rounded-[14px] border-blue-200 text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Tải PDF
                    </Button>
                    <Button
                        onClick={() => setIsShareModalOpen(true)}
                        className="h-11 px-5 rounded-[14px] bg-efb-blue text-white hover:bg-efb-blue-light font-bold flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Chia sẻ
                    </Button>
                </div>
            </div>

            {/* Tournament Stage */}
            {filteredRounds.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-[#FDFDFD] rounded-[24px] border border-gray-100">
                    <div className="text-center">
                        <Swords className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-efb-dark mb-1">Chưa có bracket</h3>
                        <p className="text-sm text-efb-text-muted">Bracket sẽ được tạo khi giải đấu bắt đầu</p>
                    </div>
                </div>
            ) : (
                <div id="bracket-capture-area" className="flex-1 overflow-auto bg-[#FDFDFD] rounded-[24px] border border-gray-100 relative custom-scrollbar shadow-inner">
                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(#E2E8F0 1.2px, transparent 1.2px)`, backgroundSize: '32px 32px' }} />
                    <div className="inline-flex p-24 min-w-full">
                        {filteredRounds.map((round, rIndex) => {
                            const cellHeight = UNIT_HEIGHT * Math.pow(2, rIndex);
                            const isLastRound = rIndex === filteredRounds.length - 1;

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
                                                {rIndex > 0 && <div className="absolute -left-10 w-10 h-[2px] bg-[#E2E8F0]" />}
                                            </div>
                                        ))}
                                    </div>
                                    {!isLastRound && (
                                        <div className="w-[80px] flex flex-col pt-[92px]">
                                            {Array.from({ length: Math.floor(round.matches.length / 2) }).map((_, i) => (
                                                <div key={i} className="relative" style={{ height: cellHeight * 2 }}>
                                                    <div className="absolute left-0 top-1/4 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                    <div className="absolute left-0 top-3/4 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                    <div className="absolute left-1/2 top-1/4 w-[2px] bg-[#E2E8F0]" style={{ height: '50%' }} />
                                                    <div className="absolute left-1/2 top-1/2 w-1/2 h-[2px] bg-[#E2E8F0]" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
