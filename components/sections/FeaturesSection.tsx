"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import {
    Zap,
    GitBranch,
    BarChart3,
    Users2,
    Wallet,
    Smartphone,
} from "lucide-react";

const features = [
    {
        icon: Zap,
        title: "Tạo giải đấu nhanh chóng",
        description: "Thiết lập giải đấu chỉ trong vài bước đơn giản với giao diện trực quan.",
        gradient: "from-amber-400 to-orange-500",
    },
    {
        icon: GitBranch,
        title: "Sơ đồ thi đấu thông minh",
        description: "Tự động tạo nhánh đấu loại trực tiếp, vòng tròn, chia bảng linh hoạt.",
        gradient: "from-blue-400 to-indigo-500",
    },
    {
        icon: BarChart3,
        title: "Theo dõi kết quả trực tiếp",
        description: "Cập nhật kết quả real-time. Tự động tính bảng xếp hạng chi tiết.",
        gradient: "from-emerald-400 to-teal-500",
    },
    {
        icon: Users2,
        title: "Quản lý đội & người chơi",
        description: "Đăng ký tuyển thủ, quản lý đội hình, phân quyền ban tổ chức.",
        gradient: "from-violet-400 to-purple-500",
    },
    {
        icon: Wallet,
        title: "Quản lý tài chính",
        description: "Theo dõi lệ phí, giải thưởng, tài trợ minh bạch, chuyên nghiệp.",
        gradient: "from-rose-400 to-pink-500",
    },
    {
        icon: Smartphone,
        title: "Tối ưu mọi thiết bị",
        description: "Trải nghiệm mượt mà trên mobile và desktop, mọi lúc mọi nơi.",
        gradient: "from-cyan-400 to-blue-500",
    },
];

export function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} className="py-20 lg:py-28 relative overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0">
                <Image
                    src="/assets/efootball_bg_cl2.webp"
                    alt=""
                    fill
                    className="object-cover"
                    quality={85}
                />
                {/* Blue overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D91]/90 via-[#1E40AF]/85 to-[#4338CA]/90" />
            </div>

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-yellow-300/[0.06] rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] bg-cyan-400/[0.06] rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-14"
                >
                    <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.1] border border-white/[0.12] text-efb-yellow text-xs font-semibold tracking-wider uppercase mb-5 backdrop-blur-sm">
                        <Zap className="w-3 h-3" />
                        Tính năng
                    </span>
                    <h2 className="text-[32px] sm:text-[40px] lg:text-[52px] font-extralight text-white leading-tight mb-4 tracking-tight">
                        Mọi thứ bạn cần cho
                        <br />
                        <span className="text-efb-yellow font-medium">giải đấu hoàn hảo</span>
                    </h2>
                    <p className="text-white/60 text-[17px] max-w-xl mx-auto font-light">
                        Từ khởi tạo đến quản lý kết quả — công cụ chuyên nghiệp cho giải đấu
                    </p>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                        >
                            <div className="bg-white/[0.07] backdrop-blur-md rounded-2xl p-7 h-full border border-white/[0.1] hover:bg-white/[0.12] hover:border-white/[0.18] transition-all duration-300 group">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-[17px] font-semibold text-white mb-2 group-hover:text-efb-yellow transition-colors duration-200">
                                    {feature.title}
                                </h3>
                                <p className="text-[14px] text-white/55 leading-relaxed font-light group-hover:text-white/70 transition-colors duration-300">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
