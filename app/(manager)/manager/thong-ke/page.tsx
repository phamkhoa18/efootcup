"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    BarChart3, TrendingUp, Users, Trophy, Eye, Gamepad2,
    Download, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight,
    Loader2, PieChart, Filter, FileText, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardAPI } from "@/lib/api";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function StatisticsPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTimeline, setActiveTimeline] = useState<"registrations" | "matches">("registrations");

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await dashboardAPI.getReports();
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Load stats error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!data) return;

        // Prepare data for export
        const performanceData = data.performance.map((p: any) => ({
            "Tên giải đấu": p.title,
            "Trạng thái": p.status,
            "Lượt xem": p.views,
            "Đăng ký": p.registrations,
            "Tỷ lệ chuyển đổi (%)": p.conversion
        }));

        const ws = XLSX.utils.json_to_sheet(performanceData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Báo cáo hiệu quả");
        XLSX.writeFile(wb, `BaoCao_eFootCup_${format(new Date(), "ddMMyyyy")}.xlsx`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    const { overview, dailyStats, performance, statusDistribution } = data || {};

    const maxVal = Math.max(...dailyStats.map((d: any) => d[activeTimeline]), 5);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-efb-dark tracking-tight">Thống kê & Báo cáo</h1>
                    <p className="text-sm text-efb-text-muted mt-1">Phân tích chuyên sâu về các giải đấu của bạn</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl h-10 px-4 gap-2" onClick={exportToExcel}>
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </Button>
                    <Button className="bg-efb-blue text-white rounded-xl h-10 px-4 gap-2">
                        <FileText className="w-4 h-4" />
                        Báo cáo PDF
                    </Button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Tổng giải đấu", value: overview.totalTournaments, icon: Trophy, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "VĐV đăng ký", value: overview.totalRegistrations, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Trận đấu tổ chức", value: overview.totalMatches, icon: Gamepad2, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Doanh thu ước tính", value: overview.totalRevenue?.toLocaleString() + " VNĐ", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                    >
                        <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-bold text-efb-dark truncate" title={String(stat.value)}>{stat.value}</div>
                        <div className="text-xs text-efb-text-muted mt-1">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Timeline Chart (Custom SVG) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-base font-bold text-efb-dark">Biểu đồ tăng trưởng</h2>
                        <p className="text-xs text-efb-text-muted mt-0.5">Dữ liệu trong 30 ngày gần nhất</p>
                    </div>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTimeline("registrations")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTimeline === "registrations" ? "bg-white text-efb-blue shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            Đăng ký
                        </button>
                        <button
                            onClick={() => setActiveTimeline("matches")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTimeline === "matches" ? "bg-white text-efb-blue shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            Trận đấu
                        </button>
                    </div>
                </div>

                <div className="relative h-64 w-full flex items-end gap-[1%] px-2">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-1 border-b border-gray-100 pointer-events-none">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="w-full border-t border-gray-50 flex items-center">
                                <span className="text-[10px] text-gray-300 -ml-8 w-6 text-right">
                                    {Math.round(maxVal - (maxVal * i / 3))}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Bars */}
                    {dailyStats.map((d: any, i: number) => {
                        const val = d[activeTimeline];
                        const height = (val / maxVal) * 100;
                        return (
                            <div key={d.date} className="group relative flex-1 flex flex-col items-center">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(height, 2)}%` }}
                                    className={`w-full max-w-[12px] rounded-t-sm transition-colors cursor-pointer ${activeTimeline === "registrations" ? "bg-efb-blue/60 group-hover:bg-efb-blue" : "bg-emerald-400/60 group-hover:bg-emerald-400"}`}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-efb-dark text-white p-2 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                    <div className="font-bold">{val} {activeTimeline === "registrations" ? "Lượt ĐK" : "Trận đấu"}</div>
                                    <div className="text-white/60">{format(new Date(d.date), "dd/MM")}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-4 px-2">
                    <span className="text-[10px] text-gray-400 font-medium">{format(new Date(dailyStats[0].date), "dd/MM")}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Hôm nay</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Performance Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-base font-bold text-efb-dark">Hiệu quả giải đấu</h2>
                        <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4 text-left font-bold">Giải đấu</th>
                                    <th className="px-6 py-4 text-center font-bold">Lượt xem</th>
                                    <th className="px-6 py-4 text-center font-bold">Đăng ký</th>
                                    <th className="px-6 py-4 text-center font-bold">Tỷ lệ</th>
                                    <th className="px-6 py-4 text-right font-bold">Xu hướng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {performance.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-efb-dark truncate max-w-[200px]">{p.title}</div>
                                            <div className="text-[10px] text-efb-text-muted mt-0.5">{p.status === 'registration' ? 'Đang mở' : 'Hoàn thành'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-efb-text-secondary">{p.views}</td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-efb-dark">{p.registrations}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full inline-block">
                                                {p.conversion}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ArrowUpRight className="w-4 h-4 text-emerald-500 ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Share */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-efb-dark mb-6">Trạng thái giải đấu</h2>

                    <div className="space-y-6">
                        {[
                            { label: "Đang mở đăng ký", count: statusDistribution.registration, color: "bg-blue-500", total: overview.totalTournaments },
                            { label: "Đang diễn ra", count: statusDistribution.ongoing, color: "bg-red-500", total: overview.totalTournaments },
                            { label: "Đã hoàn thành", count: statusDistribution.completed, color: "bg-emerald-500", total: overview.totalTournaments },
                            { label: "Bản nháp", count: statusDistribution.draft, color: "bg-gray-400", total: overview.totalTournaments },
                        ].map((item) => (
                            <div key={item.label} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-efb-text-secondary">{item.label}</span>
                                    <span className="text-efb-dark">{item.count} giải</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.count / item.total) * 100}%` }}
                                        className={`h-full ${item.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-4 bg-efb-blue/5 rounded-2xl border border-efb-blue/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-efb-blue/10 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-efb-blue" />
                            </div>
                            <span className="text-sm font-bold text-efb-blue">Phân tích</span>
                        </div>
                        <p className="text-xs text-efb-text-secondary leading-relaxed">
                            Giải đấu của bạn có tỷ lệ chuyển đổi trung bình <span className="font-bold text-efb-blue">12.5%</span>.
                            Các giải đấu vào cuối tuần có lượt đăng ký cao hơn 40%.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
