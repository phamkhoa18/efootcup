"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Facebook, Link2, QrCode } from "lucide-react";

export default function ChiaSePage() {
    const shareUrl = "https://efootcup.vn/giai-dau/1";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Chia sẻ giải đấu</h1>
                <p className="text-sm text-efb-text-muted mt-0.5">Chia sẻ giải đấu đến nhiều người tham gia hơn</p>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-efb-dark">Link giải đấu</label>
                    <div className="flex gap-2">
                        <Input className="h-10 rounded-lg flex-1" value={shareUrl} readOnly />
                        <Button variant="outline" className="h-10 rounded-lg px-4">
                            <Copy className="w-4 h-4 mr-2" /> Sao chép
                        </Button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-efb-dark mb-3 block">Chia sẻ qua</label>
                    <div className="flex gap-3">
                        {[
                            { label: "Facebook", icon: Facebook, bg: "bg-blue-500 hover:bg-blue-600" },
                            { label: "Zalo", icon: Share2, bg: "bg-blue-400 hover:bg-blue-500" },
                            { label: "Link", icon: Link2, bg: "bg-gray-600 hover:bg-gray-700" },
                        ].map((s) => (
                            <Button key={s.label} className={`${s.bg} text-white text-sm h-10 px-5 rounded-lg font-medium`}>
                                <s.icon className="w-4 h-4 mr-2" /> {s.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                    <label className="text-sm font-medium text-efb-dark mb-3 block">Mã QR</label>
                    <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-efb-text-muted" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
