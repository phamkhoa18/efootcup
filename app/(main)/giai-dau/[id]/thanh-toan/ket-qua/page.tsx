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

    const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending" | "cancelled">("loading");
    const [tournament, setTournament] = useState<any>(null);
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");

    // SePay redirects back with ?status=success|error|cancel&invoice=XXXX
    const sepayStatus = searchParams.get("status");
    const invoice = searchParams.get("invoice");

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            // Load tournament info
            const tRes = await tournamentAPI.getById(tournamentId);
            if (tRes.success) {
                setTournament(tRes.data?.tournament || tRes.data);
            }

            if (invoice) {
                setInvoiceNumber(invoice);
            }

            // Determine status from SePay callback
            if (sepayStatus === "success") {
                // SePay says payment succeeded — IPN will confirm in background
                // Check actual registration status
                const regRes = await tournamentAPI.getRegistrations(tournamentId);
                if (regRes.success && regRes.data?.registrations) {
                    const savedToken = typeof window !== "undefined" ? localStorage.getItem("efootcup_token") : null;
                    // Try to find my registration
                    const profileRes = await fetch("/api/auth/me", {
                        headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
                    });
                    const profileData = await profileRes.json();
                    const userId = profileData?.data?._id;

                    if (userId) {
                        const myReg = regRes.data.registrations.find(
                            (r: any) => r.user?._id === userId || r.user === userId
                        );
                        if (myReg?.paymentStatus === "paid" || myReg?.paymentStatus === "confirmed") {
                            setStatus("success");
                            return;
                        }
                    }
                }
                // IPN may not have arrived yet — show pending with success message
                setStatus("pending");
            } else if (sepayStatus === "cancel") {
                setStatus("cancelled");
            } else if (sepayStatus === "error") {
                setStatus("failed");
            } else {
                // Direct access / old format — show pending
                setStatus("pending");
            }
        } catch (error) {
            console.error("Load payment result error:", error);
            setStatus("failed");
        }
    };

    const handleRetry = () => {
        router.push(`/giai-dau/${tournamentId}`);
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
                            : status === "cancelled"
                                ? "bg-gradient-to-br from-gray-500 to-gray-600"
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
                            ) : status === "cancelled" ? (
                                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                                    <XCircle className="w-12 h-12 text-white" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                                    <XCircle className="w-12 h-12 text-white" />
                                </div>
                            )}

                            <h1 className="text-2xl font-bold text-white mt-5">
                                {status === "loading" && "Đang xử lý..."}
                                {status === "success" && "🎉 Thanh toán thành công!"}
                                {status === "pending" && "Đang xác nhận thanh toán..."}
                                {status === "cancelled" && "Đã huỷ thanh toán"}
                                {status === "failed" && "Thanh toán thất bại"}
                            </h1>
                            <p className="text-white/80 text-sm mt-2">
                                {status === "loading" && "Đang kiểm tra kết quả thanh toán..."}
                                {status === "success" && "Thanh toán đã được xác nhận — bạn đã chính thức tham gia giải đấu!"}
                                {status === "pending" && "Thanh toán đang được xử lý. Hệ thống sẽ tự động xác nhận trong ít giây tới."}
                                {status === "cancelled" && "Bạn đã huỷ giao dịch. Bạn có thể thử lại bất cứ lúc nào."}
                                {status === "failed" && "Giao dịch không thành công. Vui lòng thử lại."}
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
                                {invoiceNumber && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-[10px] text-gray-400">
                                            Mã đơn hàng: <span className="font-mono text-gray-600">{invoiceNumber}</span>
                                        </p>
                                    </div>
                                )}
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
                                    Hệ thống sẽ tự động xác nhận khi nhận được thông báo từ SePay.
                                </p>
                            </>
                        )}
                        {(status === "failed" || status === "cancelled") && (
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
