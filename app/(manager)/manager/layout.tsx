"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Trophy,
    Users,
    CalendarPlus,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    Search,
    Menu,
    BarChart3,
    FileText,
    User,
    ArrowLeft,
    Eye,
    Swords,
    Calendar,
    UserCheck,
    Share2,
    MessageSquare,
    DollarSign,
    ShieldCheck,
    ClipboardList,
    Check,
    CircleAlert,
    CheckCircle2,
    Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ===== Main sidebar links ===== */
const mainSidebarLinks = [
    { label: "Dashboard", href: "/manager", icon: LayoutDashboard },
    { label: "Giải đấu", href: "/manager/giai-dau", icon: Trophy },
    { label: "Tạo giải đấu", href: "/manager/tao-giai-dau", icon: CalendarPlus },
    { label: "Bảng xếp hạng", href: "/manager/bxh", icon: Award },
    { label: "Quản lý VĐV", href: "/manager/vdv", icon: Users },
    { label: "Thống kê", href: "/manager/thong-ke", icon: BarChart3 },
    { label: "Báo cáo", href: "/manager/bao-cao", icon: FileText },
];

const mainBottomLinks = [
    { label: "Cài đặt", href: "/manager/cai-dat", icon: Settings },
];

/* ===== Tournament detail sidebar links ===== */
const tournamentSidebarLinks = (id: string) => [
    { label: "Tổng quan", href: `/manager/giai-dau/${id}`, icon: Eye },
    { label: "Nội dung thi đấu", href: `/manager/giai-dau/${id}/noi-dung`, icon: ClipboardList },
    { label: "Lịch thi đấu", href: `/manager/giai-dau/${id}/lich`, icon: Calendar },
    { label: "Sơ đồ thi đấu", href: `/manager/giai-dau/${id}/so-do`, icon: Swords },
    { label: "Theo dõi giải đấu", href: `/manager/giai-dau/${id}/theo-doi`, icon: BarChart3 },
    { label: "Trọng tài / Token", href: `/manager/giai-dau/${id}/trong-tai`, icon: ShieldCheck },
    { label: "Đăng ký thi đấu", href: `/manager/giai-dau/${id}/dang-ky`, icon: UserCheck },
    { label: "Thống kê chi phí", href: `/manager/giai-dau/${id}/chi-phi`, icon: DollarSign },
    { label: "Chia sẻ giải đấu", href: `/manager/giai-dau/${id}/chia-se`, icon: Share2 },
    { label: "Đóng góp ý kiến", href: `/manager/giai-dau/${id}/y-kien`, icon: MessageSquare },
];

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading, isAuthenticated, isManager, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Auth protection
    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isManager)) {
            router.push("/dang-nhap");
        }
    }, [isLoading, isAuthenticated, isManager, router]);

    // Fetch Notifications
    useEffect(() => {
        if (isAuthenticated && isManager) {
            const fetchNotifs = async () => {
                try {
                    const res = await notificationsAPI.getMine();
                    if (res.success) {
                        setNotifications(res.data.notifications || []);
                        setUnreadCount(res.data.unreadCount || 0);
                    }
                } catch (err) {
                    console.error("Fetch notifications error", err);
                }
            };
            fetchNotifs();

            // Periodic refresh every 30 seconds
            const interval = setInterval(fetchNotifs, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, isManager]);

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    // Detect if inside a tournament detail page — must be above early returns
    const tournamentMatch = pathname.match(/^\/manager\/giai-dau\/([^/]+)/);
    const tournamentId = tournamentMatch ? tournamentMatch[1] : null;
    const isInTournamentDetail = !!tournamentId;

    const currentLinks = useMemo(() => {
        if (isInTournamentDetail && tournamentId) {
            return tournamentSidebarLinks(tournamentId);
        }
        return mainSidebarLinks;
    }, [isInTournamentDetail, tournamentId]);

    const isActive = (href: string) => {
        if (isInTournamentDetail) {
            return pathname === href;
        }
        if (href === "/manager") return pathname === "/manager";
        return pathname.startsWith(href);
    };

    // --- Early returns AFTER all hooks ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue mx-auto mb-3" />
                    <p className="text-sm text-efb-text-muted">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !isManager) return null;

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center h-16 px-4 border-b border-gray-100 ${collapsed ? "justify-center" : "gap-3"}`}>
                {collapsed ? (
                    <Image src="/assets/logo_football.png" alt="eFootCup" width={32} height={32} className="w-8 h-8" />
                ) : (
                    <>
                        <div className="bg-efb-blue rounded-lg p-1.5 flex-shrink-0">
                            <Image src="/assets/logo.svg" alt="eFootCup" width={80} height={20} className="h-4 w-auto" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-efb-dark leading-tight">eFootCup</span>
                            <span className="text-[10px] text-efb-text-muted">Manager</span>
                        </div>
                    </>
                )}
            </div>

            {/* Back button (tournament detail) */}
            {isInTournamentDetail && !collapsed && (
                <Link
                    href="/manager/giai-dau"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg text-xs font-medium text-efb-text-muted hover:text-efb-blue hover:bg-blue-50 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Quay lại danh sách
                </Link>
            )}
            {isInTournamentDetail && collapsed && (
                <Link
                    href="/manager/giai-dau"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center mx-3 mt-3 p-2 rounded-lg text-efb-text-muted hover:text-efb-blue hover:bg-blue-50 transition-all"
                    title="Quay lại danh sách"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
            )}

            {/* Nav Links */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                <div className={`text-[10px] font-semibold text-efb-text-muted uppercase tracking-wider mb-3 ${collapsed ? "text-center" : "px-3"}`}>
                    {collapsed ? "—" : isInTournamentDetail ? "Quản lý giải đấu" : "Menu"}
                </div>
                {currentLinks.map((link) => {
                    const active = isActive(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                                ? "bg-efb-blue text-white shadow-sm shadow-efb-blue/20"
                                : "text-efb-text-secondary hover:bg-gray-100 hover:text-efb-dark"
                                } ${collapsed ? "justify-center" : ""}`}
                            title={collapsed ? link.label : undefined}
                        >
                            <link.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-white" : "text-efb-text-muted group-hover:text-efb-blue"}`} />
                            {!collapsed && <span>{link.label}</span>}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom */}
            <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
                {!isInTournamentDetail && mainBottomLinks.map((link) => {
                    const active = isActive(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? "bg-gray-100 text-efb-dark" : "text-efb-text-muted hover:bg-gray-50 hover:text-efb-text-secondary"
                                } ${collapsed ? "justify-center" : ""}`}
                        >
                            <link.icon className="w-[18px] h-[18px] flex-shrink-0" />
                            {!collapsed && <span>{link.label}</span>}
                        </Link>
                    );
                })}

                {/* User profile */}
                <div className={`flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-gray-50 ${collapsed ? "justify-center" : ""}`}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-efb-dark truncate">{user?.name || "Manager"}</div>
                            <div className="text-[11px] text-efb-text-muted truncate">{user?.email || ""}</div>
                        </div>
                    )}
                    {!collapsed && (
                        <button onClick={logout} className="text-efb-text-muted hover:text-red-500 transition-colors flex-shrink-0" title="Đăng xuất">
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-white border-r border-gray-100 transition-all duration-300 z-40 ${collapsed ? "w-[72px]" : "w-[260px]"
                    }`}
            >
                <SidebarContent />
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute top-20 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-50 text-efb-text-muted hover:text-efb-blue"
                    style={{ left: collapsed ? "60px" : "248px" }}
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-0 left-0 bottom-0 w-[260px] bg-white z-50 lg:hidden shadow-xl"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}`}>
                {/* Top Bar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileOpen(true)} className="lg:hidden text-efb-text-secondary hover:text-efb-dark">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                            <input
                                placeholder="Tìm kiếm..."
                                className="w-64 h-9 pl-9 pr-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-efb-text-secondary focus:bg-white focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/10 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="relative w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-efb-blue/20">
                                    <Bell className="w-4 h-4 text-efb-text-secondary" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-gray-100 shadow-xl overflow-hidden mt-2">
                                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                    <div className="font-bold text-gray-900 text-sm">Thông báo</div>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] font-bold text-[#1b64f2] bg-blue-50 px-2.5 py-1 rounded-full">{unreadCount} mới</span>
                                    )}
                                </div>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-gray-500">
                                            Không có thông báo nào.
                                        </div>
                                    ) : (
                                        notifications.map((notif: any) => {
                                            const isRegistration = notif.type === "registration";
                                            const isTournament = notif.type === "tournament";

                                            return (
                                                <DropdownMenuItem asChild key={notif._id}>
                                                    <Link href={notif.link || "#"} className={`p-4 flex gap-3 items-start border-b border-gray-50 cursor-pointer rounded-none transition-colors ${notif.isRead ? "bg-white hover:bg-gray-50/80" : "bg-blue-50/30 hover:bg-blue-50/50"}`}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isRegistration ? "bg-blue-100" : isTournament ? "bg-amber-100" : "bg-emerald-100"}`}>
                                                            {isRegistration ? (
                                                                <UserCheck className={`w-4 h-4 ${isRegistration ? "text-blue-600" : "text-gray-600"}`} />
                                                            ) : isTournament ? (
                                                                <CircleAlert className="w-4 h-4 text-amber-600" />
                                                            ) : (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold leading-tight ${notif.isRead ? "text-gray-700" : "text-gray-900"}`}>{notif.title}</p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                                {new Date(notif.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                            </p>
                                                        </div>
                                                        {!notif.isRead && (
                                                            <div className="w-2 h-2 rounded-full bg-[#1b64f2] mt-2 flex-shrink-0" />
                                                        )}
                                                    </Link>
                                                </DropdownMenuItem>
                                            )
                                        })
                                    )}
                                </div>
                                {notifications.length > 0 && unreadCount > 0 && (
                                    <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-center">
                                        <button onClick={handleMarkAllRead} className="text-xs font-semibold text-[#1b64f2] hover:text-blue-700 transition-colors w-full">Đánh dấu tất cả đã đọc</button>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Link href="/" className="text-xs text-efb-text-muted hover:text-efb-blue transition-colors font-medium">
                            ← Về trang chủ
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
