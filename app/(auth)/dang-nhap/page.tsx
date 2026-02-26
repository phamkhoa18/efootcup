"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Trophy, Gamepad2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DangNhapPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                // Redirect based on role
                const res = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("efootcup_token")}`,
                    },
                });
                const data = await res.json();

                if (data.success && data.data.role === "manager") {
                    router.push("/manager");
                } else {
                    router.push("/giai-dau");
                }
            } else if (result.requiresVerification) {
                // Account not verified — redirect to verification page
                router.push(`/xac-minh?email=${encodeURIComponent(result.email || email)}`);
            } else {
                setError(result.message);
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
                        <div className="bg-efb-blue rounded-lg p-1.5">
                            <Image
                                src="/assets/logo.svg"
                                alt="eFootCup"
                                width={80}
                                height={20}
                                className="h-4 w-auto"
                            />
                        </div>
                        <span className="text-sm font-bold text-efb-dark">eFootCup VN</span>
                    </Link>

                    {/* Heading */}
                    <h1 className="text-[28px] sm:text-[32px] font-extralight text-efb-dark leading-tight tracking-tight mb-2">
                        Chào mừng <span className="font-medium text-gradient">trở lại</span>
                    </h1>
                    <p className="text-efb-text-secondary text-[15px] font-light mb-8">
                        Đăng nhập để quản lý giải đấu của bạn
                    </p>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-efb-dark">
                                Email
                            </Label>
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
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium text-efb-dark">
                                    Mật khẩu
                                </Label>
                                <Link
                                    href="/quen-mat-khau"
                                    className="text-xs text-efb-blue hover:text-efb-blue-light font-medium transition-colors"
                                >
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center gap-2.5">
                            <Checkbox id="remember" className="border-gray-300 data-[state=checked]:bg-efb-blue data-[state=checked]:border-efb-blue" />
                            <Label htmlFor="remember" className="text-sm text-efb-text-secondary font-normal cursor-pointer">
                                Ghi nhớ đăng nhập
                            </Label>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang đăng nhập...
                                </>
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>


                    {/* Register link */}
                    <p className="text-center mt-8 text-sm text-efb-text-secondary">
                        Chưa có tài khoản?{" "}
                        <Link href="/dang-ky" className="text-efb-blue hover:text-efb-blue-light font-semibold transition-colors">
                            Đăng ký ngay
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right — Visual Panel */}
            <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-[#0A3D91] via-[#1E40AF] to-[#4338CA] items-center justify-center p-12 overflow-hidden">
                {/* Background image */}
                <div className="absolute inset-0">
                    <Image
                        src="/assets/efootball_bg_cl2.webp"
                        alt=""
                        fill
                        className="object-cover opacity-15 mix-blend-luminosity"
                    />
                </div>

                {/* Decorative elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-yellow-300/[0.08] rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-cyan-400/[0.06] rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-purple-500/[0.06] rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center max-w-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center mx-auto mb-8">
                            <Gamepad2 className="w-10 h-10 text-efb-yellow" />
                        </div>
                        <h2 className="text-[28px] font-extralight text-white leading-tight mb-4 tracking-tight">
                            Tạo & quản lý giải đấu
                            <br />
                            <span className="text-efb-yellow font-medium">dễ dàng hơn bao giờ hết</span>
                        </h2>
                        <p className="text-white/50 text-[15px] font-light leading-relaxed">
                            Hàng ngàn game thủ eFootball đã tin tưởng sử dụng
                            nền tảng của chúng tôi.
                        </p>

                        {/* Stats mini */}
                        <div className="flex items-center justify-center gap-6 mt-8">
                            <div className="text-center">
                                <div className="text-2xl font-light text-white">500+</div>
                                <div className="text-[11px] text-white/40 font-medium">Giải đấu</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="text-2xl font-light text-white">10K+</div>
                                <div className="text-[11px] text-white/40 font-medium">Game thủ</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="text-2xl font-light text-white">4.9</div>
                                <div className="text-[11px] text-white/40 font-medium">Đánh giá</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
