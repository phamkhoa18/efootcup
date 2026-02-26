"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    Menu, Trophy, Users, Newspaper, LogIn, LogOut, User, Settings,
    LayoutDashboard, Gamepad2, ChevronDown, Shield, Bell, Trash2, Check,
    ExternalLink, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
    { label: "Giải đấu", href: "/giai-dau", icon: Trophy },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, isAuthenticated, isManager, isLoading, logout, token } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchNotifications();
            // Refresh every 2 minutes
            const interval = setInterval(fetchNotifications, 120000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, token]);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data.notifications);
                setUnreadCount(data.data.unreadCount);
            }
        } catch (e) {
            console.error("Fetch notifications error:", e);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) {
            console.error("Mark as read error:", e);
        }
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                ? "bg-white/95 backdrop-blur-md shadow-sm"
                : "bg-white"
                }`}
        >
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                <nav className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="bg-efb-blue rounded-lg p-1.5">
                            <Image
                                src="/assets/logo.svg"
                                alt="eFootball Cup VN"
                                width={100}
                                height={24}
                                className="h-5 w-auto"
                                priority
                            />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="text-sm font-bold text-efb-dark leading-tight">eFootCup</span>
                            <span className="text-[10px] text-efb-text-muted">Việt Nam</span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="px-4 py-2 text-sm font-medium text-efb-text-secondary hover:text-efb-blue transition-colors duration-200 rounded-lg hover:bg-efb-blue/[0.04]"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden lg:flex items-center gap-3">
                        {isLoading ? (
                            /* Loading skeleton */
                            <div className="flex items-center gap-3">
                                <div className="w-20 h-9 bg-gray-100 rounded-lg animate-pulse" />
                                <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                            </div>
                        ) : isAuthenticated && user ? (
                            /* Logged in — show user dropdown */
                            <>

                                {/* Notification Bell */}
                                <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors group">
                                            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-efb-blue' : 'text-gray-400'} group-hover:scale-110 transition-transform`} />
                                            {unreadCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                            <h3 className="text-sm font-bold text-gray-900">Thông báo</h3>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                                    className="text-[10px] font-bold text-efb-blue hover:underline uppercase tracking-tight"
                                                >
                                                    Đọc tất cả
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[360px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <Bell className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                                    <p className="text-xs text-gray-400">Không có thông báo mới</p>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <DropdownMenuItem
                                                        key={notif._id}
                                                        asChild
                                                        className={`p-0 focus:bg-transparent cursor-default border-b border-gray-50 last:border-0 ${!notif.isRead ? 'bg-blue-50/40' : ''}`}
                                                    >
                                                        <Link
                                                            href={notif.link || '#'}
                                                            className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                                            onClick={() => setIsNotifOpen(false)}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${notif.type === 'registration' ? 'bg-amber-100 text-amber-600' :
                                                                notif.type === 'tournament' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {notif.type === 'registration' ? <Users className="w-4 h-4" /> :
                                                                    notif.type === 'tournament' ? <Trophy className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-bold text-gray-900 leading-tight mb-0.5">{notif.title}</p>
                                                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                                                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1 font-medium">
                                                                    <Calendar className="w-2.5 h-2.5" />
                                                                    {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                                                                </p>
                                                            </div>
                                                            {!notif.isRead && (
                                                                <div className="w-2 h-2 rounded-full bg-efb-blue mt-1.5 flex-shrink-0" />
                                                            )}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <Link
                                                href="/trang-ca-nhan"
                                                onClick={() => setIsNotifOpen(false)}
                                                className="block py-2.5 text-center text-xs font-bold text-gray-500 hover:text-efb-blue hover:bg-gray-50 transition-all border-t border-gray-50"
                                            >
                                                Xem tất cả
                                            </Link>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 transition-colors duration-200 outline-none focus:ring-2 focus:ring-efb-blue/20 focus:ring-offset-1">
                                            <Avatar className="w-8 h-8 border-2 border-efb-blue/20">
                                                <AvatarImage src={user.avatar || ""} alt={user.name} />
                                                <AvatarFallback className="bg-efb-blue text-white text-xs font-bold">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-efb-dark max-w-[120px] truncate hidden xl:block">
                                                {user.name}
                                            </span>
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border border-gray-100">
                                        {/* User info header */}
                                        <DropdownMenuLabel className="px-3 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10 border-2 border-efb-blue/10">
                                                    <AvatarImage src={user.avatar || ""} alt={user.name} />
                                                    <AvatarFallback className="bg-efb-blue text-white text-sm font-bold">
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {user.email}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        {isManager ? (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-efb-blue bg-efb-blue/10 px-1.5 py-0.5 rounded-full">
                                                                <Shield className="w-2.5 h-2.5" />
                                                                Quản lý
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                                <Gamepad2 className="w-2.5 h-2.5" />
                                                                Người chơi
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>

                                        <DropdownMenuSeparator className="my-1" />

                                        {/* Menu items */}
                                        <DropdownMenuItem asChild className="px-3 py-2.5 rounded-lg cursor-pointer">
                                            <Link href="/trang-ca-nhan" className="flex items-center gap-2.5">
                                                <User className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm">Trang cá nhân</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        {isManager && (
                                            <DropdownMenuItem asChild className="px-3 py-2.5 rounded-lg cursor-pointer">
                                                <Link href="/manager" className="flex items-center gap-2.5">
                                                    <LayoutDashboard className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm">Quản lý giải đấu</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem asChild className="px-3 py-2.5 rounded-lg cursor-pointer">
                                            <Link href="/giai-dau" className="flex items-center gap-2.5">
                                                <Trophy className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm">Giải đấu của tôi</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild className="px-3 py-2.5 rounded-lg cursor-pointer">
                                            <Link href="/cai-dat" className="flex items-center gap-2.5">
                                                <Settings className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm">Cài đặt</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator className="my-1" />

                                        <DropdownMenuItem
                                            onClick={() => logout()}
                                            className="px-3 py-2.5 rounded-lg cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                        >
                                            <LogOut className="w-4 h-4 mr-2.5" />
                                            <span className="text-sm">Đăng xuất</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            /* Not logged in — show login & create tournament */
                            <>
                                <Button
                                    variant="ghost"
                                    className="text-efb-text-secondary hover:text-efb-blue text-sm font-medium h-9 px-4"
                                    asChild
                                >
                                    <Link href="/dang-nhap">
                                        <LogIn className="w-4 h-4 mr-1.5" />
                                        Đăng nhập
                                    </Link>
                                </Button>
                                <Button
                                    className="bg-efb-blue text-white hover:bg-efb-blue-light font-semibold text-sm h-9 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                    asChild
                                >
                                    <Link href="/dang-ky">
                                        Đăng ký
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild className="lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-efb-text hover:bg-efb-blue/[0.05]"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-full sm:w-[360px] bg-white border-l border-efb-border p-0"
                        >
                            <div className="flex flex-col h-full">
                                {/* Mobile header */}
                                <div className="flex items-center p-5 border-b border-efb-border">
                                    <div className="bg-efb-blue rounded-lg p-1.5">
                                        <Image
                                            src="/assets/logo.svg"
                                            alt="eFootball Cup VN"
                                            width={80}
                                            height={20}
                                            className="h-4 w-auto"
                                        />
                                    </div>
                                    <span className="ml-2.5 text-sm font-bold text-efb-dark">eFootCup VN</span>
                                </div>

                                {/* Mobile user info (if logged in) */}
                                {isAuthenticated && user && (
                                    <div className="px-5 py-4 border-b border-efb-border bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-11 h-11 border-2 border-efb-blue/20">
                                                <AvatarImage src={user.avatar || ""} alt={user.name} />
                                                <AvatarFallback className="bg-efb-blue text-white text-sm font-bold">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                <div className="mt-1">
                                                    {isManager ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-efb-blue bg-efb-blue/10 px-1.5 py-0.5 rounded-full">
                                                            <Shield className="w-2.5 h-2.5" />
                                                            Quản lý
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                            <Gamepad2 className="w-2.5 h-2.5" />
                                                            Người chơi
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mobile nav links */}
                                <div className="flex-1 py-3 px-3">
                                    {navLinks.map((link, i) => (
                                        <motion.div
                                            key={link.href}
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                        >
                                            <Link
                                                href={link.href}
                                                onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-efb-text hover:bg-efb-bg-alt transition-colors duration-150"
                                            >
                                                <link.icon className="w-[18px] h-[18px] text-efb-blue" />
                                                <span className="text-[15px] font-medium">{link.label}</span>
                                            </Link>
                                        </motion.div>
                                    ))}

                                    {/* Authenticated mobile links */}
                                    {isAuthenticated && user && (
                                        <>
                                            <div className="h-px bg-gray-100 my-2 mx-4" />

                                            <motion.div
                                                initial={{ opacity: 0, x: 16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.24 }}
                                            >
                                                <Link
                                                    href="/trang-ca-nhan"
                                                    onClick={() => setMobileOpen(false)}
                                                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-efb-text hover:bg-efb-bg-alt transition-colors duration-150"
                                                >
                                                    <User className="w-[18px] h-[18px] text-efb-blue" />
                                                    <span className="text-[15px] font-medium">Trang cá nhân</span>
                                                </Link>
                                            </motion.div>

                                            {isManager && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 16 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.32 }}
                                                >
                                                    <Link
                                                        href="/manager"
                                                        onClick={() => setMobileOpen(false)}
                                                        className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-efb-text hover:bg-efb-bg-alt transition-colors duration-150"
                                                    >
                                                        <LayoutDashboard className="w-[18px] h-[18px] text-efb-blue" />
                                                        <span className="text-[15px] font-medium">Quản lý giải đấu</span>
                                                    </Link>
                                                </motion.div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Mobile footer */}
                                <div className="p-5 space-y-2.5 border-t border-efb-border">
                                    {isAuthenticated && user ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                logout();
                                                setMobileOpen(false);
                                            }}
                                            className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium rounded-xl"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Đăng xuất
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="w-full h-11 border-efb-border text-efb-text font-medium rounded-xl"
                                                asChild
                                            >
                                                <Link href="/dang-nhap" onClick={() => setMobileOpen(false)}>
                                                    Đăng nhập
                                                </Link>
                                            </Button>
                                            <Button
                                                className="w-full h-11 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl"
                                                asChild
                                            >
                                                <Link href="/dang-ky" onClick={() => setMobileOpen(false)}>
                                                    Đăng ký
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </nav>
            </div>
        </motion.header>
    );
}
