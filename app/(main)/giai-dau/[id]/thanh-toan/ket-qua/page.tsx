"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    CheckCircle2, XCircle, Loader2, ArrowLeft, Clock, RefreshCw, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { tournamentAPI } from "@/lib/api";

function PaymentResultContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tournamentId = params.id as string;

    const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
    const [tournament, setTournament] = useState<any>(null);

    // PayOS params: returnUrl gets ?code=00&id=xxx&cancel=false&status=PAID&orderCode=xxx
    const gateway = searchParams.get("gateway");
    const payosCode = searchParams.get("code");
    const payosStatus = searchParams.get("status");
    const payosOrderCode = searchParams.get("orderCode");
    const isCancelled = searchParams.get("cancel") === "true" || searchParams.get("cancelled") === "true";

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            // Load tournament info
            const tRes = await tournamentAPI.getById(tournamentId);
            if (tRes.success) {
                setTournament(tRes.data?.tournament || tRes.data);
            }

            // === PayOS result check ===
            if (gateway === "payos") {
                if (isCancelled) {
                    // Reset registration paymentStatus to unpaid so user can retry
                    try {
                        await fetch(`/api/payment/payos-cancel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                tournamentId,
                                orderCode: payosOrderCode,
                            }),
                        });
                    } catch (err) {
                        console.error("Failed to reset payment status:", err);
                    }
                    setStatus("failed");
                    return;
                }
                if (payosStatus === "PAID" || payosCode === "00") {
                    // Verify trực tiếp với PayOS API qua endpoint an toàn (có requireAuth)
                    // Endpoint chỉ confirm cho registration của user đang đăng nhập
                    try {
                        const verifyRes = await fetch(`/api/payment/payos-verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                tournamentId,
                                orderCode: payosOrderCode,
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        console.log("PayOS verify result:", verifyData);

                        if (verifyData.success && verifyData.payosStatus === "PAID") {
                            setStatus("success");
                            return;
                        }

                        // alreadyProcessed = webhook đã xử lý rồi
                        if (verifyData.alreadyProcessed) {
                            setStatus("success");
                            return;
                        }

                        // orderCode mismatch — security issue
                        if (verifyData.mismatch) {
                            console.warn("PayOS verify: orderCode mismatch detected");
                            setStatus("failed");
                            return;
                        }
                    } catch (err) {
                        console.error("PayOS verify error:", err);
                    }

                    // Nếu verify không thành công ngay, đợi webhook xử lý
                    // (webhook có thể mất vài giây)
                    await new Promise(r => setTimeout(r, 3000));

                    // Retry verify một lần nữa (webhook có thể đã confirm)
                    try {
                        const retryRes = await fetch(`/api/payment/payos-verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                tournamentId,
                                orderCode: payosOrderCode,
                            }),
                        });
                        const retryData = await retryRes.json();
                        if ((retryData.success && retryData.payosStatus === "PAID") || retryData.alreadyProcessed) {
                            setStatus("success");
                            return;
                        }
                    } catch {
                        // Ignore retry errors
                    }

                    setStatus("pending");
                } else {
                    setStatus("failed");
                }
                return;
            }

            // Default (non-PayOS): show pending
            setStatus("pending");
        } catch (error) {
            console.error("Load payment result error:", error);
            setStatus("failed");
        }
    };

    const handleRetry = () => {
        router.push(`/giai-dau/${tournamentId}?tab=register`);
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                    {/* Status Banner */}
                    <div className={`relative p-10 text-center overflow-hidden ${status === "success"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                        : status === "pending"
                            ? "bg-gradient-to-br from-amber-500 to-orange-600"
                            : status === "failed"
                                ? "bg-gradient-to-br from-red-500 to-rose-600"
                                : "bg-gradient-to-br from-blue-500 to-indigo-600"
                        }`}>
                        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            {status === "loading" ? (
                                <Loader2 className="w-16 h-16 text-white mx-auto animate-spin" />
                            ) : status === "success" ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2, stiffness: 200 }}>
                                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-12 h-12 text-white" />
                                    </div>
                                </motion.div>
                            ) : status === "pending" ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                                        <Clock className="w-12 h-12 text-white" />
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                                    <XCircle className="w-12 h-12 text-white" />
                                </div>
                            )}

                            <h1 className="text-2xl font-bold text-white mt-5">
                                {status === "loading" && "Đang xử lý..."}
                                {status === "success" && "🎉 Đăng ký thành công!"}
                                {status === "pending" && "Đang xác nhận..."}
                                {status === "failed" && (isCancelled ? "Đã huỷ thanh toán" : "Thanh toán thất bại")}
                            </h1>
                            <p className="text-white/80 text-sm mt-2">
                                {status === "loading" && "Đang kiểm tra kết quả thanh toán..."}
                                {status === "success" && "Thanh toán đã xác nhận — bạn đã chính thức tham gia giải đấu!"}
                                {status === "pending" && "Hệ thống đang xử lý. Vui lòng đợi trong giây lát..."}
                                {status === "failed" && (isCancelled ? "Bạn đã huỷ giao dịch" : "Giao dịch không thành công. Vui lòng thử lại.")}
                            </p>
                        </div>
                    </div>

                    {/* Tournament Info */}
                    {tournament && (
                        <div className="px-6 pt-6">
                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-efb-blue/10 flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-efb-blue" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{tournament.title}</p>
                                        <p className="text-xs text-gray-500">
                                            Lệ phí: {tournament.entryFee?.toLocaleString("vi-VN")} {tournament.currency || "VNĐ"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PayOS order info */}
                    {payosOrderCode && status === "success" && (
                        <div className="px-6 pt-3">
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                <p className="text-[10px] text-emerald-500 font-bold uppercase">Mã đơn hàng</p>
                                <p className="text-sm font-mono font-bold text-emerald-800 mt-0.5">{payosOrderCode}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="p-6 space-y-3">
                        {status === "success" && (
                            <Button
                                className="w-full rounded-xl h-12 font-bold bg-efb-blue text-white hover:bg-efb-blue/90 shadow-lg shadow-efb-blue/20"
                                onClick={() => router.push(`/giai-dau/${tournamentId}`)}
                            >
                                Xem giải đấu
                            </Button>
                        )}
                        {status === "pending" && (
                            <>
                                <Button
                                    className="w-full rounded-xl h-12 font-bold bg-amber-500 text-white hover:bg-amber-600"
                                    onClick={() => { setStatus("loading"); loadData(); }}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" /> Kiểm tra lại
                                </Button>
                                <p className="text-xs text-center text-gray-400">
                                    Nếu bạn đã thanh toán thành công, hệ thống sẽ tự động xác nhận trong vài giây.
                                </p>
                            </>
                        )}
                        {status === "failed" && (
                            <Button
                                className="w-full rounded-xl h-12 font-bold bg-efb-blue text-white hover:bg-efb-blue/90"
                                onClick={handleRetry}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full rounded-xl h-11 font-semibold"
                            onClick={() => router.push(`/giai-dau/${tournamentId}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Về trang giải đấu
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    );
}
