"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
    Globe, Shield, Bell, Database, Settings, Save, Loader2,
    Image as ImageIcon, Search as SearchIcon, Share2, Code2,
    Mail, Phone, MapPin, ExternalLink, CheckCircle2, AlertTriangle,
    Info, Upload, Trash2, Eye, Palette, FileText, Hash,
    Facebook, Youtube, MessageCircle, Twitter, Instagram, Send,
    Server, Lock, Zap, RefreshCw, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";

// ===========================================================
// Settings Sections Config
// ===========================================================
const settingSections = [
    { id: "website", label: "Website", icon: Globe, description: "Tên, tagline, URL" },
    { id: "branding", label: "Thương hiệu", icon: Palette, description: "Logo, Favicon, OG Image" },
    { id: "seo", label: "SEO", icon: SearchIcon, description: "Meta tags, Keywords, Robots" },
    { id: "social", label: "Mạng xã hội", icon: Share2, description: "Facebook, Youtube, Discord..." },
    { id: "contact", label: "Liên hệ", icon: Mail, description: "Email, SĐT, Địa chỉ" },
    { id: "email", label: "Email / SMTP", icon: Send, description: "Cấu hình gửi email" },
    { id: "advanced", label: "Nâng cao", icon: Code2, description: "Analytics, Custom code..." },
    { id: "system", label: "Hệ thống", icon: Database, description: "Bảo trì, CSDL, Bảo mật" },
];

// ===========================================================
// Image Upload Component
// ===========================================================
function ImageUploader({
    label,
    hint,
    value,
    type,
    onUploaded,
    aspect = "wide",
}: {
    label: string;
    hint: string;
    value: string;
    type: string;
    onUploaded: (url: string) => void;
    aspect?: "wide" | "square" | "icon";
}) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await adminAPI.uploadSettingsImage(file, type);
            if (res.success) {
                onUploaded(res.data.url);
                toast.success(`${label} đã được cập nhật`);
            } else {
                toast.error(res.message || "Upload thất bại");
            }
        } catch (err) {
            toast.error("Lỗi khi upload ảnh");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const sizeClass =
        aspect === "icon" ? "w-20 h-20" :
            aspect === "square" ? "w-32 h-32" :
                "w-full h-36";

    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">{label}</Label>
            <p className="text-[11px] text-gray-400 -mt-1">{hint}</p>
            <div className="flex items-end gap-4">
                <div
                    className={`${sizeClass} rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all`}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    ) : value ? (
                        <>
                            <img src={value} alt={label} className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="w-5 h-5 text-white" />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 text-gray-400">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Tải lên</span>
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*,.ico,.svg"
                        className="hidden"
                        onChange={handleUpload}
                    />
                </div>
                {value && (
                    <div className="flex flex-col gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() => window.open(value, "_blank")}
                        >
                            <Eye className="w-3 h-3 mr-1" /> Xem
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onUploaded("")}
                        >
                            <Trash2 className="w-3 h-3 mr-1" /> Xóa
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ===========================================================
// Toggle Switch Component
// ===========================================================
function ToggleSwitch({
    label,
    description,
    checked,
    onChange,
    icon: Icon,
    color = "emerald",
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon?: any;
    color?: "emerald" | "amber" | "blue";
}) {
    const colorMap = {
        emerald: checked ? "bg-emerald-500" : "bg-gray-200",
        amber: checked ? "bg-amber-500" : "bg-gray-200",
        blue: checked ? "bg-efb-blue" : "bg-gray-200",
    };

    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                <div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-11 h-6 rounded-full transition-colors relative ${colorMap[color]}`}
            >
                <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${checked ? "left-6" : "left-1"}`}
                />
            </button>
        </div>
    );
}

