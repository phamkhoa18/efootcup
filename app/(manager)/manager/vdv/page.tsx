"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Users, Search, Filter, Download, MoreVertical,
    Mail, Phone, Calendar, Gamepad2, Trophy, Loader2,
    ExternalLink, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardAPI } from "@/lib/api";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function PlayersManagementPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => { loadPlayers(); }, []);

    const loadPlayers = async () => {
        try {
            const res = await dashboardAPI.getPlayers();
            if (res.success) {
                setPlayers(res.data.players || []);
            }
        } catch (error) {
            console.error("Load players error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportPlayers = () => {
        const data = players.map(p => ({
            "Tên VĐV": p.name,
            "Email": p._id,
            "Số điện thoại": p.phone || "N/A",
            "Gamer ID": p.gamerId || "N/A",
            "Số giải tham gia": p.tournamentsCount,
            "Lần cuối tham gia": format(new Date(p.lastJoined), "dd/MM/yyyy")
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách VĐV");
        XLSX.writeFile(wb, "DanhSach_VDV.xlsx");
    };

    const filtered = players.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p._id.toLowerCase().includes(search.toLowerCase()) ||
        p.gamerId?.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-efb-dark tracking-tight">Quản lý Vận động viên</h1>
                    <p className="text-sm text-efb-text-muted mt-1">Danh sách game thủ đã tham gia các giải đấu của bạn</p>
                </div>
                <Button className="bg-efb-blue text-white rounded-xl h-10 gap-2" onClick={exportPlayers}>
                    <Download className="w-4 h-4" />
                    Xuất danh sách
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-white p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-efb-dark">{players.length}</div>
                        <div className="text-xs text-efb-text-muted">Tổng số VĐV duy nhất</div>
                    </div>
                </div>
                <div className="card-white p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-efb-dark">
                            {players.filter(p => p.tournamentsCount > 1).length}
                        </div>
                        <div className="text-xs text-efb-text-muted">VĐV trung thành (≥ 2 giải)</div>
                    </div>
                </div>
                <div className="card-white p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-efb-dark">
                            {players.length > 0 ? (players.reduce((s, p) => s + p.tournamentsCount, 0) / players.length).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-efb-text-muted">Tỷ lệ tham gia trung bình</div>
                    </div>
                </div>
            </div>

            {/* Tools */}
            <div className="card-white p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm VĐV theo tên, email hoặc Gamer ID..."
                            className="pl-10 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 px-4 gap-2">
                        <Filter className="w-4 h-4" />
                        Bộ lọc
                    </Button>
                </div>
            </div>

            {/* Player Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4 text-left font-bold">Vận động viên</th>
                                <th className="px-6 py-4 text-left font-bold">Thông tin liên hệ</th>
                                <th className="px-6 py-4 text-center font-bold">Gamer ID</th>
                                <th className="px-6 py-4 text-center font-bold">Số giải</th>
                                <th className="px-6 py-4 text-center font-bold">Gần nhất</th>
                                <th className="px-6 py-4 text-right font-bold"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((p, i) => (
                                <motion.tr
                                    key={p._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="hover:bg-gray-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-efb-dark">{p.name}</div>
                                                <div className="text-[10px] text-efb-text-muted mt-0.5 font-medium">Unique ID: {p._id.split('@')[0]}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs text-efb-text-secondary">
                                                <Mail className="w-3 h-3" /> {p._id}
                                            </div>
                                            {p.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-efb-text-secondary">
                                                    <Phone className="w-3 h-3" /> {p.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-efb-blue bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 tracking-wide">
                                            {p.gamerId || "N/A"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-bold text-efb-dark">{p.tournamentsCount}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-xs text-efb-text-muted">{format(new Date(p.lastJoined), "dd/MM/yyyy")}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
