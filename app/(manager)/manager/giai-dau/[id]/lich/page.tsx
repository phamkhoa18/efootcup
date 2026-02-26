"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Download, Edit3, Filter, Settings2, Share2, Play, Users, X, Info, ChevronDown, CheckCircle2, Bone, Hexagon, SplitSquareHorizontal, Loader2, ArrowLeftRight, FileBarChart } from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Reusable icons/components
const ClearIcon = () => (
    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
        <X className="w-3 h-3" />
    </div>
);

export default function LichThiDauPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [tournament, setTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [rounds, setRounds] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [team1Id, setTeam1Id] = useState("");
    const [team2Id, setTeam2Id] = useState("");
    const [selectedFormatType, setSelectedFormatType] = useState('standard');
    const [editingMatch, setEditingMatch] = useState<any>(null);

    const handleDownloadPDF = async () => {
        const element = document.getElementById("schedule-container");
        if (!element) return;

        setIsUpdating(true);
        try {
            // Using toCanvas as it's often more reliable
            const canvas = await toCanvas(element, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                skipAutoScale: true,
                cacheBust: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Add a title to the PDF
            pdf.setFontSize(18);
            pdf.text(tournament?.title || "Lich Thi Dau", 10, 15);

            pdf.addImage(imgData, "PNG", 0, 20, pdfWidth, pdfHeight);
            pdf.save(`Lich_Thi_Dau_${tournament?.title?.replace(/\s+/g, '_') || id}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            // Fallback to data-driven table if image capture fails
            try {
                const pdf = new jsPDF();
                pdf.text(tournament?.title || "Lich Thi Dau", 10, 10);

                Object.entries(rounds).forEach(([roundName, roundMatches]: [string, any[]]) => {
                    const tableData = roundMatches.map(m => [
                        m.matchNumber,
                        m.homeTeam?.name || "Tự do",
                        `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
                        m.awayTeam?.name || "Tự do",
                        m.pitch || "Sân 1",
                        m.status === 'completed' ? 'Kết thúc' : m.status === 'live' ? 'Đang đá' : 'Chưa đá'
                    ]);

                    autoTable(pdf, {
                        head: [['#', 'Đội 1', 'KQ', 'Đội 2', 'Sân', 'TT']],
                        body: tableData,
                        startY: (pdf as any).lastAutoTable?.finalY + 10 || 20,
                        didDrawPage: (data) => {
                            pdf.text(roundName, data.settings.margin.left, 15);
                        }
                    });
                });
                pdf.save(`Lich_Thi_Dau_${id}.pdf`);
            } catch (fallbackError) {
                console.error("Fallback PDF failed:", fallbackError);
                alert("Không thể tạo file PDF. Vui lòng thử lại sau.");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tRes, mRes] = await Promise.all([
                tournamentAPI.getById(id),
                tournamentAPI.getBrackets(id)
            ]);
            if (tRes.success) setTournament(tRes.data?.tournament || tRes.data);
            if (mRes.success) {
                setMatches(mRes.data?.matches || []);
                const fetchedRounds = mRes.data?.rounds || {};

                // Sort rounds
                const sortedRounds: Record<string, any[]> = {};
                Object.keys(fetchedRounds).sort((a, b) => {
                    const matchA = fetchedRounds[a]?.[0]?.round ?? 0;
                    const matchB = fetchedRounds[b]?.[0]?.round ?? 0;
                    return matchA - matchB;
                }).forEach(k => {
                    sortedRounds[k] = fetchedRounds[k];
                });

                setRounds(sortedRounds);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const confirmGenerateBrackets = async () => {
        setIsGeneratingModalOpen(false);
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.generateBrackets(id, { formatType: selectedFormatType });
            if (res.success) {
                loadData();
            } else {
                alert(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error("Failed to generate brackets:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSwapTeams = async () => {
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.swapBracketPositions(id, team1Id, team2Id);
            if (res.success) {
                setIsSwapModalOpen(false);
                setTeam1Id("");
                setTeam2Id("");
                loadData();
            } else {
                alert(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSetMatchLive = async (matchId: string) => {
        if (!confirm("Bạn muốn chuyển trạng thái trận đấu này sang Đang trực tiếp (LIVE)?")) return;
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.updateMatch(id, { matchId, status: "live" });
            if (res.success) {
                loadData();
            } else {
                alert(res.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    const uniqueTeamsMap = new Map();
    matches.forEach(m => {
        if (m.homeTeam && typeof m.homeTeam === 'object') uniqueTeamsMap.set(m.homeTeam._id || m.homeTeam.id, m.homeTeam);
        if (m.awayTeam && typeof m.awayTeam === 'object') uniqueTeamsMap.set(m.awayTeam._id || m.awayTeam.id, m.awayTeam);
    });
    const uniqueTeams = Array.from(uniqueTeamsMap.values());

    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const totalMatches = matches.length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-full overflow-hidden pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    <h1 className="text-xl font-bold text-gray-900">Lịch thi đấu</h1>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsGeneratingModalOpen(true)}
                        variant="outline"
                        className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md h-9 text-sm font-semibold shadow-sm"
                    >
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        Tạo lịch
                    </Button>
                    <Button
                        onClick={handleDownloadPDF}
                        disabled={isUpdating}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-md h-9 text-sm font-semibold shadow-sm"
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Tải PDF
                    </Button>
                </div>
            </div>

            {/* Quick Filter / Tabs */}
            <div className="border-b border-gray-200 flex">
                <div className="px-6 py-2.5 bg-blue-50 text-blue-600 font-semibold text-sm border-b-2 border-blue-600 cursor-pointer">
                    {tournament?.title || "Giải đấu"}
                </div>
            </div>

            {/* Info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border-b border-gray-100 gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <div>Hình thức thi đấu: <span className="font-semibold">{tournament?.format === 'round_robin' ? 'Vòng tròn' : tournament?.format === 'group_stage' ? 'Vòng bảng' : 'Loại trực tiếp'}</span></div>
                            <div className="text-blue-500 font-semibold">{completedMatches}/{totalMatches} trận đã kết thúc</div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-700">Ghi chú:</span>
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="w-2 h-2 rounded bg-purple-500"></span>
                            Chưa điểm danh <Info className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 h-8 px-3 rounded text-xs font-semibold" onClick={() => router.push(`/manager/giai-dau/${id}/so-do`)}>
                        <Share2 className="w-3.5 h-3.5 mr-1.5" /> Sơ đồ thi đấu
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200" onClick={() => setIsSwapModalOpen(true)}>
                        <ArrowLeftRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200">
                        <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200" onClick={() => setIsGeneratingModalOpen(true)}>
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Match List Table */}
            <div id="schedule-container" className="bg-white border text-sm max-w-full overflow-x-auto min-w-[900px] print-container relative">
                <style jsx>{`
                    .print-container { background: white !important; }
                `}</style>
                {Object.entries(rounds).length === 0 ? (
                    <div className="text-center py-20 bg-gray-50">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-semibold">Chưa có lịch đấu nào</h3>
                        <p className="text-gray-500 text-sm">Vui lòng bấm Tải lịch thi đấu để khởi tạo.</p>
                    </div>
                ) : (
                    Object.entries(rounds).map(([roundName, roundMatches]) => (
                        <div key={roundName}>
                            {/* Round Header */}
                            <div className="bg-[#D9EAF7] flex items-center justify-center py-2 px-4 relative border-b border-white">
                                <span className="text-red-500 font-bold">{roundName}</span>
                                <span className="text-gray-700 font-semibold ml-1">| {tournament?.title}</span>
                                <Filter className="w-4 h-4 text-gray-500 absolute right-4 cursor-pointer" />
                            </div>

                            {/* Table Headers */}
                            <div className="grid grid-cols-12 gap-4 py-2 px-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-50/50">
                                <div className="col-span-1">#</div>
                                <div className="col-span-2">CLB</div>
                                <div className="col-span-4">Cặp đấu</div>
                                <div className="col-span-2 text-center">Kết quả</div>
                                <div className="col-span-1 text-center">Sân thi đấu</div>
                                <div className="col-span-2 text-center">Trạng thái</div>
                            </div>

                            {/* Match Rows */}
                            <div className="divide-y divide-gray-100">
                                {roundMatches.map((m: any, index: number) => {
                                    const homeName = m.homeTeam?.name || "Tự do";
                                    const awayName = m.awayTeam?.name || "Tự do";
                                    const p1Name = m.homeTeam?.player1 || "—";
                                    const p1Sub = m.homeTeam?.player2 && m.homeTeam.player2 !== "TBD" ? ` / ${m.homeTeam.player2}` : "";
                                    const p2Name = m.awayTeam?.player1 || "—";
                                    const p2Sub = m.awayTeam?.player2 && m.awayTeam.player2 !== "TBD" ? ` / ${m.awayTeam.player2}` : "";

                                    const isCompleted = m.status === 'completed';
                                    const isHomeWin = isCompleted && ((m.homeScore || 0) > (m.awayScore || 0));
                                    const isAwayWin = isCompleted && ((m.awayScore || 0) > (m.homeScore || 0));

                                    return (
                                        <div key={m._id} className="grid grid-cols-12 gap-4 items-center py-2 px-4 hover:bg-gray-50 transition-colors">
                                            {/* # */}
                                            <div className="col-span-1 text-gray-900 font-bold text-sm">
                                                {m.matchNumber}
                                            </div>

                                            {/* CLB */}
                                            <div className="col-span-2 flex flex-col gap-1.5">
                                                <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                    {homeName}
                                                </div>
                                                <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                                    {awayName}
                                                </div>
                                            </div>

                                            {/* Cặp đấu */}
                                            <div className="col-span-4 flex flex-col gap-1.5 text-[13px] font-medium">
                                                <div className={`${isCompleted ? (isHomeWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>
                                                    {p1Name}{p1Sub}
                                                </div>
                                                <div className={`${isCompleted ? (isAwayWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>
                                                    {p2Name}{p2Sub}
                                                </div>
                                            </div>

                                            {/* Kết quả */}
                                            <div className="col-span-2 text-center text-sm font-bold text-gray-900">
                                                {isCompleted || m.status === "live" ? (
                                                    <span>{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </div>

                                            {/* Sân thi đấu */}
                                            <div className="col-span-1 flex justify-center">
                                                <Button variant="outline" size="sm" className="h-6 text-[10px] rounded px-2 border-gray-200 text-gray-400 font-normal">
                                                    Chọn sân
                                                </Button>
                                            </div>

                                            {/* Trạng thái & Action */}
                                            <div className="col-span-2 flex items-center justify-between pr-2">
                                                <div className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600" :
                                                    m.status === "live" ? "bg-red-50 text-red-600 animate-pulse" :
                                                        "bg-blue-50/50 border border-blue-100 text-blue-400"
                                                    }`}>
                                                    {isCompleted ? "Kết thúc" : m.status === "live" ? "Đang diễn ra (LIVE)" : "Chờ thi đấu"}
                                                </div>
                                                <div className="flex gap-1.5 items-center text-gray-400">
                                                    {!isCompleted && m.status !== "live" ? (
                                                        <Play
                                                            className="w-4 h-4 hover:text-green-500 cursor-pointer transition-colors"
                                                            onClick={() => handleSetMatchLive(m._id || m.id)}
                                                        />
                                                    ) : (
                                                        <div className="w-4 h-4" /> // empty space placeholder
                                                    )}
                                                    <Edit3 className="w-4 h-4 hover:text-blue-500 cursor-pointer transition-colors" onClick={() => setEditingMatch({ ...m, roundName })} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Swap Modal */}
            <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-[12px] bg-white text-gray-900" showCloseButton={false}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold">Đổi vị trí thi đấu</h2>
                        <button onClick={() => setIsSwapModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-500 mb-6 font-medium">
                            2 đội được chọn sẽ thay đổi vị trí thi đấu với nhau trong lịch thi đấu.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">Đội 1</label>
                                <Select value={team1Id} onValueChange={setTeam1Id}>
                                    <SelectTrigger className="w-full text-sm h-10 border-gray-200">
                                        <SelectValue placeholder="Chọn đội..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueTeams.map((t: any) => (
                                            <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Đội 2</label>
                                <Select value={team2Id} onValueChange={setTeam2Id}>
                                    <SelectTrigger className="w-full text-sm h-10 border-gray-200">
                                        <SelectValue placeholder="Chọn đội..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueTeams.map((t: any) => (
                                            <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="outline" onClick={() => setIsSwapModalOpen(false)} className="px-6 h-10 font-bold border-gray-200 hover:bg-gray-100">Đóng</Button>
                            <Button
                                onClick={handleSwapTeams}
                                disabled={!team1Id || !team2Id || team1Id === team2Id || isUpdating}
                                className="bg-[#60A5FA] hover:bg-blue-500 px-6 h-10 text-white font-bold"
                            >
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Đổi vị trí"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Match Modal */}
            <AnimatePresence>
                {editingMatch && (
                    <EditMatchModal
                        match={editingMatch}
                        tournament={tournament}
                        onClose={() => setEditingMatch(null)}
                        onSaved={loadData}
                    />
                )}
            </AnimatePresence>

            <Dialog open={isGeneratingModalOpen} onOpenChange={setIsGeneratingModalOpen}>
                <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden border-0 rounded-[16px] bg-[#F7F8FA] flex flex-col max-h-[90vh]" showCloseButton={false}>
                    <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-100 flex-shrink-0 relative">
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Tạo lịch thi đấu</DialogTitle>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Sắp xếp lại vị trí thi đấu cho tất cả VĐV theo tùy chỉnh dưới đây. Hành động này sẽ TẠO LẠI TOÀN BỘ LỊCH TRÌNH VÀ XOÁ DỮ LIỆU ĐÃ CÓ.</p>
                        <button onClick={() => setIsGeneratingModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Empty Schedule */}
                            <div
                                onClick={() => setSelectedFormatType('empty')}
                                className={`cursor-pointer rounded-2xl bg-white border px-6 py-8 transition-all hover:shadow flex flex-col items-center text-center ${selectedFormatType === 'empty' ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-gray-200'}`}
                            >
                                <Bone className="w-8 h-8 text-[#3B82F6] mb-4" />
                                <h3 className="font-bold text-gray-900 text-lg mb-3">Lịch thi đấu trống</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                    Chỉ tạo sơ đồ thi đấu tương ứng với số VĐV đã đăng ký tham gia. Ban tổ chức tự sắp xếp vị trí thi đấu cho VĐV.
                                </p>
                                <p className="text-[12px] text-orange-500 font-semibold mt-auto leading-relaxed">
                                    * Phù hợp với giải đấu muốn tự sắp xếp vị trí thi đấu cho VĐV.
                                </p>
                            </div>

                            {/* Standard */}
                            <div
                                onClick={() => setSelectedFormatType('standard')}
                                className={`cursor-pointer rounded-2xl bg-white border px-6 py-8 transition-all hover:shadow flex flex-col items-center text-center ${selectedFormatType === 'standard' ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-gray-200'}`}
                            >
                                <Hexagon className="w-8 h-8 text-[#3B82F6] mb-4" />
                                <h3 className="font-bold text-gray-900 text-lg mb-3">Tiêu chuẩn</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                    <span className="text-orange-500 font-bold">Ưu tiên các đội hạt giống (nếu có)</span> được miễn vòng đầu và không gặp nhau sớm. Các vị trí còn lại sẽ được chọn ngẫu nhiên.
                                </p>
                                <p className="text-[12px] text-orange-500 font-semibold mt-auto leading-relaxed">
                                    * Các đội cùng 1 CLB vẫn có thể gặp nhau ở vòng đầu tiên.
                                </p>
                            </div>

                            {/* Custom */}
                            <div
                                onClick={() => setSelectedFormatType('custom')}
                                className={`cursor-pointer rounded-2xl bg-white border px-6 py-8 transition-all hover:shadow flex flex-col items-center text-center ${selectedFormatType === 'custom' ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]' : 'border-gray-200'}`}
                            >
                                <SplitSquareHorizontal className="w-8 h-8 text-[#3B82F6] transform rotate-90 mb-4" />
                                <h3 className="font-bold text-gray-900 text-lg mb-3">Tùy chỉnh</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                    Tách các đội <span className="text-orange-500 font-bold">cùng CLB ra nhánh khác nhau</span><br />(không tính CLB Tự do).
                                </p>
                                <p className="text-[12px] text-orange-500 font-semibold mt-auto leading-relaxed">
                                    * Không hỗ trợ tính năng hạt giống.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="outline" onClick={() => setIsGeneratingModalOpen(false)} className="px-6 h-11 rounded border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold" disabled={isUpdating}>
                                Hủy
                            </Button>
                            <Button onClick={confirmGenerateBrackets} disabled={isUpdating} className="bg-[#81A8FF] px-8 h-11 rounded text-white font-semibold hover:bg-[#6e97f5]">
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mx-auto mr-2" /> : null}
                                Trộn lịch thi đấu
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Edit Modal Component that perfectly matches the screenshot
function EditMatchModal({ match, tournament, onClose, onSaved }: { match: any; tournament: any; onClose: () => void; onSaved: () => void }) {
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
            // Determine winner ID based on score or manual selection (if you want to strictly tie it to the toggle)
            // But let's follow the standard pattern
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
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden border-0 rounded-[12px] shadow-2xl bg-white" showCloseButton={false}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Cập nhật trận đấu</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 pb-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Blue Info Box */}
                    <div className="bg-[#F0F7FF] rounded-lg p-4 flex items-center justify-between mb-6">
                        <div>
                            <div className="font-bold text-gray-900 text-sm mb-1">{tournament?.title || "Vincode"}</div>
                            <div className="text-gray-500 text-xs flex items-center gap-6">
                                <span>Hình thức thi đấu: <span className="text-gray-900 font-semibold">{tournament?.format === 'round_robin' ? 'Vòng tròn' : "Loại trực tiếp"}</span></span>
                                <span>Vòng đấu: <span className="text-gray-900 font-semibold">{match.roundName || `Vòng ${match.round}`}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-dashed border-gray-200 rounded-lg p-5 bg-white relative">
                        {/* Headers */}
                        <div className="flex justify-between text-sm font-bold text-gray-900 mb-3 px-1">
                            <div>Tên VĐV</div>
                            <div>Kết quả</div>
                        </div>

                        {/* Player Inputs & Score */}
                        <div className="flex gap-4">
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
                            <div className="w-[100px] flex flex-col gap-3">
                                <div className="flex flex-col gap-3 relative">
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
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium bg-white px-1 z-10">Set 1</div>
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
                                <div className="flex overflow-hidden rounded border border-blue-100 h-8 mt-1">
                                    <button className="flex-1 h-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center font-bold text-lg">+</button>
                                    <button className="flex-1 h-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center font-bold text-lg">-</button>
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
                    <div className="grid grid-cols-2 gap-6 mt-6">
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
                    <div className="mt-8 mb-16 text-center">
                        <div className="text-gray-500 font-medium mb-1">Chưa có lịch sử điểm số</div>
                        <div className="text-xs text-gray-400">Lịch sử điểm số chỉ hiển thị khi sử dụng tính năng chấm điểm của trọng tài.</div>
                    </div>

                </div>

                {/* Footer fixed */}
                <div className="border-t border-gray-100 p-4 bg-white flex justify-end gap-3 sticky bottom-0">
                    <Button variant="outline" onClick={onClose} className="px-6 h-10 rounded border-gray-200 text-gray-700 font-bold hover:bg-gray-50">
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#81A8FF] px-8 h-10 rounded text-white font-bold hover:bg-[#6e97f5]">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                    </Button>
                </div>
            </DialogContent>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
            `}</style>
        </Dialog>
    );
}
