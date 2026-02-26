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
    Clock, ExternalLink, ChevronRight, Activity, XCircle
} from "lucide-react";
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

    const [form, setForm] = useState({
        name: "",
        phone: "",
        bio: "",
        gamerId: "",
    });

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                gamerId: user.gamerId || "",
            });
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadParticipation();
        }
    }, [isAuthenticated, token]);

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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setIsUploading(true);
        setErrorMsg("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                const result = await updateProfile({ avatar: data.data.url });
                if (result.success) {
                    showSuccess("Cập nhật ảnh đại diện thành công!");
                } else {
                    setErrorMsg(result.message);
                }
            } else {
                setErrorMsg(data.message);
            }
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
                                    accept="image/jpeg,image/png,image/webp,image/gif"
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
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sắp tới & Trực tiếp</p>
                                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">LIVE & SOON</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {participation.matches.upcoming.map((match: any) => {
                                                const opponent = match.homeTeam?._id === participation.joined.find((j: any) => j._id === match.tournament?._id)?.teamId
                                                    ? match.awayTeam : match.homeTeam;
                                                const myTeam = match.homeTeam?._id === participation.joined.find((j: any) => j._id === match.tournament?._id)?.teamId
                                                    ? match.homeTeam : match.awayTeam;

                                                return (
                                                    <div
                                                        key={match._id}
                                                        className="relative bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all overflow-hidden group"
                                                    >
                                                        {/* Match Info Header */}
                                                        <div className="flex items-center justify-between mb-4">
                                                            <Link href={`/giai-dau/${match.tournament?.slug || match.tournament?._id}`} className="flex items-center gap-2 hover:text-efb-blue transition-colors">
                                                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                                <span className="text-[11px] font-medium uppercase tracking-tight text-gray-400 truncate max-w-[150px]">
                                                                    {match.tournament?.title}
                                                                </span>
                                                            </Link>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-efb-blue bg-blue-50 px-2 py-0.5 rounded-md">
                                                                    {match.roundName || `Vòng ${match.round}`}
                                                                </span>
                                                                {match.status === 'live' && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                                        <Activity className="w-2.5 h-2.5" /> LIVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Comparison */}
                                                        <div className="flex items-center justify-between gap-4">
                                                            {/* User Team */}
                                                            <div className="flex-1 text-center">
                                                                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gray-50 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                                    {myTeam?.logo ? <img src={myTeam.logo} className="w-9 h-9 object-contain" /> : <Shield className="w-6 h-6 text-gray-300" />}
                                                                </div>
                                                                <p className="text-[9px] font-semibold text-gray-400 truncate tracking-tight uppercase">BẠN</p>
                                                                <p className="text-[11px] font-semibold text-gray-900 truncate uppercase mt-0.5">{myTeam?.shortName || myTeam?.name}</p>
                                                            </div>

                                                            {/* VS/Result */}
                                                            <div className="flex flex-col items-center justify-center gap-1.5 px-4 min-w-[100px]">
                                                                {match.status === 'live' || match.status === 'completed' ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-2xl font-bold text-gray-900">{match.homeScore ?? 0}</span>
                                                                        <span className="text-gray-200">/</span>
                                                                        <span className="text-2xl font-bold text-gray-900">{match.awayScore ?? 0}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-[9px] font-bold text-efb-blue uppercase tracking-tighter bg-blue-50 px-2.5 py-1 rounded-md mb-1">VS</span>
                                                                        <div className="flex items-center gap-1.5 text-gray-400">
                                                                            <Clock className="w-3 h-3" />
                                                                            <span className="text-xs font-semibold">
                                                                                {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[9px] text-gray-400 mt-1 font-medium">
                                                                            {match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString('vi-VN') : 'Sắp diễn ra'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Opponent */}
                                                            <div className="flex-1 text-center">
                                                                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gray-50 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                                    {opponent?.logo ? <img src={opponent.logo} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                                                </div>
                                                                <p className="text-[9px] font-semibold text-gray-400 truncate tracking-tight uppercase">ĐỐI THỦ</p>
                                                                <p className="text-[11px] font-semibold text-gray-900 truncate uppercase mt-0.5">{opponent?.shortName || opponent?.name || 'Đang cập nhật'}</p>
                                                            </div>
                                                        </div>

                                                        {/* Action Footer */}
                                                        <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-50">
                                                            <span className="text-[10px] text-gray-400 font-medium italic">
                                                                {match.status === 'live' ? 'Vui lòng báo cáo kết quả sau trận' : 'Chuẩn bị thi đấu'}
                                                            </span>
                                                            <Link href={`/giai-dau/${match.tournament?.slug || match.tournament?._id}?tab=schedule`} className="flex items-center gap-1.5 text-[11px] font-semibold text-efb-blue hover:underline">
                                                                Xem chi tiết <ChevronRight className="w-3 h-3" />
                                                            </Link>
                                                        </div>
                                                    </div>
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
                                                const opponent = match.homeTeam?._id === myTeamId ? match.awayTeam : match.homeTeam;

                                                return (
                                                    <div key={match._id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isWinner ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {isWinner ? <Trophy className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-medium text-gray-400 uppercase truncate max-w-[100px]">vs {opponent?.name || 'Unknown'}</span>
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
                                    <p className="h-11 flex items-center text-sm text-gray-900 px-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                        {user.name || "—"}
                                    </p>
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
                                    <p className="h-11 flex items-center text-sm text-gray-900 px-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                        {user.phone || <span className="text-gray-400">Chưa cập nhật</span>}
                                    </p>
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
                                    <p className="h-11 flex items-center text-sm text-gray-900 px-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                        {user.gamerId || <span className="text-gray-400">Chưa cập nhật</span>}
                                    </p>
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
                                    <p className="min-h-[66px] flex items-start text-sm text-gray-900 px-3 py-2.5 bg-gray-50/50 rounded-xl border border-gray-100 whitespace-pre-wrap">
                                        {user.bio || <span className="text-gray-400">Chưa cập nhật</span>}
                                    </p>
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
            </div>
        </div>
    );
}
