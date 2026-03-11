"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Camera, User, Mail, Phone, Gamepad2, FileText,
    Save, Loader2, CheckCircle2, ArrowLeft, Shield,
    Trophy, Swords, Target, CalendarDays, Edit3, X,
    Clock, ExternalLink, ChevronRight, Activity, XCircle, Upload,
    Star, Crown, Medal, Award, TrendingUp, Hash, ChevronDown, Monitor, Smartphone,
    MapPin, Globe, Facebook, Lock, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import MatchCard from "@/components/profile/MatchCard";

import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/api";

export default function TrangCaNhanPage() {
    const { user, token, isAuthenticated, isManager, isLoading, updateProfile } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [participation, setParticipation] = useState<{
        managed: any[],
        joined: any[],
        matches: { upcoming: any[], past: any[] }
    }>({
        managed: [],
        joined: [],
        matches: { upcoming: [], past: [] }
    });
    const [isPGLoading, setIsPGLoading] = useState(false);
    // Submit result states
    const [submitMatchId, setSubmitMatchId] = useState<string | null>(null);
    const [submitHomeScore, setSubmitHomeScore] = useState("");
    const [submitAwayScore, setSubmitAwayScore] = useState("");
    const [submitNotes, setSubmitNotes] = useState("");
    const [submitScreenshots, setSubmitScreenshots] = useState<string[]>([]);
    const [isSubmittingResult, setIsSubmittingResult] = useState(false);
    const [isUploadingShot, setIsUploadingShot] = useState(false);

    // EFV Points
    const [efvData, setEfvData] = useState<any>(null);
    const [isEfvLoading, setIsEfvLoading] = useState(false);
    const [efvTab, setEfvTab] = useState<'mobile' | 'console'>('mobile');
    const [efvHistoryOpen, setEfvHistoryOpen] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        bio: "",
        gamerId: "",
        nickname: "",
        teamName: "",
        facebookName: "",
        facebookLink: "",
        dateOfBirth: "",
        province: "",
    });

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                gamerId: user.gamerId || "",
                nickname: user.nickname || "",
                teamName: user.teamName || "",
                facebookName: user.facebookName || "",
                facebookLink: user.facebookLink || "",
                dateOfBirth: user.dateOfBirth || "",
                province: user.province || "",
            });
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadParticipation();
            loadEfvPoints();
        }
    }, [isAuthenticated, token]);

    const loadEfvPoints = async () => {
        setIsEfvLoading(true);
        try {
            const tk = token || localStorage.getItem("efootcup_token");
            const res = await fetch("/api/auth/me/efv-points", {
                headers: tk ? { Authorization: `Bearer ${tk}` } : {},
            });
            const data = await res.json();
            if (data.success) setEfvData(data.data);
        } catch (e) {
            console.error("Load EFV error:", e);
        } finally {
            setIsEfvLoading(false);
        }
    };

    const loadParticipation = async () => {
        setIsPGLoading(true);
        try {
            const data = await authAPI.getParticipation();
            if (data.success) {
                setParticipation(data.data);
            }
        } catch (e) {
            console.error("Load participation error:", e);
        } finally {
            setIsPGLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/dang-nhap");
        }
    }, [isLoading, isAuthenticated, router]);

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const compressImage = (file: File, maxDim = 800, quality = 0.8): Promise<File> =>
        new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality,
                );
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const savedToken = token || localStorage.getItem("efootcup_token");
        if (!savedToken) {
            setErrorMsg("Vui lòng đăng nhập lại");
            return;
        }

        setIsUploading(true);
        setErrorMsg("");

        try {
            // Always compress to ensure small upload size
            let toUpload: File = file;
            if (file.type.startsWith('image/') || /\.(jpe?g|jfif|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i.test(file.name)) {
                toUpload = await compressImage(file);
            }

            const formData = new FormData();
            formData.append("file", toUpload);
            formData.append("type", "avatar");

            // Retry up to 3 times for transient errors
            let lastError = '';
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const res = await fetch("/api/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${savedToken}` },
                        body: formData,
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            const avatarUrl = data.data?.url || data.url;
                            const result = await updateProfile({ avatar: avatarUrl });
                            if (result.success) {
                                showSuccess("Cập nhật ảnh đại diện thành công!");
                            } else {
                                setErrorMsg(result.message);
                            }
                            return; // success — exit
                        }
                        lastError = data.message || "Upload thất bại";
                        break; // don't retry on logical errors
                    }

                    lastError = `HTTP ${res.status}`;
                    if (res.status === 401) {
                        setErrorMsg("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
                        return;
                    }
                    // Retry on 403, 408, 429, 5xx
                    if (![403, 408, 429, 500, 502, 503, 504].includes(res.status)) break;
                } catch {
                    lastError = 'Lỗi mạng';
                }
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
            }

            setErrorMsg(lastError || "Có lỗi xảy ra khi tải ảnh lên");
        } catch {
            setErrorMsg("Có lỗi xảy ra khi tải ảnh lên");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrorMsg("");

        try {
            const result = await updateProfile(form);
            if (result.success) {
                showSuccess("Cập nhật thông tin thành công!");
                setIsEditing(false);
            } else {
                setErrorMsg(result.message);
            }
        } catch {
            setErrorMsg("Có lỗi xảy ra");
        } finally {
            setIsSaving(false);
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const handleCancel = () => {
        if (user) {
            setForm({
                name: user.name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                gamerId: user.gamerId || "",
                nickname: user.nickname || "",
                teamName: user.teamName || "",
                facebookName: user.facebookName || "",
                facebookLink: user.facebookLink || "",
                dateOfBirth: user.dateOfBirth || "",
                province: user.province || "",
            });
        }
        setIsEditing(false);
        setErrorMsg("");
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-16">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    const statsItems = [
        { label: "Giải tham gia", value: user.stats?.tournamentsJoined || 0, icon: Trophy, color: "text-blue-600 bg-blue-50" },
        { label: "Thắng", value: user.stats?.wins || 0, icon: Target, color: "text-emerald-600 bg-emerald-50" },
        { label: "Thua", value: user.stats?.losses || 0, icon: Swords, color: "text-red-500 bg-red-50" },
        { label: "Hòa", value: user.stats?.draws || 0, icon: Swords, color: "text-amber-600 bg-amber-50" },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Toast notification */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2 text-sm font-medium"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cover Banner — sits below navbar (pt-16 = 64px for fixed navbar) */}
            <div className="relative pt-16">
                <div
                    className="h-44 sm:h-52 relative bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/assets/efootball_bg.webp')" }}
                >
                    {/* Dark overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91]/70 via-[#1E40AF]/50 to-[#4338CA]/60" />

                    {/* Back button */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/70 hover:text-white hover:bg-white/10"
                            asChild
                        >
                            <Link href="/">
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Trang chủ
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-[800px] mx-auto px-4 sm:px-6 pb-16 relative z-10" style={{ marginTop: "-72px" }}>
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100"
                >
                    {/* Avatar + Name Section */}
                    <div className="px-6 sm:px-8 pt-6 pb-6 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                            {/* Avatar */}
                            <div className="relative group flex-shrink-0 self-start">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg ring-2 ring-gray-100 bg-efb-blue flex items-center justify-center overflow-hidden">
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white text-2xl sm:text-3xl font-bold">
                                            {getInitials(user.name)}
                                        </span>
                                    )}
                                </div>

                                {/* Upload overlay */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 cursor-pointer"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-6 h-6 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />

                                {/* Camera badge */}
                                <button
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-efb-blue text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:bg-efb-blue-light transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Name + Role + Edit */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="min-w-0">
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                                            {user.name}
                                        </h1>
                                        <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
                                        {user.efvId && (
                                            <div className="mt-1.5">
                                                <span
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg cursor-pointer hover:shadow-sm transition-all select-all"
                                                    title="Nhấn để sao chép EFV ID"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(user.efvId));
                                                        toast.success("Đã sao chép EFV ID: " + user.efvId);
                                                    }}
                                                >
                                                    <Hash className="w-3 h-3 text-amber-500" />
                                                    EFV ID: {user.efvId}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {isManager ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-efb-blue bg-efb-blue/10 px-2.5 py-1 rounded-full">
                                                    <Shield className="w-3 h-3" />
                                                    Quản lý giải đấu
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                    <Gamepad2 className="w-3 h-3" />
                                                    Người chơi
                                                </span>
                                            )}
                                            {user.gamerId && (
                                                <span className="text-xs text-gray-400">
                                                    ID: {user.gamerId}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit button */}
                                    <div className="flex-shrink-0">
                                        {!isEditing ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditing(true)}
                                                className="rounded-lg border-gray-200 text-sm font-medium hover:bg-gray-50"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                                Chỉnh sửa
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleCancel}
                                                    className="text-gray-500 hover:text-gray-700 h-9"
                                                >
                                                    <X className="w-3.5 h-3.5 mr-1" />
                                                    Hủy
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSave}
                                                    disabled={isSaving}
                                                    className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-lg h-9"
                                                >
                                                    {isSaving ? (
                                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    Lưu
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {errorMsg && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mx-6 sm:mx-8 mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                            >
                                {errorMsg}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats Grid */}
                    <div className="px-6 sm:px-8 pb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {statsItems.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-gray-50/80 rounded-xl p-4 text-center border border-gray-100/80"
                                >
                                    <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* EFV Points Section — Tab-based compact layout */}
                    <div className="px-6 sm:px-8 py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
                                <Award className="w-5 h-5 text-amber-500" />
                                Điểm EFV
                            </h2>
                            {isEfvLoading && <Loader2 className="w-4 h-4 animate-spin text-efb-blue" />}
                        </div>

                        {!isEfvLoading && efvData ? (
                            <div className="space-y-4">
                                {/* ── Tab Switcher ── */}
                                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                    <button
                                        onClick={() => setEfvTab('mobile')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${efvTab === 'mobile'
                                            ? 'bg-white text-amber-700 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        Mobile
                                    </button>
                                    <button
                                        onClick={() => setEfvTab('console')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${efvTab === 'console'
                                            ? 'bg-white text-cyan-700 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Monitor className="w-3.5 h-3.5" />
                                        Console
                                    </button>
                                </div>

                                {/* ── Tab Content ── */}
                                <AnimatePresence mode="wait">
                                    {efvTab === 'mobile' ? (
                                        <motion.div
                                            key="mobile"
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 8 }}
                                            transition={{ duration: 0.15 }}
                                            className="space-y-3"
                                        >
                                            {/* Summary row */}
                                            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3.5 border border-amber-100/80">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-200/50 flex-shrink-0">
                                                    <Star className="w-4.5 h-4.5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xl font-extrabold text-amber-700 leading-none">{efvData.totalMobilePoints ?? efvData.totalActivePoints ?? 0}</p>
                                                    <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">Tổng điểm Mobile</p>
                                                </div>
                                                <div className="text-right flex-shrink-0 pl-3 border-l border-amber-200/60">
                                                    <p className="text-lg font-bold text-amber-600 leading-none">{(efvData.mobileRank ?? efvData.rank) ? `#${efvData.mobileRank ?? efvData.rank}` : "—"}</p>
                                                    <p className="text-[10px] text-amber-400 font-medium mt-0.5">Hạng BXH</p>
                                                </div>
                                            </div>
                                            {/* Tier breakdown */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'EFV 250', value: efvData.pointsEfv250 ?? 0, window: efvData.tierWindows?.efv_250 ?? 5, color: 'blue' },
                                                    { label: 'EFV 500', value: efvData.pointsEfv500 ?? 0, window: efvData.tierWindows?.efv_500 ?? 4, color: 'purple' },
                                                    { label: 'EFV 1000', value: efvData.pointsEfv1000 ?? 0, window: efvData.tierWindows?.efv_1000 ?? 3, color: 'amber' },
                                                ].map((tier) => (
                                                    <div key={tier.label} className={`bg-${tier.color}-50/60 rounded-lg p-2.5 text-center border border-${tier.color}-100/80`}>
                                                        <p className={`text-[9px] text-${tier.color}-500 font-bold uppercase tracking-wide`}>{tier.label}</p>
                                                        <p className={`text-sm font-bold text-${tier.color}-700 mt-0.5`}>{tier.value}</p>
                                                        <p className={`text-[8px] text-${tier.color}-400`}>Top {tier.window} giải</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="console"
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -8 }}
                                            transition={{ duration: 0.15 }}
                                            className="space-y-3"
                                        >
                                            {/* Summary row */}
                                            <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3.5 border border-cyan-100/80">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-200/50 flex-shrink-0">
                                                    <Star className="w-4.5 h-4.5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xl font-extrabold text-cyan-700 leading-none">{efvData.totalPcPoints ?? 0}</p>
                                                    <p className="text-[10px] text-cyan-500/80 font-medium mt-0.5">Tổng điểm Console</p>
                                                </div>
                                                <div className="text-right flex-shrink-0 pl-3 border-l border-cyan-200/60">
                                                    <p className="text-lg font-bold text-cyan-600 leading-none">{efvData.pcRank ? `#${efvData.pcRank}` : "—"}</p>
                                                    <p className="text-[10px] text-cyan-400 font-medium mt-0.5">Hạng BXH</p>
                                                </div>
                                            </div>
                                            {/* Tier breakdown */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-teal-50/60 rounded-lg p-2.5 text-center border border-teal-100/80">
                                                    <p className="text-[9px] text-teal-500 font-bold uppercase tracking-wide">EFV 50</p>
                                                    <p className="text-sm font-bold text-teal-700 mt-0.5">{efvData.pointsEfv50 ?? 0}</p>
                                                    <p className="text-[8px] text-teal-400">Top {efvData.tierWindows?.efv_50 ?? 5} giải</p>
                                                </div>
                                                <div className="bg-cyan-50/60 rounded-lg p-2.5 text-center border border-cyan-100/80">
                                                    <p className="text-[9px] text-cyan-500 font-bold uppercase tracking-wide">EFV 100</p>
                                                    <p className="text-sm font-bold text-cyan-700 mt-0.5">{efvData.pointsEfv100 ?? 0}</p>
                                                    <p className="text-[8px] text-cyan-400">Top {efvData.tierWindows?.efv_100 ?? 4} giải</p>
                                                </div>
                                                <div className="bg-rose-50/60 rounded-lg p-2.5 text-center border border-rose-100/80">
                                                    <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wide">EFV 200</p>
                                                    <p className="text-sm font-bold text-rose-700 mt-0.5">{efvData.pointsEfv200 ?? 0}</p>
                                                    <p className="text-[8px] text-rose-400">Top {efvData.tierWindows?.efv_200 ?? 3} giải</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {efvData.totalActivePoints > 0 && (
                                    <p className="text-[10px] text-gray-400 italic px-1">
                                        * BXH tính phong độ gần đây theo từng tier riêng biệt.
                                    </p>
                                )}

                                {/* ── Collapsible History ── */}
                                {efvData.logs && efvData.logs.length > 0 ? (
                                    <div>
                                        <button
                                            onClick={() => setEfvHistoryOpen(!efvHistoryOpen)}
                                            className="w-full flex items-center justify-between py-2 px-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors group"
                                        >
                                            <span className="uppercase tracking-[0.1em]">Lịch sử điểm ({efvData.logs.length})</span>
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${efvHistoryOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {efvHistoryOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
                                                        {efvData.logs.map((log: any) => (
                                                            <div key={log._id} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${log.isActive ? 'hover:bg-gray-50' : 'opacity-50'}`}>
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${log.placement === 'champion' ? 'bg-yellow-100 text-yellow-600' :
                                                                    log.placement === 'runner_up' ? 'bg-gray-100 text-gray-600' :
                                                                        log.placement === 'top_4' ? 'bg-orange-100 text-orange-600' :
                                                                            'bg-blue-50 text-blue-500'
                                                                    }`}>
                                                                    {log.placement === 'champion' ? <Crown className="w-3.5 h-3.5" /> :
                                                                        log.placement === 'runner_up' ? <Medal className="w-3.5 h-3.5" /> :
                                                                            <TrendingUp className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="text-xs font-medium text-gray-900 truncate">{log.tournamentTitle}</p>
                                                                        {log.isActive && (
                                                                            <span className="flex-shrink-0 text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1 py-px rounded uppercase">Active</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-px">
                                                                        <span className="text-[9px] text-gray-400">{log.placementLabel}</span>
                                                                        <span className="text-[9px] text-gray-200">·</span>
                                                                        <span className="text-[9px] font-medium" style={{ color: log.efvTier === 'efv_1000' ? '#d97706' : log.efvTier === 'efv_500' ? '#7c3aed' : '#2563eb' }}>
                                                                            {log.efvTierLabel}
                                                                        </span>
                                                                        <span className="text-[9px] text-gray-200">·</span>
                                                                        <span className="text-[9px] text-gray-400">
                                                                            {new Date(log.awardedAt).toLocaleDateString('vi-VN')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-xs font-bold flex-shrink-0 ${log.isActive ? 'text-amber-600' : 'text-gray-400'}`}>+{log.points}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="text-center py-5 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                        <Award className="w-7 h-7 text-gray-200 mx-auto mb-1.5" />
                                        <p className="text-xs text-gray-400">Chưa có lịch sử điểm EFV.</p>
                                    </div>
                                )}
                            </div>
                        ) : !isEfvLoading ? (
                            <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <Award className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Bạn chưa có điểm EFV nào.</p>
                                <p className="text-xs text-gray-300 mt-1">Tham gia các giải đấu EFV để tích lũy điểm!</p>
                            </div>
                        ) : null}
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Participation Section */}
                    <div className="px-6 sm:px-8 py-6 bg-gray-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
                                <Trophy className="w-5 h-5 text-efb-blue" />
                                Giải đấu của bạn
                            </h2>
                            {isPGLoading && <Loader2 className="w-4 h-4 animate-spin text-efb-blue" />}
                        </div>

                        {!isPGLoading && participation.joined.length === 0 && participation.managed.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Bạn chưa tham gia hay quản lý giải đấu nào.</p>
                                <Button variant="link" asChild className="text-efb-blue text-xs mt-1">
                                    <Link href="/giai-dau">Khám phá ngay</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Joined Tournaments */}
                                {participation.joined.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em] pl-1">Giải đấu đã tham gia</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {participation.joined.map((item: any) => (
                                                <Link
                                                    key={item._id || item.slug}
                                                    href={`/giai-dau/${item.slug || item._id}`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-efb-blue hover:shadow-md transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                                                        {item.banner ? (
                                                            <img src={item.banner} className="w-full h-full object-cover" />
                                                        ) : <div className="w-full h-full flex items-center justify-center text-efb-blue/30"><Trophy className="w-6 h-6" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[13px] font-medium text-gray-900 truncate group-hover:text-efb-blue transition-colors tracking-tight">{item.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-tight ${item.registrationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                                item.registrationStatus === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                                }`}>
                                                                {item.registrationStatus === 'approved' ? 'Đã duyệt' : item.registrationStatus === 'pending' ? 'Chờ duyệt' : 'Bị từ chối'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-medium truncate">
                                                                {item.teamName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Managed Tournaments */}
                                {isManager && participation.managed.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em] pl-1">Giải đấu quản lý</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {participation.managed.map((item: any) => (
                                                <Link
                                                    key={item._id || item.slug}
                                                    href={`/manager/giai-dau/${item._id}`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-efb-blue hover:shadow-md transition-all group border-l-4 border-l-efb-blue shadow-sm"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex-shrink-0 overflow-hidden relative">
                                                        {item.banner ? (
                                                            <img src={item.banner} className="w-full h-full object-cover" />
                                                        ) : <div className="w-full h-full flex items-center justify-center text-efb-blue/30"><Shield className="w-6 h-6" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-efb-blue transition-colors">{item.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-efb-blue font-bold uppercase tracking-tighter">MANAGER</span>
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {item.currentTeams}/{item.maxTeams} Đội
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                            <Link
                                                href="/manager/tao-giai-dau"
                                                className="flex items-center justify-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-dashed border-blue-200 text-efb-blue text-sm font-bold hover:bg-blue-50 transition-all"
                                            >
                                                <Edit3 className="w-4 h-4" /> Tạo giải mới
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* My Matches Section */}
                    <div className="px-6 sm:px-8 py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
                                <Swords className="w-5 h-5 text-red-500" />
                                Lịch thi đấu của bạn
                            </h2>
                        </div>

                        {participation.matches.upcoming.length === 0 && participation.matches.past.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Bạn chưa có trận đấu nào được lên lịch.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {participation.matches.upcoming.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em]">Sắp tới & Trực tiếp</p>
                                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">LIVE & SOON</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {participation.matches.upcoming.map((match: any) => {
                                                const myTeamId = participation.joined.find((j: any) => j._id === match.tournament?._id)?.teamId;
                                                const isHomeTeamMine = match.homeTeam?._id?.toString?.() === myTeamId?.toString?.();
                                                const myTeam = isHomeTeamMine ? match.homeTeam : match.awayTeam;
                                                const opponent = isHomeTeamMine ? match.awayTeam : match.homeTeam;

                                                return (
                                                    <MatchCard
                                                        key={match._id}
                                                        match={match}
                                                        myTeam={myTeam}
                                                        opponent={opponent}
                                                        isHome={isHomeTeamMine}
                                                        user={user}
                                                        submitMatchId={submitMatchId}
                                                        setSubmitMatchId={(id) => {
                                                            setSubmitMatchId(id);
                                                            if (id) {
                                                                setSubmitHomeScore("");
                                                                setSubmitAwayScore("");
                                                                setSubmitNotes("");
                                                                setSubmitScreenshots([]);
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {participation.matches.past.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.1em] pl-1 mt-6">Kết quả gần đây</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {participation.matches.past.slice(0, 3).map((match: any) => {
                                                const myTeamId = participation.joined.find((j: any) => j._id === match.tournament?._id)?.teamId;
                                                const isWinner = match.winner?._id === myTeamId;
                                                const isHomeTeamMine = match.homeTeam?._id?.toString?.() === myTeamId?.toString?.();
                                                const opponent = isHomeTeamMine ? match.awayTeam : match.homeTeam;
                                                const oppCaptain = opponent?.captain;

                                                return (
                                                    <div key={match._id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isWinner ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {isWinner ? <Trophy className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                            </div>
                                                            {/* Opponent avatar small */}
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white shadow-sm">
                                                                {oppCaptain?.avatar ? (
                                                                    <img src={oppCaptain.avatar} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[9px] font-bold text-slate-400">
                                                                        {(oppCaptain?.name || opponent?.name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-medium text-gray-400 uppercase truncate max-w-[100px]">vs {oppCaptain?.nickname || oppCaptain?.name || opponent?.name || 'Unknown'}</span>
                                                                    <span className="text-[10px] text-gray-300">•</span>
                                                                    <span className="text-[10px] font-medium text-gray-400 uppercase">{match.roundName || 'MT'}</span>
                                                                </div>
                                                                <p className="text-xs font-medium text-gray-900 group-hover:text-efb-blue transition-colors truncate tracking-tight">{match.tournament?.title}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-1.5 font-semibold text-sm">
                                                                    <span className={match.homeScore > match.awayScore ? 'text-gray-900' : 'text-gray-400'}>{match.homeScore}</span>
                                                                    <span className="text-gray-200">-</span>
                                                                    <span className={match.awayScore > match.homeScore ? 'text-gray-900' : 'text-gray-400'}>{match.awayScore}</span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-efb-blue transition-colors" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>



                    <div className="h-px bg-gray-100" />
                    {/* Profile Form */}
                    <div className="px-6 sm:px-8 py-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-5">Thông tin cá nhân</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                    Họ và tên
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="Nguyễn Văn A"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm text-gray-900 px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className="flex-1 text-left truncate">{user.name || "—"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Nickname */}
                            <div className="space-y-2">
                                <Label htmlFor="nickname" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Gamepad2 className="w-3.5 h-3.5 text-gray-400" />
                                    Nickname
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="nickname"
                                        value={form.nickname}
                                        onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="Tên trong game"
                                        maxLength={50}
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.nickname ? 'text-gray-900' : 'text-gray-400'}`}>{user.nickname || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Email (read-only) */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    Email
                                </Label>
                                <p className="h-11 flex items-center text-sm text-gray-500 px-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <span className="truncate flex-1">{user.email}</span>
                                    <span className="flex-shrink-0 ml-2" title="Đã xác minh">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    </span>
                                </p>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    Số điện thoại
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="phone"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="0912 345 678"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.phone ? 'text-gray-900' : 'text-gray-400'}`}>{user.phone || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Gamer ID */}
                            <div className="space-y-2">
                                <Label htmlFor="gamerId" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Gamepad2 className="w-3.5 h-3.5 text-gray-400" />
                                    eFootball ID
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="gamerId"
                                        value={form.gamerId}
                                        onChange={(e) => setForm({ ...form, gamerId: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="VD: 1234567890"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.gamerId ? 'text-gray-900' : 'text-gray-400'}`}>{user.gamerId || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Team Name */}
                            <div className="space-y-2">
                                <Label htmlFor="teamName" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                                    Tên Team
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="teamName"
                                        value={form.teamName}
                                        onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="VD: FC Saigon"
                                        maxLength={100}
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.teamName ? 'text-gray-900' : 'text-gray-400'}`}>{user.teamName || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Facebook Name */}
                            <div className="space-y-2">
                                <Label htmlFor="facebookName" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Facebook className="w-3.5 h-3.5 text-gray-400" />
                                    Tên Facebook
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="facebookName"
                                        value={form.facebookName}
                                        onChange={(e) => setForm({ ...form, facebookName: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="Tên Facebook của bạn"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.facebookName ? 'text-gray-900' : 'text-gray-400'}`}>{user.facebookName || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Facebook Link */}
                            <div className="space-y-2">
                                <Label htmlFor="facebookLink" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                    Link Facebook
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="facebookLink"
                                        value={form.facebookLink}
                                        onChange={(e) => setForm({ ...form, facebookLink: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="https://facebook.com/yourprofile"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.facebookLink ? 'text-blue-600' : 'text-gray-400'}`}>{user.facebookLink || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                                    Ngày sinh
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="dateOfBirth"
                                        type="date"
                                        value={form.dateOfBirth}
                                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.dateOfBirth ? 'text-gray-900' : 'text-gray-400'}`}>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Province */}
                            <div className="space-y-2">
                                <Label htmlFor="province" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    Tỉnh/Thành phố
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="province"
                                        value={form.province}
                                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                                        className="h-11 rounded-xl border-gray-200 bg-white focus:border-efb-blue focus:ring-efb-blue/20"
                                        placeholder="VD: TP. Hồ Chí Minh"
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full h-11 flex items-center text-sm px-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer">
                                        <span className={`flex-1 text-left truncate ${user.province ? 'text-gray-900' : 'text-gray-400'}`}>{user.province || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0" />
                                    </button>
                                )}
                            </div>

                            {/* Bio - full width */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="bio" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                    Giới thiệu
                                </Label>
                                {isEditing ? (
                                    <textarea
                                        id="bio"
                                        value={form.bio}
                                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                        maxLength={500}
                                        rows={3}
                                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/20 outline-none resize-none transition-colors"
                                        placeholder="Viết vài dòng giới thiệu về bản thân..."
                                    />
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(true)} className="w-full min-h-[66px] flex items-start text-sm px-3 py-2.5 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-efb-blue/40 hover:bg-blue-50/20 transition-all group cursor-pointer text-left">
                                        <span className={`flex-1 whitespace-pre-wrap ${user.bio ? 'text-gray-900' : 'text-gray-400'}`}>{user.bio || "Chưa cập nhật"}</span>
                                        <Edit3 className="w-3.5 h-3.5 text-gray-300 group-hover:text-efb-blue transition-colors flex-shrink-0 mt-0.5 ml-2" />
                                    </button>
                                )}
                                {isEditing && (
                                    <p className="text-xs text-gray-400 text-right">{form.bio.length}/500</p>
                                )}
                            </div>
                        </div>

                        {/* Save button (bottom) */}
                        {isEditing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="text-gray-500"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl px-6"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Lưu thay đổi
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Account Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4"
                >
                    <div className="px-6 sm:px-8 py-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Thông tin tài khoản</h2>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50/80 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <CalendarDays className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Ngày tham gia</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {new Date(user.createdAt || Date.now()).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50/80 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <Shield className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Vai trò</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {isManager ? "Quản lý giải đấu" : "Người chơi"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50/80 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm text-gray-600">Trạng thái</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    Đã xác minh
                                </span>
                            </div>

                            {isManager && (
                                <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50/80 rounded-xl">
                                    <div className="flex items-center gap-2.5">
                                        <Trophy className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">Giải đấu đã tạo</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {user.stats?.tournamentsCreated || 0}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div >
        </div >
    );
}
