"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Trophy, Eye, Loader2, Swords, Calendar, Gamepad2, RefreshCw } from "lucide-react";
import { tournamentAPI } from "@/lib/api";

export default function TheoDoiPage() {
    const params = useParams();
    const id = params.id as string;

    const [tournament, setTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tRes, mRes, tmRes] = await Promise.all([
                tournamentAPI.getById(id),
                tournamentAPI.getMatches(id),
                tournamentAPI.getTeams(id),
            ]);
            if (tRes.success) setTournament(tRes.data?.tournament || tRes.data);
            if (mRes.success) setMatches(mRes.data?.matches || mRes.data || []);
            if (tmRes.success) setTeams(tmRes.data?.teams || tmRes.data || []);
        } catch (e) {
            console.error("Load error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-efb-blue" />
            </div>
        );
    }

    const completedMatches = matches.filter((m) => m.status === "completed");
    const totalMatches = matches.length;
    const completionRate = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0;
    const liveMatches = matches.filter((m) => m.status === "live").length;

    // Calculate total goals
    const totalGoals = completedMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
    const avgGoals = completedMatches.length > 0 ? (totalGoals / completedMatches.length).toFixed(1) : "0";

    const stats = [
        { label: "Tổng lượt xem", value: tournament?.views?.toLocaleString() || "0", change: "", icon: Eye, bg: "bg-blue-50", color: "text-blue-500" },
        { label: "Đội tham gia", value: `${teams.length}/${tournament?.maxTeams || 0}`, change: `${Math.round((teams.length / (tournament?.maxTeams || 1)) * 100)}%`, icon: Users, bg: "bg-violet-50", color: "text-violet-500" },
        { label: "Trận đã hoàn thành", value: `${completedMatches.length}/${totalMatches}`, change: `${completionRate}%`, icon: Trophy, bg: "bg-emerald-50", color: "text-emerald-500" },
        { label: "Trận đang diễn ra", value: String(liveMatches), change: "", icon: Gamepad2, bg: "bg-red-50", color: "text-red-500" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Theo dõi giải đấu</h1>
                    <p className="text-sm text-efb-text-muted mt-0.5">Theo dõi hoạt động và thống kê giải đấu</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-1.5 text-xs text-efb-text-muted hover:text-efb-blue transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Làm mới
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div className="text-xl font-semibold text-efb-dark">{s.value}</div>
                        <div className="text-xs text-efb-text-muted mt-0.5">{s.label}</div>
                        {s.change && <div className="text-[11px] text-emerald-500 font-medium mt-1">{s.change}</div>}
                    </motion.div>
                ))}
            </div>

            {/* Additional stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                        <Swords className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-xl font-semibold text-efb-dark">{totalGoals}</div>
                    <div className="text-xs text-efb-text-muted mt-0.5">Tổng số bàn thắng</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center mb-3">
                        <TrendingUp className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div className="text-xl font-semibold text-efb-dark">{avgGoals}</div>
                    <div className="text-xs text-efb-text-muted mt-0.5">TB bàn thắng / trận</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl font-semibold text-efb-dark capitalize">{tournament?.status || "—"}</div>
                    <div className="text-xs text-efb-text-muted mt-0.5">Trạng thái giải đấu</div>
                </motion.div>
            </div>

            {/* Completion progress */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-efb-dark mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-efb-blue" />
                    Tiến độ giải đấu
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-efb-text-muted">Đội đăng ký</span>
                        <span className="font-medium text-efb-dark">{teams.length}/{tournament?.maxTeams || 0}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-2 transition-all duration-700"
                            style={{ width: `${Math.min(100, (teams.length / (tournament?.maxTeams || 1)) * 100)}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm mt-4">
                        <span className="text-efb-text-muted">Trận đã hoàn thành</span>
                        <span className="font-medium text-efb-dark">{completedMatches.length}/{totalMatches}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full h-2 transition-all duration-700"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Recent completed matches */}
            {completedMatches.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="text-sm font-semibold text-efb-dark mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-efb-yellow" />
                        Kết quả gần đây
                    </h3>
                    <div className="space-y-2">
                        {completedMatches.slice(-5).reverse().map((m: any) => (
                            <div key={m._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                                <div className="text-sm text-efb-text-secondary">
                                    <span className={m.homeScore > m.awayScore ? "font-bold text-efb-dark" : ""}>{m.homeTeam?.name || "TBD"}</span>
                                    <span className="mx-2 font-bold text-efb-dark">{m.homeScore} - {m.awayScore}</span>
                                    <span className={m.awayScore > m.homeScore ? "font-bold text-efb-dark" : ""}>{m.awayTeam?.name || "TBD"}</span>
                                </div>
                                <span className="text-xs text-efb-text-muted">{m.roundName || `Vòng ${m.round}`}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
