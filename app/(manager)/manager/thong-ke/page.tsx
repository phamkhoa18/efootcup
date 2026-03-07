"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    BarChart3, TrendingUp, Users, Trophy, Eye, Gamepad2,
    Download, Calendar, ArrowUpRight, ArrowDownRight,
    Loader2, PieChart, DollarSign, Target, Activity,
    RefreshCw, ChevronRight, Percent, Zap, Clock, CheckCircle2,
    Flame, FileX, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dashboardAPI } from "@/lib/api";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const chartColors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
    "#6366f1", "#ec4899", "#8b5cf6", "#6b7280"
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    draft: { label: "Nháp", color: "text-gray-500", bg: "bg-gray-100", icon: Clock },
    registration: { label: "Mở đăng ký", color: "text-blue-600", bg: "bg-blue-100", icon: Users },
    ongoing: { label: "Đang diễn ra", color: "text-red-600", bg: "bg-red-100", icon: Flame },
    completed: { label: "Hoàn thành", color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "text-gray-400", bg: "bg-gray-50", icon: FileX },
};

export default function StatisticsPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [chartMode, setChartMode] = useState<"registrations" | "matches">("registrations");
    const [chartView, setChartView] = useState<"bar" | "line">("bar");

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const res = await dashboardAPI.getReports();
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Load stats error:", error);
            toast.error("Không thể tải dữ liệu thống kê");
        } finally {
            setIsLoading(false);
        }
    };

    // Derived data
    const { overview, dailyStats, performance, statusDistribution } = data || {};

    const maxChartVal = useMemo(() => {
        if (!dailyStats) return 5;
        return Math.max(...dailyStats.map((d: any) => d[chartMode]), 5);
    }, [dailyStats, chartMode]);

    // Avg conversion
    const avgConversion = useMemo(() => {
        if (!performance || performance.length === 0) return 0;
        const total = performance.reduce((s: number, p: any) => s + Number(p.conversion || 0), 0);
        return (total / performance.length).toFixed(1);
    }, [performance]);

    // Last 7 days registrations
    const last7DaysRegs = useMemo(() => {
        if (!dailyStats) return 0;
        return dailyStats.slice(-7).reduce((s: number, d: any) => s + d.registrations, 0);
    }, [dailyStats]);

    // Last 7 days matches
    const last7DaysMatches = useMemo(() => {
        if (!dailyStats) return 0;
        return dailyStats.slice(-7).reduce((s: number, d: any) => s + d.matches, 0);
    }, [dailyStats]);

    // Previous 7 days for growth comparison
    const prev7DaysRegs = useMemo(() => {
        if (!dailyStats || dailyStats.length < 14) return 0;
        return dailyStats.slice(-14, -7).reduce((s: number, d: any) => s + d.registrations, 0);
    }, [dailyStats]);

    const regsGrowth = useMemo(() => {
        if (prev7DaysRegs === 0) return last7DaysRegs > 0 ? 100 : 0;
        return (((last7DaysRegs - prev7DaysRegs) / prev7DaysRegs) * 100).toFixed(1);
    }, [last7DaysRegs, prev7DaysRegs]);

    // Donut data from status distribution
    const donutData = useMemo(() => {
        if (!statusDistribution) return [];
        return Object.entries(statusDistribution)
            .map(([status, count]) => ({
                status,
                count: count as number,
                label: statusConfig[status]?.label || status,
            }))
            .filter(d => d.count > 0);
    }, [statusDistribution]);
    const donutTotal = donutData.reduce((s, d) => s + d.count, 0);

    // Top tournaments by revenue
    const topByRevenue = useMemo(() => {
        if (!performance) return [];
        return [...performance].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
    }, [performance]);

    // Export full stats
    const exportToExcel = () => {
        if (!data) return;

        const wb = XLSX.utils.book_new();

        // Sheet 1: Overview
        const overviewSheet = XLSX.utils.json_to_sheet([{
            "Tổng giải đấu": overview.totalTournaments,
            "Tổng VĐV": overview.totalRegistrations,
            "Tổng trận đấu": overview.totalMatches,
            "Tổng lượt xem": overview.totalViews,
            "Doanh thu ước tính (VNĐ)": overview.totalRevenue,
        }]);
        XLSX.utils.book_append_sheet(wb, overviewSheet, "Tổng quan");

        // Sheet 2: Daily Stats
        const dailySheet = XLSX.utils.json_to_sheet(dailyStats.map((d: any) => ({
            "Ngày": d.date,
            "Lượt đăng ký": d.registrations,
            "Trận đấu": d.matches,
        })));
        XLSX.utils.book_append_sheet(wb, dailySheet, "Thống kê theo ngày");

        // Sheet 3: Tournament Performance
        const perfSheet = XLSX.utils.json_to_sheet(performance.map((p: any) => ({
            "Tên giải đấu": p.title,
            "Trạng thái": statusConfig[p.status]?.label || p.status,
            "Lượt xem": p.views,
            "VĐV đăng ký": p.registrations,
            "Tối đa": p.maxTeams,
            "Tỷ lệ chuyển đổi (%)": p.conversion,
            "Lệ phí (VNĐ)": p.entryFee,
            "Doanh thu (VNĐ)": p.revenue,
        })));
        XLSX.utils.book_append_sheet(wb, perfSheet, "Hiệu quả giải đấu");

        // Sheet 4: Status Distribution
        const statusSheet = XLSX.utils.json_to_sheet(
            Object.entries(statusDistribution).map(([status, count]) => ({
                "Trạng thái": statusConfig[status]?.label || status,
                "Số lượng": count,
            }))
        );
        XLSX.utils.book_append_sheet(wb, statusSheet, "Phân bổ trạng thái");

        XLSX.writeFile(wb, `ThongKe_eFootCup_${format(new Date(), "ddMMyyyy")}.xlsx`);
        toast.success("Đã xuất Excel thành công");
    };

    const fmt = (n: number) => (n || 0).toLocaleString("vi-VN");

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu thống kê...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Không có dữ liệu</h3>
                <p className="text-sm text-gray-400">Tạo giải đấu đầu tiên để bắt đầu theo dõi thống kê</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                        Thống kê tổng quan
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 ml-4">Phân tích chuyên sâu về các giải đấu của bạn</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={loadStats}
                        className="h-9 w-9 p-0 rounded-xl border-gray-200 text-gray-500 hover:text-blue-500"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={exportToExcel}
                        className="h-9 px-4 rounded-xl text-sm border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 font-medium"
                    >
                        <Download className="w-4 h-4 mr-1.5" /> Xuất Excel
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Tổng giải đấu", value: overview.totalTournaments, icon: Trophy, gradient: "from-blue-500 to-indigo-600", text: "text-blue-600" },
                    { label: "VĐV đăng ký", value: fmt(overview.totalRegistrations), icon: Users, gradient: "from-purple-500 to-purple-600", text: "text-purple-600" },
                    { label: "Trận đấu", value: fmt(overview.totalMatches), icon: Gamepad2, gradient: "from-amber-500 to-orange-600", text: "text-amber-600" },
                    { label: "Doanh thu", value: `${fmt(overview.totalRevenue)} ₫`, icon: DollarSign, gradient: "from-emerald-500 to-emerald-600", text: "text-emerald-600" },
                ].map((s, i) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-lg transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                    <s.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className={`text-xl font-extrabold ${s.text} tracking-tight tabular-nums`}>{s.value}</div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{s.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Insights Bar */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100/50 rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
            >
                <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>7 ngày qua: <span className="font-bold">{last7DaysRegs}</span> ĐK mới</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Tăng trưởng: <span className={`font-bold ${Number(regsGrowth) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{Number(regsGrowth) >= 0 ? "+" : ""}{regsGrowth}%</span></span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <Gamepad2 className="w-4 h-4 text-amber-500" />
                    <span>7 ngày qua: <span className="font-bold">{last7DaysMatches}</span> trận</span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <Percent className="w-4 h-4 text-indigo-500" />
                    <span>Tỷ lệ chuyển đổi TB: <span className="font-bold text-indigo-600">{avgConversion}%</span></span>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2 text-gray-600">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>Tổng views: <span className="font-bold">{fmt(overview.totalViews)}</span></span>
                </div>
            </motion.div>

            {/* Timeline Chart */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Biểu đồ tăng trưởng</h2>
                            <p className="text-[11px] text-gray-400">30 ngày gần nhất</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs value={chartMode} onValueChange={(v: any) => setChartMode(v)}>
                            <TabsList className="h-8 rounded-lg bg-gray-100/80 p-0.5 gap-0.5">
                                <TabsTrigger value="registrations" className="rounded-md text-[11px] font-bold px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                                    Đăng ký
                                </TabsTrigger>
                                <TabsTrigger value="matches" className="rounded-md text-[11px] font-bold px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                                    Trận đấu
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Chart */}
                <div className="relative h-56 w-full flex items-end gap-[1%] px-6">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none px-6">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full border-t border-gray-50 flex items-center">
                                <span className="text-[9px] text-gray-300 -ml-6 w-5 text-right tabular-nums">
                                    {Math.round(maxChartVal - (maxChartVal * i / 4))}
                                </span>
                            </div>
                        ))}
                    </div>

                    {dailyStats.map((d: any, i: number) => {
                        const val = d[chartMode];
                        const height = (val / maxChartVal) * 100;
                        return (
                            <div key={d.date} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(height, 1)}%` }}
                                    transition={{ delay: i * 0.01 }}
                                    className={`w-full max-w-[14px] rounded-t transition-colors cursor-pointer ${chartMode === "registrations"
                                        ? "bg-blue-400/50 group-hover:bg-blue-500"
                                        : "bg-emerald-400/50 group-hover:bg-emerald-500"
                                        }`}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-gray-900 text-white p-2.5 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-xl">
                                    <div className="font-bold text-xs">{val} {chartMode === "registrations" ? "Lượt ĐK" : "Trận đấu"}</div>
                                    <div className="text-white/60 mt-0.5">{format(new Date(d.date), "dd/MM/yyyy")}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-3 px-6">
                    <span className="text-[10px] text-gray-400 font-medium">{dailyStats[0] ? format(new Date(dailyStats[0].date), "dd/MM") : ""}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Hôm nay</span>
                </div>

                {/* Chart Summary */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-50">
                    <div className="text-center">
                        <div className="text-lg font-extrabold text-gray-900 tabular-nums">
                            {dailyStats.reduce((s: number, d: any) => s + d.registrations, 0)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">Tổng ĐK (30 ngày)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-extrabold text-gray-900 tabular-nums">
                            {dailyStats.reduce((s: number, d: any) => s + d.matches, 0)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">Tổng trận (30 ngày)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-extrabold text-gray-900 tabular-nums">
                            {(dailyStats.reduce((s: number, d: any) => s + d.registrations, 0) / 30).toFixed(1)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">TB ĐK/ngày</div>
                    </div>
                </div>
            </motion.div>

            {/* Two Column: Performance Table + Distribution */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Performance Table */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h2 className="text-sm font-bold text-gray-900">Hiệu quả giải đấu</h2>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-gray-200">Top {performance.length}</Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-5 py-3 text-left">Giải đấu</th>
                                    <th className="px-3 py-3 text-center">Trạng thái</th>
                                    <th className="px-3 py-3 text-center">Views</th>
                                    <th className="px-3 py-3 text-center">VĐV</th>
                                    <th className="px-3 py-3 text-center">Chuyển đổi</th>
                                    <th className="px-4 py-3 text-right">Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {performance.map((p: any, i: number) => {
                                    const sc = statusConfig[p.status] || statusConfig.draft;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <Link href={`/manager/giai-dau/${p.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors truncate block max-w-[220px]">
                                                    {p.title}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                                                    <span className="w-1 h-1 rounded-full bg-current" />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3.5 text-center text-xs text-gray-500 tabular-nums">{fmt(p.views)}</td>
                                            <td className="px-3 py-3.5 text-center">
                                                <span className="text-xs font-bold text-gray-900 tabular-nums">{p.registrations}</span>
                                                <span className="text-[10px] text-gray-400">/{p.maxTeams}</span>
                                            </td>
                                            <td className="px-3 py-3.5 text-center">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${Number(p.conversion) >= 10 ? "bg-emerald-50 text-emerald-600" : Number(p.conversion) >= 5 ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                                                    {p.conversion}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-xs font-bold text-gray-900 tabular-nums">
                                                {p.revenue > 0 ? `${fmt(p.revenue)} ₫` : <span className="text-gray-300">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Status Donut + Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <PieChart className="w-5 h-5 text-purple-500" />
                        <h2 className="text-sm font-bold text-gray-900">Phân bổ trạng thái</h2>
                    </div>

                    {donutData.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        <>
                            {/* Donut */}
                            <div className="flex justify-center mb-6">
                                <div className="relative w-36 h-36">
                                    <div
                                        className="w-full h-full rounded-full"
                                        style={{
                                            background: `conic-gradient(${donutData.map((d, i) => {
                                                const startPct = donutData.slice(0, i).reduce((s, dd) => s + (dd.count / donutTotal) * 100, 0);
                                                const endPct = startPct + (d.count / donutTotal) * 100;
                                                return `${chartColors[i % chartColors.length]} ${startPct}% ${endPct}%`;
                                            }).join(", ")})`,
                                        }}
                                    />
                                    <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                                        <span className="text-xl font-extrabold text-gray-900">{donutTotal}</span>
                                        <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Giải đấu</span>
                                    </div>
                                </div>
                            </div>

                            {/* Legend + Progress */}
                            <div className="space-y-4">
                                {donutData.map((d, i) => {
                                    const sc = statusConfig[d.status];
                                    const pct = donutTotal > 0 ? ((d.count / donutTotal) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={d.status}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                                                    <span className="text-xs font-semibold text-gray-700">{d.label}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-gray-900">{d.count}</span>
                                                    <span className="text-[10px] text-gray-400 ml-1">({pct}%)</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ delay: 0.3 + i * 0.1 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: chartColors[i % chartColors.length] }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Bottom Row: Top Revenue + Key Metrics */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Revenue Tournaments */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-sm font-bold text-gray-900">Top doanh thu</h2>
                    </div>

                    {topByRevenue.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Chưa có dữ liệu doanh thu</div>
                    ) : (
                        <div className="space-y-3">
                            {topByRevenue.map((p: any, i: number) => {
                                const maxRev = topByRevenue[0]?.revenue || 1;
                                return (
                                    <div key={p.id}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-50 text-orange-500" : "bg-gray-50 text-gray-400"}`}>
                                                    {i + 1}
                                                </span>
                                                <Link href={`/manager/giai-dau/${p.id}`} className="text-xs font-semibold text-gray-800 hover:text-blue-600 truncate">
                                                    {p.title}
                                                </Link>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600 tabular-nums flex-shrink-0 ml-2">
                                                {p.revenue > 0 ? `${fmt(p.revenue)} ₫` : "—"}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden ml-7">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Key Metrics */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <h2 className="text-sm font-bold text-gray-900">Chỉ số nổi bật</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            {
                                label: "TB VĐV/giải",
                                value: overview.totalTournaments > 0 ? (overview.totalRegistrations / overview.totalTournaments).toFixed(1) : "0",
                                icon: Users, color: "text-blue-600", bg: "bg-blue-50"
                            },
                            {
                                label: "TB trận/giải",
                                value: overview.totalTournaments > 0 ? (overview.totalMatches / overview.totalTournaments).toFixed(1) : "0",
                                icon: Gamepad2, color: "text-amber-600", bg: "bg-amber-50"
                            },
                            {
                                label: "TB views/giải",
                                value: overview.totalTournaments > 0 ? Math.round(overview.totalViews / overview.totalTournaments) : "0",
                                icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50"
                            },
                            {
                                label: "Chuyển đổi TB",
                                value: `${avgConversion}%`,
                                icon: Target, color: "text-emerald-600", bg: "bg-emerald-50"
                            },
                            {
                                label: "DT TB/giải",
                                value: overview.totalTournaments > 0 ? `${fmt(Math.round(overview.totalRevenue / overview.totalTournaments))} ₫` : "0 ₫",
                                icon: DollarSign, color: "text-pink-600", bg: "bg-pink-50"
                            },
                            {
                                label: "Tăng trưởng 7 ngày",
                                value: `${Number(regsGrowth) >= 0 ? "+" : ""}${regsGrowth}%`,
                                icon: Number(regsGrowth) >= 0 ? ArrowUpRight : ArrowDownRight,
                                color: Number(regsGrowth) >= 0 ? "text-emerald-600" : "text-red-500",
                                bg: Number(regsGrowth) >= 0 ? "bg-emerald-50" : "bg-red-50"
                            },
                        ].map((m) => (
                            <div key={m.label} className={`${m.bg} rounded-xl p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <m.icon className={`w-4 h-4 ${m.color}`} />
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{m.label}</span>
                                </div>
                                <div className={`text-lg font-extrabold ${m.color} tabular-nums`}>{m.value}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Analysis Insight */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-5"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Phân tích tổng quan</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600 leading-relaxed">
                    <div className="flex items-start gap-2">
                        <div className="w-1 h-full min-h-[40px] bg-blue-400 rounded-full flex-shrink-0 mt-0.5" />
                        <p>
                            Bạn đã tổ chức <span className="font-bold text-blue-600">{overview.totalTournaments}</span> giải đấu,
                            thu hút <span className="font-bold text-blue-600">{fmt(overview.totalViews)}</span> lượt xem
                            với tỷ lệ chuyển đổi trung bình <span className="font-bold text-blue-600">{avgConversion}%</span>.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1 h-full min-h-[40px] bg-emerald-400 rounded-full flex-shrink-0 mt-0.5" />
                        <p>
                            Tổng cộng <span className="font-bold text-emerald-600">{fmt(overview.totalRegistrations)}</span> VĐV đăng ký
                            và <span className="font-bold text-emerald-600">{fmt(overview.totalMatches)}</span> trận đấu đã được tổ chức.
                            {overview.totalRevenue > 0 && <> Doanh thu ước tính đạt <span className="font-bold text-emerald-600">{fmt(overview.totalRevenue)} ₫</span>.</>}
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1 h-full min-h-[40px] bg-amber-400 rounded-full flex-shrink-0 mt-0.5" />
                        <p>
                            Trong 7 ngày qua có <span className="font-bold text-amber-600">{last7DaysRegs}</span> lượt đăng ký mới,
                            {Number(regsGrowth) >= 0
                                ? <> tăng <span className="font-bold text-emerald-600">{regsGrowth}%</span> so với tuần trước.</>
                                : <> giảm <span className="font-bold text-red-500">{Math.abs(Number(regsGrowth))}%</span> so với tuần trước.</>
                            }
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
