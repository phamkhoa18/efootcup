"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Trophy, Users, Gamepad2, Star } from "lucide-react";

const stats = [
    { icon: Trophy, value: "500+", label: "Giải đấu", desc: "đã tổ chức", gradient: "from-blue-500 to-indigo-500", bg: "bg-blue-50" },
    { icon: Users, value: "10K+", label: "Game thủ", desc: "tham gia", gradient: "from-violet-500 to-purple-500", bg: "bg-violet-50" },
    { icon: Gamepad2, value: "25K+", label: "Trận đấu", desc: "đã diễn ra", gradient: "from-orange-400 to-rose-500", bg: "bg-orange-50" },
    { icon: Star, value: "4.9", label: "Đánh giá", desc: "trung bình", gradient: "from-emerald-400 to-teal-500", bg: "bg-emerald-50" },
];

export function StatsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} className="py-16 bg-white relative -mt-1">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 24 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-300 group">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-[30px] lg:text-[36px] font-light text-efb-dark tracking-tight leading-none">
                                    {stat.value}
                                </div>
                                <div className="text-sm font-medium text-efb-text-secondary mt-1.5">
                                    {stat.label}
                                </div>
                                <div className="text-[11px] text-efb-text-muted mt-0.5">
                                    {stat.desc}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
