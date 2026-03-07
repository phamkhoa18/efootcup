"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    DollarSign, TrendingUp, TrendingDown, Plus, Download, Loader2,
    Trash2, Edit3, Calendar, Users, Trophy, CreditCard, Megaphone,
    MapPin, Wrench, Package, MoreHorizontal, RefreshCw, X, ArrowUpRight, ArrowDownRight,
    PieChart, BarChart3, FileSpreadsheet, Wallet, Target, CircleDollarSign
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const categoryConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    prize: { label: "Giải thưởng", icon: Trophy, color: "text-amber-600", bgColor: "bg-amber-50" },
    venue: { label: "Địa điểm", icon: MapPin, color: "text-blue-600", bgColor: "bg-blue-50" },
    sponsor: { label: "Tài trợ", icon: CircleDollarSign, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    registration: { label: "Phí đăng ký", icon: Users, color: "text-indigo-600", bgColor: "bg-indigo-50" },
    marketing: { label: "Truyền thông", icon: Megaphone, color: "text-pink-600", bgColor: "bg-pink-50" },
    operations: { label: "Vận hành", icon: Wrench, color: "text-orange-600", bgColor: "bg-orange-50" },
    equipment: { label: "Thiết bị", icon: Package, color: "text-purple-600", bgColor: "bg-purple-50" },
    other: { label: "Khác", icon: MoreHorizontal, color: "text-gray-600", bgColor: "bg-gray-50" },
};

const chartColors = [
    "#f59e0b", "#3b82f6", "#10b981", "#6366f1", "#ec4899",
    "#f97316", "#8b5cf6", "#6b7280",
];

