"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Trophy, Medal, Edit, Trash2, Loader2, Award, Upload, FileSpreadsheet, Download, RefreshCw, Database, Smartphone, Monitor } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManagerBxhPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const { confirm } = useConfirmDialog();

    // New Excel states
    const [addMode, setAddMode] = useState<"manual" | "excel">("manual");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelPreview, setExcelPreview] = useState<any[]>([]);
    const [excelReplaceAll, setExcelReplaceAll] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        gamerId: "",
        name: "",
        nickname: "",
        team: "",
        facebook: "",
        points: 0,
        rank: 0,
    });

    const [error, setError] = useState<string | null>(null);
    const [isReloading, setIsReloading] = useState(false);
    const [activeMode, setActiveMode] = useState<"mobile" | "pc">("mobile");

    useEffect(() => {
        loadData();
    }, [activeMode]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/bxh?mode=${activeMode}`, { cache: "no-store" });
            const result = await res.json();
            if (result.data && Array.isArray(result.data.data)) {
                setPlayers(result.data.data);
            } else {
                setPlayers([]);
            }
        } catch (error) {
            console.error("Error loading BXH:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        setForm({
            gamerId: "",
            name: "",
            nickname: "",
            team: "",
            facebook: "",
            points: 0,
            rank: 0,
        });
        setAddMode("manual");
        setExcelFile(null);
        setExcelPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setError(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (p: any) => {
        setSelectedPlayer(p);
        setForm({
            gamerId: p.id,
            name: p.name,
            nickname: p.nickname || "",
            team: p.team || "",
            facebook: p.facebook || "",
            points: p.points || 0,
            rank: p.rank || 0,
        });
        setAddMode("manual");
        setError(null);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (p: any) => {
        const ok = await confirm({
            title: "Xóa VĐV?",
            description: `Bạn có chắc muốn xóa VĐV ${p.name} khỏi bảng xếp hạng?`,
            variant: "danger",
            confirmText: "Xóa VĐV",
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/bxh/${p._id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Xóa thất bại");

            loadData();
            toast.success(`Đã xóa VĐV ${p.name}`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDeleteAll = async () => {
        const ok = await confirm({
            title: "⚠️ Xóa toàn bộ VĐV?",
            description: "CẢNH BÁO: Bạn sẽ xóa TOÀN BỘ VĐV khỏi bảng xếp hạng! Hành động này không thể hoàn tác.",
            variant: "danger",
            confirmText: "Xóa toàn bộ",
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/bxh`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Xóa thất bại");

            loadData();
            setPage(1);
            toast.success("Đã xóa toàn bộ danh sách");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (addMode === "excel") {
            handleExcelSubmit();
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const isEdit = isEditModalOpen;
            const url = isEdit ? `/api/bxh/${selectedPlayer._id}` : `/api/bxh`;
            const method = isEdit ? "PUT" : "POST";

            const payload = {
                ...form,
                points: Number(form.points),
                rank: Number(form.rank),
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Có lỗi xảy ra");
            }

            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            loadData();
            toast.success(data.message || "Đã lưu thành công");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setExcelFile(null);
            setExcelPreview([]);
            return;
        }
        setExcelFile(file);
        setError(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (typeof bstr !== "string") return;
            try {
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                let mapped = data.map((row: any) => {
                    const findVal = (keywords: string[]) => {
                        const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                        return key ? row[key] : "";
                    };

                    return {
                        gamerId: String(row["ID-EFV"] || row.ID || row.Id || row.id || row.gamerId || findVal(["id"])).trim(),
                        name: String(row["Họ và tên VĐV"] || row["Họ tên"] || row.Name || row.name || findVal(["tên", "name"])).trim(),
                        nickname: String(row["Nickname eFootball"] || row.Nickname || row.nickname || findVal(["nick"])).trim(),
                        team: String(row.Team || row.team || findVal(["team", "đội"])).trim(),
                        points: Number(row["Điểm EFV"] || row["Điểm"] || row.Points || row.points || findVal(["điểm", "point"]) || 0),
                        facebook: String(row["Link Facebook cá nhân"] || row.Facebook || row.facebook || findVal(["face", "fb"])).trim(),
                        rank: Number(row["Xếp hạng "] || row["Xếp hạng"] || row["Hạng"] || row["STT"] || row["Thứ hạng"] || row.Rank || row.rank || row.__EMPTY || findVal(["hạng", "rank", "stt", "thứ"])) || 0
                    };
                }).filter(r => r.gamerId && r.name && r.gamerId !== "undefined" && r.name !== "undefined");

                // Nếu file Excel bị mất Header chuẩn, hoặc dùng Header ẩn danh khiến rank bị bằng 0 toàn bộ
                if (mapped.length === 0 || mapped.every(r => !r.rank || r.rank === 0)) {
                    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    const fallbackMapped = [];

                    for (let i = 0; i < rawData.length; i++) {
                        const row: any = rawData[i];
                        if (!row || row.length < 3) continue;

                        const col0 = String(row[0]).toLowerCase();
                        const col1 = String(row[1]).toLowerCase();
                        // Bỏ qua dòng Header
                        if (col0.includes("hạng") || col0.includes("stt") || col1.includes("id")) continue;

                        const rank = Number(row[0]) || 0;
                        const gamerId = String(row[1] || "").trim();
                        const name = String(row[2] || "").trim();

                        if (!gamerId || !name || gamerId === "undefined") continue;

                        let facebook = "";
                        let team = "";
                        let nickname = "";
                        let points = 0;

                        // Quét các cột còn lại để nhận diện dữ liệu
                        for (let j = 3; j < row.length; j++) {
                            const val = String(row[j] || "").trim();
                            if (!val || val === "-" || val === "—") continue;

                            if (val.startsWith("http")) {
                                facebook = val;
                            } else if (!isNaN(Number(val)) && Number(val) > 0) {
                                points = Number(val);
                            } else {
                                if (!team && j === 4) team = val;
                                else nickname = val;
                            }
                        }

                        fallbackMapped.push({ gamerId, name, nickname, team, points, facebook, rank });
                    }

                    // Nếu Fallback cứu được dữ liệu thì lấy Fallback
                    if (fallbackMapped.length > 0) {
                        mapped = fallbackMapped;
                    }
                }

                setExcelPreview(mapped);
                if (mapped.length === 0) {
                    setError("Không tìm thấy dữ liệu hợp lệ. File template cần có các cột chuẩn là 'ID-EFV' và 'Họ và tên VĐV'.");
                }
            } catch (err: any) {
                setError("Lỗi đọc file: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExcelSubmit = async () => {
        if (excelPreview.length === 0) {
            setError("Chưa có dữ liệu để tải lên");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/bxh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: excelPreview,
                    replaceAll: excelReplaceAll
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");

            toast.success(data.message || `Đã nhập xong ${excelPreview.length} VĐV thành công!`);
            setIsAddModalOpen(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReloadSystem = async () => {
        const modeLabel = activeMode === "mobile" ? "Mobile" : "Console";
        const yes = await confirm({
            title: `Reload BXH ${modeLabel} từ hệ thống?`,
            description: `Toàn bộ BXH ${modeLabel} hiện tại sẽ được xóa và thay bằng dữ liệu tính từ các giải đấu EFV trong hệ thống (cơ chế cửa sổ trượt). Dữ liệu Excel sẽ bị thay thế.`,
            confirmText: `Reload ${modeLabel}`,
            variant: "warning",
        });
        if (!yes) return;

        setIsReloading(true);
        try {
            const res = await fetch("/api/bxh/reload-system", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: activeMode }),
            });
            const json = await res.json();
            if (json.success !== false) {
                toast.success(`✅ ${json.message}`);
                await loadData();
            } else {
                toast.error(`❌ ${json.message}`);
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi reload BXH");
        } finally {
            setIsReloading(false);
        }
    };

    const filtered = (Array.isArray(players) ? players : []).filter(p =>
        (p.name && String(p.name).toLowerCase().includes(search.toLowerCase())) ||
        (p.id && String(p.id).toLowerCase().includes(search.toLowerCase())) ||
        (p.nickname && String(p.nickname).toLowerCase().includes(search.toLowerCase())) ||
        (p.team && String(p.team).toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const pagedPlayers = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    useEffect(() => { setPage(1); }, [search, perPage]);

    return (
        <div className="space-y-6 font-sans antialiased text-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
                        <Award className="w-6 h-6 text-indigo-600" /> Quản lý Bảng xếp hạng
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Cập nhật điểm và thứ hạng của các VĐV.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Button
                        onClick={handleReloadSystem}
                        disabled={isReloading}
                        variant="outline"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl shadow-sm flex-1 sm:flex-none"
                    >
                        {isReloading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang reload...</>
                        ) : (
                            <><Database className="w-4 h-4 mr-2" /> Reload {activeMode === "mobile" ? "Mobile" : "Console"}</>
                        )}
                    </Button>
                    {players.length > 0 && (
                        <Button variant="destructive" onClick={handleDeleteAll} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-sm flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa toàn bộ
                        </Button>
                    )}
                    <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex-1 sm:flex-none">
                        <Plus className="w-4 h-4 mr-2" /> Thêm VĐV
                    </Button>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm w-fit">
                <button
                    onClick={() => setActiveMode("mobile")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeMode === "mobile"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                >
                    <Smartphone className="w-4 h-4" /> Mobile
                </button>
                <button
                    onClick={() => setActiveMode("pc")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeMode === "pc"
                            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                >
                    <Monitor className="w-4 h-4" /> Console
                </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm VĐV..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[13px] font-medium text-slate-500">Hiển thị:</span>
                        {[20, 50, 100].map(n => (
                            <button
                                key={n}
                                onClick={() => setPerPage(n)}
                                className={`px-2.5 py-1 text-[13px] rounded-md transition-colors ${perPage === n ? "bg-slate-800 text-white font-semibold shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fc] border-b border-gray-100 uppercase tracking-widest text-[10px] font-bold text-gray-500">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Hạng</th>
                                <th className="px-6 py-4">ID VĐV</th>
                                <th className="px-6 py-4">Họ Tên / Nickname</th>
                                <th className="px-6 py-4 text-center">Team</th>
                                <th className="px-6 py-4 text-center">Điểm số</th>
                                <th className="px-6 py-4 text-right w-24">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : pagedPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Không tìm thấy VĐV nào trong bảng xếp hạng.
                                    </td>
                                </tr>
                            ) : (
                                pagedPlayers.map((p, index) => (
                                    <tr key={p._id || index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-center">
                                            {p.rank === 1 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">1</div>
                                            ) : p.rank === 2 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">2</div>
                                            ) : p.rank === 3 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">3</div>
                                            ) : p.rank > 0 ? (
                                                <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-500 font-bold">{p.rank}</div>
                                            ) : (
                                                <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-300 font-bold">-</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[13px] font-medium text-indigo-500">{p.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-[14px]">{p.name}</div>
                                            {p.nickname && <div className="text-[12px] text-slate-500 font-medium">{p.nickname}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.team ? <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">{p.team}</span> : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-extrabold text-[#1a1f2e] text-[15px]">{p.points}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <p className="text-[13px] text-slate-500 font-medium tracking-tight">
                            Hiển thị <span className="font-bold text-slate-700">{(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, filtered.length)}</span> trên <span className="font-bold text-slate-700">{filtered.length}</span> VĐV
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Trước
                            </button>
                            <span className="px-3 py-1.5 text-[13px] font-semibold text-slate-700">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(v) => {
                if (!v) { setIsAddModalOpen(false); setIsEditModalOpen(false); }
            }}>
                <DialogContent className="sm:max-w-[500px] max-h-[95dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditModalOpen ? "Cập nhật VĐV" : "Thêm VĐV vào Bảng xếp hạng"}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={addMode} onValueChange={(v) => { if (!isEditModalOpen) setAddMode(v as "manual" | "excel") }} className="w-full mt-2">
                        {!isEditModalOpen && (
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual" className="font-semibold text-[13px]">Thêm thủ công</TabsTrigger>
                                <TabsTrigger value="excel" className="flex items-center gap-1.5 font-semibold text-[13px]">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    File Excel
                                </TabsTrigger>
                            </TabsList>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <TabsContent value="manual" className="space-y-4 m-0 outline-none">
                                <div className="space-y-2">
                                    <Label>ID VĐV (Gamer ID)</Label>
                                    <Input
                                        required
                                        value={form.gamerId}
                                        onChange={e => setForm({ ...form, gamerId: e.target.value })}
                                        placeholder="VD: efoot-123"
                                        disabled={isEditModalOpen}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Họ Tên</Label>
                                    <Input
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nickname (Tùy chọn)</Label>
                                        <Input
                                            value={form.nickname}
                                            onChange={e => setForm({ ...form, nickname: e.target.value })}
                                            placeholder="VD: Tun Tỏn"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Team (Tùy chọn)</Label>
                                        <Input
                                            value={form.team}
                                            onChange={e => setForm({ ...form, team: e.target.value })}
                                            placeholder="VD: MU"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Điểm số</Label>
                                        <Input
                                            required
                                            type="number"
                                            min={0}
                                            value={form.points}
                                            onChange={e => setForm({ ...form, points: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Thứ hạng tĩnh (Tùy chọn)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={form.rank || ""}
                                            onChange={e => setForm({ ...form, rank: Number(e.target.value) })}
                                            placeholder="Tự động xếp hạng nếu để trống"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Link Facebook (Tùy chọn)</Label>
                                    <Input
                                        type="url"
                                        value={form.facebook}
                                        onChange={e => setForm({ ...form, facebook: e.target.value })}
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="excel" className="space-y-4 m-0 outline-none">
                                <div className="flex justify-between items-center text-[13px]">
                                    <p className="text-gray-500">Tải lên file định dạng <span className="font-semibold text-gray-700">.xlsx, .csv</span></p>
                                    <a href="/assets/bxh.xlsx" download="BXH_Mau.xlsx" className="text-efb-blue hover:underline flex items-center gap-1 font-semibold">
                                        <Download className="w-3.5 h-3.5" /> Tải file mẫu
                                    </a>
                                </div>

                                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors relative cursor-pointer ${excelFile ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'}`}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleExcelChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className={`w-8 h-8 mx-auto mb-3 transition-transform group-hover:scale-110 ${excelFile ? 'text-emerald-500' : 'text-blue-400'}`} />
                                    <p className={`text-sm font-semibold ${excelFile ? 'text-emerald-900' : 'text-blue-900'}`}>
                                        {excelFile ? excelFile.name : "Kéo thả hoặc click để chọn file"}
                                    </p>
                                    {!excelFile && <p className="text-[11px] text-blue-500 mt-1.5 uppercase font-medium tracking-wide">Dung lượng tối đa 5MB</p>}
                                </div>



                                {excelPreview.length > 0 && (
                                    <>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <div className="flex items-center h-5">
                                                    <input
                                                        type="checkbox"
                                                        checked={excelReplaceAll}
                                                        onChange={(e) => setExcelReplaceAll(e.target.checked)}
                                                        className="w-4 h-4 border-slate-300 rounded text-indigo-600 focus:ring-indigo-600"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-800">Xóa dữ liệu cũ và thay thế toàn bộ (Replace All)</span>
                                                    <span className="text-[12px] text-slate-500">Hệ thống sẽ xóa sạch danh sách hiện tại và chỉ lưu các VĐV trong file Excel này. Nếu không chọn, hệ thống sẽ thêm/cập nhật danh sách cũ.</span>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 max-h-[180px] overflow-y-auto">
                                            <p className="text-[13px] font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                                Xem trước ({excelPreview.length} VĐV hợp lệ/ {excelPreview.length > 5 ? "hiển thị 5" : "tất cả"}):
                                            </p>
                                            <div className="space-y-1.5">
                                                {excelPreview.slice(0, 5).map((row, i) => (
                                                    <div key={i} className="text-[13px] flex gap-2 text-slate-600 border-b border-emerald-100/50 pb-1.5 last:border-0 last:pb-0">
                                                        <span className="font-bold text-slate-400 w-8 shrink-0">#{row.rank || "?"}</span>
                                                        <span className="font-mono text-indigo-500 w-24 shrink-0 font-medium truncate">{row.gamerId}</span>
                                                        <span className="font-bold text-slate-800 truncate flex-1 min-w-0">{row.name}</span>
                                                        <span className="ml-auto font-black text-slate-900 shrink-0 whitespace-nowrap">{row.points}</span>
                                                    </div>
                                                ))}
                                                {excelPreview.length > 5 && (
                                                    <div className="text-[12px] text-emerald-600/80 font-medium text-center pt-2 italic">
                                                        ... và {excelPreview.length - 5} VĐV khác 🚀
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="w-full flex-1" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
                                    Hủy
                                </Button>
                                <Button type="submit" className={`w-full flex-1 text-white ${addMode === "excel" && excelReplaceAll ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"}`} disabled={isSubmitting || (addMode === "excel" && excelPreview.length === 0)}>
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : addMode === "excel" ? (excelReplaceAll ? `Thay thế bằng ${excelPreview.length || ""} VĐV` : `Lưu ${excelPreview.length || ""} VĐV`) : "Lưu lại"}
                                </Button>
                            </div>
                        </form>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}
