"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
    Plus, UserCheck, Search, Download, Loader2, Check, X,
    Users, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus, Upload,
    CreditCard, Eye, Banknote, ImageIcon, DollarSign, AlertTriangle,
    Phone, Mail, Facebook, ExternalLink, MapPin, Calendar as CalendarIcon, Gamepad2, User,
    FileSpreadsheet, Hash, Shield, Sparkles, Trophy
} from "lucide-react";
import { tournamentAPI, tournamentPaymentAPI } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    unpaid: { label: "Chưa thanh toán", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle },
    pending_verification: { label: "Chờ xác nhận", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
    paid: { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 },
    refunded: { label: "Đã hoàn tiền", color: "bg-blue-50 text-blue-600 border-blue-100", icon: CreditCard },
};

export default function DangKyPage() {
    const params = useParams();
    const id = params.id as string;

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [tournament, setTournament] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [processing, setProcessing] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<"manual" | "excel">("manual");
    const [isAutoFormat, setIsAutoFormat] = useState(true);
    const [manualRows, setManualRows] = useState([
        { teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }
    ]);

    // Payment proof viewer
    const [paymentProofView, setPaymentProofView] = useState<string | null>(null);
    const [paymentDetailView, setPaymentDetailView] = useState<any>(null);
    const [playerDetailView, setPlayerDetailView] = useState<any>(null);

    useEffect(() => {
        loadRegistrations();
        loadTournament();
    }, [id]);

    const loadTournament = async () => {
        try {
            const res = await tournamentAPI.getById(id);
            if (res.success) {
                setTournament(res.data?.tournament || res.data);
            }
        } catch (e) {
            console.error("Load tournament error:", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const xlsx = await import("xlsx");
            const reader = new FileReader();

            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = xlsx.read(bstr, { type: "binary" });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = xlsx.utils.sheet_to_json(ws);

                    if (data.length === 0) {
                        toast.error("File excel trống");
                        setIsUploading(false);
                        return;
                    }

                    const formattedData = data.map((row: any) => {
                        if (isAutoFormat) {
                            if (row['Tên Đội Trưởng']) row['Tên Đội Trưởng'] = autoFormatName(row['Tên Đội Trưởng']);
                            if (row['Tên VĐV 1']) row['Tên VĐV 1'] = autoFormatName(row['Tên VĐV 1']);
                            if (row['VĐV 1']) row['VĐV 1'] = autoFormatName(row['VĐV 1']);
                            if (row['playerName']) row['playerName'] = autoFormatName(row['playerName']);
                        }
                        return row;
                    });

                    const res = await tournamentAPI.importRegistrations(id, formattedData);
                    if (res.success) {
                        toast.success(res.message || `Đã import thành công`);
                        loadRegistrations();
                        setIsAddModalOpen(false);
                    } else {
                        toast.error(res.message || "Import thất bại");
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("Lỗi khi đọc file");
                } finally {
                    setIsUploading(false);
                    e.target.value = "";
                }
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi import file");
            setIsUploading(false);
        }
    };

    const autoFormatName = (name: string) => {
        if (!name) return "";
        return name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
    };

    const handleAddManualRows = (count: number) => {
        const newRows = Array(count).fill(null).map(() => ({ teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }));
        setManualRows([...manualRows, ...newRows]);
    };

    const handleSaveManual = async () => {
        const validRows = manualRows.filter(r => r.playerName.trim().length >= 2);
        if (validRows.length === 0) {
            return toast.error("Vui lòng nhập tên VĐV hợp lệ (tối thiểu 2 ký tự)");
        }

        setIsUploading(true);
        const data = validRows.map(r => ({
            teamName: r.teamName.trim() || r.playerName.trim(),
            teamShortName: r.teamShortName.trim() || (r.teamName.trim() || r.playerName.trim()).substring(0, 3).toUpperCase(),
            playerName: isAutoFormat ? autoFormatName(r.playerName.trim()) : r.playerName.trim(),
            gamerId: r.gamerId.trim() || "TBD",
            phone: r.phone.trim() || "000",
            email: r.email.trim() || "noemail@vntournament.com",
            nickname: r.nickname.trim() || "",
        }));

        try {
            const res = await tournamentAPI.importRegistrations(id, data);
            if (res.success) {
                toast.success(res.message || "Đã thêm thành công");
                loadRegistrations();
                setIsAddModalOpen(false);
                setManualRows([{ teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }]);
            } else {
                toast.error(res.message || "Thêm thất bại");
            }
        } catch (err) {
            console.error(err);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsUploading(false);
        }
    };

    const loadRegistrations = async () => {
        setIsLoading(true);
        try {
            const res = await tournamentAPI.getRegistrations(id);
            if (res.success) {
                setRegistrations(res.data?.registrations || res.data || []);
            }
        } catch (e) {
            console.error("Load registrations error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (regId: string, action: "approve" | "reject") => {
        setProcessing(regId);
        try {
            const res = await tournamentAPI.handleRegistration(id, {
                registrationId: regId,
                action,
            });
            if (res.success) {
                toast.success(action === "approve" ? "Đã duyệt đăng ký" : "Đã từ chối đăng ký");
                setRegistrations((prev) =>
                    prev.map((r) =>
                        r._id === regId
                            ? { ...r, status: action === "approve" ? "approved" : "rejected" }
                            : r
                    )
                );
            } else {
                toast.error(res.message || "Thao tác thất bại");
            }
        } catch (e) {
            console.error("Handle registration error:", e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    // Payment actions
    const handleConfirmPayment = async (regId: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentPaymentAPI.confirmPayment(id, regId);
            if (res.success) {
                toast.success("✅ Đã xác nhận thanh toán");
                setRegistrations(prev =>
                    prev.map(r => r._id === regId ? { ...r, paymentStatus: "paid" } : r)
                );
            } else {
                toast.error(res.message || "Xác nhận thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectPayment = async (regId: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentPaymentAPI.rejectPayment(id, regId);
            if (res.success) {
                toast.success("Đã từ chối thanh toán");
                setRegistrations(prev =>
                    prev.map(r => r._id === regId ? { ...r, paymentStatus: "unpaid", paymentProof: "" } : r)
                );
            } else {
                toast.error(res.message || "Thao tác thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    const hasFee = tournament?.entryFee > 0;

    const handleExportExcel = () => {
        if (registrations.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        const data = registrations.map((r: any, idx: number) => {
            const row: Record<string, any> = {
                "STT": idx + 1,
                "EFV-ID": r.user?.efvId != null ? r.user.efvId : "",
                "Tên VĐV": r.playerName || "",
                "Nickname": r.nickname || "",
                "ID Game": r.gamerId || "",
                "Tên đội": r.teamName || "",
                "Viết tắt": r.teamShortName || "",
                "Số điện thoại": r.phone || "",
                "Email": r.email || "",
                "Ngày sinh": r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString('vi-VN') : "",
                "Tỉnh/TP": r.province || "",
                "Facebook": r.facebookName || "",
                "Link Facebook": r.facebookLink || "",
                "Ảnh cá nhân": r.personalPhoto ? `${window.location.origin}${r.personalPhoto}` : "",
                "Ảnh đội hình": r.teamLineupPhoto ? `${window.location.origin}${r.teamLineupPhoto}` : "",
                "Ghi chú": r.notes || "",
                "Trạng thái": r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : r.status === 'cancelled' ? 'Đã hủy' : 'Chờ duyệt',
                "Thanh toán": r.paymentStatus === 'paid' ? 'Đã thanh toán' : r.paymentStatus === 'pending_verification' ? 'Chờ xác nhận' : r.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán',
                "Số tiền (VNĐ)": r.paymentAmount || 0,
                "Phương thức TT": r.paymentMethod || "",
                "Ngày TT": r.paymentDate ? new Date(r.paymentDate).toLocaleString('vi-VN') : "",
                "Xác nhận TT lúc": r.paymentConfirmedAt ? new Date(r.paymentConfirmedAt).toLocaleString('vi-VN') : "",
                "Minh chứng TT": r.paymentProof ? `${window.location.origin}${r.paymentProof}` : "",
                "Duyệt bởi": r.approvedBy?.name || "",
                "Duyệt lúc": r.approvedAt ? new Date(r.approvedAt).toLocaleString('vi-VN') : "",
                "Lý do từ chối": r.rejectionReason || "",
                "Ngày đăng ký": r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : "",
            };
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-width columns
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(
                key.length + 2,
                ...data.map(row => String(row[key] || "").length)
            )
        }));
        ws["!cols"] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách đăng ký");

        const fileName = `DangKy_${tournament?.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'GiaiDau'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất ${data.length} bản đăng ký ra Excel`);
    };

    const filtered = registrations.filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                r.name?.toLowerCase().includes(q) ||
                r.teamName?.toLowerCase().includes(q) ||
                r.ingameId?.toLowerCase().includes(q) ||
                r.email?.toLowerCase().includes(q) ||
                r.playerName?.toLowerCase().includes(q) ||
                r.gamerId?.toLowerCase().includes(q) ||
                r.nickname?.toLowerCase().includes(q) ||
                r.facebookName?.toLowerCase().includes(q) ||
                r.province?.toLowerCase().includes(q) ||
                r.phone?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const counts = {
        total: registrations.length,
        pending: registrations.filter((r) => r.status === "pending").length,
        approved: registrations.filter((r) => r.status === "approved").length,
        rejected: registrations.filter((r) => r.status === "rejected").length,
        paid: registrations.filter((r) => r.paymentStatus === "paid").length,
        pendingPayment: registrations.filter((r) => r.paymentStatus === "pending_verification").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Trophy className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-bold text-efb-dark tracking-tight">Đăng ký thi đấu</h1>
                            <p className="text-sm text-efb-text-muted mt-0.5">
                                Quản lý danh sách đăng ký tham gia giải đấu
                                {hasFee && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Lệ phí: {tournament?.entryFee?.toLocaleString("vi-VN")} {tournament?.currency || "VNĐ"}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="rounded-xl h-9 text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Thêm VĐV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={handleExportExcel}
                        disabled={registrations.length === 0}
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs border-gray-200 hover:bg-gray-50" onClick={loadRegistrations}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className={`grid ${hasFee ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"} gap-3`}>
                {[
                    { label: "Tổng đăng ký", value: counts.total, icon: Users, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "Chờ duyệt", value: counts.pending, icon: Clock, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "Đã duyệt", value: counts.approved, icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "Đã từ chối", value: counts.rejected, icon: XCircle, gradient: "from-red-500 to-red-600", bg: "bg-red-50", text: "text-red-600" },
                    ...(hasFee ? [
                        { label: "Đã thanh toán", value: counts.paid, icon: CreditCard, gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50", text: "text-teal-600" },
                        { label: "Chờ xác nhận TT", value: counts.pendingPayment, icon: Banknote, gradient: "from-orange-500 to-orange-600", bg: "bg-orange-50", text: "text-orange-600" },
                    ] : []),
                ].map((s, idx) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-md transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-4 px-4">
                            <div className="flex items-center justify-between mb-3">
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

            {/* Payment Warning Banner */}
            {hasFee && counts.pendingPayment > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-800">
                            Có {counts.pendingPayment} đăng ký chờ xác nhận thanh toán
                        </h4>
                        <p className="text-xs text-amber-600/80 mt-0.5">
                            Vui lòng kiểm tra minh chứng thanh toán và xác nhận để VĐV có thể được duyệt vào giải
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm VĐV theo tên, SĐT, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                    />
                </div>
                <Tabs value={filter} onValueChange={setFilter} className="w-auto">
                    <TabsList className="h-10 rounded-xl bg-gray-100/80 p-1 gap-0.5">
                        <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Tất cả</TabsTrigger>
                        <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">Chờ duyệt</TabsTrigger>
                        <TabsTrigger value="approved" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Đã duyệt</TabsTrigger>
                        <TabsTrigger value="rejected" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm">Từ chối</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Users className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700">Chưa có đăng ký nào</h3>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">Đăng ký sẽ hiển thị khi có người đăng ký tham gia giải đấu</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-slate-50/50">
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nhân sự / CLB</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">In-game ID</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Ngày ĐK</th>
                                    {hasFee && (
                                        <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <span className="flex items-center justify-center gap-1">
                                                <CreditCard className="w-3 h-3" />
                                                Thanh toán
                                            </span>
                                        </th>
                                    )}
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const payConfig = paymentStatusConfig[r.paymentStatus] || paymentStatusConfig.unpaid;
                                    const PayIcon = payConfig.icon;

                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            key={r._id || i}
                                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-4 text-sm text-gray-400 font-medium">{i + 1}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{r.playerName || r.teamName || r.name || "—"}</div>
                                                        <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-efb-blue">{r.teamName || "Tự do"}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                            <span>{r.phone || r.email || ""}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setPlayerDetailView(r)}
                                                        className="ml-1 w-7 h-7 rounded-lg bg-blue-50 text-efb-blue hover:bg-efb-blue hover:text-white flex items-center justify-center transition-all flex-shrink-0"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell font-medium">{r.gamerId || r.ingameId || "—"}</td>
                                            <td className="px-4 py-4 text-sm text-gray-400 hidden lg:table-cell">
                                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}
                                            </td>
                                            {hasFee && (
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={`${payConfig.color} font-medium text-[10px] inline-flex items-center gap-1`}
                                                        >
                                                            <PayIcon className="w-3 h-3" />
                                                            {payConfig.label}
                                                        </Badge>
                                                        {/* Payment proof button */}
                                                        {r.paymentProof && (
                                                            <button
                                                                onClick={() => setPaymentDetailView(r)}
                                                                className="text-[10px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors"
                                                            >
                                                                <Eye className="w-3 h-3" /> Xem minh chứng
                                                            </button>
                                                        )}
                                                        {/* Payment actions for pending_verification */}
                                                        {r.paymentStatus === "pending_verification" && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <button
                                                                    onClick={() => handleConfirmPayment(r._id)}
                                                                    disabled={processing === r._id}
                                                                    className="px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-0.5"
                                                                >
                                                                    <Check className="w-3 h-3" /> Xác nhận
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectPayment(r._id)}
                                                                    disabled={processing === r._id}
                                                                    className="px-2 py-1 rounded-md bg-red-50 text-red-500 text-[10px] font-bold hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-0.5"
                                                                >
                                                                    <X className="w-3 h-3" /> Từ chối
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        r.status === "approved"
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-medium"
                                                            : r.status === "rejected"
                                                                ? "bg-red-50 text-red-500 border-red-100 font-medium"
                                                                : "bg-amber-50 text-amber-600 border-amber-100 font-medium"
                                                    }
                                                >
                                                    {r.status === "approved" ? "Đã xác nhận" : r.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {r.status === "pending" && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleAction(r._id, "approve")}
                                                            disabled={processing === r._id || (hasFee && r.paymentStatus !== "paid")}
                                                            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm"
                                                            title={hasFee && r.paymentStatus !== "paid" ? "Phải xác nhận thanh toán trước" : "Duyệt"}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(r._id, "reject")}
                                                            disabled={processing === r._id}
                                                            className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm"
                                                            title="Từ chối"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Payment Detail Modal */}
            <Dialog open={!!paymentDetailView} onOpenChange={(open) => !open && setPaymentDetailView(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-xl p-0 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-efb-blue" />
                            Chi tiết thanh toán
                        </DialogTitle>
                    </div>
                    {paymentDetailView && (
                        <div className="p-6 space-y-5">
                            {/* Player Info */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <div className="w-10 h-10 rounded-lg bg-efb-blue/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-efb-blue" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{paymentDetailView.playerName}</div>
                                    <div className="text-xs text-gray-400">{paymentDetailView.teamName}</div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-gray-50">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái</div>
                                    <Badge
                                        variant="outline"
                                        className={`mt-1.5 ${paymentStatusConfig[paymentDetailView.paymentStatus]?.color || ""}`}
                                    >
                                        {paymentStatusConfig[paymentDetailView.paymentStatus]?.label || "N/A"}
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phương thức</div>
                                    <div className="text-sm font-medium text-gray-800 mt-1.5">{paymentDetailView.paymentMethod || "N/A"}</div>
                                </div>
                                {paymentDetailView.paymentDate && (
                                    <div className="p-3 rounded-xl bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày thanh toán</div>
                                        <div className="text-sm font-medium text-gray-800 mt-1.5">
                                            {new Date(paymentDetailView.paymentDate).toLocaleString("vi-VN")}
                                        </div>
                                    </div>
                                )}
                                {paymentDetailView.paymentNote && (
                                    <div className="p-3 rounded-xl bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ghi chú</div>
                                        <div className="text-sm text-gray-800 mt-1.5">{paymentDetailView.paymentNote}</div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Proof Image */}
                            {paymentDetailView.paymentProof && (
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Minh chứng thanh toán</div>
                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                        <img
                                            src={paymentDetailView.paymentProof}
                                            alt="Payment proof"
                                            className="w-full max-h-[400px] object-contain cursor-pointer"
                                            onClick={() => window.open(paymentDetailView.paymentProof, "_blank")}
                                        />
                                    </div>
                                    <button
                                        onClick={() => window.open(paymentDetailView.paymentProof, "_blank")}
                                        className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 mt-2 transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Xem ảnh gốc
                                    </button>
                                </div>
                            )}

                            {/* Actions */}
                            {paymentDetailView.paymentStatus === "pending_verification" && (
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            handleConfirmPayment(paymentDetailView._id);
                                            setPaymentDetailView(null);
                                        }}
                                        className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl h-11 font-bold"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Xác nhận thanh toán
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleRejectPayment(paymentDetailView._id);
                                            setPaymentDetailView(null);
                                        }}
                                        className="flex-1 rounded-xl h-11 font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Từ chối
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Player Detail Modal */}
            <Dialog open={!!playerDetailView} onOpenChange={(open) => !open && setPlayerDetailView(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh]">
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100/80">
                        <DialogTitle className="text-base font-medium text-gray-900 tracking-tight">Chi tiết đăng ký</DialogTitle>
                    </div>
                    {playerDetailView && (
                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 72px)' }}>
                            {/* Profile Header */}
                            <div className="px-6 py-5 flex items-center gap-4">
                                {playerDetailView.personalPhoto ? (
                                    <img
                                        src={playerDetailView.personalPhoto}
                                        alt="Ảnh cá nhân"
                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 cursor-pointer hover:ring-efb-blue/30 transition-all"
                                        onClick={() => window.open(playerDetailView.personalPhoto, '_blank')}
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-300" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-gray-900 tracking-tight">{playerDetailView.playerName || '—'}</h3>
                                    <p className="text-[13px] text-gray-500 font-light">{playerDetailView.teamName} {playerDetailView.teamShortName ? `· ${playerDetailView.teamShortName}` : ''}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-normal ${playerDetailView.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : playerDetailView.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200'
                                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                                }`}
                                        >
                                            {playerDetailView.status === 'approved' ? 'Đã duyệt' : playerDetailView.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                        </Badge>
                                        {playerDetailView.user?.efvId != null && (
                                            <span className="text-[10px] font-mono text-gray-400">#{playerDetailView.user.efvId}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Rows — clean Apple list style */}
                            <div className="border-t border-gray-100/80">
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">ID Game</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.gamerId || '—'}</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Nickname</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.nickname || '—'}</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Tên đội</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.teamName} ({playerDetailView.teamShortName})</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Số điện thoại</span>
                                    <a href={`tel:${playerDetailView.phone}`} className="text-[13px] text-efb-blue font-normal">{playerDetailView.phone || '—'}</a>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Email</span>
                                    <a href={`mailto:${playerDetailView.email}`} className="text-[13px] text-efb-blue font-normal truncate max-w-[220px]">{playerDetailView.email || '—'}</a>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Ngày sinh</span>
                                    <span className="text-[13px] text-gray-900 font-normal">
                                        {playerDetailView.dateOfBirth ? new Date(playerDetailView.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                                    </span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Tỉnh / Thành phố</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.province || '—'}</span>
                                </div>
                                {playerDetailView.facebookName && (
                                    <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light">Facebook</span>
                                        <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.facebookName}</span>
                                    </div>
                                )}
                                {playerDetailView.facebookLink && (
                                    <div className="px-6 py-3 border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light block mb-1">Link Facebook</span>
                                        <a href={playerDetailView.facebookLink} target="_blank" rel="noopener noreferrer" className="text-[12px] text-efb-blue hover:underline break-all flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" /> {playerDetailView.facebookLink}
                                        </a>
                                    </div>
                                )}
                                {playerDetailView.notes && (
                                    <div className="px-6 py-3 border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light block mb-1">Ghi chú</span>
                                        <p className="text-[13px] text-gray-700 font-light">{playerDetailView.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Photos section */}
                            {(playerDetailView.teamLineupPhoto || playerDetailView.personalPhoto) && (
                                <div className="px-6 py-4 border-t border-gray-100/80">
                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-3">Hình ảnh</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {playerDetailView.personalPhoto && (
                                            <div>
                                                <p className="text-[11px] text-gray-400 font-light mb-1.5">Ảnh cá nhân</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                                                    <img
                                                        src={playerDetailView.personalPhoto}
                                                        alt="Ảnh cá nhân"
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => window.open(playerDetailView.personalPhoto, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {playerDetailView.teamLineupPhoto && (
                                            <div>
                                                <p className="text-[11px] text-gray-400 font-light mb-1.5">Đội hình thi đấu</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                                                    <img
                                                        src={playerDetailView.teamLineupPhoto}
                                                        alt="Đội hình"
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => window.open(playerDetailView.teamLineupPhoto, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Section */}
                            {hasFee && (
                                <div className="px-6 py-4 border-t border-gray-100/80">
                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-3">Thanh toán</p>
                                    <div className="space-y-0">
                                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                            <span className="text-[13px] text-gray-400 font-light">Trạng thái</span>
                                            <Badge variant="outline" className={`${paymentStatusConfig[playerDetailView.paymentStatus]?.color || ''} text-[10px] font-normal`}>
                                                {paymentStatusConfig[playerDetailView.paymentStatus]?.label || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                            <span className="text-[13px] text-gray-400 font-light">Số tiền</span>
                                            <span className="text-[13px] text-gray-900 font-medium">{(playerDetailView.paymentAmount || tournament?.entryFee || 0)?.toLocaleString('vi-VN')} VNĐ</span>
                                        </div>
                                        {playerDetailView.paymentMethod && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Phương thức</span>
                                                <span className="text-[13px] text-gray-900 font-normal capitalize">{playerDetailView.paymentMethod}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentDate && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Ngày TT</span>
                                                <span className="text-[13px] text-gray-900 font-normal">{new Date(playerDetailView.paymentDate).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentConfirmedAt && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Xác nhận lúc</span>
                                                <span className="text-[13px] text-gray-900 font-normal">{new Date(playerDetailView.paymentConfirmedAt).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentProof && (
                                            <div className="pt-3">
                                                <p className="text-[11px] text-gray-400 font-light mb-2">Minh chứng thanh toán</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                                    <img
                                                        src={playerDetailView.paymentProof}
                                                        alt="Minh chứng TT"
                                                        className="w-full max-h-[240px] object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                                                        onClick={() => window.open(playerDetailView.paymentProof, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Meta info */}
                            <div className="px-6 py-3 border-t border-gray-100/80 flex items-center justify-between">
                                <span className="text-[11px] text-gray-300 font-light">Đăng ký lúc</span>
                                <span className="text-[11px] text-gray-400 font-light">{playerDetailView.createdAt ? new Date(playerDetailView.createdAt).toLocaleString('vi-VN') : '—'}</span>
                            </div>
                            {playerDetailView.approvedAt && (
                                <div className="px-6 py-2 pb-3 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-300 font-light">Duyệt lúc</span>
                                    <span className="text-[11px] text-gray-400 font-light">{new Date(playerDetailView.approvedAt).toLocaleString('vi-VN')}</span>
                                </div>
                            )}

                            {/* Actions */}
                            {playerDetailView.status === 'pending' && (
                                <div className="px-6 pb-5 pt-2 flex gap-3">
                                    <Button
                                        onClick={() => {
                                            handleAction(playerDetailView._id, 'approve');
                                            setPlayerDetailView(null);
                                        }}
                                        disabled={hasFee && playerDetailView.paymentStatus !== 'paid'}
                                        className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl h-10 font-normal text-[13px]"
                                    >
                                        Duyệt VĐV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleAction(playerDetailView._id, 'reject');
                                            setPlayerDetailView(null);
                                        }}
                                        className="flex-1 rounded-xl h-10 font-normal text-[13px] text-red-500 border-gray-200 hover:bg-red-50 hover:border-red-200"
                                    >
                                        Từ chối
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Thêm VĐV */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full bg-white border-0 shadow-2xl p-0 gap-0 rounded-2xl overflow-hidden">
                    {/* Modal Header with gradient */}
                    <div className="p-5 px-6 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/50">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">Thêm VĐV</DialogTitle>
                            <p className="text-xs text-gray-400 mt-0.5">Thêm vận động viên mới vào giải đấu</p>
                        </div>
                    </div>

                    <div className="px-6 py-5 pb-2">
                        {/* Tabs using shadcn */}
                        <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "manual" | "excel")} className="w-full">
                            <TabsList className="w-full h-11 rounded-xl bg-gray-100/70 p-1 mb-6">
                                <TabsTrigger
                                    value="manual"
                                    className="flex-1 rounded-lg text-sm font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Nhập thủ công
                                </TabsTrigger>
                                <TabsTrigger
                                    value="excel"
                                    className="flex-1 rounded-lg text-sm font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Tải lên Excel
                                </TabsTrigger>
                            </TabsList>

                            {/* Manual Tab */}
                            <TabsContent value="manual" className="mt-0">
                                <div className="space-y-4">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <div className="min-w-[800px]">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-[40px_minmax(100px,1fr)_60px_minmax(120px,1.2fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(90px,1fr)] gap-2 items-center mb-3 px-2">
                                                <Label className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest justify-center">
                                                    <Hash className="w-3 h-3" />
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Shield className="w-3 h-3 mr-1" /> Tên đội
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Viết tắt
                                                </Label>
                                                <Label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                                    <User className="w-3 h-3 mr-1" /> Tên VĐV *
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    ID Game
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Phone className="w-3 h-3 mr-1" /> SĐT
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Email
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Nickname
                                                </Label>
                                            </div>

                                            <Separator className="mb-3" />

                                            {/* Scrollable Rows */}
                                            <ScrollArea className="max-h-[40vh]">
                                                <div className="space-y-2.5 px-2 pb-2">
                                                    {manualRows.map((row, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.03 }}
                                                            className="grid grid-cols-[40px_minmax(100px,1fr)_60px_minmax(120px,1.2fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(90px,1fr)] gap-2 items-center group/row"
                                                        >
                                                            <div className="text-xs font-bold text-gray-300 text-center tabular-nums group-hover/row:text-blue-400 transition-colors">{index + 1}</div>
                                                            <Input
                                                                value={row.teamName}
                                                                placeholder="Tên đội"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].teamName = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.teamShortName}
                                                                placeholder="VT"
                                                                maxLength={4}
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].teamShortName = e.target.value.toUpperCase(); setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all text-center uppercase placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.playerName}
                                                                placeholder="Họ tên VĐV *"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].playerName = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-blue-200 bg-blue-50/30 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-blue-300 font-medium"
                                                            />
                                                            <Input
                                                                value={row.gamerId}
                                                                placeholder="In-game ID"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].gamerId = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.phone}
                                                                placeholder="0912..."
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].phone = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.email}
                                                                placeholder="email@..."
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].email = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.nickname}
                                                                placeholder="Nickname"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].nickname = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 px-2">
                                        <Button
                                            onClick={() => handleAddManualRows(1)}
                                            variant="outline"
                                            className="h-10 px-5 rounded-xl text-sm border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-600 font-medium transition-all duration-200"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Thêm 1 VĐV
                                        </Button>
                                        <Button
                                            onClick={() => handleAddManualRows(10)}
                                            variant="outline"
                                            className="h-10 px-5 rounded-xl text-sm border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 font-medium transition-all duration-200"
                                        >
                                            <Users className="w-4 h-4 mr-2" /> Tạo nhanh 10 đội
                                        </Button>
                                    </div>

                                    {/* Info Notes */}
                                    <div className="px-2 pb-3">
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-blue-600/80 space-y-0.5">
                                                <p><span className="font-bold">Tên VĐV</span> là bắt buộc (tối thiểu 2 ký tự). Các trường khác để trống sẽ sử dụng giá trị mặc định.</p>
                                                <p>Tên đội trống → auto lấy tên VĐV. Viết tắt trống → auto lấy 3 ký tự đầu.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Excel Tab */}
                            <TabsContent value="excel" className="mt-0">
                                <div className="space-y-5">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="hidden"
                                        id="excelUploadModal"
                                        onChange={handleFileUpload}
                                    />

                                    {/* Upload Zone */}
                                    <div
                                        className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-10 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 group"
                                        onClick={() => document.getElementById("excelUploadModal")?.click()}
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700">Kéo và thả file Excel vào đây</p>
                                        <p className="text-xs text-gray-400 mt-1">hoặc <span className="text-blue-500 font-medium">nhấp để chọn file</span> (.xlsx, .xls)</p>
                                    </div>

                                    <Separator />

                                    {/* Auto Format Switch */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={isAutoFormat}
                                                onCheckedChange={setIsAutoFormat}
                                            />
                                            <div>
                                                <Label className="text-sm font-semibold text-gray-800 cursor-pointer">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
                                                    Tự động định dạng tên
                                                </Label>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Vd: NGUYỄN văn A {'=> '} Nguyễn Văn A
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://vntournament.com/assets/excel/example.xlsx"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors px-4 py-2 rounded-xl hover:bg-blue-50 border border-blue-100"
                                        >
                                            <Download className="w-4 h-4" /> Tải file mẫu
                                        </a>
                                    </div>

                                    {/* Notes Card */}
                                    <Card className="py-0 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                <Label className="text-sm font-bold text-amber-700">Lưu ý quan trọng</Label>
                                            </div>
                                            <ul className="space-y-2 text-sm text-gray-600">
                                                {[
                                                    <>Tối đa <span className="font-bold text-red-500">128</span> đội cho nội dung này</>,
                                                    <>Số hạt giống tối đa = <span className="font-bold">1/4</span> tổng số đội</>,
                                                    <>Cột &quot;VĐV 1&quot; <span className="text-red-500 font-medium">tối thiểu 2 ký tự</span></>,
                                                    <>SĐT chỉ gồm số (0-9), không gồm ký tự đặc biệt</>,
                                                    <>Cột &quot;Hạt giống&quot; phải là số nguyên dương</>,
                                                    <>Dòng <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-[10px] mx-0.5">màu đỏ</Badge> = dữ liệu không hợp lệ</>,
                                                ].map((note, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                                        <span>{note}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 px-6 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-slate-50/50 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-6 rounded-xl font-semibold border-gray-200 text-gray-600 hover:bg-gray-100 transition-all"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={addMode === "manual" ? handleSaveManual : () => document.getElementById("excelUploadModal")?.click()}
                            disabled={isUploading}
                            className="h-10 px-8 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            {addMode === "manual" ? "Lưu danh sách" : "Tải lên"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