// ===========================================================
// Section Wrapper
// ===========================================================
function SettingsCard({
    icon: Icon,
    iconColor,
    title,
    subtitle,
    children,
}: {
    icon: any;
    iconColor: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

// ===========================================================
// Main Component
// ===========================================================
export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState("website");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // All form state in one object
    const [form, setForm] = useState<Record<string, any>>({
        // Website
        siteName: "",
        siteTagline: "",
        siteDescription: "",
        siteUrl: "",
        // Branding
        logo: "",
        logoDark: "",
        favicon: "",
        appleTouchIcon: "",
        ogImage: "",
        // SEO
        seoTitle: "",
        seoDescription: "",
        seoKeywords: [],
        googleSiteVerification: "",
        bingSiteVerification: "",
        robotsTxt: "",
        // Social
        socialFacebook: "",
        socialYoutube: "",
        socialTiktok: "",
        socialDiscord: "",
        socialTwitter: "",
        socialInstagram: "",
        socialTelegram: "",
        // Contact
        contactEmail: "",
        contactPhone: "",
        contactAddress: "",
        // Advanced
        googleAnalyticsId: "",
        facebookPixelId: "",
        customHeadCode: "",
        customFooterCode: "",
        maintenanceMode: false,
        registrationEnabled: true,
        copyrightText: "",
        // Email / SMTP
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "",
        smtpPass: "",
        smtpFromName: "eFootCup VN",
        smtpFromEmail: "",
        emailEnabled: false,
    });

    const [keywordsInput, setKeywordsInput] = useState("");
    const [testEmailAddress, setTestEmailAddress] = useState("");
    const [isSendingTest, setIsSendingTest] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getSettings();
            if (res.success && res.data) {
                setForm(prev => ({ ...prev, ...res.data }));
                setKeywordsInput((res.data.seoKeywords || []).join(", "));
            }
        } catch (err) {
            console.error("Load settings error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSendTestEmail = async () => {
        if (!testEmailAddress) {
            toast.error("Vui long nhap email nhan test");
            return;
        }
        setIsSendingTest(true);
        try {
            // Save SMTP settings first
            await handleSave();
            // Then send test
            const res = await fetch("/api/admin/email/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: testEmailAddress }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Da gui email test thanh cong!");
            } else {
                toast.error(data.message || "Gui email that bai");
            }
        } catch (err) {
            toast.error("Loi khi gui email test");
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Parse keywords from comma-separated input
            const dataToSave = {
                ...form,
                seoKeywords: keywordsInput
                    .split(",")
                    .map((k: string) => k.trim())
                    .filter((k: string) => k.length > 0),
            };

            const res = await adminAPI.updateSettings(dataToSave);
            if (res.success) {
                toast.success("Đã lưu cài đặt thành công!");
            } else {
                toast.error(res.message || "Lưu thất bại");
            }
        } catch (err) {
            toast.error("Có lỗi xảy ra khi lưu");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                    <span className="text-sm text-gray-400 font-medium">Đang tải cài đặt...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Settings className="w-6 h-6 text-efb-blue" />
                        Cài đặt hệ thống
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Quản lý toàn bộ cấu hình website, thương hiệu và SEO
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-efb-blue text-white hover:bg-efb-blue/90 rounded-xl h-11 px-8 shadow-sm shadow-efb-blue/20"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Lưu tất cả
                </Button>
            </div>

            <div className="grid lg:grid-cols-[220px_1fr] gap-6">
                {/* Sidebar Nav */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-0.5 sticky top-24">
                        {settingSections.map((section) => {
                            const active = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${active
                                        ? "bg-efb-blue text-white shadow-sm shadow-efb-blue/20"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <section.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{section.label}</div>
                                        <div className={`text-[10px] truncate ${active ? "text-white/70" : "text-gray-400"}`}>
                                            {section.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* ====== WEBSITE ====== */}
                    {activeSection === "website" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Globe}
                                iconColor="bg-blue-50 text-blue-600"
                                title="Thông tin Website"
                                subtitle="Tên, mô tả và URL website"
                            >
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Tên website</Label>
                                        <Input value={form.siteName} onChange={(e) => updateField("siteName", e.target.value)} className="h-11 rounded-xl" placeholder="eFootCup Vietnam" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">URL website</Label>
                                        <Input value={form.siteUrl} onChange={(e) => updateField("siteUrl", e.target.value)} className="h-11 rounded-xl" placeholder="https://example.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Tagline / Slogan</Label>
                                    <Input value={form.siteTagline} onChange={(e) => updateField("siteTagline", e.target.value)} className="h-11 rounded-xl" placeholder="Nền tảng giải đấu eFootball hàng đầu Việt Nam" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Mô tả website</Label>
                                    <textarea
                                        value={form.siteDescription}
                                        onChange={(e) => updateField("siteDescription", e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                                        placeholder="Mô tả ngắn gọn về website..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Dòng bản quyền</Label>
                                    <Input value={form.copyrightText} onChange={(e) => updateField("copyrightText", e.target.value)} className="h-11 rounded-xl" placeholder="© 2024 eFootCup Vietnam. All rights reserved." />
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== BRANDING ====== */}
                    {activeSection === "branding" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Palette}
                                iconColor="bg-purple-50 text-purple-600"
                                title="Thương hiệu & Hình ảnh"
                                subtitle="Logo, Favicon và ảnh đại diện Open Graph"
                            >
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <ImageUploader
                                        label="Logo chính"
                                        hint="Ảnh PNG/SVG nền trong suốt, khuyến nghị 300×80px"
                                        value={form.logo}
                                        type="logo"
                                        onUploaded={(url) => updateField("logo", url)}
                                        aspect="wide"
                                    />
                                    <ImageUploader
                                        label="Logo Dark Mode"
                                        hint="Logo phiên bản sáng cho nền tối"
                                        value={form.logoDark}
                                        type="logoDark"
                                        onUploaded={(url) => updateField("logoDark", url)}
                                        aspect="wide"
                                    />
                                </div>
                                <div className="grid sm:grid-cols-3 gap-6 pt-2">
                                    <ImageUploader
                                        label="Favicon"
                                        hint="ICO/PNG 32×32 hoặc 16×16px"
                                        value={form.favicon}
                                        type="favicon"
                                        onUploaded={(url) => updateField("favicon", url)}
                                        aspect="icon"
                                    />
                                    <ImageUploader
                                        label="Apple Touch Icon"
                                        hint="PNG 180×180px cho iOS"
                                        value={form.appleTouchIcon}
                                        type="appleTouchIcon"
                                        onUploaded={(url) => updateField("appleTouchIcon", url)}
                                        aspect="icon"
                                    />
                                    <ImageUploader
                                        label="Open Graph Image"
                                        hint="JPG/PNG 1200×630px cho chia sẻ MXH"
                                        value={form.ogImage}
                                        type="ogImage"
                                        onUploaded={(url) => updateField("ogImage", url)}
                                        aspect="square"
                                    />
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== SEO ====== */}
                    {activeSection === "seo" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={SearchIcon}
                                iconColor="bg-emerald-50 text-emerald-600"
                                title="SEO & Meta Tags"
                                subtitle="Tối ưu hóa công cụ tìm kiếm cho website"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Meta Title mặc định</Label>
                                    <Input value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="h-11 rounded-xl" placeholder="eFootball Cup VN - Tổ Chức Giải Đấu..." />
                                    <p className="text-[11px] text-gray-400">{(form.seoTitle || "").length}/60 ký tự · Best: 50–60</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Meta Description mặc định</Label>
                                    <textarea
                                        value={form.seoDescription}
                                        onChange={(e) => updateField("seoDescription", e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400">{(form.seoDescription || "").length}/160 ký tự · Best: 120–160</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Keywords (phân cách bằng dấu phẩy)</Label>
                                    <textarea
                                        value={keywordsInput}
                                        onChange={(e) => setKeywordsInput(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                                        placeholder="eFootball, giải đấu, tournament, esports..."
                                    />
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {keywordsInput.split(",").map((k, i) => k.trim()).filter(k => k).map((k, i) => (
                                            <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Google Preview */}
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-3">
                                        <Eye className="w-3 h-3 inline mr-1" />
                                        Xem trước trên Google
                                    </p>
                                    <div className="bg-white rounded-lg p-4 border border-gray-200 max-w-xl">
                                        <div className="text-xs text-emerald-700 mb-1 truncate">{form.siteUrl || "https://efootcup.efootball.vn"}</div>
                                        <div className="text-[#1a0dab] text-lg font-medium leading-snug hover:underline cursor-pointer truncate">
                                            {form.seoTitle || form.siteName || "Tên website"}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                            {form.seoDescription || form.siteDescription || "Mô tả website..."}
                                        </p>
                                    </div>
                                </div>
                            </SettingsCard>

                            <SettingsCard
                                icon={Shield}
                                iconColor="bg-amber-50 text-amber-600"
                                title="Xác minh công cụ tìm kiếm"
                                subtitle="Xác minh quyền sở hữu website với Google, Bing"
                            >
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Google Site Verification</Label>
                                        <Input value={form.googleSiteVerification} onChange={(e) => updateField("googleSiteVerification", e.target.value)} className="h-11 rounded-xl" placeholder="Mã xác minh Google..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Bing Site Verification</Label>
                                        <Input value={form.bingSiteVerification} onChange={(e) => updateField("bingSiteVerification", e.target.value)} className="h-11 rounded-xl" placeholder="Mã xác minh Bing..." />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Robots.txt tùy chỉnh</Label>
                                    <textarea
                                        value={form.robotsTxt}
                                        onChange={(e) => updateField("robotsTxt", e.target.value)}
                                        rows={4}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 font-mono placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                                        placeholder={"User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://efootcup.efootball.vn/sitemap.xml"}
                                    />
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== SOCIAL ====== */}
                    {activeSection === "social" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Share2}
                                iconColor="bg-indigo-50 text-indigo-600"
                                title="Liên kết mạng xã hội"
                                subtitle="Kết nối với các nền tảng mạng xã hội"
                            >
                                <div className="space-y-4">
                                    {[
                                        { key: "socialFacebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/efootcup", color: "text-blue-600" },
                                        { key: "socialYoutube", label: "Youtube", icon: Youtube, placeholder: "https://youtube.com/@efootcup", color: "text-red-500" },
                                        { key: "socialTiktok", label: "TikTok", icon: Hash, placeholder: "https://tiktok.com/@efootcup", color: "text-gray-900" },
                                        { key: "socialInstagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/efootcup", color: "text-pink-500" },
                                        { key: "socialTwitter", label: "Twitter / X", icon: Twitter, placeholder: "https://twitter.com/efootcup", color: "text-sky-500" },
                                        { key: "socialDiscord", label: "Discord", icon: MessageCircle, placeholder: "https://discord.gg/efootcup", color: "text-indigo-500" },
                                        { key: "socialTelegram", label: "Telegram", icon: Send, placeholder: "https://t.me/efootcup", color: "text-sky-400" },
                                    ].map(({ key, label, icon: Icon, placeholder, color }) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 ${color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</Label>
                                                <Input
                                                    value={form[key] || ""}
                                                    onChange={(e) => updateField(key, e.target.value)}
                                                    className="h-10 rounded-lg mt-1"
                                                    placeholder={placeholder}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== CONTACT ====== */}
                    {activeSection === "contact" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Mail}
                                iconColor="bg-rose-50 text-rose-600"
                                title="Thông tin liên hệ"
                                subtitle="Email, số điện thoại và địa chỉ hiển thị trên website"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email liên hệ</Label>
                                            <Input value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} className="h-10 rounded-lg" placeholder="contact@efootcup.vn" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số điện thoại</Label>
                                            <Input value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} className="h-10 rounded-lg" placeholder="+84 123 456 789" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Địa chỉ</Label>
                                            <Input value={form.contactAddress} onChange={(e) => updateField("contactAddress", e.target.value)} className="h-10 rounded-lg" placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== EMAIL / SMTP ====== */}
                    {activeSection === "email" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Mail}
                                iconColor="bg-sky-50 text-sky-600"
                                title="Cấu hình Email (SMTP)"
                                subtitle="Thiết lập máy chủ gửi email để hệ thống gửi thông báo, hóa đơn tự động"
                            >
                                <ToggleSwitch
                                    label="Bật gửi email"
                                    description="Khi bật, hệ thống sẽ gửi email tự động (xác minh, hóa đơn, thông báo)"
                                    checked={form.emailEnabled}
                                    onChange={(v) => updateField("emailEnabled", v)}
                                    icon={Mail}
                                    color="emerald"
                                />

                                <div className="grid sm:grid-cols-2 gap-5 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">SMTP Host</Label>
                                        <Input
                                            value={form.smtpHost}
                                            onChange={(e) => updateField("smtpHost", e.target.value)}
                                            className="h-11 rounded-xl font-mono"
                                            placeholder="smtp.gmail.com"
                                        />
                                        <p className="text-[11px] text-gray-400">Ví dụ: smtp.gmail.com, smtp.zoho.com, smtp.mail.yahoo.com</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">SMTP Port</Label>
                                        <Input
                                            type="number"
                                            value={form.smtpPort}
                                            onChange={(e) => updateField("smtpPort", parseInt(e.target.value) || 587)}
                                            className="h-11 rounded-xl font-mono"
                                            placeholder="587"
                                        />
                                        <p className="text-[11px] text-gray-400">587 (TLS) hoặc 465 (SSL)</p>
                                    </div>
                                </div>

                                <ToggleSwitch
                                    label="SSL/TLS"
                                    description="Bật nếu dùng port 465 (SSL). Tắt nếu dùng port 587 (STARTTLS)"
                                    checked={form.smtpSecure}
                                    onChange={(v) => updateField("smtpSecure", v)}
                                    icon={Lock}
                                    color="blue"
                                />

                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">SMTP Username</Label>
                                        <Input
                                            value={form.smtpUser}
                                            onChange={(e) => updateField("smtpUser", e.target.value)}
                                            className="h-11 rounded-xl"
                                            placeholder="your-email@gmail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">SMTP Password</Label>
                                        <Input
                                            type="password"
                                            value={form.smtpPass}
                                            onChange={(e) => updateField("smtpPass", e.target.value)}
                                            className="h-11 rounded-xl"
                                            placeholder="App password..."
                                        />
                                        <p className="text-[11px] text-gray-400">Nếu dùng Gmail, tạo App Password trong Google Account</p>
                                    </div>
                                </div>
                            </SettingsCard>

                            <SettingsCard
                                icon={Send}
                                iconColor="bg-emerald-50 text-emerald-600"
                                title="Thông tin người gửi"
                                subtitle="Tên và email hiển thị khi gửi email"
                            >
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Tên người gửi</Label>
                                        <Input
                                            value={form.smtpFromName}
                                            onChange={(e) => updateField("smtpFromName", e.target.value)}
                                            className="h-11 rounded-xl"
                                            placeholder="eFootCup VN"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Email người gửi</Label>
                                        <Input
                                            value={form.smtpFromEmail}
                                            onChange={(e) => updateField("smtpFromEmail", e.target.value)}
                                            className="h-11 rounded-xl"
                                            placeholder="noreply@efootcup.vn"
                                        />
                                        <p className="text-[11px] text-gray-400">Để trống sẽ dùng SMTP Username làm email gửi</p>
                                    </div>
                                </div>
                            </SettingsCard>

                            <SettingsCard
                                icon={Zap}
                                iconColor="bg-amber-50 text-amber-600"
                                title="Kiểm tra cấu hình"
                                subtitle="Gửi email thử để xác nhận cấu hình SMTP hoạt động"
                            >
                                <div className="flex items-end gap-3">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Email nhận test</Label>
                                        <Input
                                            type="email"
                                            value={testEmailAddress}
                                            onChange={(e) => setTestEmailAddress(e.target.value)}
                                            className="h-11 rounded-xl"
                                            placeholder="your-email@gmail.com"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSendTestEmail}
                                        disabled={isSendingTest || !testEmailAddress}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl h-11 px-6"
                                    >
                                        {isSendingTest ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Send className="w-4 h-4 mr-2" />
                                        )}
                                        Gửi test
                                    </Button>
                                </div>

                                <div className="space-y-3 mt-2">
                                    {/* Outlook / Microsoft 365 */}
                                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-semibold text-blue-800">Outlook / Microsoft 365 (Doanh nghiệp)</h4>
                                                <ul className="text-xs text-blue-700/70 mt-1 space-y-1 list-disc pl-4">
                                                    <li>Host: <code className="bg-blue-100 px-1 rounded">smtp.office365.com</code>, Port: <code className="bg-blue-100 px-1 rounded">587</code></li>
                                                    <li>SSL/TLS: <strong>Tắt</strong> (dùng STARTTLS tự động)</li>
                                                    <li>Username: Email đầy đủ, vd: <code className="bg-blue-100 px-1 rounded">tenban@congty.com</code></li>
                                                    <li>Password: Mật khẩu tài khoản hoặc App Password (nếu bật 2FA)</li>
                                                    <li>Email người gửi: <strong>phải trùng</strong> với SMTP Username</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gmail */}
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-semibold text-emerald-800">Gmail / Google Workspace</h4>
                                                <ul className="text-xs text-emerald-700/70 mt-1 space-y-1 list-disc pl-4">
                                                    <li>Host: <code className="bg-emerald-100 px-1 rounded">smtp.gmail.com</code>, Port: <code className="bg-emerald-100 px-1 rounded">587</code></li>
                                                    <li>Bật xác thực 2 bước trong Google Account</li>
                                                    <li>Tạo App Password: Google Account &rarr; Security &rarr; App passwords</li>
                                                    <li>Dùng App Password làm SMTP Password (không phải mật khẩu tài khoản)</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Zoho */}
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700">Các dịch vụ khác</h4>
                                                <ul className="text-xs text-gray-500 mt-1 space-y-1 list-disc pl-4">
                                                    <li>Zoho Mail: <code className="bg-gray-100 px-1 rounded">smtp.zoho.com</code>, Port 587</li>
                                                    <li>Yahoo: <code className="bg-gray-100 px-1 rounded">smtp.mail.yahoo.com</code>, Port 587</li>
                                                    <li>SendGrid: <code className="bg-gray-100 px-1 rounded">smtp.sendgrid.net</code>, Port 587, Username: <code className="bg-gray-100 px-1 rounded">apikey</code></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== ADVANCED ====== */}
                    {activeSection === "advanced" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={FileText}
                                iconColor="bg-cyan-50 text-cyan-600"
                                title="Phân tích & Tracking"
                                subtitle="Google Analytics, Facebook Pixel"
                            >
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Google Analytics ID (GA4)</Label>
                                        <Input value={form.googleAnalyticsId} onChange={(e) => updateField("googleAnalyticsId", e.target.value)} className="h-11 rounded-xl font-mono" placeholder="G-XXXXXXXXXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Facebook Pixel ID</Label>
                                        <Input value={form.facebookPixelId} onChange={(e) => updateField("facebookPixelId", e.target.value)} className="h-11 rounded-xl font-mono" placeholder="123456789012345" />
                                    </div>
                                </div>
                            </SettingsCard>

                            <SettingsCard
                                icon={Code2}
                                iconColor="bg-orange-50 text-orange-600"
                                title="Code tùy chỉnh"
                                subtitle="Chèn code vào <head> hoặc trước </body>"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Custom Head Code</Label>
                                    <p className="text-[11px] text-gray-400">Được chèn vào thẻ {"<head>"}. Ví dụ: script tracking, font, stylesheet...</p>
                                    <textarea
                                        value={form.customHeadCode}
                                        onChange={(e) => updateField("customHeadCode", e.target.value)}
                                        rows={5}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all bg-gray-50"
                                        placeholder={'<!-- Google Tag Manager -->\n<script>...</script>'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Custom Footer Code</Label>
                                    <p className="text-[11px] text-gray-400">Được chèn trước thẻ {"</body>"}. Ví dụ: chatbot widget, analytics...</p>
                                    <textarea
                                        value={form.customFooterCode}
                                        onChange={(e) => updateField("customFooterCode", e.target.value)}
                                        rows={5}
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all bg-gray-50"
                                        placeholder={'<!-- Zalo Chat Widget -->\n<script>...</script>'}
                                    />
                                </div>

                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-800">Lưu ý bảo mật</h4>
                                            <p className="text-xs text-amber-700/70 mt-1">
                                                Code tùy chỉnh sẽ được render trực tiếp trên tất cả các trang. Đảm bảo code an toàn và không ảnh hưởng đến hiệu suất website.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* ====== SYSTEM ====== */}
                    {activeSection === "system" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <SettingsCard
                                icon={Shield}
                                iconColor="bg-red-50 text-red-500"
                                title="Chế độ hoạt động"
                                subtitle="Bảo trì, đăng ký người dùng"
                            >
                                <ToggleSwitch
                                    label="Chế độ bảo trì"
                                    description="Khi bật, chỉ admin mới có thể truy cập website"
                                    checked={form.maintenanceMode}
                                    onChange={(v) => updateField("maintenanceMode", v)}
                                    icon={Lock}
                                    color="amber"
                                />
                                <ToggleSwitch
                                    label="Cho phép đăng ký"
                                    description="Cho phép người dùng mới đăng ký tài khoản trên hệ thống"
                                    checked={form.registrationEnabled}
                                    onChange={(v) => updateField("registrationEnabled", v)}
                                    icon={Crown}
                                    color="emerald"
                                />
                            </SettingsCard>

                            <SettingsCard
                                icon={Database}
                                iconColor="bg-emerald-50 text-emerald-600"
                                title="Cơ sở dữ liệu"
                                subtitle="Thông tin kết nối MongoDB"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "Database", value: "MongoDB Atlas", icon: Server },
                                        { label: "Trạng thái", value: "Đã kết nối", icon: CheckCircle2 },
                                        { label: "ODM", value: "Mongoose", icon: Database },
                                        { label: "Phiên bản", value: "v8.x", icon: Info },
                                    ].map((item) => (
                                        <div key={item.label} className="p-3 rounded-xl bg-gray-50 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100">
                                                <item.icon className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-gray-400">{item.label}</div>
                                                <div className="text-sm font-medium text-gray-800">{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-emerald-800">Hệ thống hoạt động bình thường</h4>
                                            <p className="text-xs text-emerald-700/70 mt-1">
                                                Tất cả các collections đều được kết nối và sẵn sàng phục vụ.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>

                            <SettingsCard
                                icon={Shield}
                                iconColor="bg-violet-50 text-violet-600"
                                title="Bảo mật"
                                subtitle="Thông tin bảo mật hệ thống"
                            >
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-blue-800">Thông tin bảo mật</h4>
                                            <ul className="text-xs text-blue-700/70 mt-1 space-y-1 list-disc pl-4">
                                                <li>JWT token hết hạn sau 7 ngày</li>
                                                <li>Mật khẩu được mã hóa bằng bcrypt</li>
                                                <li>Xác thực qua Bearer Token hoặc Cookie</li>
                                                <li>Rate limiting: Chống spam API</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>
                        </motion.div>
                    )}

                    {/* Floating Save */}
                    <div className="flex justify-end pt-2 pb-4">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-efb-blue text-white hover:bg-efb-blue/90 rounded-xl h-11 px-8 shadow-sm shadow-efb-blue/20"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Lưu tất cả cài đặt
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
