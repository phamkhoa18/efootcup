"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-20 lg:py-28 bg-white">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <div className="relative rounded-3xl overflow-hidden">
                        {/* Rich gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D91] via-[#1E40AF] to-[#4338CA]" />

                        {/* Decorative elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-24 -right-24 w-[400px] h-[400px] bg-gradient-to-br from-yellow-300/20 via-orange-400/10 to-transparent rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-[350px] h-[350px] bg-gradient-to-tr from-cyan-400/15 via-blue-400/10 to-transparent rounded-full blur-3xl" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl" />
                        </div>

                        {/* Logo watermark */}
                        <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
                            <Image
                                src="/assets/logo.svg"
                                alt=""
                                width={400}
                                height={100}
                                className="w-auto h-auto"
                            />
                        </div>

                        <div className="relative px-8 py-16 sm:px-16 sm:py-20 lg:px-24 lg:py-24 text-center z-10">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm mb-8">
                                <Sparkles className="w-4 h-4 text-efb-yellow" />
                                <span className="text-xs font-medium text-white/90 tracking-wider uppercase">
                                    Bắt đầu miễn phí
                                </span>
                            </div>

                            <h2 className="text-[32px] sm:text-[40px] lg:text-[56px] font-extralight text-white leading-tight mb-6 tracking-tight">
                                Sẵn sàng tạo giải đấu
                                <br />
                                <span className="text-efb-yellow font-semibold">của riêng bạn?</span>
                            </h2>

                            <p className="text-white/60 text-[17px] max-w-xl mx-auto mb-10 leading-relaxed font-light">
                                Tham gia cùng hàng ngàn game thủ eFootball Việt Nam.
                                Tạo giải đấu ngay hôm nay và trải nghiệm sự khác biệt.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                                <Button
                                    size="lg"
                                    className="bg-efb-yellow text-efb-dark hover:bg-efb-yellow-dark font-semibold text-sm h-13 px-10 rounded-xl shadow-lg shadow-yellow-300/20 transition-all duration-300 group"
                                    asChild
                                >
                                    <Link href="/tao-giai-dau">
                                        <Trophy className="w-5 h-5 mr-2" />
                                        Tạo giải đấu ngay
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    className="bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] font-medium text-sm h-13 px-8 rounded-xl backdrop-blur-sm"
                                    asChild
                                >
                                    <Link href="/huong-dan">Tìm hiểu thêm</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
