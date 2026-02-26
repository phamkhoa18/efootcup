"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Trophy } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative min-h-[92vh] flex items-center overflow-hidden">
            {/* Background base */}
            <div className="absolute inset-0 bg-[#0A3D91]" />

            {/* Background image */}
            <div className="absolute inset-0">
                <Image
                    src="/assets/hero-banner-1.png"
                    alt="eFootball Hero"
                    fill
                    className="object-cover object-top opacity-70"
                    priority
                    quality={90}
                />
            </div>

            {/* Light gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D91]/60 via-[#1E40AF]/40 to-[#4338CA]/50" />

            {/* Decorative mesh */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.16, 0.08] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute -top-32 right-0 w-[700px] h-[700px] bg-gradient-to-br from-yellow-300/40 via-orange-400/20 to-transparent rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1.1, 1, 1.1], opacity: [0.06, 0.12, 0.06] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute bottom-0 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-400/30 via-blue-500/20 to-transparent rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.1, 0.04] }}
                    transition={{ duration: 12, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-transparent rounded-full blur-3xl"
                />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 pt-28 pb-20 w-full">
                <div className="max-w-2xl">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm mb-7"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] font-medium text-white/90 tracking-wider uppercase">
                            Nền tảng giải đấu #1 Việt Nam
                        </span>
                    </motion.div>

                    {/* Title — thin weight */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                        className="text-[42px] sm:text-[56px] md:text-[64px] lg:text-[76px] font-extralight leading-[1.05] tracking-tight text-white mb-6"
                    >
                        Sân chơi
                        <br />
                        <span className="font-semibold text-efb-yellow drop-shadow-[0_0_30px_rgba(255,255,0,0.3)]">eFootball</span>
                        <br />
                        chuyên nghiệp<span className="text-efb-yellow font-light">.</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-[16px] sm:text-[18px] text-white/60 font-light leading-relaxed max-w-lg mb-10"
                    >
                        Tổ chức giải đấu chỉ trong vài phút. Quản lý đội hình,
                        theo dõi kết quả trực tiếp và kết nối cộng đồng.
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.45 }}
                        className="flex flex-col sm:flex-row items-start gap-3.5"
                    >
                        <Button
                            size="lg"
                            className="bg-efb-yellow text-efb-dark hover:bg-efb-yellow-dark font-semibold text-sm h-12 px-7 rounded-xl shadow-lg shadow-yellow-300/25 transition-all duration-300 group"
                            asChild
                        >
                            <Link href="/tao-giai-dau">
                                <Trophy className="w-4 h-4 mr-2" />
                                Tạo giải đấu
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            className="bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] font-medium text-sm h-12 px-7 rounded-xl backdrop-blur-sm"
                            asChild
                        >
                            <Link href="/giai-dau">
                                <Play className="w-4 h-4 mr-2" />
                                Xem giải đấu
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Bottom curve to white */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 80" fill="none" className="w-full block">
                    <path d="M0 80H1440V20C1440 20 1200 80 720 80C240 80 0 20 0 20V80Z" fill="white" />
                </svg>
            </div>
        </section>
    );
}
