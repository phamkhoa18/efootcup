"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    FileText, Download, Filter, Search, Calendar,
    ChevronRight, ArrowRight, Loader2, ClipboardList,
    Trophy, Users, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardAPI, tournamentAPI } from "@/lib/api";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function ReportsPage() {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await tournamentAPI.getAll({ limit: "100" });
            if (res.success) {
                setTournaments(res.data.tournaments || []);
            }
        } catch (error) {
            console.error("Load reports error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportTournamentReport = (t: any) => {
        const data = [
            ["BÁO CÁO GIẢI ĐẤU", ""],
            ["Tên giải đấu", t.title],
            ["Trạng thái", t.status],
            ["Thể thức", t.format],
            ["Ngày bắt đầu", t.schedule?.tournamentStart ? format(new Date(t.schedule.tournamentStart), "dd/MM/yyyy") : "N/A"],
            ["Số đội đăng ký", `${t.currentTeams}/${t.maxTeams}`],
            ["Lượt xem", t.views],
            ["Phí tham gia", `${t.entryFee} ${t.currency}`],
            ["Doanh thu ước tính", (t.entryFee * t.currentTeams).toLocaleString() + " " + t.currency],
            ["", ""],
            ["DANH SÁCH VẬN ĐỘNG VIÊN", ""],
            ["STT", "Tên đội", "Người đại diện", "GamerID", "Trạng thái"]
        ];

        // This is a simplified export. In a real app, you'd fetch teams/registrations for this tournament too.

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
        XLSX.writeFile(wb, `BaoCao_${t.slug}.xlsx`);
    };

    const filtered = tournaments.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "all" || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-efb-dark tracking-tight">Trung tâm Báo cáo</h1>
                    <p className="text-sm text-efb-text-muted mt-1">Xuất dữ liệu và tổng hợp kết quả giải đấu</p>
                </div>
                <Button className="bg-efb-blue text-white rounded-xl h-10 gap-2">
                    <Download className="w-4 h-4" />
                    Xuất tất cả dữ liệu
                </Button>
            </div>

            {/* Filters */}
            <div className="card-white p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm giải đấu..."
                            className="pl-10 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="h-10 border rounded-xl px-4 text-sm bg-white outline-none focus:border-efb-blue"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="registration">Đang đăng ký</option>
                            <option value="ongoing">Đang diễn ra</option>
                            <option value="completed">Đã kết thúc</option>
                        </select>
                        <Button variant="outline" className="rounded-xl h-10 px-4">
                            <Filter className="w-4 h-4 mr-2" />
                            Lọc nâng cao
                        </Button>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="grid lg:grid-cols-1 gap-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 card-white">
                        <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-efb-text-muted">Không tìm thấy báo cáo nào phù hợp</p>
                    </div>
                ) : (
                    filtered.map((t, i) => (
                        <motion.div
                            key={t._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card-white p-5 flex flex-col md:flex-row items-center gap-6 hover:border-efb-blue/30 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-efb-blue/5 transition-colors">
                                <Trophy className="w-8 h-8 text-efb-blue/40" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-efb-dark truncate">{t.title}</h3>
                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-efb-text-muted">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {t.schedule?.tournamentStart ? format(new Date(t.schedule.tournamentStart), "dd/MM/yyyy") : "Chưa đặt lịch"}</span>
                                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t.currentTeams}/{t.maxTeams} Đội</span>
                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {t.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        {t.status === 'completed' ? 'Hoàn thành' : 'Đang thực hiện'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Link href={`/manager/giai-dau/${t._id}`} className="flex-1 md:flex-none">
                                    <Button variant="outline" className="w-full rounded-xl hover:bg-gray-50">
                                        Chi tiết
                                    </Button>
                                </Link>
                                <Button
                                    onClick={() => exportTournamentReport(t)}
                                    className="flex-1 md:flex-none bg-efb-blue text-white rounded-xl hover:bg-efb-blue-light gap-2 shadow-sm shadow-efb-blue/20"
                                >
                                    <FileText className="w-4 h-4" />
                                    Tải báo cáo
                                </Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
