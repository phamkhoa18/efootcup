"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Trophy, Loader2, Shield,
    Gamepad2, Phone, ExternalLink
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function DangKyPage() {
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        teamName: "",
        nickname: "",
        phone: "",
        facebookLink: "",
        role: "user" as const,
    });
    const { register: registerUser } = useAuth();
    const { settings: siteSettings } = useSiteSettings();
    const router = useRouter();

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleNextStep = () => {
        setError("");
        // Validate step 1
        if (!form.name.trim()) { setError("Vui lòng nhập họ và tên"); return; }
        if (!form.nickname.trim()) { setError("Vui lòng nhập nickname"); return; }
        if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
        if (!form.facebookLink.trim()) { setError("Vui lòng nhập link Facebook"); return; }
        setStep(2);
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

    const inputClass = "pl-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm";

    return (
        <div className="min-h-screen flex">
            {/* Left — Visual Panel */}
            <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-[#0A3D91] via-[#1E40AF] to-[#4338CA] items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0">
                    <Image src="/assets/hero-banner-1.png" alt="" fill className="object-cover opacity-15 mix-blend-luminosity" />
                </div>
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-yellow-300/[0.08] rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-emerald-400/[0.06] rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 text-center max-w-md">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] flex items-center justify-center mx-auto mb-8">
                            <Trophy className="w-10 h-10 text-efb-yellow" />
                        </div>
                        <h2 className="text-[28px] font-extralight text-white leading-tight mb-4 tracking-tight">
                            Tham gia cộng đồng<br />
                            <span className="text-efb-yellow font-medium">eFootball Việt Nam</span>
                        </h2>
                        <p className="text-white/50 text-[15px] font-light leading-relaxed">
                            Đăng ký miễn phí để tạo giải đấu, tham gia thi đấu
                            và kết nối với game thủ khắp cả nước.
                        </p>
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
                    <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
                        <div className={siteSettings.logo ? "" : "bg-efb-blue rounded-lg p-1.5"}>
                            <Image
                                src={siteSettings.logo || "/assets/logo.svg"}
                                alt={siteSettings.siteName}
                                width={80}
                                height={20}
                                className={siteSettings.logo ? "h-8 w-auto object-contain" : "h-4 w-auto"}
                            />
                        </div>
                        <span className="text-sm font-bold text-efb-dark">{siteSettings.siteName || "EFV CUP VN"}</span>
                    </Link>

                    {/* Heading */}
                    <h1 className="text-[26px] sm:text-[30px] font-extralight text-efb-dark leading-tight tracking-tight mb-1.5">
                        Tạo <span className="font-medium text-gradient">tài khoản mới</span>
                    </h1>
                    <p className="text-efb-text-secondary text-[14px] font-light mb-5">
                        {step === 1 ? "Bước 1/2 — Thông tin cá nhân & game" : "Bước 2/2 — Tài khoản đăng nhập"}
                    </p>

                    {/* Step indicator */}
                    <div className="flex gap-1.5 mb-5">
                        <div className={`h-1 rounded-full flex-1 transition-colors duration-300 ${step >= 1 ? 'bg-efb-blue' : 'bg-gray-200'}`} />
                        <div className={`h-1 rounded-full flex-1 transition-colors duration-300 ${step >= 2 ? 'bg-efb-blue' : 'bg-gray-200'}`} />
                    </div>

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
                    <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }}>
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3.5"
                                >
                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-[13px] font-medium text-efb-dark">Họ và tên *</Label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="name" type="text" placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} required />
                                        </div>
                                    </div>

                                    {/* Nickname */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nickname" className="text-[13px] font-medium text-efb-dark">Nickname *</Label>
                                        <div className="relative">
                                            <Gamepad2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="nickname" type="text" placeholder="Tên trong game" value={form.nickname} onChange={(e) => updateField("nickname", e.target.value)} className={inputClass} required maxLength={50} />
                                        </div>
                                    </div>

                                    {/* Team Name + Phone — 2 columns */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="teamName" className="text-[13px] font-medium text-efb-dark flex items-center gap-1">
                                                Team <span className="text-[10px] text-gray-400">(tùy chọn)</span>
                                            </Label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                                <Input id="teamName" type="text" placeholder="FC Saigon" value={form.teamName} onChange={(e) => updateField("teamName", e.target.value)} className="pl-9 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm" maxLength={100} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone" className="text-[13px] font-medium text-efb-dark">SĐT *</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                                <Input id="phone" type="tel" placeholder="0912 345 678" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="pl-9 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm" required />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Facebook */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="facebookLink" className="text-[13px] font-medium text-efb-dark">Link Facebook *</Label>
                                        <div className="relative">
                                            <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="facebookLink" type="url" placeholder="https://facebook.com/yourprofile" value={form.facebookLink} onChange={(e) => updateField("facebookLink", e.target.value)} className={inputClass} required />
                                        </div>
                                    </div>

                                    {/* Next button */}
                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group mt-1"
                                    >
                                        Tiếp tục
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3.5"
                                >
                                    {/* Summary of step 1 */}
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-1">
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-700 truncate">{form.name}</p>
                                                <p className="text-[11px] text-gray-400 truncate">{form.nickname} · {form.phone}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setStep(1); setError(""); }}
                                                className="text-[12px] text-efb-blue hover:underline font-medium flex-shrink-0 ml-3"
                                            >
                                                Sửa
                                            </button>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-[13px] font-medium text-efb-dark">Email *</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} required disabled={isSubmitting} />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password" className="text-[13px] font-medium text-efb-dark">Mật khẩu *</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="password" type={showPassword ? "text" : "password"} placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={(e) => updateField("password", e.target.value)} className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm" required disabled={isSubmitting} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-efb-text-muted hover:text-efb-text-secondary transition-colors">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-efb-dark">Xác nhận mật khẩu *</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-efb-text-muted" />
                                            <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className="pl-10 pr-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-efb-blue focus:ring-efb-blue/20 transition-all text-sm" required disabled={isSubmitting} />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-efb-text-muted hover:text-efb-text-secondary transition-colors">
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Terms */}
                                    <div className="flex items-start gap-2.5 pt-1">
                                        <Checkbox id="terms" className="mt-0.5 border-gray-300 data-[state=checked]:bg-efb-blue data-[state=checked]:border-efb-blue" required />
                                        <Label htmlFor="terms" className="text-[13px] text-efb-text-secondary font-normal leading-snug cursor-pointer">
                                            Tôi đồng ý với{" "}
                                            <Link href="/dieu-khoan" className="text-efb-blue hover:underline" target="_blank">
                                                Điều khoản sử dụng
                                            </Link>{" "}
                                            và{" "}
                                            <Link href="/chinh-sach" className="text-efb-blue hover:underline" target="_blank">
                                                Chính sách bảo mật
                                            </Link>
                                        </Label>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-2.5 mt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => { setStep(1); setError(""); }}
                                            className="h-11 rounded-xl px-4 text-sm font-medium"
                                            disabled={isSubmitting}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-1" />
                                            Quay lại
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 h-11 bg-efb-blue text-white hover:bg-efb-blue-light font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Đang tạo...
                                                </>
                                            ) : (
                                                <>
                                                    Tạo tài khoản
                                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    {/* Login link */}
                    <p className="text-center mt-6 text-sm text-efb-text-secondary">
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
