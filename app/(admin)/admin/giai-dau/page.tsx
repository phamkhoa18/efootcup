"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Trophy, Search, Users, Eye, Flame, Clock, CheckCircle2,
    Loader2, Trash2, Edit, ExternalLink, FileX, MoreVertical,
    Filter, ChevronDown, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const statusStyles: Record<string, { label: string; bg: string; icon: typeof Flame }> = {
    draft: { label: "Nháp", bg: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock },
    registration: { label: "Đăng ký", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Users },
    ongoing: { label: "Đang diễn ra", bg: "bg-red-50 text-red-700 border-red-200", icon: Flame },
    completed: { label: "Hoàn thành", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", bg: "bg-red-50 text-red-400 border-red-200", icon: FileX },
};

export default function AdminTournamentsPage() {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [pagination, setPagination] = useState<any>({ page: 1, total: 0, totalPages: 1 });
    const { confirm } = useConfirmDialog();

    useEffect(() => {
        loadTournaments();
    }, [statusFilter, pagination.page]);

    const loadTournaments = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(pagination.page),
                limit: "20",
            };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;

            const res = await adminAPI.getAllTournaments(params);
            if (res.success) {
                setTournaments(res.data.tournaments);
                setPagination(res.data.pagination);
            }
        } catch (error) {
            console.error("Load tournaments error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination((prev: any) => ({ ...prev, page: 1 }));
        loadTournaments();
    };

    const handleStatusChange = async (tournamentId: string, newStatus: string) => {
        try {
            const res = await adminAPI.updateTournament(tournamentId, { status: newStatus });
            if (res.success) {
                toast.success(`Đã cập nhật trạng thái thành "${statusStyles[newStatus]?.label || newStatus}"`);
                loadTournaments();
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const handleDelete = async (id: string, title: string) => {
        const ok = await confirm({
            title: "Xóa giải đấu?",
            description: `Bạn có chắc muốn xóa giải đấu "${title}"? Hành động này không thể hoàn tác!`,
            variant: "danger",
            confirmText: "Xóa giải đấu",
        });
        if (!ok) return;
        try {
            const res = await adminAPI.deleteTournament(id);
            if (res.success) {
                toast.success("Đã xóa giải đấu");
                loadTournaments();
            } else {
                toast.error(res.message);
            }
        } catch (e: any) {
            toast.error(e.message || "Có lỗi xảy ra");
        }
    };

    const statuses = ["", "draft", "registration", "ongoing", "completed", "cancelled"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-efb-dark tracking-tight">Quản lý giải đấu</h1>
                    <p className="text-sm text-efb-text-muted mt-1">
                        Tất cả giải đấu trên hệ thống · {pagination.total} giải đấu
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
                                onClick={() => {
                                    setStatusFilter(s);
                                    setPagination((prev: any) => ({ ...prev, page: 1 }));
                                }}
                                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${statusFilter === s
                                    ? "bg-efb-blue text-white border-efb-blue shadow-sm"
                                    : "bg-white text-efb-text-secondary border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                {s === "" ? "Tất cả" : sty?.label || s}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                </div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-efb-dark mb-2">Không tìm thấy giải đấu</h3>
                    <p className="text-sm text-efb-text-muted">Thử thay đổi bộ lọc</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tournaments.map((t, i) => {
                        const sty = statusStyles[t.status] || statusStyles.draft;
                        const Icon = sty.icon;
                        return (
                            <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 group hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-6 h-6 text-efb-blue" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-efb-dark truncate">
                                            {t.title}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            {/* Status dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${sty.bg}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {sty.label}
                                                        <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="rounded-xl">
                                                    {["draft", "registration", "ongoing", "completed", "cancelled"].map((s) => (
                                                        <DropdownMenuItem
                                                            key={s}
                                                            onClick={() => handleStatusChange(t._id, s)}
                                                            className={`text-sm cursor-pointer ${t.status === s ? "text-efb-blue font-bold" : ""}`}
                                                        >
                                                            {statusStyles[s]?.label || s}
                                                            {t.status === s && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <span className="text-[11px] text-efb-text-muted flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {t.currentTeams}/{t.maxTeams}
                                            </span>
                                            <span className="text-[11px] text-efb-text-muted flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {t.views || 0}
                                            </span>
                                            {t.createdBy && (
                                                <span className="text-[11px] text-gray-400">
                                                    bởi: {t.createdBy.name || t.createdBy.email}
                                                </span>
                                            )}
                                            {t.schedule?.tournamentStart && (
                                                <span className="text-[11px] text-gray-400">
                                                    {format(new Date(t.schedule.tournamentStart), "dd/MM/yyyy")}
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
                                                className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-efb-blue hover:bg-blue-50"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Link href={`/giai-dau/${t._id}`} target="_blank">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-efb-blue hover:bg-blue-50"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(t._id, t.title)}
                                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-efb-text-muted">
                        Trang {pagination.page} / {pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page - 1 }))}
                            className="rounded-lg"
                        >
                            Trước
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page + 1 }))}
                            className="rounded-lg"
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
