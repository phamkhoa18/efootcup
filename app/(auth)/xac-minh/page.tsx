"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Mail, ArrowRight, Loader2, CheckCircle2, RefreshCw, ShieldCheck, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function VerifyContent() {
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email") || "";
    const router = useRouter();
    const { verifyEmail, resendCode } = useAuth();

    const [code, setCode] = useState(["", "", "", ""]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isVerified, setIsVerified] = useState(false);

    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    // Start countdown
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // Resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Focus first input on mount
    useEffect(() => {
        inputRefs[0].current?.focus();
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, "").slice(-1);

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        setError("");

        // Auto-focus next input
        if (digit && index < 3) {
            inputRefs[index + 1].current?.focus();
        }

        // Auto-submit when all 4 digits entered
        if (digit && index === 3) {
            const fullCode = newCode.join("");
            if (fullCode.length === 4) {
                handleVerify(fullCode);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
            const newCode = [...code];
            newCode[index - 1] = "";
            setCode(newCode);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (pasted.length > 0) {
            const newCode = ["", "", "", ""];
            for (let i = 0; i < pasted.length; i++) {
                newCode[i] = pasted[i];
            }
            setCode(newCode);
            const focusIndex = Math.min(pasted.length, 3);
            inputRefs[focusIndex].current?.focus();

            if (pasted.length === 4) {
                handleVerify(pasted);
            }
        }
    };

    const handleVerify = async (fullCode: string) => {
        if (!emailParam) {
            setError("Không tìm thấy email. Vui lòng đăng ký lại");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const result = await verifyEmail(emailParam, fullCode);

            if (result.success) {
                setIsVerified(true);
                setSuccess(result.message);

                // Brief delay then redirect
                setTimeout(() => {
                    // Check the user's role from the stored data
                    const token = localStorage.getItem("efootcup_token");
                    if (token) {
                        fetch("/api/auth/me", {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                            .then((res) => res.json())
                            .then((data) => {
                                if (data.success && data.data.role === "manager") {
                                    router.push("/manager");
                                } else {
                                    router.push("/giai-dau");
                                }
                            })
                            .catch(() => router.push("/giai-dau"));
                    } else {
                        router.push("/dang-nhap");
                    }
                }, 2000);
            } else {
                setError(result.message);
                // Clear code on error
                setCode(["", "", "", ""]);
                inputRefs[0].current?.focus();
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!emailParam || resendCooldown > 0) return;

        setIsResending(true);
        setError("");

        try {
            const result = await resendCode(emailParam);

            if (result.success) {
                setSuccess("Mã mới đã được gửi!");
                setCountdown(300); // Reset 5 minute countdown
                setResendCooldown(60); // 60 second cooldown for resend
                setCode(["", "", "", ""]);
                inputRefs[0].current?.focus();

                // Clear success after 3 seconds
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setError(result.message);
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsResending(false);
        }
    };

    const maskedEmail = emailParam
        ? emailParam.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : "***@***.com";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-100/20 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-[440px]"
            >
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#0A3D91] via-[#1E40AF] to-[#4338CA] px-8 py-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-yellow-300/[0.08] rounded-full blur-2xl" />
                            <div className="absolute -bottom-10 -left-10 w-[150px] h-[150px] bg-cyan-400/[0.06] rounded-full blur-2xl" />
                        </div>

                        <AnimatePresence mode="wait">
                            {isVerified ? (
                                <motion.div
                                    key="verified"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                >
                                    <div className="w-16 h-16 rounded-full bg-green-400/20 border-2 border-green-400/30 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-300" />
                                    </div>
                                    <h1 className="text-xl font-semibold text-white mb-1">Xác minh thành công!</h1>
                                    <p className="text-white/60 text-sm">Đang chuyển hướng...</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="unverified"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck className="w-8 h-8 text-efb-yellow" />
                                    </div>
                                    <h1 className="text-xl font-semibold text-white mb-1">Xác minh email</h1>
                                    <p className="text-white/60 text-sm">
                                        Nhập mã 4 số đã gửi đến <span className="text-white/80 font-medium">{maskedEmail}</span>
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-8">
                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium text-center overflow-hidden"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Success message */}
                        <AnimatePresence>
                            {success && !isVerified && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm font-medium text-center overflow-hidden"
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isVerified && (
                            <>
                                {/* Timer */}
                                <div className="text-center mb-6">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${countdown > 60
                                            ? "bg-blue-50 text-blue-600"
                                            : countdown > 0
                                                ? "bg-amber-50 text-amber-600"
                                                : "bg-red-50 text-red-600"
                                        }`}>
                                        {countdown > 0 ? (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                Mã hết hạn sau {formatTime(countdown)}
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Mã đã hết hạn
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* OTP Input - 4 boxes using shadcn Input */}
                                <div className="flex justify-center gap-3 mb-8">
                                    {code.map((digit, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.08 }}
                                        >
                                            <Input
                                                ref={inputRefs[index]}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={index === 0 ? handlePaste : undefined}
                                                disabled={isSubmitting || countdown === 0}
                                                className={`w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-1 ${digit
                                                        ? "border-efb-blue bg-efb-blue/5 text-efb-blue focus:ring-efb-blue/20"
                                                        : "border-gray-200 bg-gray-50/50 text-gray-700 focus:border-efb-blue focus:ring-efb-blue/20 focus:bg-white"
                                                    } ${isSubmitting ? "opacity-60" : ""}`}
                                                autoComplete="one-time-code"
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Verify button */}
                                <Button
                                    onClick={() => handleVerify(code.join(""))}
                                    disabled={code.join("").length !== 4 || isSubmitting || countdown === 0}
                                    className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang xác minh...
                                        </>
                                    ) : (
                                        <>
                                            Xác minh tài khoản
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                {/* Resend / Back */}
                                <div className="mt-6 space-y-3">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Không nhận được mã?
                                        </p>
                                        <Button
                                            variant="ghost"
                                            onClick={handleResend}
                                            disabled={resendCooldown > 0 || isResending}
                                            className="text-efb-blue hover:text-efb-blue-light hover:bg-efb-blue/5 text-sm font-semibold h-9 px-4 rounded-lg"
                                        >
                                            {isResending ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                    Đang gửi...
                                                </>
                                            ) : resendCooldown > 0 ? (
                                                `Gửi lại sau ${resendCooldown}s`
                                            ) : (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                                    Gửi lại mã
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Link
                                            href="/dang-nhap"
                                            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            Quay lại đăng nhập
                                        </Link>
                                    </div>
                                </div>
                            </>
                        )}

                        {isVerified && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Tài khoản đã được kích hoạt. Đang chuyển hướng...
                                </p>
                                <div className="mt-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-efb-blue mx-auto" />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-gray-50/80 border-t border-gray-100 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Kiểm tra cả thư mục spam nếu không thấy email</span>
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="mt-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="bg-efb-blue rounded-lg p-1">
                            <Image
                                src="/assets/logo.svg"
                                alt="eFootCup"
                                width={60}
                                height={16}
                                className="h-3 w-auto"
                            />
                        </div>
                        <span className="text-xs font-semibold text-gray-500">eFootCup VN</span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

export default function XacMinhPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
