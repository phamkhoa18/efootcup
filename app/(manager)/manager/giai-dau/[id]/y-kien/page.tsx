"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, ThumbsUp, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { tournamentAPI } from "@/lib/api";

export default function YKienPage() {
    const params = useParams();
    const id = params.id as string;

    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => { loadFeedback(); }, [id]);

    const loadFeedback = async () => {
        setIsLoading(true);
        try {
            const res = await tournamentAPI.getFeedback(id);
            if (res.success) {
                setFeedbacks(res.data?.feedbacks || res.data || []);
            }
        } catch (e) {
            console.error("Load feedback error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!message.trim()) return;
        setIsSending(true);
        try {
            const res = await tournamentAPI.submitFeedback(id, { message: message.trim() });
            if (res.success) {
                setMessage("");
                loadFeedback();
            }
        } catch (e) {
            console.error("Submit feedback error:", e);
        } finally {
            setIsSending(false);
        }
    };

    const timeAgo = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-efb-dark tracking-tight">Đóng góp ý kiến</h1>
                    <p className="text-sm text-efb-text-muted mt-0.5">
                        Xem phản hồi từ người tham gia
                        {feedbacks.length > 0 && <span className="ml-1">· {feedbacks.length} ý kiến</span>}
                    </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs" onClick={loadFeedback}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
                </Button>
            </div>

            {/* Write feedback */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-efb-blue" />
                    </div>
                    <textarea
                        className="flex-1 min-h-[60px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none focus:border-efb-blue focus:ring-1 focus:ring-efb-blue/20 outline-none"
                        placeholder="Viết phản hồi hoặc ghi chú..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>
                <div className="flex justify-end mt-3">
                    <Button
                        className="bg-efb-blue text-white hover:bg-efb-blue-light font-semibold text-xs h-9 px-4 rounded-lg"
                        onClick={handleSubmit}
                        disabled={isSending || !message.trim()}
                    >
                        {isSending ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang gửi...</>
                        ) : (
                            <><Send className="w-3.5 h-3.5 mr-1.5" /> Gửi</>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* Feedback list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-efb-blue" />
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="text-center py-16">
                    <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-efb-dark">Chưa có ý kiến nào</h3>
                    <p className="text-sm text-efb-text-muted mt-1">Phản hồi từ người tham gia sẽ hiển thị tại đây</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {feedbacks.map((fb: any, i: number) => (
                        <motion.div
                            key={fb._id || i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.06 }}
                            className="bg-white rounded-xl border border-gray-100 p-4"
                        >
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                                    {(fb.user?.name || fb.name || "?").charAt(0)}
                                </div>
                                <span className="text-sm font-semibold text-efb-dark">{fb.user?.name || fb.name || "Ẩn danh"}</span>
                                <span className="text-[11px] text-efb-text-muted">· {timeAgo(fb.createdAt)}</span>
                            </div>
                            <p className="text-sm text-efb-text-secondary ml-[36px]">{fb.message}</p>
                            {fb.likes !== undefined && (
                                <div className="flex items-center gap-1.5 ml-[36px] mt-2">
                                    <button className="flex items-center gap-1 text-xs text-efb-text-muted hover:text-efb-blue transition-colors">
                                        <ThumbsUp className="w-3.5 h-3.5" /> {fb.likes || 0}
                                    </button>
                                </div>
                            )}
                            {fb.reply && (
                                <div className="ml-[36px] mt-3 bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                    <div className="text-[11px] text-efb-blue font-semibold mb-1">Phản hồi từ BTC</div>
                                    <p className="text-sm text-efb-text-secondary">{fb.reply}</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
