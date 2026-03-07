"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Phone, Gamepad2, Shield, Trophy, Swords, Target,
    CalendarDays, ArrowLeft, ExternalLink, MapPin, Hash,
    Star, Crown, Medal, Award, TrendingUp, ChevronDown,
    Monitor, Smartphone, Loader2, CheckCircle2, XCircle, Facebook
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLACEMENT_LABELS, EFV_TIER_WINDOWS } from "@/lib/efv-points";

type ProfileData = {
    efvId: number;
    name: string;
    avatar: string;
    nickname: string;
    teamName: string;
    phone: string;
    email: string;
    facebookName: string;
    facebookLink: string;
    bio: string;
    gamerId: string;
    province: string;
    country: string;
    dateOfBirth: string;
    role: string;
    stats: {
        tournamentsCreated: number;
        tournamentsJoined: number;
        wins: number;
        losses: number;
        draws: number;
        goalsScored: number;
        goalsConceded: number;
    };
    createdAt: string;
    mobile: {
        points: number;
        rank: number;
        pointsEfv250: number;
        pointsEfv500: number;
        pointsEfv1000: number;
    } | null;
    console: {
        points: number;
        rank: number;
        pointsEfv50: number;
        pointsEfv100: number;
        pointsEfv200: number;
    } | null;
    recentLogs: {
        _id: string;
        tournamentTitle: string;
        efvTier: string;
        placement: string;
        points: number;
        teamName: string;
        awardedAt: string;
        isActive: boolean;
    }[];
};

