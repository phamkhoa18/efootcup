"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus, Search, Info, Calendar, UserPlus, Edit2, Settings,
    UserCheck, MoreHorizontal, Loader2
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";

export default function NoiDungThiDauPage() {
    const params = useParams();
    const id = params.id as string;

    const [tournament, setTournament] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Simulated local states for the checkboxes that might not exist in backend yet
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});
    const [seeds, setSeeds] = useState<Record<string, boolean>>({});
    const [fees, setFees] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Fetch tournament info
            const tRes = await tournamentAPI.getById(id);
            if (tRes.success) setTournament(tRes.data);

            // Fetch approved registrations (participants)
            const rRes = await tournamentAPI.getRegistrations(id);
            if (rRes.success) {
                // Here we might filter by approved or just show all depending on the flow
                // For "Nội dung thi đấu", it typically means finalized participants
                let regs = rRes.data?.registrations || rRes.data || [];
                regs = regs.filter((r: any) => r.status === "approved" || r.status === "confirmed");
                setRegistrations(regs);

                // initial sync fees if paymentStatus is paid
                const initialFees: Record<string, boolean> = {};
                regs.forEach((r: any) => {
                    initialFees[r._id] = r.paymentStatus === "paid";
                });
                setFees(initialFees);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckAllAttendance = () => {
        const newAttendance = { ...attendance };
        registrations.forEach(r => {
            newAttendance[r._id] = true;
        });
        setAttendance(newAttendance);
    };

    const toggleAttendance = (rId: string) => {
        setAttendance(prev => ({ ...prev, [rId]: !prev[rId] }));
    };

    const toggleSeed = (rId: string) => {
        setSeeds(prev => ({ ...prev, [rId]: !prev[rId] }));
    };

    const toggleFee = (rId: string) => {
        setFees(prev => ({ ...prev, [rId]: !prev[rId] }));
        // Could also trigger API to update paymentStatus here
    };

    const filtered = registrations.filter(r => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            r.teamName?.toLowerCase().includes(q) ||
            r.playerName?.toLowerCase().includes(q) ||
            r.gamerId?.toLowerCase().includes(q) ||
            r.phone?.includes(q) ||
            r.email?.toLowerCase().includes(q)
        );
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-efb-blue animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
            </div>
        );
    }

    const formatLabel = tournament?.format === "round_robin" ? "Vòng tròn" : "Loại trực tiếp";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight flex items-center gap-3">
                        <div className="w-1 h-6 bg-efb-blue rounded-full"></div>
                        Nội dung thi đấu
                    </h1>
                </div>
                <Button className="bg-[#1b64f2] text-white hover:bg-[#1b64f2]/90 font-medium px-4 h-9 rounded-md">
                    <Plus className="w-4 h-4 mr-1.5" /> Tạo nội dung
                </Button>
            </div>

            {/* Tabs (Pseudo) */}
            <div className="border-b border-gray-200">
                <div className="flex">
                    <button className="px-6 py-2.5 text-sm font-bold text-[#1b64f2] bg-[#EFF6FF] border-b-2 border-[#1b64f2] rounded-t-md">
                        {tournament?.title || "Giải đấu"}
                    </button>
                    {/* Placeholder for more contents if necessary */}
                </div>
            </div>

            {/* Sub Tools & Settings */}
            <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                <div className="flex items-center text-sm text-gray-500">
                    <Info className="w-4 h-4 mr-1.5" />
                    Hình thức thi đấu: {formatLabel}
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/manager/giai-dau/${id}/lich`}>
                        <Button variant="outline" className="h-9 text-[#1b64f2] border-gray-200 hover:bg-gray-50 font-medium px-4">
                            <Calendar className="w-4 h-4 mr-1.5" /> Lịch thi đấu
                        </Button>
                    </Link>
                    <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-600">
                        <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-600">
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-600">
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Filter & Action */}
            <div className="flex items-center justify-between mt-4">
                <div className="relative w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Tìm kiếm: CLB, Tên VĐV"
                        className="pl-9 h-10 border-gray-200 bg-white shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    className="h-10 border-gray-200 bg-white font-medium text-gray-700 shadow-sm"
                    onClick={handleCheckAllAttendance}
                >
                    <UserCheck className="w-4 h-4 mr-1.5" /> Điểm danh tất cả
                </Button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-900 bg-gray-50/50 uppercase font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">#</th>
                                <th className="px-5 py-4">CLB</th>
                                <th className="px-5 py-4">VĐV 1</th>
                                <th className="px-5 py-4">VĐV 2</th>
                                <th className="px-5 py-4">Số điện thoại</th>
                                <th className="px-5 py-4 text-center">Điểm danh</th>
                                <th className="px-5 py-4 text-center">Hạt giống</th>
                                <th className="px-5 py-4 text-center">Lệ phí</th>
                                <th className="px-5 py-4 w-12 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/80">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-10 text-center text-gray-500 font-medium">
                                        Không tìm thấy VĐV nào
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, i) => {
                                    const hasClb = r.teamName && r.teamName.toLowerCase() !== r.playerName?.toLowerCase() && r.teamName.toUpperCase() !== "TỰ DO";
                                    return (
                                        <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4 text-center font-medium text-gray-900">
                                                {i + 1}
                                            </td>
                                            <td className="px-5 py-4">
                                                {hasClb ? (
                                                    <Badge variant="outline" className="font-medium px-2.5 py-1 rounded bg-gray-50 text-gray-700 border-gray-200 max-w-[140px] truncate block text-center">
                                                        {r.teamName}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs"></span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-gray-900 truncate max-w-[150px]">
                                                {r.playerName || "Chưa cập nhật"}
                                            </td>
                                            <td className="px-5 py-4 font-medium text-gray-700 truncate max-w-[150px]">
                                                {r.gamerId || ""}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 font-medium">
                                                {r.phone || "—"}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <Checkbox
                                                    checked={!!attendance[r._id]}
                                                    onCheckedChange={() => toggleAttendance(r._id)}
                                                    className="border-gray-300 data-[state=checked]:bg-[#1b64f2] data-[state=checked]:border-[#1b64f2]"
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <Checkbox
                                                    checked={!!seeds[r._id]}
                                                    onCheckedChange={() => toggleSeed(r._id)}
                                                    className="border-gray-300 data-[state=checked]:bg-[#1b64f2] data-[state=checked]:border-[#1b64f2]"
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <Checkbox
                                                    checked={!!fees[r._id]}
                                                    onCheckedChange={() => toggleFee(r._id)}
                                                    className="border-gray-300 data-[state=checked]:bg-[#1b64f2] data-[state=checked]:border-[#1b64f2]"
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button className="text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-md hover:bg-gray-100">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
