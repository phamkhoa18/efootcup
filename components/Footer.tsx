"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Youtube, MessageCircle } from "lucide-react";

const socials = [
    { label: "Facebook", href: "#", icon: Facebook },
    { label: "YouTube", href: "#", icon: Youtube },
    { label: "Zalo", href: "#", icon: MessageCircle },
];

const quickLinks = [
    { label: "Giải đấu", href: "/giai-dau" },
    { label: "Hướng dẫn", href: "/huong-dan" },
];

const supportLinks = [
    { label: "Liên hệ", href: "/lien-he" },
    { label: "Điều khoản", href: "/dieu-khoan" },
    { label: "Chính sách", href: "/chinh-sach" },
    { label: "FAQ", href: "/faq" },
];

export function Footer() {
    return (
        <footer className="bg-efb-dark text-white">
            {/* Main Footer */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
                            <div className="bg-white/10 rounded-lg p-1.5">
                                <Image
                                    src="/assets/logo.svg"
                                    alt="eFootball Cup VN"
                                    width={100}
                                    height={24}
                                    className="h-5 w-auto"
                                />
                            </div>
                            <span className="text-sm font-bold">eFootCup VN</span>
                        </Link>
                        <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
                            Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam.
                            Kết nối cộng đồng game thủ, tạo sân chơi chuyên nghiệp.
                        </p>
                        <div className="flex items-center gap-2.5">
                            {socials.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-efb-yellow hover:bg-white/[0.12] transition-all duration-200"
                                >
                                    <social.icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-4">
                            Truy cập nhanh
                        </h4>
                        <ul className="space-y-2.5">
                            {quickLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-white/60 hover:text-white text-sm transition-colors duration-200"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-xs font-bold tracking-[0.15em] uppercase text-white/40 mb-4">
                            Hỗ trợ
                        </h4>
                        <ul className="space-y-2.5">
                            {supportLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-white/60 hover:text-white text-sm transition-colors duration-200"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-white/[0.08]">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-white/40 text-xs">
                        © 2026 eFootball Cup VN. Mọi quyền được bảo lưu.
                    </p>
                    <p className="text-white/25 text-xs">
                        eFootball™ là thương hiệu của KONAMI Digital Entertainment.
                    </p>
                </div>
            </div>
        </footer>
    );
}