export default function PublicProfilePage() {
    const params = useParams();
    const id = params.id as string;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [efvTab, setEfvTab] = useState<'mobile' | 'console'>('mobile');
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setError("");
        fetch(`/api/users/${id}/profile`)
            .then(r => r.json())
            .then(d => {
                if (d.success !== false && d.data) {
                    setProfile(d.data);
                } else {
                    setError(d.message || "Không tìm thấy người dùng");
                }
            })
            .catch(() => setError("Có lỗi xảy ra"))
            .finally(() => setLoading(false));
    }, [id]);

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-16 bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-efb-blue mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Đang tải hồ sơ...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-16 bg-gray-50">
                <div className="text-center max-w-md">
                    <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">Không tìm thấy</h2>
                    <p className="text-sm text-gray-500 mb-6">{error || "Người dùng không tồn tại hoặc đã bị xóa."}</p>
                    <Button variant="outline" asChild>
                        <Link href="/bxh"><ArrowLeft className="w-4 h-4 mr-2" />Quay lại BXH</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const statsItems = [
        { label: "Giải tham gia", value: profile.stats.tournamentsJoined, icon: Trophy, color: "text-blue-600 bg-blue-50" },
        { label: "Thắng", value: profile.stats.wins, icon: Target, color: "text-emerald-600 bg-emerald-50" },
        { label: "Thua", value: profile.stats.losses, icon: Swords, color: "text-red-500 bg-red-50" },
        { label: "Hòa", value: profile.stats.draws, icon: Swords, color: "text-amber-600 bg-amber-50" },
    ];

    const infoItems = [
        { label: "EFV ID", value: `#${profile.efvId}`, icon: Hash, show: true },
        { label: "Họ và tên", value: profile.name, icon: User, show: true },
        { label: "Nickname", value: profile.nickname, icon: Gamepad2, show: !!profile.nickname },
        { label: "CLB / Team", value: profile.teamName, icon: Shield, show: !!profile.teamName },
        { label: "Số điện thoại", value: profile.phone, icon: Phone, show: !!profile.phone },
        { label: "Email", value: profile.email, icon: Mail, show: !!profile.email },
        { label: "eFootball ID", value: profile.gamerId, icon: Gamepad2, show: !!profile.gamerId },
        { label: "Tỉnh/TP", value: profile.province, icon: MapPin, show: !!profile.province },
        { label: "Ngày sinh", value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("vi-VN") : "", icon: CalendarDays, show: !!profile.dateOfBirth },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Cover Banner */}
            <div className="relative pt-16">
                <div
                    className="h-56 sm:h-72 relative bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/assets/efootball_bg.webp')" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A3D91]/60 via-[#1E40AF]/50 to-gray-50" />
                    {/* Decorative elements */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-yellow-300/[0.06] rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-emerald-400/[0.04] rounded-full blur-3xl" />
                    </div>

                    {/* Back button */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"
                            asChild
                        >
                            <Link href="/bxh">
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                BXH
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-[900px] mx-auto px-4 sm:px-6 pb-16 relative z-10" style={{ marginTop: "-100px" }}>
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                >
                    {/* Avatar + Name Section */}
                    <div className="px-6 sm:px-8 pt-6 pb-6 relative">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
                            {/* Avatar */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="flex-shrink-0 self-center sm:self-start"
                            >
                                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-white shadow-xl ring-2 ring-gray-100 bg-gradient-to-br from-efb-blue to-indigo-600 flex items-center justify-center overflow-hidden">
                                    {profile.avatar ? (
                                        <img
                                            src={profile.avatar}
                                            alt={profile.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white text-3xl sm:text-4xl font-bold">
                                            {getInitials(profile.name)}
                                        </span>
                                    )}
                                </div>
                            </motion.div>

                            {/* Name + Badges */}
                            <div className="flex-1 min-w-0 text-center sm:text-left pb-2">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                                    {profile.name}
                                </h1>
                                {profile.nickname && (
                                    <p className="text-base text-gray-500 font-medium mt-0.5">
                                        &quot;{profile.nickname}&quot;
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                                    {/* EFV ID Badge */}
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg">
                                        <Hash className="w-3 h-3 text-amber-500" />
                                        EFV ID: {profile.efvId}
                                    </span>
                                    {/* Role */}
                                    {profile.role === "manager" || profile.role === "admin" ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-efb-blue bg-efb-blue/10 px-2.5 py-1.5 rounded-lg">
                                            <Shield className="w-3 h-3" />
                                            Quản lý giải đấu
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                                            <Gamepad2 className="w-3 h-3" />
                                            Người chơi
                                        </span>
                                    )}
                                    {profile.teamName && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                                            <Shield className="w-3 h-3" />
                                            {profile.teamName}
                                        </span>
                                    )}
                                </div>
                                {/* Facebook link */}
                                {profile.facebookLink && (
                                    <div className="mt-3">
                                        <a
                                            href={profile.facebookLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all border border-blue-100"
                                        >
                                            <Facebook className="w-4 h-4" />
                                            {profile.facebookName || "Facebook"}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bio Section */}
                    {profile.bio && (
                        <>
                            <div className="h-px bg-gray-100" />
                            <div className="px-6 sm:px-8 py-5">
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {profile.bio}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-gray-100" />

                    {/* Stats Grid */}
                    <div className="px-6 sm:px-8 py-6">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Thống kê</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {statsItems.map((stat) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-gray-50/80 rounded-xl p-4 text-center border border-gray-100/80 hover:shadow-md transition-all"
                                >
                                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* EFV Points Section */}
                    <div className="px-6 sm:px-8 py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                Điểm EFV & BXH
                            </h2>
                        </div>

                        {(profile.mobile || profile.console) ? (
                            <div className="space-y-4">
                                {/* Tab Switcher */}
                                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                    <button
                                        onClick={() => setEfvTab('mobile')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${efvTab === 'mobile'
                                            ? 'bg-white text-amber-700 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Smartphone className="w-4 h-4" />
                                        Mobile
                                    </button>
                                    <button
                                        onClick={() => setEfvTab('console')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${efvTab === 'console'
                                            ? 'bg-white text-cyan-700 shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Monitor className="w-4 h-4" />
                                        Console
                                    </button>
                                </div>

                                {/* Tab Content */}
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
                                            {profile.mobile ? (
                                                <>
                                                    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100/80">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-200/50 flex-shrink-0">
                                                            <Star className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-2xl font-extrabold text-amber-700 leading-none">{profile.mobile.points}</p>
                                                            <p className="text-xs text-amber-500/80 font-medium mt-0.5">Tổng điểm Mobile</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 pl-3 border-l border-amber-200/60">
                                                            <p className="text-xl font-bold text-amber-600 leading-none">{profile.mobile.rank ? `#${profile.mobile.rank}` : "—"}</p>
                                                            <p className="text-xs text-amber-400 font-medium mt-0.5">Hạng BXH</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { label: 'EFV 250', value: profile.mobile.pointsEfv250, color: 'blue' },
                                                            { label: 'EFV 500', value: profile.mobile.pointsEfv500, color: 'purple' },
                                                            { label: 'EFV 1000', value: profile.mobile.pointsEfv1000, color: 'amber' },
                                                        ].map((tier) => (
                                                            <div key={tier.label} className={`bg-${tier.color}-50/60 rounded-xl p-3 text-center border border-${tier.color}-100/80`}>
                                                                <p className={`text-[10px] text-${tier.color}-500 font-bold uppercase tracking-wide`}>{tier.label}</p>
                                                                <p className={`text-lg font-bold text-${tier.color}-700 mt-0.5`}>{tier.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                    <Smartphone className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Chưa có dữ liệu Mobile</p>
                                                </div>
                                            )}
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
                                            {profile.console ? (
                                                <>
                                                    <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-100/80">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-200/50 flex-shrink-0">
                                                            <Star className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-2xl font-extrabold text-cyan-700 leading-none">{profile.console.points}</p>
                                                            <p className="text-xs text-cyan-500/80 font-medium mt-0.5">Tổng điểm Console</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 pl-3 border-l border-cyan-200/60">
                                                            <p className="text-xl font-bold text-cyan-600 leading-none">{profile.console.rank ? `#${profile.console.rank}` : "—"}</p>
                                                            <p className="text-xs text-cyan-400 font-medium mt-0.5">Hạng BXH</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="bg-teal-50/60 rounded-xl p-3 text-center border border-teal-100/80">
                                                            <p className="text-[10px] text-teal-500 font-bold uppercase tracking-wide">EFV 50</p>
                                                            <p className="text-lg font-bold text-teal-700 mt-0.5">{profile.console.pointsEfv50}</p>
                                                        </div>
                                                        <div className="bg-cyan-50/60 rounded-xl p-3 text-center border border-cyan-100/80">
                                                            <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-wide">EFV 100</p>
                                                            <p className="text-lg font-bold text-cyan-700 mt-0.5">{profile.console.pointsEfv100}</p>
                                                        </div>
                                                        <div className="bg-rose-50/60 rounded-xl p-3 text-center border border-rose-100/80">
                                                            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wide">EFV 200</p>
                                                            <p className="text-lg font-bold text-rose-700 mt-0.5">{profile.console.pointsEfv200}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                    <Monitor className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-400">Chưa có dữ liệu Console</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <Award className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Chưa có điểm EFV</p>
                            </div>
                        )}
                    </div>

                    {/* Tournament History */}
                    {profile.recentLogs.length > 0 && (
                        <>
                            <div className="h-px bg-gray-100" />
                            <div className="px-6 sm:px-8 py-6">
                                <button
                                    onClick={() => setHistoryOpen(!historyOpen)}
                                    className="w-full flex items-center justify-between py-2 text-sm font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        Lịch sử giải đấu ({profile.recentLogs.length})
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {historyOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="divide-y divide-gray-50 mt-3 max-h-[400px] overflow-y-auto">
                                                {profile.recentLogs.map((log) => {
                                                    const placementLabel = PLACEMENT_LABELS[log.placement] || log.placement;
                                                    return (
                                                        <div key={log._id} className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${log.isActive ? 'hover:bg-gray-50' : 'opacity-50'}`}>
                                                            <div className="flex-shrink-0">
                                                                {log.isActive ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-gray-300" />
                                                                )}
                                                            </div>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${log.placement === 'champion' ? 'bg-yellow-100 text-yellow-600' :
                                                                log.placement === 'runner_up' ? 'bg-gray-100 text-gray-600' :
                                                                    log.placement === 'top_4' ? 'bg-orange-100 text-orange-600' :
                                                                        'bg-blue-50 text-blue-500'
                                                                }`}>
                                                                {log.placement === 'champion' ? <Crown className="w-3.5 h-3.5" /> :
                                                                    log.placement === 'runner_up' ? <Medal className="w-3.5 h-3.5" /> :
                                                                        <TrendingUp className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">{log.tournamentTitle}</p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-[10px] text-gray-400">{placementLabel}</span>
                                                                    <span className="text-[10px] text-gray-200">·</span>
                                                                    <span className="text-[10px] font-medium text-purple-600">{log.efvTier?.replace('efv_', 'EFV ')}</span>
                                                                    <span className="text-[10px] text-gray-200">·</span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {new Date(log.awardedAt).toLocaleDateString('vi-VN')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className={`text-sm font-bold flex-shrink-0 ${log.isActive ? 'text-amber-600' : 'text-gray-400'}`}>+{log.points}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden"
                >
                    <div className="px-6 sm:px-8 py-6">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            Thông tin chi tiết
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {infoItems.filter(i => i.show).map((item) => (
                                <div key={item.label} className="flex items-center gap-3 py-3 px-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/70 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                                        <item.icon className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Facebook prominent link */}
                        {profile.facebookLink && (
                            <div className="mt-4 flex items-center gap-3 py-3 px-4 bg-blue-50/80 rounded-xl border border-blue-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Facebook className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Facebook</p>
                                    <a href={profile.facebookLink} target="_blank" rel="noopener" className="text-sm font-medium text-blue-700 hover:underline truncate block">
                                        {profile.facebookName || profile.facebookLink}
                                    </a>
                                </div>
                                <a href={profile.facebookLink} target="_blank" rel="noopener" className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors flex-shrink-0">
                                    <ExternalLink className="w-4 h-4 text-blue-600" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Join date */}
                    <div className="px-6 sm:px-8 pb-6">
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Tham gia từ {new Date(profile.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
