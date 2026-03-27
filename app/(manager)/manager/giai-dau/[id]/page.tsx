"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, Edit3, Flame, Loader2, Pause, Play, Settings, Trophy, Users, AlertCircle, Ban, Eye, EyeOff, FileText, Calendar, Gamepad2, Bone, Hexagon, SplitSquareHorizontal, MapPin, Globe, DollarSign, X, Crown, Award, Camera, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";

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
    const [isAwardingEfv, setIsAwardingEfv] = useState(false);
    const [efvAwardResult, setEfvAwardResult] = useState<any>(null);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);

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
                toast.success(`✅ Đã tạo ${res.data.totalMatches} trận đấu!`);
                loadTournament();
            } else {
                toast.error(`❌ ${res.message}`);
            }
        } catch (error) {
            console.error("Failed to generate brackets:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAwardEfvPoints = async () => {
        setIsAwardingEfv(true);
        try {
            const res = await fetch(`/api/tournaments/${id}/award-efv-points`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`🏆 ${json.message}`);
                setEfvAwardResult(json.data);
                loadTournament();
            } else {
                toast.error(`❌ ${json.message}`);
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi trao điểm EFV");
        } finally {
            setIsAwardingEfv(false);
        }
    };

    const handleUploadBanner = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Chỉ chấp nhận file hình ảnh");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File quá lớn (tối đa 10MB)");
            return;
        }
        setIsUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "banner");
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
            const uploadRes = await fetch("/api/upload", { method: "POST", headers, body: formData });
            const uploadData = await uploadRes.json();
            const url = uploadData.data?.url || uploadData.url;
            if (url) {
                const updateRes = await tournamentAPI.update(id, { banner: url });
                if (updateRes.success) {
                    setData((prev: any) => ({
                        ...prev,
                        tournament: { ...prev.tournament, banner: url },
                    }));
                    toast.success("Đã cập nhật banner giải đấu!");
                } else {
                    toast.error("Lỗi cập nhật banner");
                }
            } else {
                toast.error(uploadData.message || "Lỗi upload banner");
            }
        } catch {
            toast.error("Có lỗi xảy ra khi upload banner");
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleRemoveBanner = async () => {
        try {
            const res = await tournamentAPI.update(id, { banner: "" });
            if (res.success) {
                setData((prev: any) => ({
                    ...prev,
                    tournament: { ...prev.tournament, banner: "" },
                }));
                toast.success("Đã xóa banner");
            }
        } catch {
            toast.error("Lỗi xóa banner");
        }
    };

    const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

    const handleToggleVisibility = async () => {
        setIsTogglingVisibility(true);
        const newValue = !data.tournament.isPublic;
        try {
            const res = await tournamentAPI.update(id, { isPublic: newValue });
            if (res.success) {
                setData((prev: any) => ({
                    ...prev,
                    tournament: { ...prev.tournament, isPublic: newValue },
                }));
                toast.success(newValue ? "Giải đấu đã được hiện trên trang công khai" : "Giải đấu đã được ẩn khỏi trang công khai");
            }
        } catch {
            toast.error("Có lỗi xảy ra khi thay đổi trạng thái hiển thị");
        } finally {
            setIsTogglingVisibility(false);
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
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <button
                    onClick={() => router.push("/manager/giai-dau")}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="text-lg sm:text-xl font-semibold text-efb-dark break-words">{t.title}</h1>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 flex-shrink-0 ${sty.color}`}>
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

                    {/* EFV Award Button */}
                    {t.status === "completed" && t.efvTier && !t.efvPointsAwarded && (
                        <Button
                            onClick={handleAwardEfvPoints}
                            disabled={isAwardingEfv}
                            className="bg-amber-500 text-white hover:bg-amber-600 rounded-xl h-9 px-4 text-sm"
                        >
                            {isAwardingEfv ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Đang trao...</>
                            ) : (
                                <><Crown className="w-3.5 h-3.5 mr-1.5" />Trao điểm EFV</>
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={() => router.push(`/manager/giai-dau/${id}/chinh-sua`)}
                        variant="outline"
                        className="rounded-xl h-9 px-4 text-sm"
                    >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Chỉnh sửa
                    </Button>
                    {t.efvPointsAwarded && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã trao điểm EFV
                        </span>
                    )}
                </div>
            </div>

            {/* Visibility Toggle */}
            <div className="card-white p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${t.isPublic !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                            {t.isPublic !== false ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-efb-dark">
                                {t.isPublic !== false ? 'Đang hiển thị công khai' : 'Đang ẩn khỏi công khai'}
                            </h3>
                            <p className="text-xs text-efb-text-muted mt-0.5">
                                {t.isPublic !== false
                                    ? 'Giải đấu đang hiện trên trang giải đấu công khai (/giai-dau)'
                                    : 'Giải đấu đang bị ẩn, không hiển thị trên trang công khai'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleVisibility}
                        disabled={isTogglingVisibility}
                        className={`relative inline-flex h-7 w-[52px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-efb-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            t.isPublic !== false ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={t.isPublic !== false}
                        aria-label="Ẩn/Hiện giải đấu"
                    >
                        <span
                            className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out mt-[1px] ${
                                t.isPublic !== false ? 'translate-x-[25px]' : 'translate-x-[2px]'
                            }`}
                        />
                        {isTogglingVisibility && (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Banner */}
            <div className="card-white p-5">
                <h3 className="text-sm font-semibold text-efb-dark flex items-center gap-2 mb-3">
                    <ImageIcon className="w-4 h-4 text-efb-blue" />
                    Ảnh banner giải đấu
                </h3>
                {t.banner ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                        <img
                            src={t.banner}
                            alt="Banner"
                            className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3">
                            <label className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-white text-efb-blue flex items-center justify-center shadow-lg hover:bg-blue-50">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploadingBanner}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadBanner(f);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemoveBanner}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {isUploadingBanner && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                            </div>
                        )}
                    </div>
                ) : (
                    <label className="cursor-pointer block">
                        <div className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isUploadingBanner ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-efb-blue hover:bg-blue-50/20'}`}>
                            {isUploadingBanner ? (
                                <>
                                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue mb-2" />
                                    <span className="text-xs text-efb-blue font-medium">Đang tải lên...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                        <Camera className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500">Bấm để chọn ảnh banner</span>
                                    <span className="text-xs text-gray-400 mt-1">Mọi định dạng ảnh — tối đa 10MB — khuyến nghị 16:9</span>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingBanner}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadBanner(f);
                                e.target.value = "";
                            }}
                        />
                    </label>
                )}
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
                            {t.efvTier && (
                                <div>
                                    <div className="text-xs text-efb-text-muted">Hạng EFV</div>
                                    <div className="text-sm font-medium text-amber-600 flex items-center gap-1">
                                        <Crown className="w-3.5 h-3.5" />
                                        {({ "efv_250": "EFV 250", "efv_500": "EFV 500", "efv_1000": "EFV 1000", "efv_50": "EFV 50", "efv_100": "EFV 100", "efv_200": "EFV 200" } as Record<string, string>)[t.efvTier] || t.efvTier} ({t.mode?.toUpperCase() || "MOBILE"})
                                    </div>
                                </div>
                            )}
                            {!t.efvTier && t.mode && (
                                <div>
                                    <div className="text-xs text-efb-text-muted">Chế độ</div>
                                    <div className="text-sm font-medium text-efb-dark">
                                        {t.mode === "mobile" ? "📱 Mobile" : t.mode === "free" ? "🎯 Tự do" : "🖥 Console"}
                                    </div>
                                </div>
                            )}
                            {t.settings?.matchDuration && (
                                <div>
                                    <div className="text-xs text-efb-text-muted">Thời lượng</div>
                                    <div className="text-sm font-medium text-efb-dark">
                                        {t.settings.matchDuration} phút · {t.settings.legsPerRound === 2 ? "2 lượt" : "1 lượt"}
                                    </div>
                                </div>
                            )}
                            {(t.settings?.extraTime !== undefined || t.settings?.penalties !== undefined) && (
                                <div>
                                    <div className="text-xs text-efb-text-muted">HP / Penalty</div>
                                    <div className="text-sm font-medium text-efb-dark">
                                        {t.settings?.extraTime ? "✅" : "❌"} HP · {t.settings?.penalties ? "✅" : "❌"} PEN
                                    </div>
                                </div>
                            )}
                        </div>
                        {t.entryFee > 0 && (
                            <div className="pt-3 border-t border-gray-100">
                                <div className="text-xs text-efb-text-muted mb-1">Phí tham gia</div>
                                <div className="text-sm font-semibold text-blue-600">
                                    {Number(t.entryFee).toLocaleString("vi-VN")} VNĐ
                                </div>
                            </div>
                        )}
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
                            Đội tham gia ({data.teams?.length || 0}/{t.maxTeams})
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
                        <>
                            {/* Table header - hidden on mobile */}
                            <div className="hidden md:grid grid-cols-[36px_1fr_80px_120px_70px] gap-2 px-2.5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                                <div>#</div>
                                <div>VĐV / Đội</div>
                                <div className="text-center">Seed</div>
                                <div className="text-center">Thống kê</div>
                                <div className="text-center">Trạng thái</div>
                            </div>
                            <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                                {data.teams?.map((team: any, i: number) => {
                                    // Find registration for this team to get player details
                                    const reg = data.registrations?.find((r: any) => {
                                        const regTeamId = (r.team?._id || r.team)?.toString?.();
                                        return regTeamId === team._id?.toString?.();
                                    });
                                    const captainName = team.captain?.name || reg?.playerName || "N/A";
                                    const captainEfvId = team.captain?.efvId || reg?.user?.efvId;
                                    const playerNickname = reg?.nickname || "";
                                    const gamerId = reg?.gamerId || "";
                                    const totalMatches = (team.stats?.wins || 0) + (team.stats?.draws || 0) + (team.stats?.losses || 0);

                                    return (
                                        <div
                                            key={team._id}
                                            className="md:grid md:grid-cols-[36px_1fr_80px_120px_70px] md:gap-2 md:items-center p-2.5 rounded-lg hover:bg-gray-50 transition-colors group flex flex-col gap-2"
                                        >
                                            {/* Number + Player Info (mobile: side by side) */}
                                            <div className="flex items-center gap-2 md:contents">
                                                {/* Number */}
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-efb-blue/10 to-indigo-100 flex items-center justify-center text-xs font-bold text-efb-blue flex-shrink-0">
                                                    {i + 1}
                                                </div>

                                                {/* Player Info */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        {captainEfvId && (
                                                            <span className="text-[10px] font-bold text-efb-blue bg-efb-blue/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                #{captainEfvId}
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-semibold text-efb-dark truncate">
                                                            {captainName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[11px] text-efb-text-muted truncate">
                                                            {team.name}
                                                        </span>
                                                        {playerNickname && (
                                                            <span className="text-[10px] text-gray-400 truncate">
                                                                · {playerNickname}
                                                            </span>
                                                        )}
                                                        {gamerId && (
                                                            <span className="text-[10px] text-amber-500 font-medium truncate">
                                                                ID: {gamerId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Seed + Stats + Status (mobile: row) */}
                                            <div className="flex items-center justify-between gap-2 md:contents pl-10 md:pl-0">
                                                {/* Seed */}
                                                <div className="md:text-center">
                                                    {team.seed ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            🌱 {team.seed}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-gray-300">—</span>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                <div className="md:text-center">
                                                    <div className="flex items-center justify-center gap-1 text-[11px]">
                                                        <span className="font-bold text-emerald-600">{team.stats?.wins || 0}W</span>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="font-bold text-amber-500">{team.stats?.draws || 0}D</span>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="font-bold text-red-500">{team.stats?.losses || 0}L</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 hidden md:block">
                                                        {team.stats?.goalsFor || 0}:{team.stats?.goalsAgainst || 0} ({team.stats?.goalDifference > 0 ? '+' : ''}{team.stats?.goalDifference || 0})
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className="md:text-center">
                                                    <span
                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${team.status === "active"
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : team.status === "eliminated"
                                                                ? "bg-red-50 text-red-500"
                                                                : team.status === "withdrawn"
                                                                    ? "bg-gray-100 text-gray-500"
                                                                    : "bg-orange-50 text-orange-500"
                                                            }`}
                                                    >
                                                        {team.status === "active"
                                                            ? "Thi đấu"
                                                            : team.status === "eliminated"
                                                                ? "Bị loại"
                                                                : team.status === "withdrawn"
                                                                    ? "Rút lui"
                                                                    : "Loại"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
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
                                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-[10px] font-medium text-efb-text-muted sm:w-16 sm:text-center flex-shrink-0">
                                    {match.roundName || `Vòng ${match.round}`}
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-medium text-efb-dark flex-1 text-right truncate">
                                        {match.homeTeam?.name || "TBD"}
                                    </span>
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-gray-200 min-w-[60px] justify-center flex-shrink-0">
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
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium sm:w-16 text-center flex-shrink-0 ${match.status === "completed"
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
