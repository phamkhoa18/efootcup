"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, Copy, Trash2, RefreshCw } from "lucide-react";

const referees = [
    { id: 1, name: "Trần Văn Bình", role: "Trọng tài chính", token: "REF-A1B2C3", status: "active" },
    { id: 2, name: "Lê Thị Lan", role: "Trọng tài phụ", token: "REF-D4E5F6", status: "active" },
    { id: 3, name: "Ngô Đức Thắng", role: "Trọng tài phụ", token: "REF-G7H8I9", status: "inactive" },
];

export default function TrongTaiPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Trọng tài / Token</h1>
                    <p className="text-sm text-efb-text-muted mt-0.5">Quản lý trọng tài và token truy cập</p>
                </div>
                <Button className="bg-efb-blue text-white hover:bg-efb-blue-light font-semibold text-sm h-10 px-5 rounded-lg">
                    <Plus className="w-4 h-4 mr-2" /> Thêm trọng tài
                </Button>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {referees.map((ref) => (
                        <div key={ref.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-efb-blue" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-efb-dark">{ref.name}</div>
                                <div className="text-xs text-efb-text-muted">{ref.role}</div>
                            </div>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-efb-text-secondary hidden sm:block">{ref.token}</code>
                            <button className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center text-efb-text-muted hover:text-efb-blue transition-colors" title="Copy token">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Badge className={ref.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-efb-text-muted border-gray-200"}>
                                {ref.status === "active" ? "Hoạt động" : "Vô hiệu"}
                            </Badge>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
