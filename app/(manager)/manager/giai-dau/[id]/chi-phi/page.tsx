"use client";

import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

const expenses = [
    { label: "Giải thưởng", amount: "10,000,000", type: "out" },
    { label: "Thuê địa điểm", amount: "2,000,000", type: "out" },
    { label: "Tài trợ nhận", amount: "8,000,000", type: "in" },
    { label: "Phí đăng ký (28 VĐV)", amount: "2,800,000", type: "in" },
    { label: "Banner & truyền thông", amount: "1,500,000", type: "out" },
    { label: "Vận hành & trọng tài", amount: "1,000,000", type: "out" },
];

export default function ChiPhiPage() {
    const totalIn = 10800000;
    const totalOut = 14500000;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Thống kê chi phí</h1>
                <p className="text-sm text-efb-text-muted mt-0.5">Theo dõi thu chi của giải đấu</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Tổng thu", value: "10,800,000 ₫", icon: TrendingUp, bg: "bg-emerald-50", color: "text-emerald-500" },
                    { label: "Tổng chi", value: "14,500,000 ₫", icon: TrendingDown, bg: "bg-red-50", color: "text-red-500" },
                    { label: "Chênh lệch", value: "-3,700,000 ₫", icon: DollarSign, bg: "bg-amber-50", color: "text-amber-500" },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div className="text-lg font-semibold text-efb-dark">{s.value}</div>
                        <div className="text-xs text-efb-text-muted">{s.label}</div>
                    </motion.div>
                ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-[15px] font-semibold text-efb-dark">Chi tiết</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    {expenses.map((e, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${e.type === "in" ? "bg-emerald-500" : "bg-red-400"}`} />
                                <span className="text-sm text-efb-text-secondary">{e.label}</span>
                            </div>
                            <span className={`text-sm font-semibold ${e.type === "in" ? "text-emerald-600" : "text-red-500"}`}>
                                {e.type === "in" ? "+" : "-"}{e.amount} ₫
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
