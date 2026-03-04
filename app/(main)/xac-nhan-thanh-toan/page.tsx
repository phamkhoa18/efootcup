"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function QuickConfirmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const regId = searchParams.get("regId");
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
    const [message, setMessage] = useState("");
    const [redirectUrl, setRedirectUrl] = useState("");

    useEffect(() => {
        if (regId && token) {
            confirmPayment();
        } else {
            setStatus("error");
            setMessage("Link không hợp lệ");
        }
    }, []);

    const confirmPayment = async () => {
        try {
            const headers: Record<string, string> = {};
            if (typeof window !== "undefined") {
                const savedToken = localStorage.getItem("efootcup_token");
                if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
            }

            const res = await fetch(`/api/payment/quick-confirm?regId=${regId}&token=${token}`, {
                headers,
            });
            const data = await res.json();

            if (data.success) {
                if (data.data?.alreadyConfirmed) {
                    setStatus("already");
                    setMessage("Thanh toán đã được xác nhận trước đó");
                } else {
                    setStatus("success");
                    setMessage(data.message || "Đã xác nhận thanh toán thành công!");
                    setRedirectUrl(data.data?.redirectUrl || "");
                }
            } else {
                setStatus("error");
                setMessage(data.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            setStatus("error");
            setMessage("Không thể kết nối server");
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-100/50 overflow-hidden">
                    <div className={`relative p-8 text-center ${status === "success" || status === "already"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : status === "error"
                                ? "bg-gradient-to-br from-red-500 to-rose-600"
                                : "bg-gradient-to-br from-blue-500 to-indigo-600"
                        }`}>
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            {status === "loading" ? (
                                <Loader2 className="w-16 h-16 text-white mx-auto animate-spin" />
                            ) : status === "success" || status === "already" ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-12 h-12 text-white" />
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="w-12 h-12 text-white" />
                                </div>
                            )}

                            <h1 className="text-2xl font-bold text-white mt-4">
                                {status === "loading" && "Đang xác nhận..."}
                                {status === "success" && "Xác nhận thành công!"}
                                {status === "already" && "Đã xác nhận rồi"}
                                {status === "error" && "Không thể xác nhận"}
                            </h1>
                            <p className="text-white/80 text-sm mt-2">{message}</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {redirectUrl && (
                            <Button
                                className="w-full rounded-xl h-11 font-semibold bg-efb-blue text-white hover:bg-efb-blue/90"
                                onClick={() => router.push(redirectUrl)}
                            >
                                Quản lý đăng ký
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full rounded-xl h-11 font-semibold"
                            onClick={() => router.push("/")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Về trang chủ
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function QuickConfirmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        }>
            <QuickConfirmContent />
        </Suspense>
    );
}
