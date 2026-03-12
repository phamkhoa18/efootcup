"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Share2, Copy, Facebook, Link2, QrCode, Users, UserPlus, Loader2,
    CheckCircle2, Trash2, ExternalLink, Shield, Calendar,
    Swords, Check, AlertCircle, Mail, Clock, RotateCcw, KeyRound
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";

export default function ChiaSePage() {
    const params = useParams();
    const id = params.id as string;

    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const publicShareUrl = `${baseUrl}/giai-dau/${id}`;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await tournamentAPI.getCollaborators(id);
            if (res.success) {
                setCollaborators(res.data?.collaborators || []);
                setInviteCode(res.data?.inviteCode || null);
            }
        } catch (error) {
            console.error("Load share data error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateCode = async () => {
        setIsGenerating(true);
        try {
            const res = await tournamentAPI.generateInviteCode(id);
            if (res.success) {
                setInviteCode(res.data?.inviteCode);
                toast.success("Đã tạo mã mời!");
            } else {
                toast.error(res.message || "Lỗi tạo mã");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateCode = async () => {
        setIsRegenerating(true);
        try {
            const res = await tournamentAPI.regenerateInviteCode(id);
            if (res.success) {
                setInviteCode(res.data?.inviteCode);
                toast.success("Đã tạo mã mới! Mã cũ không còn hiệu lực.");
            } else {
                toast.error(res.message || "Lỗi tạo lại");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleRemoveCollaborator = async (userId: string, name: string) => {
        if (!confirm(`Xóa "${name}" khỏi danh sách cộng tác viên?`)) return;
        setRemovingId(userId);
        try {
            const res = await tournamentAPI.removeCollaborator(id, userId);
            if (res.success) {
                setCollaborators(prev => prev.filter(c => c.userId !== userId));
                toast.success(`Đã xóa ${name}`);
            } else {
                toast.error(res.message || "Lỗi xóa");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        } finally {
            setRemovingId(null);
        }
    };

    const copyCode = async () => {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            toast.success("Đã sao chép mã mời!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Không thể sao chép");
        }
    };

    const shareToFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicShareUrl)}`, "_blank", "width=600,height=400");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-extrabold text-[#1E293B] tracking-tight">Chia sẻ giải đấu</h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Tạo mã mời & quản lý cộng tác viên
                    </p>
                </div>
            </div>

            {/* Section 1: Invite Code */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                    <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-bold text-gray-800">Mã mời cộng tác viên</h2>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Tạo mã mời để Manager/Admin khác nhập vào và cùng quản lý giải đấu
                    </p>
                </div>
                <div className="p-6 space-y-5">
                    {/* Permission Info */}
                    <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-indigo-800">Cộng tác viên có thể</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-700">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-medium">Lịch thi đấu</span> — cập nhật kết quả
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-700">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                        <Swords className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-medium">Sơ đồ</span> — tạo & sửa bracket
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        <AlertCircle className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                        <span>Không thể sửa thông tin giải</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        <AlertCircle className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                        <span>Không thể quản lý đăng ký</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generate / Show Code */}
                    {!inviteCode ? (
                        <Button
                            onClick={handleGenerateCode}
                            disabled={isGenerating}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200 transition-all"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <KeyRound className="w-4 h-4 mr-2" />
                            )}
                            Tạo mã mời
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            {/* Big Code Display */}
                            <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl p-6 border border-indigo-100 text-center">
                                <p className="text-[11px] text-indigo-500 font-bold uppercase tracking-widest mb-3">Mã mời</p>
                                <div className="flex items-center justify-center gap-2">
                                    {inviteCode.split("").map((char, i) => (
                                        <div
                                            key={i}
                                            className="w-12 h-14 sm:w-14 sm:h-16 bg-white rounded-xl border-2 border-indigo-200 shadow-sm flex items-center justify-center text-xl sm:text-2xl font-extrabold text-indigo-700 tracking-widest"
                                        >
                                            {char}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <Button
                                        onClick={copyCode}
                                        className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all"
                                    >
                                        {copied ? (
                                            <><Check className="w-3.5 h-3.5 mr-1.5" /> Đã sao chép</>
                                        ) : (
                                            <><Copy className="w-3.5 h-3.5 mr-1.5" /> Sao chép mã</>
                                        )}
                                    </Button>
                                </div>

                                <p className="text-[10px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Mã không hết hạn · Gửi mã này cho Manager/Admin cần cộng tác
                                </p>
                            </div>

                            {/* Instruction */}
                            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
                                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                    💡 <strong>Hướng dẫn:</strong> Gửi mã <strong>{inviteCode}</strong> cho người cần thêm.
                                    Họ vào trang <strong>"Giải đấu"</strong> → bấm nút <strong>"Nhập mã cộng tác"</strong> → nhập mã là xong!
                                </p>
                            </div>

                            {/* Regenerate */}
                            <div className="flex items-center justify-end">
                                <Button
                                    onClick={handleRegenerateCode}
                                    disabled={isRegenerating}
                                    variant="ghost"
                                    className="h-8 px-3 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-lg"
                                >
                                    {isRegenerating ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                    )}
                                    Tạo mã mới (hủy mã cũ)
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Section 2: Collaborators List */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <h2 className="text-sm font-bold text-gray-800">
                            Cộng tác viên
                            {collaborators.length > 0 && (
                                <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                                    {collaborators.length}
                                </span>
                            )}
                        </h2>
                    </div>
                </div>
                <div className="p-6">
                    {collaborators.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <Users className="w-6 h-6 text-gray-300" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-700 mb-1">Chưa có cộng tác viên</h3>
                            <p className="text-xs text-gray-400 max-w-xs mx-auto">
                                Tạo mã mời ở trên và gửi mã cho Manager khác để cùng quản lý
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {collaborators.map((collab, index) => (
                                <motion.div
                                    key={collab.userId}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                            {collab.name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{collab.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                                    {collab.email}
                                                </span>
                                                <Badge className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-100 px-1.5 py-0 font-bold">
                                                    Lịch + Sơ đồ
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[10px] text-gray-300 hidden sm:block">
                                            {collab.addedAt
                                                ? new Date(collab.addedAt).toLocaleDateString("vi-VN")
                                                : ""}
                                        </span>
                                        <Button
                                            onClick={() => handleRemoveCollaborator(collab.userId, collab.name)}
                                            disabled={removingId === collab.userId}
                                            variant="ghost"
                                            className="w-8 h-8 p-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                        >
                                            {removingId === collab.userId ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Section 3: Public Share */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="px-6 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <h2 className="text-sm font-bold text-gray-800">Chia sẻ công khai</h2>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Link xem giải đấu cho tất cả mọi người</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            className="h-10 rounded-xl flex-1 bg-gray-50 border-gray-200 text-sm font-medium"
                            value={publicShareUrl}
                            readOnly
                        />
                        <Button
                            onClick={async () => {
                                await navigator.clipboard.writeText(publicShareUrl);
                                toast.success("Đã sao chép link!");
                            }}
                            variant="outline"
                            className="h-10 rounded-xl px-4 font-bold border-gray-200"
                        >
                            <Copy className="w-4 h-4 mr-1.5" /> Sao chép
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={shareToFacebook}
                            className="bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs h-9 px-4 rounded-xl font-bold"
                        >
                            <Facebook className="w-3.5 h-3.5 mr-1.5" /> Facebook
                        </Button>
                        <a href={`/giai-dau/${id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="text-xs h-9 px-4 rounded-xl font-bold border-gray-200">
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Xem trang
                            </Button>
                        </a>
                    </div>
                </div>
            </motion.div>

            {/* Section 4: QR Code */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
                <div className="px-6 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-gray-500" />
                        <h2 className="text-sm font-bold text-gray-800">Mã QR</h2>
                    </div>
                </div>
                <div className="p-6 flex flex-col items-center">
                    <div className="w-44 h-44 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200 shadow-inner overflow-hidden">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicShareUrl)}&format=svg`}
                            alt="QR Code"
                            className="w-36 h-36"
                        />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">Quét mã QR để xem trang giải đấu</p>
                </div>
            </motion.div>
        </div>
    );
}
