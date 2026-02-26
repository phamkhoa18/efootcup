"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, Edit3, Flame, Loader2, Pause, Play, Settings, Trophy, Users, AlertCircle, Ban, Eye, FileText, Calendar, Gamepad2, Bone, Hexagon, SplitSquareHorizontal, MapPin, Globe, DollarSign, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentAPI } from "@/lib/api";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Flame }> = {
    draft: { label: "Nháp", color: "bg-gray-200 text-gray-600", icon: Clock },
    registration: { label: "Đang mở đăng ký", color: "bg-blue-500 text-white", icon: Users },
    ongoing: { label: "Đang diễn ra", color: "bg-red-500 text-white", icon: Flame },
    completed: { label: "Đã kết thúc", color: "bg-emerald-500 text-white", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-600", icon: Ban },
};

const formatLabels: Record<string, string> = {
    single_elimination: "Loại trực tiếp",
    double_elimination: "Loại kép",
    round_robin: "Vòng tròn",
    swiss: "Swiss System",
    group_stage: "Vòng bảng",
};

export default function TournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadTournament();
    }, [id]);

    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState(false);
    const [selectedFormatType, setSelectedFormatType] = useState('standard');

    const loadTournament = async () => {
        try {
            const res = await tournamentAPI.getById(id);
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Failed to load tournament:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.update(id, { status: newStatus });
            if (res.success) {
                setData((prev: any) => ({
                    ...prev,
                    tournament: { ...prev.tournament, status: newStatus },
                }));
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const openGenerateBracketsModal = () => {
        setIsGeneratingModalOpen(true);
        setSelectedFormatType('standard');
    };

    const confirmGenerateBrackets = async () => {
        setIsGeneratingModalOpen(false);
        setIsUpdating(true);
        try {
            const res = await tournamentAPI.generateBrackets(id, { formatType: selectedFormatType });
            if (res.success) {
                alert(`✅ Đã tạo ${res.data.totalMatches} trận đấu!`);
                loadTournament();
            } else {
                alert(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error("Failed to generate brackets:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    if (!data?.tournament) {
        return (
            <div className="text-center py-20">
                <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-efb-dark">Không tìm thấy giải đấu</h3>
                <Link href="/manager/giai-dau">
                    <Button className="mt-4 bg-efb-blue text-white rounded-xl">Quay lại</Button>
                </Link>
            </div>
        );
    }

    const t = data.tournament;
    const stats = data.stats || {};
    const sty = statusConfig[t.status] || statusConfig.draft;
    const StatusIcon = sty.icon;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => router.push("/manager/giai-dau")}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors mt-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl font-semibold text-efb-dark">{t.title}</h1>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${sty.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sty.label}
                        </span>
                    </div>
                    <p className="text-sm text-efb-text-muted">
                        {formatLabels[t.format] || t.format} · {t.platform} · {t.isOnline ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Đội tham gia", value: `${t.currentTeams}/${t.maxTeams}`, icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Trận đấu", value: `${stats.completedMatches || 0}/${stats.totalMatches || 0}`, icon: Gamepad2, color: "text-purple-600 bg-purple-50" },
                    { label: "Đăng ký chờ", value: stats.pendingRegistrations || 0, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
                    { label: "Lượt xem", value: t.views || 0, icon: Eye, color: "text-emerald-600 bg-emerald-50" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="card-white p-4"
                    >
                        <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-semibold text-efb-dark">{stat.value}</div>
                        <div className="text-xs text-efb-text-muted mt-0.5">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Actions */}
            <div className="card-white p-5">
                <h3 className="text-sm font-semibold text-efb-dark mb-3">Hành động nhanh</h3>
                <div className="flex flex-wrap gap-2">
                    {t.status === "draft" && (
                        <Button
                            onClick={() => updateStatus("registration")}
                            disabled={isUpdating}
                            className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-9 px-4 text-sm"
                        >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            Mở đăng ký
                        </Button>
                    )}
                    {t.status === "registration" && (
                        <>
                            <Button
                                onClick={() => updateStatus("ongoing")}
                                disabled={isUpdating}
                                className="bg-red-600 text-white hover:bg-red-700 rounded-xl h-9 px-4 text-sm"
                            >
                                <Flame className="w-3.5 h-3.5 mr-1.5" />
                                Bắt đầu giải
                            </Button>
                            <Button
                                onClick={() => updateStatus("draft")}
                                disabled={isUpdating}
                                variant="outline"
                                className="rounded-xl h-9 px-4 text-sm"
                            >
                                <Pause className="w-3.5 h-3.5 mr-1.5" />
                                Đóng đăng ký
                            </Button>
                        </>
                    )}
                    {(t.status === "registration" || t.status === "ongoing") && stats.totalTeams >= 2 && (
                        <Button
                            onClick={openGenerateBracketsModal}
                            disabled={isUpdating}
                            className="bg-purple-600 text-white hover:bg-purple-700 rounded-xl h-9 px-4 text-sm"
                        >
                            <Settings className="w-3.5 h-3.5 mr-1.5" />
                            Tạo Bracket
                        </Button>
                    )}
                    {t.status === "ongoing" && (
                        <Button
                            onClick={() => updateStatus("completed")}
                            disabled={isUpdating}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl h-9 px-4 text-sm"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Kết thúc giải
                        </Button>
                    )}
                    <Button
                        onClick={() => updateStatus("cancelled")}
                        disabled={isUpdating}
                        variant="outline"
                        className="rounded-xl h-9 px-4 text-sm text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Ban className="w-3.5 h-3.5 mr-1.5" />
                        Hủy giải
                    </Button>
                </div>
            </div>

            {/* Tournament Info */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Details */}
                <div className="card-white p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-efb-dark flex items-center gap-2">
                        <FileText className="w-4 h-4 text-efb-blue" />
                        Thông tin chi tiết
                    </h3>
                    <div className="space-y-3">
                        {t.description && (
                            <div>
                                <div className="text-xs text-efb-text-muted mb-1">Mô tả</div>
                                <p className="text-sm text-efb-text-secondary">{t.description}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-xs text-efb-text-muted">Thể thức</div>
                                <div className="text-sm font-medium text-efb-dark">
                                    {formatLabels[t.format] || t.format}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-efb-text-muted">Nền tảng</div>
                                <div className="text-sm font-medium text-efb-dark">{t.platform}</div>
                            </div>
                            <div>
                                <div className="text-xs text-efb-text-muted">Kích thước đội</div>
                                <div className="text-sm font-medium text-efb-dark">{t.teamSize}v{t.teamSize}</div>
                            </div>
                            <div>
                                <div className="text-xs text-efb-text-muted">Hình thức</div>
                                <div className="text-sm font-medium text-efb-dark flex items-center gap-1">
                                    {t.isOnline ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                    {t.isOnline ? "Online" : "Offline"}
                                </div>
                            </div>
                        </div>
                        {t.prize?.total && t.prize.total !== "0 VNĐ" && (
                            <div className="pt-3 border-t border-gray-100">
                                <div className="text-xs text-efb-text-muted mb-1">Giải thưởng</div>
                                <div className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    {t.prize.total}
                                </div>
                                <div className="flex gap-4 mt-1.5 text-xs text-efb-text-muted">
                                    {t.prize.first && <span>🥇 {t.prize.first}</span>}
                                    {t.prize.second && <span>🥈 {t.prize.second}</span>}
                                    {t.prize.third && <span>🥉 {t.prize.third}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Teams */}
                <div className="card-white p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-efb-dark flex items-center gap-2">
                            <Users className="w-4 h-4 text-efb-blue" />
                            Đội tham gia ({data.teams?.length || 0})
                        </h3>
                        <Link
                            href={`/manager/giai-dau/${id}/dang-ky`}
                            className="text-xs text-efb-blue hover:text-efb-blue-light font-medium"
                        >
                            Quản lý đăng ký →
                        </Link>
                    </div>

                    {data.teams?.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-efb-text-muted">Chưa có đội nào</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {data.teams?.map((team: any, i: number) => (
                                <div
                                    key={team._id}
                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-efb-blue/10 to-indigo-100 flex items-center justify-center text-xs font-bold text-efb-blue">
                                        {team.shortName || (i + 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-efb-dark truncate">
                                            {team.name}
                                        </div>
                                        <div className="text-[11px] text-efb-text-muted">
                                            {team.stats?.played || 0}P {team.stats?.wins || 0}W {team.stats?.draws || 0}D {team.stats?.losses || 0}L · {team.stats?.points || 0} pts
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${team.status === "active"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : team.status === "eliminated"
                                                ? "bg-red-50 text-red-500"
                                                : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {team.status === "active"
                                            ? "Đang thi đấu"
                                            : team.status === "eliminated"
                                                ? "Bị loại"
                                                : team.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Matches */}
            <div className="card-white p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-efb-dark flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-efb-blue" />
                        Trận đấu ({data.matches?.length || 0})
                    </h3>
                    <Link
                        href={`/manager/giai-dau/${id}/so-do`}
                        className="text-xs text-efb-blue hover:text-efb-blue-light font-medium"
                    >
                        Xem Bracket →
                    </Link>
                </div>

                {data.matches?.length === 0 ? (
                    <div className="text-center py-8">
                        <Gamepad2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-efb-text-muted">Chưa có trận đấu nào</p>
                        {stats.totalTeams >= 2 && (
                            <Button
                                onClick={openGenerateBracketsModal}
                                disabled={isUpdating}
                                className="mt-3 bg-purple-600 text-white hover:bg-purple-700 rounded-xl h-9 px-4 text-sm"
                            >
                                <Settings className="w-3.5 h-3.5 mr-1.5" />
                                Tạo Bracket
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {data.matches?.map((match: any) => (
                            <div
                                key={match._id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-[10px] font-medium text-efb-text-muted w-16 text-center">
                                    {match.roundName || `Vòng ${match.round}`}
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-medium text-efb-dark flex-1 text-right truncate">
                                        {match.homeTeam?.name || "TBD"}
                                    </span>
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-gray-200 min-w-[60px] justify-center">
                                        <span className="text-sm font-bold text-efb-dark">
                                            {match.homeScore ?? "-"}
                                        </span>
                                        <span className="text-xs text-efb-text-muted">:</span>
                                        <span className="text-sm font-bold text-efb-dark">
                                            {match.awayScore ?? "-"}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-efb-dark flex-1 truncate">
                                        {match.awayTeam?.name || "TBD"}
                                    </span>
                                </div>
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-16 text-center ${match.status === "completed"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : match.status === "live"
                                            ? "bg-red-50 text-red-500"
                                            : "bg-gray-100 text-gray-500"
                                        }`}
                                >
                                    {match.status === "completed"
                                        ? "Xong"
                                        : match.status === "live"
                                            ? "Live"
                                            : match.status === "scheduled"
                                                ? "Sắp tới"
                                                : match.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isGeneratingModalOpen} onOpenChange={setIsGeneratingModalOpen}>
                <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden border-0 rounded-[24px] bg-[#F7F8FA] flex flex-col max-h-[90vh]" showCloseButton={false}>
                    <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-100 flex-shrink-0 relative">
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Tạo lịch thi đấu</DialogTitle>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">Hành động này sẽ TẠO LẠI TOÀN BỘ LỊCH TRÌNH VÀ XOÁ DỮ LIỆU CŨ.</p>
                        <button onClick={() => setIsGeneratingModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Empty Schedule */}
                            <div
                                onClick={() => setSelectedFormatType('empty')}
                                className={`cursor-pointer rounded-2xl bg-white border-2 p-6 transition-all hover:shadow-lg flex flex-col items-center text-center ${selectedFormatType === 'empty' ? 'border-[#3B82F6] ring-4 ring-[#3B82F6]/10' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center mb-4">
                                    <Bone className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Lịch thi đấu trống</h3>
                                <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-4">
                                    Chỉ tạo sơ đồ thi đấu tương ứng với số VĐV đã đăng ký tham gia. Ban tổ chức tự sắp xếp vị trí thi đấu cho VĐV.
                                </p>
                                <p className="text-[12px] text-orange-500 font-bold mt-auto">
                                    * Phù hợp với giải đấu muốn tự sắp xếp vị trí thi đấu.
                                </p>
                            </div>

                            {/* Standard */}
                            <div
                                onClick={() => setSelectedFormatType('standard')}
                                className={`cursor-pointer rounded-2xl bg-white border-2 p-6 transition-all hover:shadow-lg flex flex-col items-center text-center ${selectedFormatType === 'standard' ? 'border-[#3B82F6] ring-4 ring-[#3B82F6]/10' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center mb-4">
                                    <Hexagon className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Tiêu chuẩn</h3>
                                <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-4">
                                    <span className="text-orange-500 font-bold">Ưu tiên các đội hạt giống (nếu có)</span> được đôn lên vòng sau và không gặp nhau sớm. Các vị trí còn lại chọn ngẫu nhiên.
                                </p>
                                <p className="text-[12px] text-orange-500 font-bold mt-auto">
                                    * Các đội cùng 1 CLB vẫn có thể gặp nhau ở vòng đầu tiên.
                                </p>
                            </div>

                            {/* Custom */}
                            <div
                                onClick={() => setSelectedFormatType('custom')}
                                className={`cursor-pointer rounded-2xl bg-white border-2 p-6 transition-all hover:shadow-lg flex flex-col items-center text-center ${selectedFormatType === 'custom' ? 'border-[#3B82F6] ring-4 ring-[#3B82F6]/10' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center mb-4">
                                    <SplitSquareHorizontal className="w-6 h-6 transform rotate-90" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Tùy chỉnh</h3>
                                <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-4">
                                    Tách các đội <span className="text-orange-500 font-bold">cùng CLB ra nhánh khác nhau</span> (không tính CLB Tự do).
                                </p>
                                <p className="text-[12px] text-orange-500 font-bold mt-auto">
                                    * Không hỗ trợ tính năng hạt giống.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="outline" onClick={() => setIsGeneratingModalOpen(false)} className="px-6 h-11 rounded-xl text-gray-600 font-bold border-gray-200 hover:bg-gray-100">
                                Hủy
                            </Button>
                            <Button onClick={confirmGenerateBrackets} className="bg-[#60A5FA] px-8 h-11 rounded-xl text-white font-bold hover:bg-blue-500 shadow-sm">
                                Trộn lịch thi đấu
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
