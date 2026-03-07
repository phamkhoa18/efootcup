"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Mail, ArrowRight, ArrowLeft, Loader2, KeyRound, ShieldCheck,
    CheckCircle2, Lock, Eye, EyeOff, Gamepad2
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

type Step = "email" | "code" | "success";

export default function QuenMatKhauPage() {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const { settings: siteSettings } = useSiteSettings();
    const router = useRouter();
    const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Step 1: Request code
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email.trim()) return setError("Vui lòng nhập email");

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, step: "request" }),
            });
            const data = await res.json();

            if (data.success) {
                setStep("code");
                setCountdown(60);
                toast.success("Mã xác nhận đã được gửi!");
            } else {
                setError(data.message || "Có lỗi xảy ra");
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resend code
    const handleResend = async () => {
        if (countdown > 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, step: "request" }),
            });
            const data = await res.json();
            if (data.success) {
                setCountdown(60);
                toast.success("Đã gửi lại mã xác nhận");
            }
        } catch {
            toast.error("Không thể gửi lại mã");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Code input handlers
    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        if (value && index < 5) {
            codeRefs.current[index + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            codeRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pasted.length; i++) {
            newCode[i] = pasted[i];
        }
        setCode(newCode);
        const nextEmpty = newCode.findIndex(c => !c);
        codeRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    };

    // Step 2: Verify code + reset
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const fullCode = code.join("");
        if (fullCode.length !== 6) return setError("Vui lòng nhập đủ 6 số");
        if (!newPassword) return setError("Vui lòng nhập mật khẩu mới");
        if (newPassword.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự");
        if (newPassword !== confirmPassword) return setError("Mật khẩu xác nhận không khớp");

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, step: "reset", code: fullCode, newPassword }),
            });
            const data = await res.json();

            if (data.success) {
                setStep("success");
                toast.success("Đặt lại mật khẩu thành công!");
            } else {
                setError(data.message || "Có lỗi xảy ra");
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left — Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[420px]"
                >
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
                        <div className={siteSettings.logo ? "" : "bg-efb-blue rounded-lg p-1.5"}>
                            <Image
                                src={siteSettings.logo || "/assets/logo.svg"}
                                alt={siteSettings.siteName}
                                width={80}
                                height={20}
                                className={siteSettings.logo ? "h-8 w-auto object-contain" : "h-4 w-auto"}
                            />
                        </div>
                        <span className="text-sm font-bold text-efb-dark">{siteSettings.siteName || "eFootCup VN"}</span>
                    </Link>

                    <AnimatePresence mode="wait">
                        {/* ===== STEP 1: Email ===== */}
                        {step === "email" && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {/* Icon */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                    <KeyRound className="w-6 h-6 text-white" />
                                </div>

                                <h1 className="text-[28px] font-extralight text-efb-dark leading-tight tracking-tight mb-2">
                                    Quên <span className="font-medium text-gradient">mật khẩu?</span>
                                </h1>
                                <p className="text-efb-text-secondary text-[15px] font-light mb-8">
                                    Nhập email đăng ký, chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu
                                </p>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleRequestCode} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium text-efb-dark">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                                required
                                                disabled={isSubmitting}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>
                                                Gửi mã xác nhận
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>

                                <p className="text-center mt-8 text-sm text-efb-text-secondary">
                                    <Link href="/dang-nhap" className="text-efb-blue hover:text-efb-blue-light font-semibold transition-colors inline-flex items-center gap-1">
                                        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {/* ===== STEP 2: Code + New Password ===== */}
                        {step === "code" && (
                            <motion.div
                                key="code"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>

                                <h1 className="text-[28px] font-extralight text-efb-dark leading-tight tracking-tight mb-2">
                                    Xác nhận <span className="font-medium text-gradient">mã OTP</span>
                                </h1>
                                <p className="text-efb-text-secondary text-[15px] font-light mb-2">
                                    Nhập mã 6 số đã gửi đến
                                </p>
                                <p className="text-sm font-bold text-efb-dark mb-8">{email}</p>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    {/* OTP Input */}
                                    <div>
                                        <Label className="text-sm font-medium text-efb-dark mb-3 block">Mã xác nhận</Label>
                                        <div className="flex gap-2 justify-between" onPaste={handleCodePaste}>
                                            {code.map((digit, i) => (
                                                <input
                                                    key={i}
                                                    ref={el => { codeRefs.current[i] = el; }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleCodeChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${digit
                                                        ? "border-efb-blue bg-blue-50/50 text-efb-blue"
                                                        : "border-gray-200 bg-gray-50/50 text-efb-dark"
                                                        } focus:border-efb-blue focus:ring-2 focus:ring-efb-blue/20`}
                                                    disabled={isSubmitting}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-xs text-gray-400">Mã có hiệu lực trong 15 phút</span>
                                            <button
                                                type="button"
                                                onClick={handleResend}
                                                disabled={countdown > 0 || isSubmitting}
                                                className={`text-xs font-semibold transition-colors ${countdown > 0 ? "text-gray-400" : "text-efb-blue hover:text-efb-blue-light"}`}
                                            >
                                                {countdown > 0 ? `Gửi lại (${countdown}s)` : "Gửi lại mã"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-efb-dark">Mật khẩu mới</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Tối thiểu 8 ký tự"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                                required
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-efb-text-muted hover:text-efb-text-secondary transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {/* Password strength */}
                                        {newPassword && (
                                            <div className="flex gap-1 mt-1">
                                                {[
                                                    newPassword.length >= 8,
                                                    /[A-Z]/.test(newPassword),
                                                    /[0-9]/.test(newPassword),
                                                    /[^A-Za-z0-9]/.test(newPassword),
                                                ].map((met, i) => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${met ? "bg-emerald-400" : "bg-gray-200"}`} />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-efb-dark">Xác nhận mật khẩu</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Nhập lại mật khẩu mới"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                                required
                                                disabled={isSubmitting}
                                            />
                                            {confirmPassword && newPassword === confirmPassword && (
                                                <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                Đặt lại mật khẩu
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>

                                <p className="text-center mt-6 text-sm text-efb-text-secondary">
                                    <button
                                        onClick={() => { setStep("email"); setError(""); setCode(["", "", "", "", "", ""]); }}
                                        className="text-efb-blue hover:text-efb-blue-light font-semibold transition-colors inline-flex items-center gap-1"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" /> Đổi email khác
                                    </button>
                                </p>
                            </motion.div>
                        )}

                        {/* ===== STEP 3: Success ===== */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="w-7 h-7 text-white" />
                                </div>

                                <h1 className="text-[28px] font-extralight text-efb-dark leading-tight tracking-tight mb-3">
                                    Đặt lại mật khẩu <span className="font-medium text-gradient">thành công!</span>
                                </h1>
                                <p className="text-efb-text-secondary text-[15px] font-light mb-8">
                                    Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ
                                </p>

                                <Button
                                    onClick={() => router.push("/dang-nhap")}
                                    className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                                >
                                    Đăng nhập ngay
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Right — Visual Panel */}
            <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-[#0A3D91] via-[#1E40AF] to-[#4338CA] items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0">
                    <Image
                        src="/assets/efootball_bg_cl2.webp"
                        alt=""
                        fill
                        className="object-cover opacity-15 mix-blend-luminosity"
                    />
                </div>

                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-yellow-300/[0.08] rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-cyan-400/[0.06] rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 text-center max-w-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center mx-auto mb-8">
                            <KeyRound className="w-10 h-10 text-efb-yellow" />
                        </div>
                        <h2 className="text-[28px] font-extralight text-white leading-tight mb-4 tracking-tight">
                            Bảo mật tài khoản
                            <br />
                            <span className="text-efb-yellow font-medium">là ưu tiên hàng đầu</span>
                        </h2>
                        <p className="text-white/50 text-[15px] font-light leading-relaxed">
                            Đặt lại mật khẩu nhanh chóng và an toàn chỉ với vài bước đơn giản.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
