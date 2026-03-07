"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Youtube, MessageCircle, Mail, Phone, MapPin, Instagram, Send, Gamepad2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const quickLinks = [
    { label: "Giải đấu", href: "/giai-dau" },
    { label: "Tin tức", href: "/tin-tuc" },
    { label: "Bảng xếp hạng", href: "/bxh" },
];

const supportLinks = [
    { label: "Liên hệ", href: "/lien-he" },
    { label: "Điều khoản", href: "/dieu-khoan" },
    { label: "Chính sách", href: "/chinh-sach" },
    { label: "FAQ", href: "/faq" },
];

export function Footer() {
    const { settings } = useSiteSettings();

    // Build social links dynamically
    const socialLinks = [
        settings.socialFacebook && { label: "Facebook", href: settings.socialFacebook, icon: Facebook },
        settings.socialYoutube && { label: "YouTube", href: settings.socialYoutube, icon: Youtube },
        settings.socialTiktok && { label: "TikTok", href: settings.socialTiktok, icon: Gamepad2 },
        settings.socialDiscord && { label: "Discord", href: settings.socialDiscord, icon: MessageCircle },
        settings.socialInstagram && { label: "Instagram", href: settings.socialInstagram, icon: Instagram },
        settings.socialTelegram && { label: "Telegram", href: settings.socialTelegram, icon: Send },
    ].filter(Boolean) as { label: string; href: string; icon: any }[];

    const siteName = settings.siteName || "EFV CUP Vietnam";
    const siteDescription = settings.siteDescription || "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam. Kết nối cộng đồng game thủ, tạo sân chơi chuyên nghiệp.";
    const copyrightText = settings.copyrightText || "© 2026 eFootball Cup VN. Mọi quyền được bảo lưu.";
    const logoSrc = settings.logoDark || settings.logo || "/assets/logo.svg";
    const hasCustomLogo = !!(settings.logoDark || settings.logo);

    return (
        <footer className="bg-efb-dark text-white">
            {/* Main Footer */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
                            <div className={hasCustomLogo ? "" : "bg-white/10 rounded-lg p-1.5"}>
                                <Image
                                    src={logoSrc}
                                    alt={siteName}
                                    width={100}
                                    height={24}
                                    className={hasCustomLogo ? "h-8 w-auto object-contain brightness-0 invert" : "h-5 w-auto"}
                                />
                            </div>
                            <span className="text-sm font-bold">{siteName}</span>
                        </Link>
                        <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
                            {siteDescription}
                        </p>

                        {/* Social Links */}
                        {socialLinks.length > 0 && (
                            <div className="flex items-center gap-2.5">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-efb-yellow hover:bg-white/[0.12] transition-all duration-200"
                                    >
                                        <social.icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Contact Info */}
                        {(settings.contactEmail || settings.contactPhone || settings.contactAddress) && (
                            <div className="mt-6 space-y-2.5 text-white/50 text-sm">
                                {settings.contactEmail && (
                                    <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-2 hover:text-white/80 transition-colors">
                                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{settings.contactEmail}</span>
                                    </a>
                                )}
                                {settings.contactPhone && (
                                    <a href={`tel:${settings.contactPhone}`} className="flex items-center gap-2 hover:text-white/80 transition-colors">
                                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{settings.contactPhone}</span>
                                    </a>
                                )}
                                {settings.contactAddress && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span>{settings.contactAddress}</span>
                                    </div>
                                )}
                            </div>
                        )}
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
                        {copyrightText}
                    </p>
                    <p className="text-white/25 text-xs">
                        eFootball™ là thương hiệu của KONAMI Digital Entertainment.
                    </p>
                </div>
            </div>
        </footer>
    );
}
