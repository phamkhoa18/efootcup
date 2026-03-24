"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Download, Edit3, Filter, Settings2, Share2, Play, Users, X, Info, ChevronDown, CheckCircle2, Bone, Hexagon, SplitSquareHorizontal, Loader2, ArrowLeftRight, FileBarChart, Eye, ArrowUp, ArrowDown, Shuffle, Hash, Trophy, Save, Sparkles, Search } from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
    const [editingMatch, setEditingMatch] = useState<any>(null);
    const [viewingSubmissions, setViewingSubmissions] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'live' | 'completed' | 'has_submissions' | 'pending_review'>('all');
    const [seedMode, setSeedMode] = useState<'random' | 'manual'>('random');
    const [seedMap, setSeedMap] = useState<Record<string, number | null>>({});
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [seedSearchTerm, setSeedSearchTerm] = useState('');
    const [matchSearchTerm, setMatchSearchTerm] = useState('');
    const { confirm, alert: showAlert } = useConfirmDialog();

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
                toast.error("Không thể tạo file PDF. Vui lòng thử lại sau.");
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
            // Auto-save seeds to DB before generating
            if (seedMode === 'manual') {
                const seedsPayload = Object.entries(seedMap).map(([teamId, seed]) => ({
                    teamId,
                    seed: seed && seed > 0 ? seed : null,
                }));
                await tournamentAPI.updateTeamSeed(id, { seeds: seedsPayload });
            }

            const payload: any = {};
            if (seedMode === 'manual') {
                const seeded = allTeams
                    .filter(t => seedMap[t._id] != null && seedMap[t._id]! > 0)
                    .sort((a, b) => (seedMap[a._id] || 999) - (seedMap[b._id] || 999));
                const nonSeeded = allTeams.filter(t => !seedMap[t._id] || seedMap[t._id]! <= 0);
                for (let i = nonSeeded.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [nonSeeded[i], nonSeeded[j]] = [nonSeeded[j], nonSeeded[i]];
                }
                payload.seeds = [...seeded, ...nonSeeded].map(t => t._id || t.id);
            }
            const res = await tournamentAPI.generateBrackets(id, payload);
            if (res.success) {
                toast.success(`Đã tạo lịch thi đấu với ${res.data?.totalMatches || 0} trận!`);
                loadData();
            } else {
                toast.error(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error("Failed to generate brackets:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Load teams for seeding when modal opens
    const openGenerateModal = async () => {
        setIsGeneratingModalOpen(true);
        setSeedSearchTerm('');
        try {
            const res = await tournamentAPI.getById(id);
            if (res.success) {
                const teams = res.data?.teams || [];
                setAllTeams(teams);
                const map: Record<string, number | null> = {};
                teams.forEach((team: any) => { map[team._id || team.id] = team.seed ?? null; });
                setSeedMap(map);
                // Auto-switch to manual mode if any seeds exist
                if (teams.some((team: any) => team.seed != null && team.seed > 0)) {
                    setSeedMode('manual');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const autoAssignSeeds = () => {
        const count = Math.max(1, Math.floor(allTeams.length / 4));
        const newMap: Record<string, number | null> = {};
        allTeams.forEach((t, i) => { newMap[t._id || t.id] = i < count ? i + 1 : null; });
        setSeedMap(newMap);
        toast.success(`Đã gán tự động ${count} hạt giống (¼ số đội)`);
    };

    const clearAllSeeds = () => {
        const newMap: Record<string, number | null> = {};
        allTeams.forEach(t => { newMap[t._id || t.id] = null; });
        setSeedMap(newMap);
    };

    const saveSeedsFromLich = async () => {
        setIsUpdating(true);
        try {
            const seedsPayload = Object.entries(seedMap).map(([teamId, seed]) => ({
                teamId,
                seed: seed && seed > 0 ? seed : null,
            }));
            const res = await tournamentAPI.updateTeamSeed(id, { seeds: seedsPayload });
            if (res.success) {
                toast.success('💾 Đã lưu hạt giống thành công!');
            } else {
                toast.error(res.message || 'Lỗi lưu');
            }
        } catch (e) {
            console.error(e);
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsUpdating(false);
        }
    };

    const assignedSeedsList = Object.values(seedMap).filter(v => v != null && v > 0);
    const filteredSeedTeams = allTeams.filter(t => {
        if (!seedSearchTerm.trim()) return true;
        const s = seedSearchTerm.toLowerCase();
        return (
            t.name?.toLowerCase().includes(s) ||
            t.shortName?.toLowerCase().includes(s) ||
            t.captain?.name?.toLowerCase().includes(s) ||
            String(t.captain?.efvId || '').includes(s.replace(/^#/, ''))
        );
    });

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
                toast.error(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSetMatchLive = async (matchId: string) => {
        const ok = await confirm({
            title: "Chuyển trạng thái LIVE?",
            description: "Bạn muốn chuyển trạng thái trận đấu này sang Đang trực tiếp (LIVE)?",
            variant: "warning",
            confirmText: "Chuyển LIVE",
        });
        if (!ok) return;
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.updateMatch(id, { matchId, status: "live" });
            if (res.success) {
                loadData();
            } else {
                toast.error(res.message);
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

    const actualMatches = matches.filter(m => m.status !== 'walkover' && m.status !== 'bye');
    const completedMatches = actualMatches.filter(m => m.status === 'completed').length;
    const liveMatches = actualMatches.filter(m => m.status === 'live').length;
    const pendingMatches = actualMatches.filter(m => m.status !== 'completed' && m.status !== 'live').length;
    const hasSubMatches = actualMatches.filter(m => m.resultSubmissions?.length > 0).length;
    const unreviewedMatches = actualMatches.filter(m => m.resultSubmissions?.length > 0 && m.status !== 'completed').length;
    const totalMatches = actualMatches.length;

    const filterMatch = (m: any) => {
        // Status filter
        if (statusFilter === 'completed' && m.status !== 'completed') return false;
        if (statusFilter === 'live' && m.status !== 'live') return false;
        if (statusFilter === 'pending' && (m.status === 'completed' || m.status === 'live')) return false;
        if (statusFilter === 'has_submissions' && !(m.resultSubmissions?.length > 0)) return false;
        if (statusFilter === 'pending_review' && !(m.resultSubmissions?.length > 0 && m.status !== 'completed')) return false;

        // Search filter
        if (matchSearchTerm.trim()) {
            const s = matchSearchTerm.toLowerCase();
            const homeName = (m.homeTeam?.name || '').toLowerCase();
            const awayName = (m.awayTeam?.name || '').toLowerCase();
            const homeP1 = (m.homeTeam?.player1 || '').toLowerCase();
            const awayP1 = (m.awayTeam?.player1 || '').toLowerCase();
            const homeP2 = (m.homeTeam?.player2 || '').toLowerCase();
            const awayP2 = (m.awayTeam?.player2 || '').toLowerCase();
            const homeEfv = String(m.homeTeam?.efvId || '');
            const awayEfv = String(m.awayTeam?.efvId || '');
            const matchNum = String(m.matchNumber || '');
            const homeShort = (m.homeTeam?.shortName || '').toLowerCase();
            const awayShort = (m.awayTeam?.shortName || '').toLowerCase();

            return (
                homeName.includes(s) || awayName.includes(s) ||
                homeP1.includes(s) || awayP1.includes(s) ||
                homeP2.includes(s) || awayP2.includes(s) ||
                homeEfv.includes(s) || awayEfv.includes(s) ||
                matchNum.includes(s) ||
                homeShort.includes(s) || awayShort.includes(s)
            );
        }
        return true;
    };

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
                        onClick={openGenerateModal}
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
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 h-8 px-3 rounded text-xs font-semibold" onClick={() => router.push(`/manager/giai-dau/${id}/so-do`)}>
                        <Share2 className="w-3.5 h-3.5 mr-1.5" /> Sơ đồ
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200" onClick={() => setIsSwapModalOpen(true)}>
                        <ArrowLeftRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200">
                        <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200" onClick={openGenerateModal}>
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto">
                {[
                    { key: 'all', label: 'Tất cả', count: totalMatches, color: 'bg-gray-100 text-gray-700', active: 'bg-gray-900 text-white' },
                    { key: 'pending_review', label: '⚡ Chờ xử lý', count: unreviewedMatches, color: 'bg-rose-50 text-rose-600', active: 'bg-rose-600 text-white' },
                    { key: 'pending', label: 'Chưa đá', count: pendingMatches, color: 'bg-blue-50 text-blue-600', active: 'bg-blue-600 text-white' },
                    { key: 'live', label: 'Đang đá', count: liveMatches, color: 'bg-red-50 text-red-600', active: 'bg-red-600 text-white' },
                    { key: 'completed', label: 'Đã xong', count: completedMatches, color: 'bg-emerald-50 text-emerald-600', active: 'bg-emerald-600 text-white' },
                    { key: 'has_submissions', label: 'Có KQ gửi', count: hasSubMatches, color: 'bg-orange-50 text-orange-600', active: 'bg-orange-600 text-white' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                            statusFilter === f.key ? f.active + ' shadow-sm' : f.color + ' hover:opacity-80'
                        }`}
                    >
                        {f.label}
                        <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center ${
                            statusFilter === f.key ? 'bg-white/25' : 'bg-black/5'
                        }`}>{f.count}</span>
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 bg-white border-b border-gray-100">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm trận đấu (tên đội, VĐV, mã EFV, số trận...)"
                        value={matchSearchTerm}
                        onChange={(e) => setMatchSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-gray-400"
                    />
                    {matchSearchTerm && (
                        <button
                            onClick={() => setMatchSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Match List */}
            <div id="schedule-container" className="bg-white border text-sm max-w-full print-container relative rounded-lg overflow-hidden">
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
                    Object.entries(rounds).map(([roundName, roundMatches]) => {
                        const visibleMatches = roundMatches.filter((m: any) => m.status !== 'walkover' && m.status !== 'bye').filter(filterMatch);
                        if (visibleMatches.length === 0) return null;

                        return (
                            <div key={roundName}>
                                {/* Round Header */}
                                <div className="bg-[#D9EAF7] flex items-center justify-center py-2 px-4 relative border-b border-white">
                                    <span className="text-red-500 font-bold text-sm">{roundName}</span>
                                    <span className="text-gray-700 font-semibold ml-1 text-sm hidden sm:inline">| {tournament?.title}</span>
                                </div>

                                {/* Desktop Table Headers (hidden on mobile) */}
                                <div className="hidden lg:grid grid-cols-12 gap-4 py-2 px-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-50/50 text-xs">
                                    <div className="col-span-1">#</div>
                                    <div className="col-span-2">CLB</div>
                                    <div className="col-span-4">Cặp đấu</div>
                                    <div className="col-span-2 text-center">Kết quả</div>
                                    <div className="col-span-1 text-center">Sân</div>
                                    <div className="col-span-2 text-center">Trạng thái</div>
                                </div>

                                {/* Match Rows */}
                                <div className="divide-y divide-gray-100">
                                    {roundMatches.filter((m: any) => m.status !== 'walkover' && m.status !== 'bye').filter(filterMatch).map((m: any, index: number) => {
                                        const homeName = m.homeTeam?.name || "Tự do";
                                        const awayName = m.awayTeam?.name || "Tự do";
                                        const p1Name = m.homeTeam?.player1 || "—";
                                        const p1Sub = m.homeTeam?.player2 && m.homeTeam.player2 !== "TBD" ? ` / ${m.homeTeam.player2}` : "";
                                        const p2Name = m.awayTeam?.player1 || "—";
                                        const p2Sub = m.awayTeam?.player2 && m.awayTeam.player2 !== "TBD" ? ` / ${m.awayTeam.player2}` : "";

                                        const isWalkover = m.status === 'walkover';
                                        const isCompleted = m.status === 'completed' || isWalkover;
                                        const isHomeWin = isCompleted && (m.winner === (m.homeTeam?._id || m.homeTeam?.id) || (m.homeScore || 0) > (m.awayScore || 0));
                                        const isAwayWin = isCompleted && (m.winner === (m.awayTeam?._id || m.awayTeam?.id) || (m.awayScore || 0) > (m.homeScore || 0));

                                        return (
                                            <div key={m._id}>
                                                {/* Desktop Row */}
                                                <div className="hidden lg:grid grid-cols-12 gap-4 items-center py-2 px-4 hover:bg-gray-50 transition-colors">
                                                    <div className="col-span-1 text-gray-900 font-bold text-sm">{m.matchNumber}</div>
                                                    <div className="col-span-2 flex flex-col gap-1.5">
                                                        <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                            {m.homeTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.homeTeam.efvId}</span>}
                                                            {m.homeTeam?.seed != null && m.homeTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0" title={`Hạt giống số ${m.homeTeam.seed}`}>Seed {m.homeTeam.seed}</span>}
                                                            <span className="truncate">{homeName}</span>
                                                        </div>
                                                        <div className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-white text-[11px] font-semibold text-gray-700 truncate w-fit max-w-full flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                            {m.awayTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.awayTeam.efvId}</span>}
                                                            {m.awayTeam?.seed != null && m.awayTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0" title={`Hạt giống số ${m.awayTeam.seed}`}>Seed {m.awayTeam.seed}</span>}
                                                            <span className="truncate">{awayName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 flex flex-col gap-1.5 text-[13px] font-medium">
                                                        <div className={`${isCompleted ? (isHomeWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>{p1Name}{p1Sub}</div>
                                                        <div className={`${isCompleted ? (isAwayWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>{p2Name}{p2Sub}</div>
                                                    </div>
                                                    <div className="col-span-2 text-center text-sm font-bold text-gray-900">
                                                        {isCompleted || m.status === "live" ? (
                                                            isWalkover ? <span className="text-gray-400">Tự động đi tiếp</span> : <span>{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <Button variant="outline" size="sm" className="h-6 text-[10px] rounded px-2 border-gray-200 text-gray-400 font-normal">Chọn sân</Button>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-between pr-2">
                                                        <div className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600" : m.status === "live" ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50/50 border border-blue-100 text-blue-400"}`}>
                                                            {isWalkover ? "Đi tiếp" : isCompleted ? "Kết thúc" : m.status === "live" ? "LIVE" : "Chờ thi đấu"}
                                                        </div>
                                                        <div className="flex gap-1.5 items-center text-gray-400">
                                                            {!isCompleted && m.status !== "live" ? (
                                                                <Play className="w-4 h-4 hover:text-green-500 cursor-pointer transition-colors" onClick={() => handleSetMatchLive(m._id || m.id)} />
                                                            ) : <div className="w-4 h-4" />}
                                                            {m.resultSubmissions && m.resultSubmissions.length > 0 && (
                                                                <span title={`${m.resultSubmissions.length} kết quả VĐV gửi${isCompleted ? ' (đã xử lý)' : ''}`} onClick={() => setViewingSubmissions(m)} className="relative cursor-pointer">
                                                                    <Eye className={`w-4 h-4 transition-colors ${isCompleted ? 'text-gray-300 hover:text-gray-500' : 'text-orange-400 hover:text-orange-500'}`} />
                                                                    {!isCompleted && (
                                                                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">{m.resultSubmissions.length}</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            <Edit3 className="w-4 h-4 hover:text-blue-500 cursor-pointer transition-colors" onClick={() => setEditingMatch({ ...m, roundName })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mobile Card */}
                                                <div className="lg:hidden p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-400">Trận #{m.matchNumber}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600" : m.status === "live" ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50/50 border border-blue-100 text-blue-400"}`}>
                                                                {isWalkover ? "Đi tiếp" : isCompleted ? "Kết thúc" : m.status === "live" ? "LIVE" : "Chờ"}
                                                            </div>
                                                            <div className="flex gap-1.5 items-center">
                                                                {!isCompleted && m.status !== "live" && (
                                                                    <button className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors" onClick={() => handleSetMatchLive(m._id || m.id)}>
                                                                        <Play className="w-4 h-4 text-green-600" />
                                                                    </button>
                                                                )}
                                                                {m.resultSubmissions?.length > 0 && (
                                                                    <button onClick={() => setViewingSubmissions(m)} className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isCompleted ? 'bg-gray-50 hover:bg-gray-100' : 'bg-orange-50 hover:bg-orange-100'}`}>
                                                                        <Eye className={`w-4 h-4 ${isCompleted ? 'text-gray-400' : 'text-orange-500'}`} />
                                                                        {!isCompleted && (
                                                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">{m.resultSubmissions.length}</span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <button className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors" onClick={() => setEditingMatch({ ...m, roundName })}>
                                                                    <Edit3 className="w-4 h-4 text-blue-600" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Home team */}
                                                    <div className={`flex items-center justify-between py-1.5 ${isHomeWin ? 'font-bold' : ''}`}>
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                                            <span className={`text-[13px] truncate flex items-center gap-1.5 ${isCompleted ? (isHomeWin ? "text-gray-900" : "text-gray-400") : "text-purple-600"}`}>
                                                                {m.homeTeam?.seed != null && m.homeTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0 leading-tight" title={`Hạt giống số ${m.homeTeam.seed}`}>Seed {m.homeTeam.seed}</span>}
                                                                <span className="truncate">{p1Name}{p1Sub}</span>
                                                            </span>
                                                        </div>
                                                        <span className={`text-sm tabular-nums ml-2 ${isHomeWin ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                                            {isCompleted || m.status === "live" ? (m.homeScore ?? 0) : "-"}
                                                        </span>
                                                    </div>
                                                    {/* Away team */}
                                                    <div className={`flex items-center justify-between py-1.5 ${isAwayWin ? 'font-bold' : ''}`}>
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                            <span className={`text-[13px] truncate flex items-center gap-1.5 ${isCompleted ? (isAwayWin ? "text-gray-900" : "text-gray-400") : "text-purple-600"}`}>
                                                                {m.awayTeam?.seed != null && m.awayTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0 leading-tight" title={`Hạt giống số ${m.awayTeam.seed}`}>Seed {m.awayTeam.seed}</span>}
                                                                <span className="truncate">{p2Name}{p2Sub}</span>
                                                            </span>
                                                        </div>
                                                        <span className={`text-sm tabular-nums ml-2 ${isAwayWin ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                                                            {isCompleted || m.status === "live" ? (m.awayScore ?? 0) : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })
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
                <DialogContent className="w-[95vw] sm:w-[80vw] max-w-5xl p-0 overflow-hidden border-0 rounded-[16px] bg-white flex flex-col max-h-[90vh]" showCloseButton={false}>
                    <div className="px-6 sm:px-8 py-6 border-b border-gray-100 flex-shrink-0 relative">
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Tạo lịch thi đấu</DialogTitle>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Hành động này sẽ TẠO LẠI TOÀN BỘ LỊCH TRÌNH VÀ XOÁ DỮ LIỆU ĐÃ CÓ.</p>
                        <button onClick={() => setIsGeneratingModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                        {/* Seed Mode Toggle */}
                        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Hash className="w-4 h-4 text-blue-500" /> Chế độ hạt giống
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSeedMode('random')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${seedMode === 'random'
                                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                        : 'bg-white text-gray-500 border-2 border-transparent hover:border-gray-200'}`}
                                >
                                    <Shuffle className="w-4 h-4" /> Ngẫu nhiên
                                </button>
                                <button
                                    onClick={() => setSeedMode('manual')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${seedMode === 'manual'
                                        ? 'bg-amber-50 text-amber-700 border-2 border-amber-200'
                                        : 'bg-white text-gray-500 border-2 border-transparent hover:border-gray-200'}`}
                                >
                                    <Hash className="w-4 h-4" /> Chọn hạt giống thủ công
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                {seedMode === 'random'
                                    ? 'Đội sẽ được xếp ngẫu nhiên. Hạt giống #1 sẽ gặp hạt giống thấp nhất.'
                                    : 'Chọn số hạt giống cho các VĐV mạnh để họ không gặp nhau sớm. Nhập từ 1 trở lên, không giới hạn.'}
                            </p>
                        </div>

                        {/* Manual Seed Table */}
                        {seedMode === 'manual' && allTeams.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                                {/* Toolbar */}
                                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <div className="flex-1 relative w-full sm:w-auto">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm VĐV theo tên, EFV ID, đội..."
                                            value={seedSearchTerm}
                                            onChange={(e) => setSeedSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            <span className="font-bold text-amber-600">{assignedSeedsList.length}</span> hạt giống
                                        </span>
                                        <button
                                            onClick={saveSeedsFromLich}
                                            disabled={isUpdating}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Lưu
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
                                <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-gray-50/80">
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-12">STT</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">VĐV / Đội</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">Hạt giống</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredSeedTeams.map((team, idx) => {
                                                const teamId = team._id || team.id;
                                                const currentSeed = seedMap[teamId];
                                                const hasSeed = currentSeed != null && currentSeed > 0;

                                                return (
                                                    <tr key={teamId} className={`hover:bg-gray-50/50 transition-colors ${hasSeed ? 'bg-amber-50/30' : ''}`}>
                                                        <td className="px-4 py-3 text-gray-400 text-xs font-medium">{idx + 1}</td>
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
                                                                        <span className="text-sm font-semibold text-gray-900 truncate">{team.captain?.name || team.name || '—'}</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                                        {team.name}{team.shortName ? ` (${team.shortName})` : ''}
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
                                                                                ([tid, sv]) => tid !== teamId && sv === val
                                                                            );
                                                                            if (duplicate) {
                                                                                const dupTeam = allTeams.find(t => (t._id || t.id) === duplicate[0]);
                                                                                toast.info(`Hạt giống #${val} đã chuyển từ ${dupTeam?.name || '?'} sang ${team.name}`);
                                                                                setSeedMap(prev => ({ ...prev, [duplicate[0]]: null, [teamId]: val }));
                                                                                return;
                                                                            }
                                                                        }
                                                                        setSeedMap(prev => ({ ...prev, [teamId]: val }));
                                                                    }}
                                                                    className={`w-16 h-8 text-center text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${hasSeed
                                                                        ? 'border-amber-300 bg-amber-50 text-amber-700 font-bold focus:ring-amber-200'
                                                                        : 'border-gray-200 bg-white text-gray-400 focus:ring-blue-200 focus:border-blue-300'
                                                                        }`}
                                                                />
                                                                {hasSeed && (
                                                                    <button
                                                                        onClick={() => setSeedMap(prev => ({ ...prev, [teamId]: null }))}
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

                                {/* Seed Summary */}
                                {assignedSeedsList.length > 0 && (
                                    <div className="p-4 border-t border-gray-100 bg-amber-50/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-xs font-bold text-amber-800">Hạt giống đã chọn ({assignedSeedsList.length})</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(seedMap)
                                                .filter(([, v]) => v != null && v > 0)
                                                .sort(([, a], [, b]) => (a || 0) - (b || 0))
                                                .map(([teamId, seedNum]) => {
                                                    const t = allTeams.find(t => (t._id || t.id) === teamId);
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

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsGeneratingModalOpen(false)} className="px-6 h-11 rounded-xl border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold" disabled={isUpdating}>
                                Hủy
                            </Button>
                            <Button onClick={confirmGenerateBrackets} disabled={isUpdating} className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 h-11 rounded-xl text-white font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200">
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                Tạo lịch thi đấu
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Submissions Popup */}
            <Dialog open={!!viewingSubmissions} onOpenChange={(open) => { if (!open) setViewingSubmissions(null); }}>
                <DialogContent
                    className="w-[95vw] max-w-lg p-0 overflow-hidden border-0 rounded-[16px] bg-white text-gray-900 shadow-2xl max-h-[90vh] flex flex-col"
                    showCloseButton={false}
                >
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 flex-shrink-0">
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-orange-500" /> Kết quả VĐV đã gửi
                            </DialogTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Trận #{viewingSubmissions?.matchNumber} — {viewingSubmissions?.homeTeam?.name || "?"} vs {viewingSubmissions?.awayTeam?.name || "?"}
                            </p>
                        </div>
                        <button onClick={() => setViewingSubmissions(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                        {viewingSubmissions?.resultSubmissions?.length > 0 ? (
                            viewingSubmissions.resultSubmissions.map((sub: any, idx: number) => {
                                const isFromHome = sub.team?.toString() === (viewingSubmissions.homeTeam?._id || viewingSubmissions.homeTeam)?.toString();
                                const submitterTeam = isFromHome ? viewingSubmissions.homeTeam : viewingSubmissions.awayTeam;
                                const submitterTeamName = submitterTeam?.shortName || submitterTeam?.name || "";

                                // Use enriched userData
                                const userData = sub.userData || {};
                                const displayName = userData.name || submitterTeam?.player1 || "VĐV";
                                const displayEfvId = userData.efvId ?? null;
                                const displayAvatar = userData.personalPhoto || userData.avatar || '';
                                const displayGameId = userData.gamerId || '';

                                return (
                                <div key={idx} className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                                    {/* Player Info Header */}
                                    <div className={`px-4 py-3 flex items-start gap-3 ${isFromHome ? 'bg-blue-50/50 border-b border-blue-100' : 'bg-rose-50/50 border-b border-rose-100'}`}>
                                        {displayAvatar ? (
                                            <img src={displayAvatar} alt={displayName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0 cursor-pointer hover:opacity-80" onClick={() => window.open(displayAvatar, '_blank')} />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isFromHome ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {displayEfvId != null && (
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-px rounded">#{displayEfvId}</span>
                                                )}
                                                <span className="text-sm font-bold text-gray-900 truncate">{displayName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                                {displayGameId && <span>🎮 <span className="font-semibold text-gray-600">{displayGameId}</span></span>}
                                                {submitterTeamName && <span>· {submitterTeamName}</span>}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("vi-VN") : ""}
                                        </span>
                                    </div>
                                    {/* Score + Content */}
                                    <div className="p-4 space-y-3">
                                    {/* Score */}
                                    <div className="flex items-center justify-center gap-4 py-2">
                                        <div className="text-center">
                                            <div className="mb-1">
                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                    {viewingSubmissions.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{viewingSubmissions.homeTeam.efvId}</span>}
                                                    <span className="text-[10px] font-bold text-gray-600 truncate">{viewingSubmissions.homeTeam?.player1 || "Đội nhà"}</span>
                                                </div>
                                                {viewingSubmissions.homeTeam?.shortName && <p className="text-[9px] text-gray-400">{viewingSubmissions.homeTeam.shortName}</p>}
                                            </div>
                                            <span className={`text-2xl font-black px-4 py-2 rounded-xl inline-block ${sub.homeScore > sub.awayScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.homeScore}</span>
                                        </div>
                                        <span className="text-xl text-gray-200 font-light">—</span>
                                        <div className="text-center">
                                            <div className="mb-1">
                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                    {viewingSubmissions.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{viewingSubmissions.awayTeam.efvId}</span>}
                                                    <span className="text-[10px] font-bold text-gray-600 truncate">{viewingSubmissions.awayTeam?.player1 || "Đội khách"}</span>
                                                </div>
                                                {viewingSubmissions.awayTeam?.shortName && <p className="text-[9px] text-gray-400">{viewingSubmissions.awayTeam.shortName}</p>}
                                            </div>
                                            <span className={`text-2xl font-black px-4 py-2 rounded-xl inline-block ${sub.awayScore > sub.homeScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.awayScore}</span>
                                        </div>
                                    </div>
                                    {sub.notes && (
                                        <p className="text-xs text-gray-500 italic bg-white px-3 py-2 rounded-lg border border-gray-100">💬 "{sub.notes}"</p>
                                    )}
                                    {sub.screenshots && sub.screenshots.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {sub.screenshots.map((s: string, si: number) => (
                                                <img key={si} src={s} alt="Screenshot" className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 cursor-pointer hover:opacity-80 hover:shadow-lg transition-all" onClick={() => window.open(s, '_blank')} />
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">Chưa có kết quả nào được gửi.</p>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50 flex justify-between items-center gap-3 flex-shrink-0">
                        <p className="text-[10px] text-gray-400 italic hidden sm:block">Xem kết quả và nhập tỉ số chính thức qua nút Sửa bên cạnh.</p>
                        <Button variant="outline" onClick={() => setViewingSubmissions(null)} className="px-6 h-10 sm:h-9 rounded-lg border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 text-sm w-full sm:w-auto">
                            Đóng
                        </Button>
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
    const [sets, setSets] = useState<{homeScore: string; awayScore: string}[]>(
        match.sets && match.sets.length > 0
            ? match.sets.map((s: any) => ({ homeScore: String(s.homeScore), awayScore: String(s.awayScore) }))
            : [{ homeScore: match.homeScore ?? "", awayScore: match.awayScore ?? "" }]
    );
    const [isSaving, setIsSaving] = useState(false);

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
            // Determine winner ID based on score or manual selection (if you want to strictly tie it to the toggle)
            // But let's follow the standard pattern
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

    return (
        <>
        <Dialog open onOpenChange={() => {}}>
            <DialogContent
                className="w-[95vw] max-w-4xl p-0 overflow-hidden border-0 rounded-[12px] shadow-2xl bg-white max-h-[95vh] flex flex-col"
                showCloseButton={false}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Cập nhật trận đấu</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 pb-2 overflow-y-auto custom-scrollbar flex-1">
                    {/* Blue Info Box */}
                    <div className="bg-[#F0F7FF] rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-y-1 mb-4 sm:mb-6">
                        <div>
                            <div className="font-bold text-gray-900 text-sm mb-1">{tournament?.title || "Vincode"}</div>
                            <div className="text-gray-500 text-xs flex flex-wrap items-center gap-3 sm:gap-6">
                                <span>Hình thức: <span className="text-gray-900 font-semibold">{tournament?.format === 'round_robin' ? 'Vòng tròn' : "Loại trực tiếp"}</span></span>
                                <span>Vòng: <span className="text-gray-900 font-semibold">{match.roundName || `Vòng ${match.round}`}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="border border-dashed border-gray-200 rounded-lg p-3 sm:p-5 bg-white relative">
                        {/* Headers - hidden on mobile since we stack */}
                        <div className="hidden sm:flex justify-between text-sm font-bold text-gray-900 mb-3 px-1">
                            <div>Tên VĐV</div>
                            <div>Kết quả</div>
                        </div>

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
                                    <div className="w-[160px] sm:w-[220px] sticky left-0 z-10 bg-white py-3 px-3 flex items-center min-w-0 border-r border-gray-100 flex-shrink-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {match.homeTeam?.logo && <img src={match.homeTeam.logo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-100" />}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {match.homeTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.homeTeam.efvId}</span>}
                                                    <span className="text-[13px] font-semibold text-gray-900 truncate inline-block max-w-[90px] sm:max-w-none align-bottom leading-tight">{match.homeTeam?.player1 || match.p1?.name || "Tự do"}</span>
                                                </div>
                                                {match.homeTeam?.shortName && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{match.homeTeam.shortName}</div>}
                                            </div>
                                        </div>
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
                                    <div className="w-[160px] sm:w-[220px] sticky left-0 z-10 bg-white py-3 px-3 flex items-center min-w-0 border-r border-gray-100 flex-shrink-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {match.awayTeam?.logo && <img src={match.awayTeam.logo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-100" />}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {match.awayTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                                    <span className="text-[13px] font-semibold text-gray-900 truncate inline-block max-w-[90px] sm:max-w-none align-bottom leading-tight">{match.awayTeam?.player1 || match.p2?.name || "Tự do"}</span>
                                                </div>
                                                {match.awayTeam?.shortName && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{match.awayTeam.shortName}</div>}
                                            </div>
                                        </div>
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
                                        <span>{match.homeTeam?.player1 || match.p1?.name || "Tự do"}</span>
                                    </div>
                                    {match.homeTeam?.shortName && <span className="text-[10px] text-gray-400">{match.homeTeam.shortName}</span>}
                                </button>
                                <button
                                    onClick={() => setSelectedWinner('away')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center gap-1 ${selectedWinner === 'away' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                        <span>{match.awayTeam?.player1 || match.p2?.name || "Tự do"}</span>
                                    </div>
                                    {match.awayTeam?.shortName && <span className="text-[10px] text-gray-400">{match.awayTeam.shortName}</span>}
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
                    </div>

                    {/* Player Submitted Results */}
                    {match.resultSubmissions && match.resultSubmissions.length > 0 && (
                        <div className="mt-8 border border-orange-200 rounded-xl p-5 bg-orange-50/30">
                            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileBarChart className="w-4 h-4 text-orange-500" />
                                Kết quả VĐV đã gửi
                                <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{match.resultSubmissions.length}</span>
                            </h4>
                            <div className="space-y-3">
                                {match.resultSubmissions.map((sub: any, idx: number) => {
                                    const isFromHome = sub.team?.toString?.() === (match.homeTeam?._id || match.homeTeam)?.toString?.();
                                    const submitterTeam = isFromHome ? match.homeTeam : match.awayTeam;
                                    const submitterTeamName = submitterTeam?.shortName || submitterTeam?.name || "";
                                    const userData = sub.userData || {};
                                    const displayName = userData.name || submitterTeam?.player1 || "VĐV";
                                    const displayEfvId = userData.efvId ?? null;
                                    const displayAvatar = userData.personalPhoto || userData.avatar || '';
                                    const displayGameId = userData.gamerId || '';

                                    return (
                                    <div key={idx} className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                                        {/* Player Info */}
                                        <div className={`px-4 py-2.5 flex items-center gap-3 ${isFromHome ? 'bg-blue-50/50 border-b border-blue-100' : 'bg-rose-50/50 border-b border-rose-100'}`}>
                                            {displayAvatar ? (
                                                <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                                            ) : (
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isFromHome ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {displayEfvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-px rounded">#{displayEfvId}</span>}
                                                    <span className="text-xs font-bold text-gray-900 truncate">{displayName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    {displayGameId && <span>🎮 {displayGameId}</span>}
                                                    {submitterTeamName && <span>· {submitterTeamName}</span>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("vi-VN") : ""}
                                            </span>
                                        </div>
                                        {/* Score + notes + screenshots */}
                                        <div className="p-3">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                {match.homeTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.homeTeam.efvId}</span>}
                                                <span className="text-xs font-bold text-gray-700">{match.homeTeam?.player1 || match.homeTeam?.shortName || "H"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xl font-black px-3 py-1 rounded-lg ${sub.homeScore > sub.awayScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.homeScore}</span>
                                                <span className="text-gray-300 font-light">—</span>
                                                <span className={`text-xl font-black px-3 py-1 rounded-lg ${sub.awayScore > sub.homeScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.awayScore}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                                <span className="text-xs font-bold text-gray-700">{match.awayTeam?.player1 || match.awayTeam?.shortName || "A"}</span>
                                            </div>
                                        </div>
                                        {sub.notes && <p className="text-xs text-gray-500 italic mb-2">"{sub.notes}"</p>}
                                        {sub.screenshots && sub.screenshots.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {sub.screenshots.map((s: string, si: number) => (
                                                    <img key={si} src={s} alt="SS" className="w-20 h-20 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 hover:shadow-md transition-all" onClick={() => window.open(s, '_blank')} />
                                                ))}
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}




                </div>

                {/* Footer fixed */}
                <div className="border-t border-gray-100 p-3 sm:p-4 bg-white flex justify-end gap-3 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} className="px-4 sm:px-6 h-11 sm:h-10 rounded-lg border-gray-200 text-gray-700 font-bold hover:bg-gray-50 text-sm">
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#81A8FF] px-6 sm:px-8 h-11 sm:h-10 rounded-lg text-white font-bold hover:bg-[#6e97f5] text-sm">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu"}
                    </Button>
                </div>
            </DialogContent>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
            `}</style>
        </Dialog>
        </>
    );
}
