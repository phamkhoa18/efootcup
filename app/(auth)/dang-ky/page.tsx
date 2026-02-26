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
import {
    Eye, EyeOff, Mail, Lock, User, ArrowRight, Trophy, Loader2,
    Shield, Gamepad2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DangKyPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user" as "user" | "manager",
    });
    const { register: registerUser } = useAuth();
    const router = useRouter();

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (form.password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await registerUser(form);

            if (result.success && result.requiresVerification) {
                // Redirect to verification page with email
                router.push(`/xac-minh?email=${encodeURIComponent(form.email)}`);
            } else if (!result.success) {
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
            {/* Left — Visual Panel */}
            <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-[#0A3D91] via-[#1E40AF] to-[#4338CA] items-center justify-center p-12 overflow-hidden">
                {/* Background image */}
                <div className="absolute inset-0">
                    <Image
                        src="/assets/hero-banner-1.png"
                        alt=""
                        fill
                        className="object-cover opacity-15 mix-blend-luminosity"
                    />
                </div>

                {/* Decorative elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-yellow-300/[0.08] rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-emerald-400/[0.06] rounded-full blur-3xl" />
                    <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-purple-500/[0.06] rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center max-w-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center mx-auto mb-8">
                            <Trophy className="w-10 h-10 text-efb-yellow" />
                        </div>
                        <h2 className="text-[28px] font-extralight text-white leading-tight mb-4 tracking-tight">
                            Tham gia cộng đồng
                            <br />
                            <span className="text-efb-yellow font-medium">eFootball Việt Nam</span>
                        </h2>
                        <p className="text-white/50 text-[15px] font-light leading-relaxed">
                            Đăng ký miễn phí để tạo giải đấu, tham gia thi đấu
                            và kết nối với game thủ khắp cả nước.
                        </p>

                        {/* Features mini */}
                        <div className="mt-10 space-y-4 text-left max-w-xs mx-auto">
                            {[
                                "Tạo giải đấu không giới hạn",
                                "Tham gia giải đấu miễn phí",
                                "Theo dõi bảng xếp hạng",
                                "Kết nối cộng đồng game thủ",
                            ].map((item, i) => (
                                <motion.div
                                    key={item}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-5 h-5 rounded-full bg-efb-yellow/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-efb-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-white/60 text-sm font-light">{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right — Form */}
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
                        Tạo <span className="font-medium text-gradient">tài khoản mới</span>
                    </h1>
                    <p className="text-efb-text-secondary text-[15px] font-light mb-6">
                        Đăng ký để bắt đầu tạo giải đấu của riêng bạn
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

                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => updateField("role", "user")}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 ${form.role === "user"
                                ? "border-efb-blue bg-efb-blue/5"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <Gamepad2 className={`w-5 h-5 ${form.role === "user" ? "text-efb-blue" : "text-gray-400"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-semibold ${form.role === "user" ? "text-efb-blue" : "text-gray-600"}`}>
                                    Người chơi
                                </div>
                                <div className="text-[11px] text-gray-400">Tham gia giải đấu</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateField("role", "manager")}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 ${form.role === "manager"
                                ? "border-efb-blue bg-efb-blue/5"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <Shield className={`w-5 h-5 ${form.role === "manager" ? "text-efb-blue" : "text-gray-400"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-semibold ${form.role === "manager" ? "text-efb-blue" : "text-gray-600"}`}>
                                    Quản lý
                                </div>
                                <div className="text-[11px] text-gray-400">Tạo & quản lý giải</div>
                            </div>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-efb-dark">
                                Họ và tên
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

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
                                    value={form.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-efb-dark">
                                Mật khẩu
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Tối thiểu 8 ký tự"
                                    value={form.password}
                                    onChange={(e) => updateField("password", e.target.value)}
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

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium text-efb-dark">
                                Xác nhận mật khẩu
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Nhập lại mật khẩu"
                                    value={form.confirmPassword}
                                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                                    className="pl-10 pr-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-efb-text-muted hover:text-efb-text-secondary transition-colors"
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-2.5 pt-1">
                            <Checkbox id="terms" className="mt-0.5 border-gray-300 data-[state=checked]:bg-efb-blue data-[state=checked]:border-efb-blue" required />
                            <Label htmlFor="terms" className="text-sm text-efb-text-secondary font-normal leading-snug cursor-pointer">
                                Tôi đồng ý với{" "}
                                <Link href="/dieu-khoan" className="text-efb-blue hover:underline">
                                    Điều khoản sử dụng
                                </Link>{" "}
                                và{" "}
                                <Link href="/chinh-sach" className="text-efb-blue hover:underline">
                                    Chính sách bảo mật
                                </Link>
                            </Label>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group mt-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tạo tài khoản...
                                </>
                            ) : (
                                <>
                                    Tạo tài khoản
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>


                    {/* Login link */}
                    <p className="text-center mt-8 text-sm text-efb-text-secondary">
                        Đã có tài khoản?{" "}
                        <Link href="/dang-nhap" className="text-efb-blue hover:text-efb-blue-light font-semibold transition-colors">
                            Đăng nhập
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
