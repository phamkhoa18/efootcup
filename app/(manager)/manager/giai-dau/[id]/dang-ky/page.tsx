"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Plus, UserCheck, Search, Download, Loader2, Check, X,
    Users, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus, Upload
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DangKyPage() {
    const params = useParams();
    const id = params.id as string;

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [processing, setProcessing] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<"manual" | "excel">("manual");
    const [isAutoFormat, setIsAutoFormat] = useState(true);
    const [manualRows, setManualRows] = useState([
        { clb: "", vdv1: "", vdv2: "", phone: "", seed: "", fee: false }
    ]);

    useEffect(() => { loadRegistrations(); }, [id]);

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
                        alert("File excel trống");
                        setIsUploading(false);
                        return;
                    }

                    // Format names if enabled
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
                        alert(res.message || `Đã import thành công`);
                        loadRegistrations();
                        setIsAddModalOpen(false);
                    } else {
                        alert(res.message || "Import thất bại");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Lỗi khi đọc file");
                } finally {
                    setIsUploading(false);
                    e.target.value = ""; // reset input
                }
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            alert("Lỗi khi import file");
            setIsUploading(false);
        }
    };

    const autoFormatName = (name: string) => {
        if (!name) return "";
        return name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
    };

    const handleAddManualRows = (count: number) => {
        const newRows = Array(count).fill(null).map(() => ({ clb: "", vdv1: "", vdv2: "", phone: "", seed: "", fee: false }));
        setManualRows([...manualRows, ...newRows]);
    };

    const handleSaveManual = async () => {
        const validRows = manualRows.filter(r => r.vdv1.length >= 2);
        if (validRows.length === 0) {
            return alert("Vui lòng nhập VĐV hợp lệ (VĐV 1 tối thiểu 2 ký tự)");
        }

        setIsUploading(true);
        const data = validRows.map(r => ({
            teamName: r.clb || r.vdv1,
            playerName: isAutoFormat ? autoFormatName(r.vdv1) : r.vdv1,
            gamerId: r.vdv2,
            phone: r.phone
        }));

        try {
            const res = await tournamentAPI.importRegistrations(id, data);
            if (res.success) {
                alert(res.message || "Đã thêm thành công");
                loadRegistrations();
                setIsAddModalOpen(false);
                setManualRows([{ clb: "", vdv1: "", vdv2: "", phone: "", seed: "", fee: false }]);
            } else {
                alert(res.message || "Thêm thất bại");
            }
        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra");
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
                setRegistrations((prev) =>
                    prev.map((r) =>
                        r._id === regId
                            ? { ...r, status: action === "approve" ? "approved" : "rejected" }
                            : r
                    )
                );
            }
        } catch (e) {
            console.error("Handle registration error:", e);
        } finally {
            setProcessing(null);
        }
    };

    const filtered = registrations.filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                r.name?.toLowerCase().includes(q) ||
                r.teamName?.toLowerCase().includes(q) ||
                r.ingameId?.toLowerCase().includes(q) ||
                r.email?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const counts = {
        total: registrations.length,
        pending: registrations.filter((r) => r.status === "pending").length,
        approved: registrations.filter((r) => r.status === "approved").length,
        rejected: registrations.filter((r) => r.status === "rejected").length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Đăng ký thi đấu</h1>
                    <p className="text-sm text-efb-text-muted mt-0.5">Quản lý danh sách đăng ký tham gia giải đấu</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="rounded-lg h-9 text-xs bg-efb-blue text-white hover:bg-efb-blue/90"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Thêm VĐV
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs" onClick={loadRegistrations}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Tổng đăng ký", value: counts.total, icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Chờ duyệt", value: counts.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
                    { label: "Đã duyệt", value: counts.approved, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Đã từ chối", value: counts.rejected, icon: XCircle, color: "text-red-600 bg-red-50" },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                            <s.icon className="w-4 h-4" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</div>
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                    <Input
                        placeholder="Tìm VĐV..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-lg"
                    />
                </div>
                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                    {[
                        { key: "all", label: "Tất cả" },
                        { key: "pending", label: "Chờ duyệt" },
                        { key: "approved", label: "Đã duyệt" },
                        { key: "rejected", label: "Từ chối" },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === f.key
                                ? "bg-white text-efb-blue shadow-sm"
                                : "text-efb-text-muted hover:text-efb-text-secondary"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-efb-blue" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-efb-dark">Chưa có đăng ký nào</h3>
                    <p className="text-sm text-efb-text-muted mt-1">Đăng ký sẽ hiển thị khi có người đăng ký tham gia</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/30">
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nhân sự / CLB</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">In-game ID</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Ngày ĐK</th>
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <motion.tr
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={r._id || i}
                                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-4 text-sm text-gray-400 font-medium">{i + 1}</td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-bold text-gray-900">{r.playerName || r.teamName || r.name || "—"}</div>
                                            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                                                <span className="text-efb-blue">{r.teamName || "Tự do"}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                <span>{r.phone || r.email || ""}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell font-medium">{r.gamerId || r.ingameId || "—"}</td>
                                        <td className="px-4 py-4 text-sm text-gray-400 hidden lg:table-cell">
                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}
                                        </td>
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
                                                        disabled={processing === r._id}
                                                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm"
                                                        title="Duyệt"
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Modal Thêm VĐV */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full bg-white border shadow-lg p-0 gap-0 rounded-lg overflow-hidden">
                    <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-white">
                        <DialogTitle className="text-xl font-bold text-gray-900">Thêm VĐV</DialogTitle>
                    </div>

                    <div className="px-6 py-6 pb-2">
                        {/* Tabs */}
                        <div className="flex bg-gray-50/50 border border-gray-200 p-1 rounded-md w-max mx-auto mb-6">
                            <button
                                onClick={() => setAddMode("manual")}
                                className={`px-10 py-2 text-sm font-semibold rounded-md transition-all ${addMode === "manual" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 border border-transparent"}`}
                            >
                                Thêm VĐV
                            </button>
                            <button
                                onClick={() => setAddMode("excel")}
                                className={`px-10 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${addMode === "excel" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 border border-transparent"}`}
                            >
                                <Upload className="w-4 h-4" /> Tải lên file Excel
                            </button>
                        </div>

                        {addMode === "manual" && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[700px]">
                                        <div className="grid grid-cols-[40px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_80px_60px] gap-4 items-center font-medium text-sm text-gray-600 mb-2 px-2">
                                            <div className="text-center">#</div>
                                            <div>CLB</div>
                                            <div>* VĐV 1</div>
                                            <div>VĐV 2</div>
                                            <div>Số điện thoại</div>
                                            <div className="text-center">Hạt giống</div>
                                            <div className="text-center">Lệ phí</div>
                                        </div>
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto px-2 custom-scrollbar pb-2">
                                            {manualRows.map((row, index) => (
                                                <div key={index} className="grid grid-cols-[40px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_80px_60px] gap-4 items-center">
                                                    <div className="text-sm font-medium text-gray-600 text-center">{index + 1}</div>
                                                    <Input value={row.clb} onChange={(e) => { const newRows = [...manualRows]; newRows[index].clb = e.target.value; setManualRows(newRows); }} className="h-10 rounded-md text-sm border-gray-200 focus-visible:ring-blue-500" />
                                                    <Input value={row.vdv1} onChange={(e) => { const newRows = [...manualRows]; newRows[index].vdv1 = e.target.value; setManualRows(newRows); }} className="h-10 rounded-md text-sm border-gray-200 focus-visible:ring-blue-500" />
                                                    <Input value={row.vdv2} onChange={(e) => { const newRows = [...manualRows]; newRows[index].vdv2 = e.target.value; setManualRows(newRows); }} className="h-10 rounded-md text-sm border-gray-200 focus-visible:ring-blue-500" />
                                                    <Input value={row.phone} onChange={(e) => { const newRows = [...manualRows]; newRows[index].phone = e.target.value; setManualRows(newRows); }} className="h-10 rounded-md text-sm border-gray-200 focus-visible:ring-blue-500" />
                                                    <Input value={row.seed} onChange={(e) => { const newRows = [...manualRows]; newRows[index].seed = e.target.value; setManualRows(newRows); }} className="h-10 rounded-md text-sm border-gray-200 focus-visible:ring-blue-500 text-center" />
                                                    <div className="flex justify-center">
                                                        <input type="checkbox" checked={row.fee} onChange={(e) => { const newRows = [...manualRows]; newRows[index].fee = e.target.checked; setManualRows(newRows); }} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center mt-2 px-2">
                                    <Button onClick={() => handleAddManualRows(1)} variant="outline" className="h-10 px-5 rounded-md text-sm border-gray-200 hover:bg-gray-50 text-gray-700 font-medium bg-white shadow-sm">
                                        <Plus className="w-4 h-4 mr-2" /> Thêm VĐV
                                    </Button>
                                </div>
                                <div className="mt-4 px-2">
                                    <Button onClick={() => handleAddManualRows(10)} variant="outline" className="h-9 px-4 rounded-md text-sm border-gray-200 hover:bg-gray-50 text-gray-600 font-medium flex items-center gap-2">
                                        <UserPlus className="w-4 h-4" /> Tạo nhanh 10 đội
                                    </Button>
                                </div>

                                <div className="px-2 mt-4 pb-4">
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                        <li>Mỗi lần tạo tối đa 20 đội.</li>
                                        <li>VĐV 1 ít nhất 2 ký tự.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {addMode === "excel" && (
                            <div className="space-y-4">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    id="excelUploadModal"
                                    onChange={handleFileUpload}
                                />
                                <div
                                    className="border border-dashed border-orange-300 bg-orange-50/10 rounded-md p-10 text-center cursor-pointer hover:bg-orange-50 transition-all group"
                                    onClick={() => document.getElementById("excelUploadModal")?.click()}
                                >
                                    <p className="text-gray-500">Kéo và thả file excel vào đây, hoặc nhấp để chọn file</p>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAutoFormat}
                                            onChange={(e) => setIsAutoFormat(e.target.checked)}
                                            className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <div className="text-sm font-semibold text-gray-800">
                                            Tự động định dạng tên VĐV khi nhập từ Excel
                                            <span className="text-gray-400 font-normal ml-1">Vd: NGUYỄN văn A {'=>'} Nguyễn Văn A</span>
                                        </div>
                                    </label>
                                    <a href="https://vntournament.com/assets/excel/example.xlsx" className="text-blue-500 text-sm font-semibold hover:underline flex items-center gap-1.5">
                                        <Download className="w-4 h-4" /> Tải file mẫu tại đây
                                    </a>
                                </div>

                                <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-md mt-4">
                                    <p className="font-bold text-blue-600 mb-2 text-sm">Lưu ý:</p>
                                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
                                        <li>Bạn được phép thêm tối đa <span className="text-red-500">128</span> đội cho nội dung này</li>
                                        <li>Số lượng hạt giống tối đa bằng 1/4 tổng số đội tham gia</li>
                                        <li>Cột "VĐV 1" <span className="text-red-500">tối thiểu 2 ký tự</span> (tải file mẫu để tham khảo thêm)</li>
                                        <li>Cột "Số điện thoại" chỉ bao gồm số (0-9), không bao gồm ký tự đặc biệt hoặc chữ cái</li>
                                        <li>Cột "Hạt giống" phải là số nguyên dương (1,2,3,4...)</li>
                                        <li>Sau khi import, những dòng có <span className="bg-red-100 text-red-700 px-1 rounded">màu nền đỏ</span> sẽ không được thêm do dữ liệu không hợp lệ</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 px-6 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-lg">
                        <Button variant="outline" className="h-10 px-6 rounded-md font-semibold border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
                        <Button onClick={addMode === "manual" ? handleSaveManual : () => document.getElementById("excelUploadModal")?.click()} disabled={isUploading} className="h-10 px-8 rounded-md font-semibold bg-blue-500 hover:bg-blue-600 text-white shadow-sm">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Lưu
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
