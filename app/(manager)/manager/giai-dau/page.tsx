"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Trophy, Plus, Search, Eye, Users, Flame, Clock, CheckCircle2,
    Filter, Loader2, MoreHorizontal, Trash2, Edit, ExternalLink,
    CalendarPlus, ArrowRight, FileX
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentAPI } from "@/lib/api";

const statusStyles: Record<string, { label: string; bg: string; icon: typeof Flame }> = {
    draft: { label: "Nháp", bg: "bg-gray-200 text-gray-600 border-transparent", icon: Clock },
    registration: { label: "Đăng ký", bg: "bg-blue-500 text-white border-transparent", icon: Users },
    ongoing: { label: "Đang diễn ra", bg: "bg-red-500 text-white border-transparent", icon: Flame },
    completed: { label: "Đã kết thúc", bg: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", bg: "bg-red-50 text-red-500 border-red-200", icon: FileX },
};

export default function ManagerGiaiDauPage() {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [pagination, setPagination] = useState<any>({ page: 1, total: 0 });

    useEffect(() => {
        if (user) loadTournaments();
    }, [user, statusFilter]);

    const loadTournaments = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                createdBy: user?._id || "",
                limit: "20",
            };
            if (statusFilter) params.status = statusFilter;

            const res = await tournamentAPI.getAll(params);
            if (res.success) {
                setTournaments(res.data.tournaments);
                setPagination(res.data.pagination);
            }
        } catch (error) {
            console.error("Failed to load tournaments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa giải đấu này?")) return;

        try {
            const res = await tournamentAPI.delete(id);
            if (res.success) {
                setTournaments((prev) => prev.filter((t) => t._id !== id));
            }
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const filteredTournaments = tournaments.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
    );

    const statuses = ["", "draft", "registration", "ongoing", "completed", "cancelled"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-efb-dark">Giải đấu của tôi</h1>
                    <p className="text-sm text-efb-text-muted mt-1">
                        {pagination.total} giải đấu
                    </p>
                </div>
                <Link href="/manager/tao-giai-dau">
                    <Button className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-10 px-5 group">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo giải đấu
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm giải đấu..."
                        className="pl-10 h-10 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {statuses.map((s) => {
                        const sty = s ? statusStyles[s] : null;
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${statusFilter === s
                                        ? "bg-efb-blue text-white border-efb-blue"
                                        : "bg-white text-efb-text-secondary border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                {s === "" ? "Tất cả" : sty?.label || s}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                </div>
            ) : filteredTournaments.length === 0 ? (
                <div className="text-center py-20">
                    <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-efb-dark mb-2">
                        Chưa có giải đấu nào
                    </h3>
                    <p className="text-sm text-efb-text-muted mb-6">
                        Bắt đầu tạo giải đấu đầu tiên của bạn
                    </p>
                    <Link href="/manager/tao-giai-dau">
                        <Button className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-10 px-6 group">
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Tạo giải đấu
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTournaments.map((t, i) => {
                        const sty = statusStyles[t.status] || statusStyles.draft;
                        const Icon = sty.icon;
                        return (
                            <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="card-white p-4 group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-efb-blue/10 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-6 h-6 text-efb-blue" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/manager/giai-dau/${t._id}`}
                                            className="text-sm font-medium text-efb-dark hover:text-efb-blue transition-colors truncate block"
                                        >
                                            {t.title}
                                        </Link>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1 ${sty.bg}`}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {sty.label}
                                            </span>
                                            <span className="text-[11px] text-efb-text-muted flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {t.currentTeams}/{t.maxTeams}
                                            </span>
                                            <span className="text-[11px] text-efb-text-muted flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {t.views || 0}
                                            </span>
                                            {t.prize?.total && t.prize.total !== "0 VNĐ" && (
                                                <span className="text-[11px] text-amber-600 font-medium">
                                                    🏆 {t.prize.total}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/manager/giai-dau/${t._id}`}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Link href={`/giai-dau/${t._id}`} target="_blank">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(t._id)}
                                            className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
