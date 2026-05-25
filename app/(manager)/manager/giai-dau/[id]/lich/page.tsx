"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Download, Edit3, Filter, Settings2, Share2, Play, Users, X, Info, ChevronDown, CheckCircle2, Bone, Hexagon, SplitSquareHorizontal, Loader2, ArrowLeftRight, FileBarChart, Eye, ArrowUp, ArrowDown, Shuffle, Hash, Trophy, Save, Sparkles, Search, History, UserCheck } from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useBracketSwap } from "@/hooks/useBracketSwap";
import SwapFloatingBar from "@/components/SwapFloatingBar";
import { useAuth } from "@/contexts/AuthContext";

// Helper: Vietnamese relative time
function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

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
    const { user } = useAuth();

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
    const [isExporting, setIsExporting] = useState(false);
    const { confirm, alert: showAlert } = useConfirmDialog();

    const handleDownloadPDF = async () => {
        setIsUpdating(true);
        try {
            // Khởi tạo jsPDF
            const pdf = new jsPDF("landscape", "mm", "a4");

            // Load font Roboto hỗ trợ Tiếng Việt
            toast.info("Đang tạo PDF, vui lòng đợi...");
            const fontRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
            const fontBuffer = await fontRes.arrayBuffer();
            const fontBytes = new Uint8Array(fontBuffer);
            let binary = '';
            for (let i = 0; i < fontBytes.byteLength; i++) {
                binary += String.fromCharCode(fontBytes[i]);
            }
            const fontBase64 = btoa(binary);
            pdf.addFileToVFS('Roboto-Regular.ttf', fontBase64);
            pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal', 'Identity-H');
            pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'bold', 'Identity-H');
            pdf.setFont('Roboto', 'normal');

            // Hàm hỗ trợ tải ảnh thành Base64 (PNG)
            const loadImgAsPngBase64 = async (url: string) => {
                return new Promise<string>((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => resolve('');
                    img.src = url;
                });
            };

            const siteLogoBase64 = await loadImgAsPngBase64(window.location.origin + '/assets/logo_football.png');
            let tourAvatarBase64 = '';
            if (tournament?.thumbnail || tournament?.banner) {
                tourAvatarBase64 = await loadImgAsPngBase64(tournament.thumbnail || tournament.banner);
            }

            // Vẽ Site Logo & Info
            let startX = 14;
            if (siteLogoBase64) {
                pdf.addImage(siteLogoBase64, 'PNG', startX, 10, 12, 12);
                startX += 15;
            }
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139); // Slate-500
            pdf.text("EFOOTBALL.VN - HỆ THỐNG GIẢI ĐẤU CHUYÊN NGHIỆP", startX, 17);
            
            // Đường kẻ ngang phân cách
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.5);
            pdf.line(14, 25, 283, 25);

            // Vẽ Avatar Giải đấu (nếu có) bên góc phải
            if (tourAvatarBase64) {
                // Vẽ khung avatar 26x26 ở góc phải
                pdf.addImage(tourAvatarBase64, 'PNG', 255, 30, 28, 28);
                // Vẽ viền mỏng cho avatar
                pdf.setDrawColor(203, 213, 225);
                pdf.rect(255, 30, 28, 28);
            }

            // Header Giải đấu
            const title = tournament?.title || "Lịch Thi Đấu";
            pdf.setFontSize(22);
            pdf.setTextColor(15, 23, 42);
            // Giới hạn độ dài text nếu có avatar
            const maxTitleWidth = tourAvatarBase64 ? 230 : 270;
            const splitTitle = pdf.splitTextToSize(title.toUpperCase(), maxTitleWidth);
            pdf.text(splitTitle, 14, 38);

            // Tính toán Y tiếp theo dựa vào số dòng của title
            const titleHeight = splitTitle.length * 8;
            let infoY = 38 + titleHeight - 2;

            pdf.setFontSize(10);
            pdf.setTextColor(71, 85, 105);
            
            const formatStr = tournament?.format === 'round_robin' ? 'Vòng tròn' : tournament?.format === 'group_stage' ? 'Vòng bảng' : 'Loại trực tiếp';
            const platformStr = tournament?.platform ? tournament.platform.toUpperCase() : 'ĐA NỀN TẢNG';
            const teamSizeStr = tournament?.teamSize === 2 ? '2v2' : '1v1';
            const onlineStr = tournament?.isOnline ? 'Online' : 'Offline';
            pdf.text(`Thể thức: ${formatStr} | Nền tảng: ${platformStr} | Kích thước: ${teamSizeStr} | Hình thức: ${onlineStr}`, 14, infoY);
            
            const efvStr = tournament?.efvTier ? tournament.efvTier.replace('_', ' ').toUpperCase() : 'Không';
            const feeStr = tournament?.entryFee ? tournament.entryFee.toLocaleString('vi-VN') + ' VNĐ' : 'Miễn phí';
            const durationStr = tournament?.settings?.matchDuration ? `${tournament.settings.matchDuration} phút` : '—';
            const penStr = tournament?.settings?.penalties ? 'Có' : 'Không';
            pdf.text(`Hạng EFV: ${efvStr} | Lệ phí: ${feeStr} | Thời lượng: ${durationStr} | Penalty: ${penStr}`, 14, infoY + 5);

            const locationStr = tournament?.isOnline ? 'Thi đấu Online' : (tournament?.location || 'Chưa cập nhật');
            const contactStr = tournament?.contact?.phone ? ` | CSKH: ${tournament.contact.phone}` : '';
            pdf.text(`Địa điểm: ${locationStr}${contactStr}`, 14, infoY + 10);

            const printDate = new Date().toLocaleString("vi-VN", { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            pdf.text(`Ngày xuất: ${printDate} | Mã giải: ${id.substring(0, 8).toUpperCase()}`, 14, infoY + 15);

            let currentY = Math.max(infoY + 25, tourAvatarBase64 ? 65 : 55);

            // Lặp qua từng vòng đấu
            Object.entries(rounds).forEach(([roundName, roundMatches]: [string, any[]], index) => {
                if (!roundMatches || roundMatches.length === 0) return;

                // Lọc các trận đấu hợp lệ
                const validMatches = roundMatches.filter(m => m.status !== 'walkover' && m.status !== 'bye');
                if (validMatches.length === 0) return;

                const tableData = validMatches.map(m => {
                    const formatTeamInfo = (team: any, pFallback: any) => {
                        if (!team || typeof team === 'string') return "Tự do\n(—)";
                        const tName = team.name || "Tự do";
                        const tEfv = team.efvId ? `[EFV: #${team.efvId}]` : "";
                        const p1 = team.player1 || pFallback?.name || "—";
                        const p2 = team.player2 && team.player2 !== "TBD" ? ` / ${team.player2}` : "";
                        return `${tName} ${tEfv}\n(${p1}${p2})`;
                    };

                    const homeStr = formatTeamInfo(m.homeTeam, m.p1);
                    const awayStr = formatTeamInfo(m.awayTeam, m.p2);
                    
                    const isCompleted = m.status === 'completed' || m.status === 'walkover';
                    const score = isCompleted || m.status === 'live' ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : "vs";
                    const status = m.status === 'completed' ? 'Kết thúc' : m.status === 'live' ? 'LIVE' : 'Chờ thi đấu';
                    
                    let updaterInfo = "—";
                    if (m.updatedBy && m.updatedAt) {
                        const dateStr = new Date(m.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                        updaterInfo = `${m.updatedBy.name || 'Quản lý'}\n(${dateStr})`;
                    }
                    
                    const matchFormat = tournament?.isOnline ? "Online" : "Offline";

                    return [
                        m.matchNumber,
                        homeStr,
                        score,
                        awayStr,
                        matchFormat,
                        status,
                        updaterInfo
                    ];
                });

                // Vẽ title Vòng đấu
                if (currentY > 170) {
                    pdf.addPage();
                    currentY = 20;
                }
                pdf.setFontSize(14);
                pdf.setTextColor(220, 38, 38); // Red-600
                pdf.setFont('Roboto', 'bold');
                pdf.text(`[ ${roundName.toUpperCase()} ]`, 14, currentY);
                
                currentY += 5;

                // AutoTable
                autoTable(pdf, {
                    head: [['#', 'ĐỘI NHÀ (VĐV)', 'TỈ SỐ', 'ĐỘI KHÁCH (VĐV)', 'HÌNH THỨC', 'TRẠNG THÁI', 'NGƯỜI XÁC NHẬN']],
                    body: tableData,
                    startY: currentY,
                    theme: 'grid',
                    styles: { 
                        font: 'Roboto', 
                        fontSize: 9,
                        cellPadding: 3,
                        valign: 'middle',
                    },
                    headStyles: {
                        fillColor: [37, 99, 235], // Blue-600
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }, // ID
                        // 1: Auto (Home)
                        2: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [220, 38, 38] }, // Score
                        // 3: Auto (Away)
                        4: { halign: 'center', cellWidth: 25 }, // Pitch
                        5: { halign: 'center', cellWidth: 25 }, // Status
                        6: { halign: 'center', cellWidth: 40, textColor: [71, 85, 105], fontSize: 8 } // Updater
                    },
                    margin: { top: 20, left: 14, right: 14 }
                });

                // Cập nhật Y cho vòng tiếp theo (cộng thêm margin)
                currentY = (pdf as any).lastAutoTable.finalY + 15;
            });

            // Save PDF
            const safeName = (tournament?.title || 'Giai_Dau').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`Lich_Thi_Dau_${safeName}.pdf`);
            toast.success("Đã tải PDF thành công!");

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Không thể tạo file PDF. Vui lòng thử lại sau.");
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

    const bracketsForSwap = useMemo(() => Object.entries(rounds).map(([name, matches]) => ({ name, matches })), [rounds]);
    const swap = useBracketSwap(id, bracketsForSwap, loadData);

    const displayRoundsObj = useMemo(() => {
        const obj: Record<string, any[]> = {};
        swap.displayRounds.forEach(r => { obj[r.name] = r.matches; });
        return obj;
    }, [swap.displayRounds]);

    const isOwner = user?._id === (tournament?.createdBy?._id || tournament?.createdBy);

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
            payload.force = true;
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
                const rawTeams = res.data?.teams || [];
                const regs = res.data?.registrations || [];
                const teamMap = new Map();
                regs.forEach((r: any) => { if (r.team) teamMap.set(r.team.toString(), r); });

                const teams = rawTeams.map((team: any) => {
                    const r = teamMap.get((team._id || team.id).toString());
                    if (r) {
                        return { ...team, player1Name: r.playerName, player2Name: r.player2Name, player2EfvId: r.player2User?.efvId };
                    }
                    return team;
                });

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

    const handleExportPlayers = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem("efootcup_token");
            const res = await fetch(`/api/tournaments/${id}/export-players`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                toast.error(err?.message || "Không thể tải danh sách");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            // Extract filename from Content-Disposition or fallback
            const cd = res.headers.get("Content-Disposition");
            const fnMatch = cd?.match(/filename="?(.+?)"?$/);
            a.download = fnMatch?.[1] ? decodeURIComponent(fnMatch[1]) : `DS_VDV_${id}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Đã tải danh sách VĐV!");
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Có lỗi xảy ra khi tải");
        } finally {
            setIsExporting(false);
        }
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
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={handleExportPlayers}
                        disabled={isExporting}
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-md h-9 text-sm font-semibold shadow-sm"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileBarChart className="w-4 h-4 mr-2 text-emerald-500" />}
                        Export DS VĐV
                    </Button>
                    {isOwner && (
                        <Button
                            onClick={openGenerateModal}
                            variant="outline"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md h-9 text-sm font-semibold shadow-sm"
                        >
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            Tạo lịch
                        </Button>
                    )}
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
                    {isOwner && (
                        <Button 
                            variant={swap.isSwapMode ? "default" : "outline"} 
                            size="sm" 
                            className={`h-8 px-3 rounded text-xs font-semibold transition-all ${swap.isSwapMode ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-1 shadow-lg shadow-blue-200' : 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100'}`} 
                            onClick={swap.isSwapMode ? swap.exitSwapMode : swap.enterSwapMode}
                        >
                            <Shuffle className="w-3.5 h-3.5 mr-1.5" /> {swap.isSwapMode ? 'Thoát' : 'Sắp xếp'}
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200">
                        <Filter className="w-4 h-4" />
                    </Button>
                    {isOwner && (
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded text-gray-500 border-gray-200" onClick={openGenerateModal}>
                            <Settings2 className="w-4 h-4" />
                        </Button>
                    )}
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
                    
                    /* CSS khi xuất PDF (ẩn các nút không cần thiết) */
                    :global(.exporting-pdf) .action-buttons {
                        display: none !important;
                    }
                    :global(.exporting-pdf) .status-label {
                        border: 1px solid #e2e8f0 !important;
                        background: #f8fafc !important;
                        color: #475569 !important;
                    }
                    :global(.exporting-pdf) .round-header {
                        margin-top: 15px;
                        border-top: 2px solid #3b82f6;
                    }
                `}</style>
                {Object.entries(displayRoundsObj).length === 0 ? (
                    <div className="text-center py-20 bg-gray-50">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-semibold">Chưa có lịch đấu nào</h3>
                        <p className="text-gray-500 text-sm">Vui lòng bấm Tải lịch thi đấu để khởi tạo.</p>
                    </div>
                ) : (
                    Object.entries(displayRoundsObj).map(([roundName, roundMatches]) => {
                        const visibleMatches = roundMatches.filter((m: any) => m.status !== 'walkover' && m.status !== 'bye').filter(filterMatch);
                        if (visibleMatches.length === 0) return null;

                        return (
                            <div key={roundName}>
                                {/* Round Header */}
                                <div className="round-header bg-[#D9EAF7] flex items-center justify-center py-2 px-4 relative border-b border-white">
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
                                        const isBye = m.status === 'bye';
                                        const isCompleted = m.status === 'completed' || isWalkover;
                                        const isHomeWin = isCompleted && (m.winner === (m.homeTeam?._id || m.homeTeam?.id) || (m.homeScore || 0) > (m.awayScore || 0));
                                        const isAwayWin = isCompleted && (m.winner === (m.awayTeam?._id || m.awayTeam?.id) || (m.awayScore || 0) > (m.homeScore || 0));

                                        const hTeamId = m.homeTeam?._id || m.homeTeam?.id || '';
                                        const aTeamId = m.awayTeam?._id || m.awayTeam?.id || '';

                                        const isSwappable = swap.isSwapMode && !isCompleted && !isWalkover && !isBye;

                                        const homeContainerClasses = `border rounded px-1.5 py-0.5 shadow-sm text-[11px] font-semibold truncate w-fit max-w-full flex items-center gap-1 transition-all ${isSwappable && hTeamId ? 'cursor-pointer' : 'border-gray-200 bg-white text-gray-700'} ${isSwappable && hTeamId === swap.selectedTeamId ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500 ring-inset text-blue-900 shadow-md transform scale-[1.02]' : ''} ${isSwappable && swap.swappedTeamIds?.has(hTeamId) && hTeamId !== swap.selectedTeamId ? 'bg-amber-50 border-amber-300 text-amber-900' : ''} ${isSwappable && hTeamId && hTeamId !== swap.selectedTeamId && !swap.swappedTeamIds?.has(hTeamId) ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 text-blue-800' : ''}`;

                                        const awayContainerClasses = `border rounded px-1.5 py-0.5 shadow-sm text-[11px] font-semibold truncate w-fit max-w-full flex items-center gap-1 transition-all ${isSwappable && aTeamId ? 'cursor-pointer' : 'border-gray-200 bg-white text-gray-700'} ${isSwappable && aTeamId === swap.selectedTeamId ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500 ring-inset text-blue-900 shadow-md transform scale-[1.02]' : ''} ${isSwappable && swap.swappedTeamIds?.has(aTeamId) && aTeamId !== swap.selectedTeamId ? 'bg-amber-50 border-amber-300 text-amber-900' : ''} ${isSwappable && aTeamId && aTeamId !== swap.selectedTeamId && !swap.swappedTeamIds?.has(aTeamId) ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 text-blue-800' : ''}`;

                                        return (
                                            <div key={m._id} className={swap.isSwapMode && (isCompleted || isWalkover || isBye) ? 'opacity-40 grayscale pointer-events-none' : ''}>
                                                {/* Desktop Row */}
                                                <div className={`hidden lg:grid grid-cols-12 gap-4 items-center py-2 px-4 transition-colors ${swap.isSwapMode ? 'hover:bg-transparent' : 'hover:bg-gray-50'}`}>
                                                    <div className="col-span-1 text-gray-900 font-bold text-sm">{m.matchNumber}</div>
                                                    <div className="col-span-2 flex flex-col gap-1.5">
                                                        <div 
                                                            className={homeContainerClasses}
                                                            onClick={isSwappable && hTeamId ? () => swap.handleTeamSelect(hTeamId, m.homeTeam?.player1 || homeName) : undefined}
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                            {m.homeTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.homeTeam.efvId}</span>}
                                                            {m.homeTeam?.seed != null && m.homeTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0" title={`Hạt giống số ${m.homeTeam.seed}`}>Seed {m.homeTeam.seed}</span>}
                                                            <span className="truncate">{homeName}</span>
                                                        </div>
                                                        <div 
                                                            className={awayContainerClasses}
                                                            onClick={isSwappable && aTeamId ? () => swap.handleTeamSelect(aTeamId, m.awayTeam?.player1 || awayName) : undefined}
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                            {m.awayTeam?.efvId != null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded flex-shrink-0">#{m.awayTeam.efvId}</span>}
                                                            {m.awayTeam?.seed != null && m.awayTeam.seed > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-px rounded flex-shrink-0" title={`Hạt giống số ${m.awayTeam.seed}`}>Seed {m.awayTeam.seed}</span>}
                                                            <span className="truncate">{awayName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 flex flex-col gap-1.5 text-[13px] font-medium">
                                                        <div className={`${isCompleted ? (isHomeWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>{p1Name}{p1Sub}</div>
                                                        <div className={`${isCompleted ? (isAwayWin ? "font-bold text-gray-900" : "text-gray-400 line-through") : "text-purple-600"}`}>{p2Name}{p2Sub}</div>
                                                        {/* Updater Info */}
                                                        {m.updatedBy && m.updatedAt && (
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5" title={`${m.updatedBy.name || ''}`}>
                                                                <UserCheck className="w-3 h-3 text-teal-400 flex-shrink-0" />
                                                                <span className="font-semibold text-teal-600 truncate max-w-[120px]">{m.updatedBy.name || 'Quản lý'}</span>
                                                                <span className="text-gray-300">·</span>
                                                                <span>{new Date(m.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2 text-center text-sm font-bold text-gray-900">
                                                        {isCompleted || m.status === "live" ? (
                                                            isWalkover ? <span className="text-gray-400">Tự động đi tiếp</span> : <span>{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </div>
                                                    <div className="col-span-1 flex justify-center action-buttons">
                                                        <Button variant="outline" size="sm" className="h-6 text-[10px] rounded px-2 border-gray-200 text-gray-400 font-normal">Chọn sân</Button>
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-between pr-2">
                                                        <div className={`status-label px-2 py-0.5 rounded text-[11px] font-semibold ${isCompleted ? "bg-emerald-50 text-emerald-600" : m.status === "live" ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50/50 border border-blue-100 text-blue-400"}`}>
                                                            {isWalkover ? "Đi tiếp" : isCompleted ? "Kết thúc" : m.status === "live" ? "LIVE" : "Chờ thi đấu"}
                                                        </div>
                                                        <div className="flex gap-1.5 items-center text-gray-400 action-buttons">
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
                                                    <div className="flex items-center justify-between py-1.5 mb-1">
                                                        <div 
                                                            className={`flex items-center gap-2 min-w-0 flex-1 px-1.5 py-1 -ml-1.5 rounded transition-all ${isHomeWin ? 'font-bold' : ''} ${isSwappable && hTeamId ? 'cursor-pointer' : ''} ${isSwappable && hTeamId === swap.selectedTeamId ? 'bg-blue-100 ring-2 ring-blue-500 text-blue-900 shadow-sm' : ''} ${isSwappable && swap.swappedTeamIds?.has(hTeamId) && hTeamId !== swap.selectedTeamId ? 'bg-amber-50 ring-1 ring-amber-300 text-amber-900' : ''} ${isSwappable && hTeamId && hTeamId !== swap.selectedTeamId && !swap.swappedTeamIds?.has(hTeamId) ? 'hover:bg-blue-50 ring-1 ring-blue-200' : ''}`}
                                                            onClick={isSwappable && hTeamId ? () => swap.handleTeamSelect(hTeamId, m.homeTeam?.player1 || homeName) : undefined}
                                                        >
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
                                                    <div className="flex items-center justify-between py-1.5">
                                                        <div 
                                                            className={`flex items-center gap-2 min-w-0 flex-1 px-1.5 py-1 -ml-1.5 rounded transition-all ${isAwayWin ? 'font-bold' : ''} ${isSwappable && aTeamId ? 'cursor-pointer' : ''} ${isSwappable && aTeamId === swap.selectedTeamId ? 'bg-blue-100 ring-2 ring-blue-500 text-blue-900 shadow-sm' : ''} ${isSwappable && swap.swappedTeamIds?.has(aTeamId) && aTeamId !== swap.selectedTeamId ? 'bg-amber-50 ring-1 ring-amber-300 text-amber-900' : ''} ${isSwappable && aTeamId && aTeamId !== swap.selectedTeamId && !swap.swappedTeamIds?.has(aTeamId) ? 'hover:bg-blue-50 ring-1 ring-blue-200' : ''}`}
                                                            onClick={isSwappable && aTeamId ? () => swap.handleTeamSelect(aTeamId, m.awayTeam?.player1 || awayName) : undefined}
                                                        >
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
                                                    {/* Mobile Updater Info */}
                                                    {m.updatedBy && m.updatedAt && (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1.5 pb-1">
                                                            <UserCheck className="w-3 h-3 text-teal-400 flex-shrink-0" />
                                                            <span className="font-semibold text-teal-600 truncate max-w-[120px]">{m.updatedBy.name || 'Quản lý'}</span>
                                                            <span className="text-gray-300">·</span>
                                                            <span>{new Date(m.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                        </div>
                                                    )}
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
                        {viewingSubmissions?.resultSubmissions?.length > 0 ? (() => {
                            const currentVersion = viewingSubmissions.matchVersion || 1;
                            const currentSubs = viewingSubmissions.resultSubmissions.filter((s: any) => (s.version || 1) === currentVersion);
                            const historySubs = viewingSubmissions.resultSubmissions.filter((s: any) => (s.version || 1) !== currentVersion);
                            
                            const renderSubmission = (sub: any, idx: number, isHistory: boolean = false) => {
                                const isFromHome = sub.team?.toString() === (viewingSubmissions.homeTeam?._id || viewingSubmissions.homeTeam)?.toString();
                                const submitterTeam = isFromHome ? viewingSubmissions.homeTeam : viewingSubmissions.awayTeam;
                                const submitterTeamName = submitterTeam?.name || submitterTeam?.shortName || "";

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
                                                {viewingSubmissions.homeTeam?.name && <p className="text-[9px] text-gray-400">{viewingSubmissions.homeTeam.name}</p>}
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
                                                {viewingSubmissions.awayTeam?.name && <p className="text-[9px] text-gray-400">{viewingSubmissions.awayTeam.name}</p>}
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
                            };

                            return (
                                <>
                                    {/* Current Version */}
                                    {currentVersion > 1 && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Lần {currentVersion}</span>
                                            <span className="text-[10px] text-gray-400">Kết quả mới nhất</span>
                                        </div>
                                    )}
                                    {currentSubs.length > 0 ? (
                                        currentSubs.map((sub: any, idx: number) => renderSubmission(sub, idx))
                                    ) : (
                                        <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm">VĐV chưa gửi lại kết quả cho lần này.</p>
                                        </div>
                                    )}

                                    {/* Historical Submissions */}
                                    {historySubs.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <History className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-500">Lịch sử gửi trước đó</span>
                                                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{historySubs.length}</span>
                                            </div>
                                            <div className="space-y-3 opacity-70">
                                                {historySubs.map((sub: any, idx: number) => renderSubmission(sub, idx, true))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })() : (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">Chưa có kết quả nào được gửi.</p>
                            </div>
                        )}
                    </div>
                    {/* Official Result + Updater Info */}
                    {viewingSubmissions?.status === 'completed' && (
                        <div className="mx-3 sm:mx-4 mb-3 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-800">Kết quả chính thức</span>
                            </div>
                            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-2">
                                <div className="text-center flex-1 min-w-0">
                                    <div className="mb-1">
                                        <p className="text-xs font-bold text-gray-800 truncate">
                                            {viewingSubmissions.homeTeam?.player1 || 'Đội nhà'}
                                        </p>
                                        {viewingSubmissions.homeTeam?.player2 && viewingSubmissions.homeTeam.player2 !== "TBD" && (
                                            <p className="text-[10px] font-semibold text-gray-500 truncate">/ {viewingSubmissions.homeTeam.player2}</p>
                                        )}
                                        {viewingSubmissions.homeTeam?.name && (
                                            <p className="text-[9px] text-gray-400 mt-0.5 truncate">{viewingSubmissions.homeTeam.name}</p>
                                        )}
                                    </div>
                                    <div className="text-2xl font-black text-gray-900">{viewingSubmissions.homeScore ?? '-'}</div>
                                </div>
                                <span className="text-gray-300 text-lg font-light mt-3">—</span>
                                <div className="text-center flex-1 min-w-0">
                                    <div className="mb-1">
                                        <p className="text-xs font-bold text-gray-800 truncate">
                                            {viewingSubmissions.awayTeam?.player1 || 'Đội khách'}
                                        </p>
                                        {viewingSubmissions.awayTeam?.player2 && viewingSubmissions.awayTeam.player2 !== "TBD" && (
                                            <p className="text-[10px] font-semibold text-gray-500 truncate">/ {viewingSubmissions.awayTeam.player2}</p>
                                        )}
                                        {viewingSubmissions.awayTeam?.name && (
                                            <p className="text-[9px] text-gray-400 mt-0.5 truncate">{viewingSubmissions.awayTeam.name}</p>
                                        )}
                                    </div>
                                    <div className="text-2xl font-black text-gray-900">{viewingSubmissions.awayScore ?? '-'}</div>
                                </div>
                            </div>
                            {viewingSubmissions.updatedBy && (
                                <div className="flex items-center justify-center gap-1.5 text-[11px] text-teal-700 bg-white/60 rounded-lg py-1.5 px-3">
                                    <UserCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                                    <span>Cập nhật bởi</span>
                                    <span className="font-bold">{viewingSubmissions.updatedBy.name || 'Quản lý'}</span>
                                    {viewingSubmissions.updatedAt && (
                                        <>
                                            <span className="text-teal-400">·</span>
                                            <span className="text-teal-600">{new Date(viewingSubmissions.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [isAuditExpanded, setIsAuditExpanded] = useState(false);

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

    // Fetch audit logs for this match
    useEffect(() => {
        const fetchAuditLogs = async () => {
            setIsLoadingAudit(true);
            try {
                const matchId = match._id || match.id;
                const res = await tournamentAPI.getMatchAuditLog(tournament._id, { matchId, limit: "10" });
                if (res.success) {
                    setAuditLogs(res.data?.logs || []);
                }
            } catch (err) {
                console.error("Failed to load audit logs:", err);
            } finally {
                setIsLoadingAudit(false);
            }
        };
        fetchAuditLogs();
    }, [match._id, match.id, tournament._id]);

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
                                                    <span className="text-[13px] font-semibold text-gray-900 leading-tight">{match.homeTeam?.player1 || match.p1?.name || "Tự do"}{match.homeTeam?.player2 && match.homeTeam.player2 !== "TBD" ? ` / ${match.homeTeam.player2}` : ""}</span>
                                                </div>
                                                {match.homeTeam?.name && <div className="text-[10px] text-gray-400 mt-0.5">{match.homeTeam.name}</div>}
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
                                                    <span className="text-[13px] font-semibold text-gray-900 leading-tight">{match.awayTeam?.player1 || match.p2?.name || "Tự do"}{match.awayTeam?.player2 && match.awayTeam.player2 !== "TBD" ? ` / ${match.awayTeam.player2}` : ""}</span>
                                                </div>
                                                {match.awayTeam?.name && <div className="text-[10px] text-gray-400 mt-0.5">{match.awayTeam.name}</div>}
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
                                    {match.homeTeam?.name && <span className="text-[10px] text-gray-400">{match.homeTeam.name}</span>}
                                </button>
                                <button
                                    onClick={() => setSelectedWinner('away')}
                                    className={`flex-1 py-3 text-sm flex flex-col items-center justify-center gap-1 ${selectedWinner === 'away' ? 'bg-orange-50 font-bold text-gray-900' : 'text-gray-500 font-medium hover:bg-orange-50/50'}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                        <span>{match.awayTeam?.player1 || match.p2?.name || "Tự do"}</span>
                                    </div>
                                    {match.awayTeam?.name && <span className="text-[10px] text-gray-400">{match.awayTeam.name}</span>}
                                </button>
                            </div>
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
                                    const submitterTeamName = submitterTeam?.name || "";
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
                                                <span className="text-xs font-bold text-gray-700">{match.homeTeam?.player1 || match.homeTeam?.name || "Đội nhà"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xl font-black px-3 py-1 rounded-lg ${sub.homeScore > sub.awayScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.homeScore}</span>
                                                <span className="text-gray-300 font-light">—</span>
                                                <span className={`text-xl font-black px-3 py-1 rounded-lg ${sub.awayScore > sub.homeScore ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>{sub.awayScore}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {match.awayTeam?.efvId != null && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-px rounded">#{match.awayTeam.efvId}</span>}
                                                <span className="text-xs font-bold text-gray-700">{match.awayTeam?.player1 || match.awayTeam?.name || "Đội khách"}</span>
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

                    {/* =============== AUDIT LOG TIMELINE =============== */}
                    <div className="mt-8">
                        <button
                            onClick={() => setIsAuditExpanded(!isAuditExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 hover:border-gray-300 transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-sm">
                                    <History className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-sm font-bold text-gray-800">Lịch sử thay đổi</span>
                                {auditLogs.length > 0 && (
                                    <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {auditLogs.length}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isAuditExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {isAuditExpanded && (
                            <div className="mt-3 rounded-xl border border-gray-100 bg-white overflow-hidden">
                                {isLoadingAudit ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                                        <span className="ml-2 text-sm text-gray-400">Đang tải...</span>
                                    </div>
                                ) : auditLogs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                            <History className="w-5 h-5 text-gray-300" />
                                        </div>
                                        <p className="text-xs text-gray-400">Chưa có lịch sử thay đổi</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Vertical timeline line */}
                                        <div className="absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-teal-200 via-gray-200 to-transparent" />

                                        <div className="divide-y divide-gray-50">
                                            {auditLogs.map((log: any, idx: number) => {
                                                const actionConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
                                                    update_score: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: 'Tỉ số' },
                                                    change_status: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: 'Trạng thái' },
                                                    reset_match: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: 'Reset' },
                                                    update_schedule: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: 'Lịch' },
                                                    update_events: { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', label: 'Sự kiện' },
                                                    update_notes: { color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', label: 'Ghi chú' },
                                                    update_penalty: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: 'Penalty' },
                                                    create_match: { color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', label: 'Tạo mới' },
                                                };
                                                const config = actionConfig[log.action] || actionConfig.update_score;
                                                const userName = log.user?.name || log.user?.email || 'Hệ thống';
                                                const userInitial = userName.charAt(0).toUpperCase();
                                                const timeAgo = getTimeAgo(new Date(log.createdAt));

                                                return (
                                                    <div key={log._id || idx} className="flex gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                                        {/* Timeline dot */}
                                                        <div className="flex-shrink-0 relative z-10">
                                                            <div className={`w-8 h-8 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center text-[10px] font-bold ${config.color} shadow-sm`}>
                                                                {userInitial}
                                                            </div>
                                                        </div>
                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{userName}</span>
                                                                <span className={`text-[9px] font-bold ${config.color} ${config.bgColor} border ${config.borderColor} px-1.5 py-px rounded`}>
                                                                    {config.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{log.summary}</p>
                                                            <span className="text-[10px] text-gray-400 mt-0.5 block" title={new Date(log.createdAt).toLocaleString('vi-VN')}>{timeAgo}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


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
