"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy, Plus, Search, Eye, EyeOff, Users, Flame, Clock, CheckCircle2,
    Loader2, Trash2, Edit, ExternalLink, CalendarPlus, ArrowRight,
    FileX, ChevronLeft, ChevronRight, Gamepad2, MapPin, CreditCard,
    Calendar, RefreshCw, BarChart3, Wifi, ArrowUpDown, KeyRound, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentAPI } from "@/lib/api";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 12;

const statusConfig: Record<string, { label: string; bg: string; dot: string; icon: typeof Flame }> = {
    draft: { label: "Nháp", bg: "bg-gray-100 text-gray-600", dot: "bg-gray-400", icon: Clock },
    registration: { label: "Mở đăng ký", bg: "bg-blue-100 text-blue-700", dot: "bg-blue-500", icon: Users },
    ongoing: { label: "Đang diễn ra", bg: "bg-red-100 text-red-700", dot: "bg-red-500", icon: Flame },
    completed: { label: "Đã kết thúc", bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", bg: "bg-gray-100 text-gray-500", dot: "bg-gray-400", icon: FileX },
};

const formatLabels: Record<string, string> = {
    single_elimination: "Loại trực tiếp",
    double_elimination: "Loại kép",
    round_robin: "Vòng tròn",
    group_stage: "Vòng bảng",
    swiss: "Swiss",
};

export default function ManagerGiaiDauPage() {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<string>("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const { confirm } = useConfirmDialog();

    // Join modal state
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState([""  , "", "", "", "", ""]);
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState("");

    useEffect(() => {
        if (user) loadTournaments();
    }, [user]);

    const loadTournaments = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                createdBy: user?._id || "",
                limit: "100",
            };
            const res = await tournamentAPI.getAll(params);
            if (res.success) {
                setTournaments(res.data.tournaments || []);
            }
        } catch (error) {
            console.error("Failed to load tournaments:", error);
            toast.error("Không thể tải danh sách giải đấu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        const ok = await confirm({
            title: "Xóa giải đấu?",
            description: `Bạn có chắc muốn xóa "${title}"? Hành động này không thể hoàn tác.`,
            variant: "danger",
            confirmText: "Xóa giải đấu",
        });
        if (!ok) return;
        try {
            const res = await tournamentAPI.delete(id);
            if (res.success) {
                setTournaments((prev) => prev.filter((t) => t._id !== id));
                toast.success("Đã xóa giải đấu");
            }
        } catch (error) {
            toast.error("Không thể xóa giải đấu");
        }
    };

    const handleJoinByCode = async () => {
        const code = joinCode.join("").trim().toUpperCase();
        if (code.length < 6) {
            setJoinError("Vui lòng nhập đủ 6 ký tự");
            return;
        }
        setIsJoining(true);
        setJoinError("");
        try {
            const res = await tournamentAPI.joinByCode(code);
            if (res.success) {
                toast.success(res.message || "Đã tham gia cộng tác!");
                setShowJoinModal(false);
                setJoinCode(["", "", "", "", "", ""]);
                loadTournaments();
            } else {
                setJoinError(res.message || "Mã không hợp lệ");
            }
        } catch {
            setJoinError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsJoining(false);
        }
    };

    const handleCodeInput = (index: number, value: string) => {
        if (value.length > 1) value = value.charAt(value.length - 1);
        const newCode = [...joinCode];
        newCode[index] = value.toUpperCase();
        setJoinCode(newCode);
        setJoinError("");
        // Auto-focus next input
        if (value && index < 5) {
            const next = document.getElementById(`join-code-${index + 1}`);
            next?.focus();
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !joinCode[index] && index > 0) {
            const prev = document.getElementById(`join-code-${index - 1}`);
            prev?.focus();
        }
        if (e.key === "Enter") {
            handleJoinByCode();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        const newCode = [...joinCode];
        for (let i = 0; i < Math.min(text.length, 6); i++) {
            newCode[i] = text[i];
        }
        setJoinCode(newCode);
        setJoinError("");
        // Focus last filled or next empty
        const focusIdx = Math.min(text.length, 5);
        setTimeout(() => document.getElementById(`join-code-${focusIdx}`)?.focus(), 50);
    };

    // Filtering, sorting, pagination
    const processed = useMemo(() => {
        let result = [...tournaments];

        // Status filter
        if (statusFilter !== "all") {
            result = result.filter(t => t.status === statusFilter);
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                t.title?.toLowerCase().includes(q) ||
                t.efvTier?.toLowerCase().includes(q) ||
                t.mode?.toLowerCase().includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            let valA: any, valB: any;
            if (sortField === "createdAt") {
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
            } else if (sortField === "title") {
                valA = (a.title || "").toLowerCase();
                valB = (b.title || "").toLowerCase();
            } else if (sortField === "currentTeams") {
                valA = a.currentTeams || 0;
                valB = b.currentTeams || 0;
            } else {
                valA = a[sortField];
                valB = b[sortField];
            }
            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [tournaments, statusFilter, search, sortField, sortDir]);

    // Pagination
    const totalPages = Math.ceil(processed.length / ITEMS_PER_PAGE);
    const paginated = processed.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: tournaments.length,
        draft: tournaments.filter(t => t.status === "draft").length,
        registration: tournaments.filter(t => t.status === "registration").length,
        ongoing: tournaments.filter(t => t.status === "ongoing").length,
        completed: tournaments.filter(t => t.status === "completed").length,
    }), [tournaments]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Đang tải giải đấu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                        Giải đấu của tôi
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 ml-4">{stats.total} giải đấu</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={() => { setShowJoinModal(true); setJoinCode(["", "", "", "", "", ""]); setJoinError(""); }}
                        variant="outline"
                        className="h-10 px-4 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-bold group"
                    >
                        <KeyRound className="w-4 h-4 mr-1.5" />
                        Nhập mã cộng tác
                    </Button>
                    <Button
                        variant="outline"
                        onClick={loadTournaments}
                        className="h-9 w-9 p-0 rounded-xl border-gray-200 text-gray-500 hover:text-blue-500"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Link href="/manager/tao-giai-dau">
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 rounded-xl h-10 px-5 shadow-md shadow-blue-500/20 font-medium group">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Tạo giải đấu
                            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Tổng", value: stats.total, icon: Trophy, gradient: "from-blue-500 to-indigo-600", text: "text-blue-600" },
                    { label: "Mở đăng ký", value: stats.registration, icon: Users, gradient: "from-sky-400 to-blue-500", text: "text-sky-600" },
                    { label: "Đang diễn ra", value: stats.ongoing, icon: Flame, gradient: "from-red-500 to-rose-600", text: "text-red-500" },
                    { label: "Đã kết thúc", value: stats.completed, icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-600", text: "text-emerald-600" },
                ].map((s) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-md transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                                    <s.icon className="w-4 h-4 text-white" />
                                </div>
                                <div className={`text-2xl font-extrabold ${s.text} tracking-tight tabular-nums`}>{s.value}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm giải đấu..."
                        className="pl-9 h-10 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-max">
                            <TabsList className="h-10 rounded-xl bg-gray-100/80 p-1 gap-0.5">
                                <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                                    Tất cả
                                </TabsTrigger>
                                <TabsTrigger value="draft" className="rounded-lg text-xs font-semibold px-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Nháp
                                </TabsTrigger>
                                <TabsTrigger value="registration" className="rounded-lg text-xs font-semibold px-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                                    Đăng ký
                                </TabsTrigger>
                                <TabsTrigger value="ongoing" className="rounded-lg text-xs font-semibold px-2.5 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm">
                                    Đang diễn ra
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="rounded-lg text-xs font-semibold px-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                                    Kết thúc
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => handleSort("createdAt")}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors whitespace-nowrap flex-shrink-0 ${sortField === "createdAt" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                        >
                            <Calendar className="w-3 h-3" />
                            Ngày tạo
                            <ArrowUpDown className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => handleSort("title")}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors whitespace-nowrap flex-shrink-0 ${sortField === "title" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                        >
                            Tên
                            <ArrowUpDown className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => handleSort("currentTeams")}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors whitespace-nowrap flex-shrink-0 ${sortField === "currentTeams" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                        >
                            <Users className="w-3 h-3" />
                            VĐV
                            <ArrowUpDown className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    Hiển thị <span className="font-bold text-gray-600">{paginated.length}</span> / <span className="font-bold text-gray-600">{processed.length}</span> giải đấu
                </p>
            </div>

            {/* Tournament List */}
            {processed.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 bg-white rounded-2xl border border-gray-100"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {search ? "Không tìm thấy giải đấu" : "Chưa có giải đấu nào"}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                        {search ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu tạo giải đấu đầu tiên của bạn"}
                    </p>
                    {!search && (
                        <Link href="/manager/tao-giai-dau">
                            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl h-10 px-6 font-medium group shadow-md shadow-blue-500/20">
                                <CalendarPlus className="w-4 h-4 mr-2" />
                                Tạo giải đấu
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        </Link>
                    )}
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginated.map((t, i) => {
                        const sty = statusConfig[t.status] || statusConfig.draft;
                        const startDate = t.schedule?.tournamentStart
                            ? new Date(t.schedule.tournamentStart).toLocaleDateString("vi-VN")
                            : null;
                        const progress = t.maxTeams ? Math.min(100, ((t.currentTeams || 0) / t.maxTeams) * 100) : 0;
                        const isOwned = t.createdBy?._id === user?._id || t.createdBy === user?._id;
                        const isShared = !isOwned;

                        return (
                            <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 group flex flex-col"
                            >
                                {/* Status Header Strip */}
                                <div className={`px-4 py-2 flex items-center justify-between ${sty.bg}`}>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold">
                                        <span className={`w-1.5 h-1.5 rounded-full ${sty.dot} ${t.status === "ongoing" ? "animate-pulse" : ""}`} />
                                        {sty.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {isShared && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                                <Users className="w-2.5 h-2.5" />
                                                Cộng tác
                                            </span>
                                        )}
                                        {t.isPublic === false && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                                                <EyeOff className="w-2.5 h-2.5" />
                                                Đã ẩn
                                            </span>
                                        )}
                                        <Link href={isShared ? `/manager/giai-dau/${t._id}/lich` : `/manager/giai-dau/${t._id}`}>
                                            <button className="w-6 h-6 rounded-md bg-white/60 hover:bg-white flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors">
                                                <Edit className="w-3 h-3" />
                                            </button>
                                        </Link>
                                        <Link href={`/giai-dau/${t._id}`} target="_blank">
                                            <button className="w-6 h-6 rounded-md bg-white/60 hover:bg-white flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors">
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </Link>
                                        {isOwned && (
                                            <button
                                                onClick={() => handleDelete(t._id, t.title)}
                                                className="w-6 h-6 rounded-md bg-white/60 hover:bg-white flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Title */}
                                    <Link
                                        href={isShared ? `/manager/giai-dau/${t._id}/lich` : `/manager/giai-dau/${t._id}`}
                                        className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
                                    >
                                        {t.title}
                                    </Link>

                                    {/* Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                        <Badge variant="outline" className="text-[9px] font-medium bg-slate-50 text-gray-500 border-gray-200 rounded px-1.5 py-0">
                                            {formatLabels[t.format] || t.format}
                                        </Badge>
                                        {t.efvTier && (
                                            <Badge variant="outline" className="text-[9px] font-bold bg-purple-50 text-purple-600 border-purple-100 rounded px-1.5 py-0">
                                                {t.efvTier === "efv_250" ? "EFV 250" : t.efvTier === "efv_500" ? "EFV 500" : "EFV 1000"}
                                            </Badge>
                                        )}
                                        {t.mode && (
                                            <Badge variant="outline" className="text-[9px] font-medium bg-gray-50 text-gray-500 border-gray-200 rounded px-1.5 py-0">
                                                {t.mode === "mobile" ? "📱" : "🖥"} {t.mode === "mobile" ? "Mobile" : "PC"}
                                            </Badge>
                                        )}
                                        {t.prize?.total && t.prize.total !== "0 VNĐ" && t.prize.total !== "0" && (
                                            <Badge variant="outline" className="text-[9px] font-bold bg-amber-50 text-amber-600 border-amber-100 rounded px-1.5 py-0">
                                                🏆 {t.prize.total}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-50">
                                        <div className="text-center">
                                            <div className="text-lg font-extrabold text-gray-900 tabular-nums">{t.currentTeams || 0}</div>
                                            <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">/ {t.maxTeams || 0} đội</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-extrabold text-gray-900 tabular-nums">{t.views || 0}</div>
                                            <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">views</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-extrabold text-gray-900 tabular-nums">{t.teamSize || 1}v{t.teamSize || 1}</div>
                                            <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">đấu</div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {t.maxTeams > 0 && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] text-gray-400">Đăng ký</span>
                                                <span className="text-[10px] font-bold text-gray-600">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${progress >= 90 ? "bg-red-400" : progress >= 60 ? "bg-amber-400" : "bg-blue-400"}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Meta */}
                                    <div className="flex items-center justify-between mt-auto pt-3 text-[10px] text-gray-400">
                                        <div className="flex items-center gap-2">
                                            {startDate && (
                                                <span className="flex items-center gap-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {startDate}
                                                </span>
                                            )}
                                            {t.entryFee > 0 && (
                                                <span className="flex items-center gap-0.5 text-emerald-600 font-bold">
                                                    <CreditCard className="w-3 h-3" />
                                                    {t.entryFee.toLocaleString("vi-VN")} ₫
                                                </span>
                                            )}
                                        </div>
                                        <span className="flex items-center gap-0.5">
                                            <Eye className="w-3 h-3" /> {t.views || 0}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 col-span-full">
                            <p className="text-xs text-gray-400 font-medium">
                                Trang <span className="text-gray-700 font-bold">{currentPage}</span> / {totalPages}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0 rounded-lg border-gray-200 disabled:opacity-40"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((page, idx, arr) => (
                                        <span key={page} className="flex items-center">
                                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                <span className="text-gray-300 text-xs px-1">…</span>
                                            )}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className={`h-8 w-8 p-0 rounded-lg text-xs ${currentPage === page
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                                    : "border-gray-200"
                                                    }`}
                                            >
                                                {page}
                                            </Button>
                                        </span>
                                    ))
                                }

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 p-0 rounded-lg border-gray-200 disabled:opacity-40"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Join Code Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowJoinModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-center relative">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                                <KeyRound className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Nhập mã cộng tác</h2>
                            <p className="text-indigo-100 text-xs mt-1">Nhập mã 6 ký tự để tham gia quản lý giải đấu</p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Code Input */}
                            <div className="flex items-center justify-center gap-2">
                                {joinCode.map((char, i) => (
                                    <input
                                        key={i}
                                        id={`join-code-${i}`}
                                        type="text"
                                        maxLength={1}
                                        value={char}
                                        onChange={(e) => handleCodeInput(i, e.target.value)}
                                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                        onPaste={i === 0 ? handleCodePaste : undefined}
                                        className={`w-12 h-14 text-center text-xl font-extrabold rounded-xl border-2 outline-none transition-all uppercase
                                            ${joinError
                                                ? "border-red-300 text-red-600 bg-red-50"
                                                : char
                                                    ? "border-indigo-300 text-indigo-700 bg-indigo-50"
                                                    : "border-gray-200 text-gray-700 bg-gray-50 focus:border-indigo-400 focus:bg-indigo-50/50"
                                            }`}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            {/* Error message */}
                            {joinError && (
                                <p className="text-center text-xs text-red-500 font-medium">{joinError}</p>
                            )}

                            {/* Submit Button */}
                            <Button
                                onClick={handleJoinByCode}
                                disabled={isJoining || joinCode.join("").length < 6}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                            >
                                {isJoining ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Users className="w-4 h-4 mr-2" />
                                )}
                                Tham gia cộng tác
                            </Button>

                            {/* Info */}
                            <p className="text-center text-[11px] text-gray-400">
                                Liên hệ chủ giải đấu để nhận mã mời
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
