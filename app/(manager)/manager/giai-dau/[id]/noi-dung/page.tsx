"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search, Info, Calendar, UserCheck, MoreHorizontal, Loader2,
    Users, CheckCircle2, CreditCard, Download, ChevronLeft, ChevronRight,
    Trophy, Gamepad2, Wifi, Clock, Shield, Hash, User, Phone, Mail,
    Eye, ArrowUpDown, RefreshCw, FileSpreadsheet
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 20;

const formatLabels: Record<string, string> = {
    single_elimination: "Loại trực tiếp",
    double_elimination: "Loại kép",
    round_robin: "Vòng tròn",
    group_stage: "Vòng bảng + Loại trực tiếp",
    swiss: "Swiss System",
};

const paymentLabels: Record<string, { label: string; color: string }> = {
    paid: { label: "Đã TT", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    pending_verification: { label: "Chờ XN", color: "bg-amber-50 text-amber-600 border-amber-100" },
    unpaid: { label: "Chưa TT", color: "bg-red-50 text-red-500 border-red-100" },
    refunded: { label: "Hoàn tiền", color: "bg-blue-50 text-blue-600 border-blue-100" },
};

export default function NoiDungThiDauPage() {
    const params = useParams();
    const id = params.id as string;

    const [tournament, setTournament] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<string>("");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Attendance tracking (local state)
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tRes, rRes] = await Promise.all([
                tournamentAPI.getById(id),
                tournamentAPI.getRegistrations(id),
            ]);

            if (tRes.success) setTournament(tRes.data?.tournament || tRes.data);

            if (rRes.success) {
                let regs = rRes.data?.registrations || rRes.data || [];
                regs = regs.filter((r: any) => r.status === "approved" || r.status === "confirmed");
                setRegistrations(regs);
            }
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    };

    // ----- Attendance -----
    const handleCheckAllAttendance = () => {
        const newAttendance: Record<string, boolean> = {};
        registrations.forEach(r => { newAttendance[r._id] = true; });
        setAttendance(newAttendance);
        toast.success("Đã điểm danh tất cả");
    };

    const handleUncheckAllAttendance = () => {
        setAttendance({});
        toast.info("Đã bỏ điểm danh tất cả");
    };

    const toggleAttendance = (rId: string) => {
        setAttendance(prev => ({ ...prev, [rId]: !prev[rId] }));
    };

    // ----- Sorting -----
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    // ----- Filtering & Sorting -----
    const filtered = useMemo(() => {
        let result = [...registrations];

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(r =>
                r.teamName?.toLowerCase().includes(q) ||
                r.teamShortName?.toLowerCase().includes(q) ||
                r.playerName?.toLowerCase().includes(q) ||
                r.gamerId?.toLowerCase().includes(q) ||
                r.phone?.includes(q) ||
                r.email?.toLowerCase().includes(q) ||
                r.nickname?.toLowerCase().includes(q)
            );
        }

        // Payment filter
        if (paymentFilter !== "all") {
            result = result.filter(r => r.paymentStatus === paymentFilter);
        }

        // Sorting
        if (sortField) {
            result.sort((a, b) => {
                const valA = (a[sortField] || "").toString().toLowerCase();
                const valB = (b[sortField] || "").toString().toLowerCase();
                if (valA < valB) return sortDir === "asc" ? -1 : 1;
                if (valA > valB) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [registrations, search, paymentFilter, sortField, sortDir]);

    // ----- Pagination -----
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedData = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on filter change
    useEffect(() => { setCurrentPage(1); }, [search, paymentFilter]);

    // ----- Stats -----
    const stats = useMemo(() => {
        const total = registrations.length;
        const attended = Object.values(attendance).filter(Boolean).length;
        const paid = registrations.filter(r => r.paymentStatus === "paid").length;
        const pendingPayment = registrations.filter(r => r.paymentStatus === "pending_verification").length;
        return { total, attended, paid, pendingPayment };
    }, [registrations, attendance]);

    // ----- Export -----
    const handleExport = () => {
        if (filtered.length === 0) {
            return toast.error("Không có dữ liệu để xuất");
        }

        const exportData = filtered.map((r, i) => ({
            "STT": i + 1,
            "Tên đội": r.teamName || "",
            "Viết tắt": r.teamShortName || "",
            "Tên VĐV": r.playerName || "",
            "ID Game": r.gamerId || "",
            "SĐT": r.phone || "",
            "Email": r.email || "",
            "Nickname": r.nickname || "",
            "Ngày sinh": r.dateOfBirth || "",
            "Tỉnh/Thành": r.province || "",
            "Facebook": r.facebookName || "",
            "Trạng thái": r.status === "approved" ? "Đã duyệt" : r.status,
            "Thanh toán": paymentLabels[r.paymentStatus]?.label || r.paymentStatus,
            "Điểm danh": attendance[r._id] ? "✓" : "",
            "Ngày ĐK": r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "",
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách");

        // Auto-width columns
        const colWidths = Object.keys(exportData[0]).map(key => ({
            wch: Math.max(key.length, ...exportData.map(r => String((r as any)[key] || "").length)) + 2
        }));
        ws["!cols"] = colWidths;

        XLSX.writeFile(wb, `${tournament?.title || "giai-dau"}_noi-dung.xlsx`);
        toast.success("Đã xuất file Excel");
    };

    // ----- Sortable Header -----
    const SortHeader = ({ field, label }: { field: string; label: string }) => (
        <th
            className="px-4 py-3.5 text-left cursor-pointer hover:bg-gray-100/50 transition-colors select-none group"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {label}
                <ArrowUpDown className={`w-3 h-3 transition-colors ${sortField === field ? "text-efb-blue" : "text-gray-300 group-hover:text-gray-400"}`} />
            </div>
        </th>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight flex items-center gap-3">
                        <div className="w-1 h-6 bg-efb-blue rounded-full"></div>
                        Nội dung thi đấu
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 ml-4">{tournament?.title || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="h-9 px-4 rounded-xl text-sm border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 font-medium"
                    >
                        <Download className="w-4 h-4 mr-1.5" /> Xuất Excel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={loadData}
                        className="h-9 w-9 p-0 rounded-xl border-gray-200 text-gray-500 hover:text-efb-blue"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Tournament Info Bar */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 border border-gray-100 rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2"
            >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Trophy className="w-4 h-4 text-efb-blue" />
                    <span className="font-medium">{formatLabels[tournament?.format] || tournament?.format || "—"}</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-efb-blue" />
                    <span>{stats.total} / {tournament?.maxTeams || "—"} đội</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Gamepad2 className="w-4 h-4 text-efb-blue" />
                    <span>{tournament?.teamSize || 1}v{tournament?.teamSize || 1}</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Wifi className="w-4 h-4 text-efb-blue" />
                    <span>{tournament?.isOnline ? "Online" : "Offline"}</span>
                </div>
                {tournament?.settings?.matchDuration && (
                    <>
                        <div className="w-px h-5 bg-gray-200" />
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-efb-blue" />
                            <span>{tournament.settings.matchDuration} phút</span>
                        </div>
                    </>
                )}
                {tournament?.mode && (
                    <>
                        <div className="w-px h-5 bg-gray-200" />
                        <Badge variant="outline" className="text-xs font-medium bg-white">
                            {tournament.mode === "mobile" ? "📱 Mobile" : "🖥 PC"}
                        </Badge>
                    </>
                )}
                {tournament?.efvTier && (
                    <Badge variant="outline" className="text-xs font-bold bg-purple-50 text-purple-600 border-purple-100">
                        {tournament.efvTier === "efv_250" ? "EFV 250" : tournament.efvTier === "efv_500" ? "EFV 500" : "EFV 1000"}
                    </Badge>
                )}
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Tổng VĐV", value: stats.total, icon: Users, gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "Đã điểm danh", value: stats.attended, icon: UserCheck, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "Đã thanh toán", value: stats.paid, icon: CreditCard, gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50", text: "text-teal-600" },
                    { label: "Chờ xác nhận TT", value: stats.pendingPayment, icon: Clock, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-600" },
                ].map((s) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-md transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                    <s.icon className="w-4 h-4 text-white" />
                                </div>
                                <div className={`text-2xl font-extrabold ${s.text} tracking-tight tabular-nums`}>{s.value}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Tên đội, VĐV, ID Game, SĐT..."
                            className="pl-9 h-10 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Tabs value={paymentFilter} onValueChange={setPaymentFilter} className="w-auto">
                        <TabsList className="h-10 rounded-xl bg-gray-100/80 p-1 gap-0.5">
                            <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">Tất cả</TabsTrigger>
                            <TabsTrigger value="paid" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Đã TT</TabsTrigger>
                            <TabsTrigger value="pending_verification" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">Chờ XN</TabsTrigger>
                            <TabsTrigger value="unpaid" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm">Chưa TT</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="h-10 rounded-xl border-gray-200 bg-white font-medium text-gray-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                        onClick={handleCheckAllAttendance}
                    >
                        <UserCheck className="w-4 h-4 mr-1.5" /> Điểm danh tất cả
                    </Button>
                    {Object.values(attendance).some(Boolean) && (
                        <Button
                            variant="outline"
                            className="h-10 rounded-xl border-gray-200 bg-white font-medium text-red-500 shadow-sm hover:bg-red-50 hover:border-red-200"
                            onClick={handleUncheckAllAttendance}
                        >
                            Bỏ tất cả
                        </Button>
                    )}
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    Hiển thị <span className="font-bold text-gray-600">{paginatedData.length}</span> / <span className="font-bold text-gray-600">{filtered.length}</span> VĐV
                    {search && <span className="ml-1">(lọc từ {registrations.length})</span>}
                </p>
                <p className="text-xs text-gray-400">
                    Điểm danh: <span className="font-bold text-emerald-600">{stats.attended}</span> / {stats.total}
                </p>
            </div>

            {/* Data Table */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-slate-50/50">
                                <th className="px-4 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                                <SortHeader field="teamName" label="Tên đội" />
                                <SortHeader field="playerName" label="Tên VĐV" />
                                <SortHeader field="gamerId" label="ID Game" />
                                <th className="px-4 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">SĐT</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Email</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Nickname</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Điểm danh</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thanh toán</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                                <Users className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-500">Không tìm thấy VĐV nào</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {search ? "Thử thay đổi từ khóa tìm kiếm" : "Chưa có VĐV đã được duyệt"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((r, i) => {
                                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i;
                                    const pay = paymentLabels[r.paymentStatus] || paymentLabels.unpaid;

                                    return (
                                        <motion.tr
                                            key={r._id}
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${attendance[r._id] ? "bg-emerald-50/30" : ""}`}
                                        >
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="text-xs font-bold text-gray-300 tabular-nums">{globalIndex + 1}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {r.teamShortName && (
                                                        <Badge variant="outline" className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 border-blue-100 flex-shrink-0">
                                                            {r.teamShortName}
                                                        </Badge>
                                                    )}
                                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{r.teamName || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-semibold text-gray-900 truncate max-w-[150px] block">{r.playerName || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-medium text-gray-600 truncate max-w-[120px] block font-mono text-xs">{r.gamerId || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600 text-xs font-medium">
                                                {r.phone && r.phone !== "000" ? r.phone : "—"}
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-500 text-xs truncate max-w-[150px] hidden lg:table-cell">
                                                {r.email && r.email !== "noemail@vntournament.com" ? r.email : "—"}
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600 text-xs font-medium hidden md:table-cell">
                                                {r.nickname || "—"}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Checkbox
                                                    checked={!!attendance[r._id]}
                                                    onCheckedChange={() => toggleAttendance(r._id)}
                                                    className="border-gray-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Badge variant="outline" className={`text-[10px] font-medium ${pay.color}`}>
                                                    {pay.label}
                                                </Badge>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/30">
                        <p className="text-xs text-gray-400 font-medium">
                            Trang <span className="text-gray-700 font-bold">{currentPage}</span> / {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="h-8 px-2.5 rounded-lg text-xs border-gray-200 disabled:opacity-40"
                            >
                                Đầu
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0 rounded-lg border-gray-200 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                            {/* Page numbers */}
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
                                                ? "bg-efb-blue text-white hover:bg-efb-blue/90"
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="h-8 px-2.5 rounded-lg text-xs border-gray-200 disabled:opacity-40"
                            >
                                Cuối
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pb-4">
                <div className="flex items-center gap-4">
                    <Link href={`/manager/giai-dau/${id}/lich`} className="flex items-center gap-1 text-efb-blue hover:underline font-medium">
                        <Calendar className="w-3.5 h-3.5" /> Lịch thi đấu
                    </Link>
                    <Link href={`/manager/giai-dau/${id}/dang-ky`} className="flex items-center gap-1 text-efb-blue hover:underline font-medium">
                        <Users className="w-3.5 h-3.5" /> Quản lý đăng ký
                    </Link>
                    <Link href={`/manager/giai-dau/${id}`} className="flex items-center gap-1 text-efb-blue hover:underline font-medium">
                        <Info className="w-3.5 h-3.5" /> Chi tiết giải
                    </Link>
                </div>
                <span>Cập nhật: {new Date().toLocaleString("vi-VN")}</span>
            </div>
        </div>
    );
}