export default function ChiPhiPage() {
    const params = useParams();
    const id = params.id as string;

    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    // Add/Edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [formData, setFormData] = useState({
        label: "", amount: "", type: "expense" as "income" | "expense",
        category: "other", notes: "", date: new Date().toISOString().split("T")[0],
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await tournamentAPI.getExpenses(id);
            if (res.success) {
                setExpenses(res.data?.expenses || []);
                setSummary(res.data?.summary || null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải dữ liệu chi phí");
        } finally {
            setIsLoading(false);
        }
    };

    // Filtered data
    const filtered = useMemo(() => {
        if (filter === "all") return expenses;
        return expenses.filter(e => e.type === filter);
    }, [expenses, filter]);

    // Chart data for expense categories
    const expenseCategoryData = useMemo(() => {
        if (!summary?.categoryBreakdown) return [];
        const categories = Object.entries(summary.categoryBreakdown)
            .map(([cat, vals]: [string, any]) => ({
                category: cat,
                label: categoryConfig[cat]?.label || cat,
                income: vals.income || 0,
                expense: vals.expense || 0,
                total: (vals.income || 0) + (vals.expense || 0),
            }))
            .filter(c => c.total > 0)
            .sort((a, b) => b.total - a.total);
        return categories;
    }, [summary]);

    // Donut chart data (expenses only)
    const donutData = useMemo(() => {
        if (!summary?.categoryBreakdown) return [];
        return Object.entries(summary.categoryBreakdown)
            .map(([cat, vals]: [string, any]) => ({
                category: cat,
                label: categoryConfig[cat]?.label || cat,
                value: vals.expense || 0,
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [summary]);

    const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

    // Format currency
    const fmt = (n: number) => n.toLocaleString("vi-VN");

    // ----- CRUD Handlers -----
    const openAddModal = (type: "income" | "expense") => {
        setEditingExpense(null);
        setFormData({
            label: "", amount: "", type,
            category: type === "income" ? "sponsor" : "operations",
            notes: "", date: new Date().toISOString().split("T")[0],
        });
        setIsModalOpen(true);
    };

    const openEditModal = (exp: any) => {
        setEditingExpense(exp);
        setFormData({
            label: exp.label,
            amount: String(exp.amount),
            type: exp.type,
            category: exp.category,
            notes: exp.notes || "",
            date: exp.date ? new Date(exp.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.label.trim()) return toast.error("Vui lòng nhập tên khoản");
        if (!formData.amount || Number(formData.amount) <= 0) return toast.error("Số tiền phải lớn hơn 0");

        setIsSaving(true);
        try {
            if (editingExpense) {
                const res = await tournamentAPI.updateExpense(id, {
                    expenseId: editingExpense._id,
                    ...formData,
                    amount: Number(formData.amount),
                });
                if (res.success) {
                    toast.success("Đã cập nhật");
                    setIsModalOpen(false);
                    loadData();
                } else toast.error(res.message);
            } else {
                const res = await tournamentAPI.addExpense(id, {
                    ...formData,
                    amount: Number(formData.amount),
                });
                if (res.success) {
                    toast.success("Đã thêm khoản thu/chi");
                    setIsModalOpen(false);
                    loadData();
                } else toast.error(res.message);
            }
        } catch (err) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (expenseId: string) => {
        if (!confirm("Bạn có chắc muốn xóa khoản này?")) return;
        try {
            const res = await tournamentAPI.deleteExpense(id, expenseId);
            if (res.success) {
                toast.success("Đã xóa");
                loadData();
            } else toast.error(res.message);
        } catch (err) {
            toast.error("Có lỗi xảy ra");
        }
    };

    // ----- Export -----
    const handleExport = () => {
        const allItems: any[] = [];

        // Registration income row (auto)
        if (summary?.registrationIncome > 0) {
            allItems.push({
                "Loại": "Thu",
                "Danh mục": "Phí đăng ký",
                "Tên khoản": `Phí đăng ký (${summary.registrationCount} VĐV × ${fmt(summary.entryFee)}đ)`,
                "Số tiền": summary.registrationIncome,
                "Ngày": "",
                "Ghi chú": "Tự động tính từ hệ thống",
            });
        }

        expenses.forEach(e => {
            allItems.push({
                "Loại": e.type === "income" ? "Thu" : "Chi",
                "Danh mục": categoryConfig[e.category]?.label || e.category,
                "Tên khoản": e.label,
                "Số tiền": e.amount,
                "Ngày": e.date ? new Date(e.date).toLocaleDateString("vi-VN") : "",
                "Ghi chú": e.notes || "",
            });
        });

        // Summary rows
        allItems.push({});
        allItems.push({ "Loại": "", "Danh mục": "", "Tên khoản": "TỔNG THU", "Số tiền": summary?.totalIncome || 0 });
        allItems.push({ "Loại": "", "Danh mục": "", "Tên khoản": "TỔNG CHI", "Số tiền": summary?.totalExpense || 0 });
        allItems.push({ "Loại": "", "Danh mục": "", "Tên khoản": "CHÊNH LỆCH", "Số tiền": summary?.balance || 0 });

        const ws = XLSX.utils.json_to_sheet(allItems);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chi phí");

        // Column widths
        ws["!cols"] = [
            { wch: 8 }, { wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 30 },
        ];

        XLSX.writeFile(wb, `chi-phi-giai-dau.xlsx`);
        toast.success("Đã xuất Excel");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu chi phí...</p>
            </div>
        );
    }

    const balanceColor = (summary?.balance || 0) >= 0 ? "text-emerald-600" : "text-red-500";
    const balanceGradient = (summary?.balance || 0) >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600";

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                        Thống kê chi phí
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 ml-4">Quản lý thu chi toàn bộ giải đấu</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Tổng thu", value: summary?.totalIncome || 0, icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600", text: "text-emerald-600", prefix: "+" },
                    { label: "Tổng chi", value: summary?.totalExpense || 0, icon: TrendingDown, gradient: "from-red-500 to-rose-600", text: "text-red-500", prefix: "-" },
                    { label: "Chênh lệch", value: Math.abs(summary?.balance || 0), icon: Wallet, gradient: balanceGradient, text: balanceColor, prefix: (summary?.balance || 0) >= 0 ? "+" : "-" },
                    { label: "Phí đăng ký", value: summary?.registrationIncome || 0, icon: CreditCard, gradient: "from-indigo-500 to-indigo-600", text: "text-indigo-600", prefix: "+" },
                ].map((s) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-lg transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                    <s.icon className="w-5 h-5 text-white" />
                                </div>
                                {s.label === "Chênh lệch" && (
                                    <Badge variant="outline" className={`text-[10px] font-bold ${(summary?.balance || 0) >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                                        {(summary?.balance || 0) >= 0 ? "Lãi" : "Lỗ"}
                                    </Badge>
                                )}
                            </div>
                            <div className={`text-xl font-extrabold ${s.text} tracking-tight tabular-nums`}>
                                {s.prefix}{fmt(s.value)} ₫
                            </div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{s.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Sub-info */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100/50 rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
            >
                <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span><span className="font-bold">{summary?.registrationCount || 0}</span> VĐV đã thanh toán</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>Lệ phí: <span className="font-bold">{fmt(summary?.entryFee || 0)} ₫</span>/VĐV</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Giải thưởng: <span className="font-bold">{fmt(summary?.prizePool || 0)} ₫</span></span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                    <span><span className="font-bold">{expenses.length}</span> khoản ghi nhận</span>
                </div>
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Category Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <h3 className="text-sm font-bold text-gray-900">Phân tích theo danh mục</h3>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Thu</div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-400" /> Chi</div>
                        </div>
                    </div>

                    {expenseCategoryData.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        <div className="space-y-4">
                            {expenseCategoryData.map((cat) => {
                                const maxVal = Math.max(...expenseCategoryData.map(c => Math.max(c.income, c.expense)));
                                const CatIcon = categoryConfig[cat.category]?.icon || MoreHorizontal;
                                return (
                                    <div key={cat.category}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <CatIcon className={`w-3.5 h-3.5 ${categoryConfig[cat.category]?.color || "text-gray-500"}`} />
                                                <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
                                            </div>
                                            <span className="text-xs text-gray-400 tabular-nums">{fmt(cat.total)} ₫</span>
                                        </div>
                                        <div className="flex gap-1 h-5">
                                            {cat.income > 0 && (
                                                <div
                                                    className="bg-emerald-400 rounded-l-md rounded-r-sm h-full transition-all duration-500 flex items-center justify-center"
                                                    style={{ width: `${Math.max(4, (cat.income / maxVal) * 100)}%` }}
                                                >
                                                    {cat.income / maxVal > 0.15 && (
                                                        <span className="text-[9px] font-bold text-white">{fmt(cat.income)}</span>
                                                    )}
                                                </div>
                                            )}
                                            {cat.expense > 0 && (
                                                <div
                                                    className="bg-red-400 rounded-r-md rounded-l-sm h-full transition-all duration-500 flex items-center justify-center"
                                                    style={{ width: `${Math.max(4, (cat.expense / maxVal) * 100)}%` }}
                                                >
                                                    {cat.expense / maxVal > 0.15 && (
                                                        <span className="text-[9px] font-bold text-white">{fmt(cat.expense)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Donut Chart - Expense Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-bold text-gray-900">Tỷ lệ chi phí</h3>
                    </div>

                    {donutData.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">Chưa có khoản chi nào</div>
                    ) : (
                        <div className="flex items-center gap-8">
                            {/* CSS Conic Gradient Donut */}
                            <div className="relative w-40 h-40 flex-shrink-0">
                                <div
                                    className="w-full h-full rounded-full"
                                    style={{
                                        background: `conic-gradient(${donutData.map((d, i) => {
                                            const startPct = donutData.slice(0, i).reduce((s, dd) => s + (dd.value / donutTotal) * 100, 0);
                                            const endPct = startPct + (d.value / donutTotal) * 100;
                                            return `${chartColors[i % chartColors.length]} ${startPct}% ${endPct}%`;
                                        }).join(", ")})`,
                                    }}
                                />
                                <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                                    <span className="text-xs text-gray-400 font-medium">Tổng chi</span>
                                    <span className="text-sm font-extrabold text-gray-900">{fmt(donutTotal)}</span>
                                    <span className="text-[10px] text-gray-400">VNĐ</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-2">
                                {donutData.map((d, i) => (
                                    <div key={d.category} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                                style={{ backgroundColor: chartColors[i % chartColors.length] }}
                                            />
                                            <span className="text-xs text-gray-600 font-medium">{d.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-700 tabular-nums">{fmt(d.value)} ₫</span>
                                            <span className="text-[10px] text-gray-400 ml-1.5">
                                                ({((d.value / donutTotal) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Income/Expense Progress Bar */}
            {(summary?.totalIncome > 0 || summary?.totalExpense > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                >
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        Tổng quan thu chi
                    </h3>
                    <div className="h-6 rounded-full bg-gray-100 overflow-hidden flex">
                        {summary?.totalIncome > 0 && (
                            <div
                                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full flex items-center justify-center transition-all duration-700"
                                style={{ width: `${(summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100}%` }}
                            >
                                <span className="text-[10px] font-bold text-white whitespace-nowrap px-2">
                                    Thu: {fmt(summary.totalIncome)} ₫
                                </span>
                            </div>
                        )}
                        {summary?.totalExpense > 0 && (
                            <div
                                className="bg-gradient-to-r from-red-400 to-rose-500 h-full flex items-center justify-center transition-all duration-700"
                                style={{ width: `${(summary.totalExpense / (summary.totalIncome + summary.totalExpense)) * 100}%` }}
                            >
                                <span className="text-[10px] font-bold text-white whitespace-nowrap px-2">
                                    Chi: {fmt(summary.totalExpense)} ₫
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                        <span>Thu chiếm {((summary?.totalIncome / ((summary?.totalIncome || 0) + (summary?.totalExpense || 0))) * 100 || 0).toFixed(1)}%</span>
                        <span>Chi chiếm {((summary?.totalExpense / ((summary?.totalIncome || 0) + (summary?.totalExpense || 0))) * 100 || 0).toFixed(1)}%</span>
                    </div>
                </motion.div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Tabs value={filter} onValueChange={setFilter} className="w-auto">
                    <TabsList className="h-10 rounded-xl bg-gray-100/80 p-1 gap-0.5">
                        <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                            Tất cả ({expenses.length})
                        </TabsTrigger>
                        <TabsTrigger value="income" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> Thu
                        </TabsTrigger>
                        <TabsTrigger value="expense" className="rounded-lg text-xs font-semibold px-3 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm">
                            <ArrowDownRight className="w-3 h-3 mr-1" /> Chi
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => openAddModal("income")}
                        className="h-9 px-4 rounded-xl text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm shadow-emerald-500/20"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Thêm khoản thu
                    </Button>
                    <Button
                        onClick={() => openAddModal("expense")}
                        className="h-9 px-4 rounded-xl text-sm bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm shadow-red-500/20"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Thêm khoản chi
                    </Button>
                </div>
            </div>

            {/* Auto Registration Income Row */}
            {summary?.registrationIncome > 0 && (filter === "all" || filter === "income") && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/60 rounded-2xl p-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-900">Phí đăng ký (tự động)</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {summary.registrationCount} VĐV × {fmt(summary.entryFee)} ₫ = <span className="font-bold text-indigo-600">{fmt(summary.registrationIncome)} ₫</span>
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 text-xs font-bold">
                        Tự động từ hệ thống
                    </Badge>
                </motion.div>
            )}

            {/* Expense List */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Chi tiết thu chi</h3>
                    <span className="text-xs text-gray-400">{filtered.length} khoản</span>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                            <DollarSign className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Chưa có khoản thu/chi nào</p>
                        <p className="text-xs text-gray-400 mt-1">Bấm nút "Thêm" ở trên để bắt đầu</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((e, i) => {
                            const catConfig = categoryConfig[e.category] || categoryConfig.other;
                            const CatIcon = catConfig.icon;
                            return (
                                <motion.div
                                    key={e._id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${catConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                            <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{e.label}</span>
                                                <Badge variant="outline" className={`text-[9px] font-bold ${catConfig.bgColor} ${catConfig.color} border-transparent`}>
                                                    {catConfig.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {e.date && (
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(e.date).toLocaleDateString("vi-VN")}
                                                    </span>
                                                )}
                                                {e.notes && (
                                                    <span className="text-[11px] text-gray-400 italic truncate max-w-[200px]">{e.notes}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-bold tabular-nums ${e.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                                            {e.type === "income" ? "+" : "-"}{fmt(e.amount)} ₫
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(e)}
                                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(e._id)}
                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md bg-white border-0 shadow-2xl p-0 gap-0 rounded-2xl overflow-hidden">
                    <div className="p-5 px-6 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/50">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${formData.type === "income" ? "from-emerald-500 to-emerald-600" : "from-red-500 to-rose-600"} flex items-center justify-center shadow-md`}>
                            {formData.type === "income" ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">
                                {editingExpense ? "Sửa" : "Thêm"} khoản {formData.type === "income" ? "thu" : "chi"}
                            </DialogTitle>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Type toggle */}
                        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, type: "income" }))}
                                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${formData.type === "income" ? "bg-emerald-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                                <ArrowUpRight className="w-4 h-4 inline mr-1" /> Khoản thu
                            </button>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, type: "expense" }))}
                                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${formData.type === "expense" ? "bg-red-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                                <ArrowDownRight className="w-4 h-4 inline mr-1" /> Khoản chi
                            </button>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tên khoản *</Label>
                            <Input
                                value={formData.label}
                                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="VD: Giải thưởng vô địch, Thuê sân..."
                                className="mt-1.5 h-10 rounded-xl border-gray-200"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Số tiền (VNĐ) *</Label>
                                <Input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="500000"
                                    className="mt-1.5 h-10 rounded-xl border-gray-200"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ngày</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="mt-1.5 h-10 rounded-xl border-gray-200"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Danh mục</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger className="mt-1.5 h-10 rounded-xl border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(categoryConfig).filter(([k]) => k !== "registration").map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            <span className="flex items-center gap-2">
                                                <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                                                {config.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ghi chú</Label>
                            <Input
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Ghi chú thêm..."
                                className="mt-1.5 h-10 rounded-xl border-gray-200"
                            />
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="px-5 h-10 rounded-xl border-gray-200 font-semibold">
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-6 h-10 rounded-xl font-bold shadow-sm text-white ${formData.type === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            {editingExpense ? "Cập nhật" : "Thêm khoản"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
