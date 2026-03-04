"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Users, Trophy, Gamepad2, Newspaper, TrendingUp,
    ArrowRight, Eye, Crown, Shield, UserCheck,
    Loader2, AlertCircle, Activity, Globe,
    CheckCircle2, Clock, FileText, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { adminAPI } from "@/lib/api";

export default function AdminDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await adminAPI.getStats();
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Failed to load admin stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue mx-auto mb-3" />
                    <p className="text-sm text-efb-text-muted">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const users = data?.users || {};
    const tournaments = data?.tournaments || {};
    const matches = data?.matches || {};
    const registrations = data?.registrations || {};
    const posts = data?.posts || {};
    const recentUsers = data?.recentUsers || [];
    const statusBreakdown = tournaments.statusBreakdown || {};

    const statsCards = [
        {
            label: "Tổng người dùng",
            value: users.total || 0,
            sub: `${users.newThisWeek || 0} mới tuần này`,
            icon: Users,
            gradient: "from-blue-500 to-indigo-600",
            bgIcon: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            label: "Giải đấu",
            value: tournaments.total || 0,
            sub: `${tournaments.active || 0} đang hoạt động`,
            icon: Trophy,
            gradient: "from-amber-400 to-orange-500",
            bgIcon: "bg-amber-50",
            iconColor: "text-amber-600",
        },
        {
            label: "Trận đấu",
            value: matches.total || 0,
            sub: `${matches.completed || 0} hoàn thành`,
            icon: Gamepad2,
            gradient: "from-emerald-400 to-teal-500",
            bgIcon: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            label: "Bài viết",
            value: posts.total || 0,
            sub: `${posts.published || 0} đã xuất bản`,
            icon: Newspaper,
            gradient: "from-purple-500 to-fuchsia-500",
            bgIcon: "bg-purple-50",
            iconColor: "text-purple-600",
        },
    ];

    const roleCards = [
        { label: "Admin", value: users.admins || 0, icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Manager", value: users.managers || 0, icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Đã xác minh", value: users.verified || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Đăng ký chờ", value: registrations.pending || 0, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-semibold text-efb-dark tracking-tight"
                    >
                        Xin chào, <span className="text-efb-blue">{user?.name || "Admin"}</span>
                    </motion.h1>
                    <p className="text-sm text-efb-text-muted mt-1 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        Bảng điều khiển quản trị hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/nguoi-dung">
                        <Button className="bg-efb-blue text-white hover:bg-efb-blue/90 rounded-xl h-10 px-5 shadow-sm shadow-efb-blue/20 group">
                            <Users className="w-4 h-4 mr-2" />
                            Quản lý người dùng
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm group hover:shadow-md transition-all"
                    >
                        <div className={`w-10 h-10 rounded-xl ${stat.bgIcon} flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                        </div>
                        <div className="text-2xl font-bold text-efb-dark tracking-tight">
                            {stat.value}
                        </div>
                        <div className="text-xs text-efb-text-muted mt-1">{stat.label}</div>
                        {stat.sub && (
                            <div className="text-[11px] text-efb-text-muted/60 mt-0.5">{stat.sub}</div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Role breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {roleCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
                    >
                        <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-efb-dark">{card.value}</div>
                            <div className="text-[11px] text-efb-text-muted">{card.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Users */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-semibold text-efb-dark">
                            Người dùng mới nhất
                        </h2>
                        <Link
                            href="/admin/nguoi-dung"
                            className="text-xs text-efb-blue hover:text-efb-blue/80 font-medium flex items-center gap-1 transition-colors"
                        >
                            Xem tất cả
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {recentUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-efb-text-muted">
                                Chưa có người dùng nào
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentUsers.map((u: any, i: number) => (
                                <motion.div
                                    key={u._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.05 }}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${u.role === "admin" ? "bg-amber-50" : u.role === "manager" ? "bg-blue-50" : "bg-gray-50"}`}>
                                        {u.role === "admin" ? (
                                            <Crown className="w-5 h-5 text-amber-600" />
                                        ) : u.role === "manager" ? (
                                            <Shield className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Users className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-efb-dark truncate group-hover:text-efb-blue transition-colors">
                                            {u.name}
                                        </div>
                                        <div className="text-[11px] text-efb-text-muted truncate">{u.email}</div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-amber-50 text-amber-700" : u.role === "manager" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                            {u.role}
                                        </span>
                                        <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tournament Status Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-semibold text-efb-dark mb-5">
                        Trạng thái giải đấu
                    </h2>
                    <div className="space-y-4">
                        {[
                            { key: "ongoing", label: "Đang diễn ra", color: "bg-red-500", text: "text-red-600" },
                            { key: "registration", label: "Đăng ký", color: "bg-blue-500", text: "text-blue-600" },
                            { key: "draft", label: "Nháp", color: "bg-gray-400", text: "text-gray-500" },
                            { key: "completed", label: "Hoàn thành", color: "bg-emerald-500", text: "text-emerald-600" },
                            { key: "cancelled", label: "Đã hủy", color: "bg-red-300", text: "text-red-400" },
                        ].map((item) => {
                            const val = statusBreakdown[item.key] || 0;
                            const total = tournaments.total || 1;
                            return (
                                <div key={item.key} className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-efb-text-secondary">{item.label}</span>
                                        <span className={`font-bold ${item.text}`}>{val}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(val / total) * 100}%` }}
                                            className={`h-full ${item.color} rounded-full`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 space-y-2">
                        <p className="text-[10px] font-semibold text-efb-text-muted uppercase tracking-wider mb-3">Thao tác nhanh</p>
                        <Link href="/admin/nguoi-dung" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-efb-text-secondary group-hover:text-efb-dark transition-colors">Quản lý người dùng</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 ml-auto group-hover:text-efb-blue transition-colors" />
                        </Link>
                        <Link href="/admin/giai-dau" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                            <Trophy className="w-4 h-4 text-amber-600" />
                            <span className="text-sm text-efb-text-secondary group-hover:text-efb-dark transition-colors">Quản lý giải đấu</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 ml-auto group-hover:text-efb-blue transition-colors" />
                        </Link>
                        <Link href="/admin/bai-viet" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                            <Newspaper className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-efb-text-secondary group-hover:text-efb-dark transition-colors">Đăng bài viết</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 ml-auto group-hover:text-efb-blue transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
