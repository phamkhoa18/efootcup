"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard, Plus, Trash2, Save, Loader2,
    QrCode, Eye, Upload,
    X, Clock, Wallet, ChevronDown, ChevronUp,
    Info, Settings, Zap, BookOpen, ExternalLink,
    ShieldCheck, Key, Globe, CheckCircle2, AlertTriangle, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { paymentConfigAPI } from "@/lib/api";
import { toast } from "sonner";

const PAYMENT_TYPE_OPTIONS = [
    { value: "bank_transfer", label: "Ngân hàng (Thủ công)", icon: "🏦", color: "from-blue-500 to-indigo-500", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", mode: "manual" },
    { value: "sepay", label: "SePay (Tự động)", icon: "⚡", color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", mode: "auto" },
];

function getTypeConfig(type: string) {
    return PAYMENT_TYPE_OPTIONS.find(t => t.value === type) || PAYMENT_TYPE_OPTIONS[0];
}

export default function AdminPaymentConfigPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [methods, setMethods] = useState<any[]>([]);
    const [globalSettings, setGlobalSettings] = useState({
        autoConfirm: false,
        paymentDeadlineHours: 24,
        paymentNote: "Nội dung chuyển khoản: [TÊN GIẢI] - [TÊN VĐV]",
        refundPolicy: "Không hoàn tiền sau khi giải đấu bắt đầu.",
        callbackBaseUrl: "",
    });
    const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

    useEffect(() => { loadConfig(); }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const res = await paymentConfigAPI.getConfig();
            if (res.success && res.data) {
                setMethods(res.data.methods || []);
                setGlobalSettings({
                    autoConfirm: res.data.autoConfirm || false,
                    paymentDeadlineHours: res.data.paymentDeadlineHours || 24,
                    paymentNote: res.data.paymentNote || "",
                    refundPolicy: res.data.refundPolicy || "",
                    callbackBaseUrl: res.data.callbackBaseUrl || "",
                });
            }
        } catch (err) {
            console.error("Load payment config error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await paymentConfigAPI.updateConfig({
                methods,
                ...globalSettings,
            });
            if (res.success) {
                toast.success("Đã lưu cấu hình thanh toán thành công!");
            } else {
                toast.error(res.message || "Lưu thất bại");
            }
        } catch (err) {
            toast.error("Có lỗi xảy ra khi lưu");
        } finally {
            setIsSaving(false);
        }
    };

    const addMethod = (type: string) => {
        const typeConfig = getTypeConfig(type);
        const newMethod: any = {
            id: `${type}_${Date.now()}`,
            type,
            mode: typeConfig.mode,
            enabled: true,
            name: typeConfig.label,
            accountName: "",
            accountNumber: "",
            bankName: "",
            bankBranch: "",
            bankBin: "",
            qrImage: "",
            instructions: "",
            icon: "",
            sepayMerchantId: "",
            sepaySecretKey: "",
            sepayEnv: "production",
        };
        setMethods([...methods, newMethod]);
        setExpandedMethod(newMethod.id);
    };

    const updateMethod = (id: string, field: string, value: any) => {
        setMethods(methods.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const removeMethod = (id: string) => {
        setMethods(methods.filter(m => m.id !== id));
    };

    const toggleMethodEnabled = (id: string) => {
        setMethods(methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    const handleQRUpload = async (methodId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await paymentConfigAPI.uploadQR(file);
            if (res.success) {
                updateMethod(methodId, "qrImage", res.data.url);
                toast.success("Đã upload ảnh QR thành công");
            } else {
                toast.error(res.message || "Upload thất bại");
            }
        } catch (err) {
            toast.error("Lỗi khi upload ảnh QR");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã copy!");
    };

    const baseUrl = globalSettings.callbackBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const sepayIpnUrl = `${baseUrl}/api/payment/sepay-webhook`;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
                    <span className="text-sm text-gray-400 font-medium">Đang tải cấu hình thanh toán...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-efb-blue to-indigo-600 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        Cấu hình thanh toán
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">Quản lý phương thức thanh toán & cài đặt hệ thống</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-efb-blue hover:bg-efb-blue/90 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-efb-blue/20"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu cấu hình
                </Button>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-efb-blue" />
                        Phương thức thanh toán
                    </h2>
                    <div className="flex gap-2">
                        {PAYMENT_TYPE_OPTIONS.map(opt => (
                            <Button
                                key={opt.value}
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs font-bold"
                                onClick={() => addMethod(opt.value)}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                {opt.icon} {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {methods.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                        <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-400">Chưa có phương thức thanh toán</h3>
                        <p className="text-sm text-gray-400 mt-1">Nhấn nút ở trên để thêm SePay (tự động) hoặc Ngân hàng (thủ công)</p>
                    </div>
                )}

                <AnimatePresence>
                    {methods.map((method, index) => {
                        const typeConfig = getTypeConfig(method.type);
                        const isExpanded = expandedMethod === method.id;

                        return (
                            <motion.div
                                key={method.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className={`rounded-2xl border-2 overflow-hidden transition-all ${method.enabled ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
                                    }`}
                            >
                                {/* Method Header */}
                                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedMethod(isExpanded ? null : method.id)}>
                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-xl shadow-lg`}>
                                        {typeConfig.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{method.name}</span>
                                            <Badge variant={method.mode === "auto" ? "default" : "secondary"} className="text-[10px] font-bold">
                                                {method.mode === "auto" ? "⚡ TỰ ĐỘNG" : "✋ THỦ CÔNG"}
                                            </Badge>
                                            {method.type === "sepay" && (
                                                <Badge className={`text-[10px] font-bold ${(method.sepayEnv || "production") === "production" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                                                    {(method.sepayEnv || "production") === "production" ? "🟢 Production" : "🟡 Sandbox"}
                                                </Badge>
                                            )}
                                            {method.enabled ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 text-[10px] border-emerald-200">Đang bật</Badge>
                                            ) : (
                                                <Badge className="bg-gray-100 text-gray-500 text-[10px]">Đã tắt</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            {method.type === "sepay"
                                                ? (method.sepayMerchantId ? `Merchant: ${method.sepayMerchantId}` : "Chưa cấu hình SePay")
                                                : (method.accountNumber ? `${method.bankName} • ${method.accountNumber}` : "Chưa nhập thông tin")
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleMethodEnabled(method.id); }}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${method.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${method.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); removeMethod(method.id); }} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 space-y-6 border-t border-gray-100 mt-2">
                                                {/* Basic Info */}
                                                <div className="grid grid-cols-2 gap-4 pt-4">
                                                    <div>
                                                        <Label className="text-xs font-bold text-gray-500">Tên hiển thị</Label>
                                                        <Input
                                                            value={method.name}
                                                            onChange={(e) => updateMethod(method.id, "name", e.target.value)}
                                                            placeholder="VD: SePay"
                                                            className="rounded-xl mt-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs font-bold text-gray-500">Hướng dẫn</Label>
                                                        <Input
                                                            value={method.instructions || ""}
                                                            onChange={(e) => updateMethod(method.id, "instructions", e.target.value)}
                                                            placeholder="Hướng dẫn thanh toán..."
                                                            className="rounded-xl mt-1"
                                                        />
                                                    </div>
                                                </div>

                                                {/* SePay Config */}
                                                {method.type === "sepay" && (
                                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <Key className="w-4 h-4 text-emerald-600" />
                                                            <span className="text-sm font-bold text-emerald-800">SePay Configuration</span>
                                                            <a href="https://my.sepay.vn" target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                                                <ExternalLink className="w-3 h-3" /> Quản lý tại my.sepay.vn
                                                            </a>
                                                        </div>

                                                        {/* Bank Info (required for VietQR generation) */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Tên ngân hàng</Label>
                                                                <Input
                                                                    value={method.bankName || ""}
                                                                    onChange={(e) => updateMethod(method.id, "bankName", e.target.value)}
                                                                    placeholder="VD: MB Bank, Vietcombank..."
                                                                    className="rounded-xl mt-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Mã BIN ngân hàng</Label>
                                                                <Input
                                                                    value={method.bankBin || ""}
                                                                    onChange={(e) => updateMethod(method.id, "bankBin", e.target.value)}
                                                                    placeholder="VD: 970422 (MB Bank)"
                                                                    className="rounded-xl mt-1 font-mono text-sm"
                                                                />
                                                                <p className="text-[10px] text-emerald-400 mt-1">
                                                                    Tra mã BIN tại <a href="https://www.vietqr.io/danh-sach-ngan-hang" target="_blank" className="underline">vietqr.io</a>
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Số tài khoản</Label>
                                                                <Input
                                                                    value={method.accountNumber || ""}
                                                                    onChange={(e) => updateMethod(method.id, "accountNumber", e.target.value)}
                                                                    placeholder="VD: 0123456789"
                                                                    className="rounded-xl mt-1 font-mono text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Chủ tài khoản</Label>
                                                                <Input
                                                                    value={method.accountName || ""}
                                                                    onChange={(e) => updateMethod(method.id, "accountName", e.target.value)}
                                                                    placeholder="VD: NGUYEN VAN A"
                                                                    className="rounded-xl mt-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Merchant ID & Secret Key */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Merchant ID</Label>
                                                                <Input
                                                                    value={method.sepayMerchantId || ""}
                                                                    onChange={(e) => updateMethod(method.id, "sepayMerchantId", e.target.value)}
                                                                    placeholder="VD: SP-XXXXXX"
                                                                    className="rounded-xl mt-1 font-mono text-sm"
                                                                />
                                                                <p className="text-[10px] text-emerald-400 mt-1">Merchant ID từ SePay</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-emerald-700">Secret Key</Label>
                                                                <Input
                                                                    value={method.sepaySecretKey || ""}
                                                                    onChange={(e) => updateMethod(method.id, "sepaySecretKey", e.target.value)}
                                                                    placeholder="spsk_..."
                                                                    className="rounded-xl mt-1 font-mono text-sm"
                                                                    type="password"
                                                                />
                                                                <p className="text-[10px] text-emerald-400 mt-1">Dùng để xác thực IPN</p>
                                                            </div>
                                                        </div>

                                                        {/* API Token for fetching transactions */}
                                                        <div>
                                                            <Label className="text-xs font-bold text-emerald-700">API Token (Xem giao dịch)</Label>
                                                            <Input
                                                                value={method.sepayApiToken || ""}
                                                                onChange={(e) => updateMethod(method.id, "sepayApiToken", e.target.value)}
                                                                placeholder="Nhập API Token từ my.sepay.vn"
                                                                className="rounded-xl mt-1 font-mono text-sm"
                                                                type="password"
                                                            />
                                                            <p className="text-[10px] text-emerald-400 mt-1">
                                                                Token này dùng để tải danh sách giao dịch ngân hàng. Lấy từ{' '}
                                                                <a href="https://my.sepay.vn/keys" target="_blank" className="underline">my.sepay.vn → API Keys</a>
                                                            </p>
                                                        </div>

                                                        {/* Environment Selector */}
                                                        <div>
                                                            <Label className="text-xs font-bold text-emerald-700">Môi trường SePay</Label>
                                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateMethod(method.id, "sepayEnv", "production")}
                                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${(method.sepayEnv || "production") === "production"
                                                                        ? "border-emerald-500 bg-emerald-50"
                                                                        : "border-gray-200 bg-white hover:border-emerald-300"}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-3 h-3 rounded-full ${(method.sepayEnv || "production") === "production" ? "bg-emerald-500" : "bg-gray-300"}`} />
                                                                        <span className="text-sm font-bold text-gray-800">Production</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 mt-1 ml-5">Thanh toán thật</p>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateMethod(method.id, "sepayEnv", "sandbox")}
                                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${method.sepayEnv === "sandbox"
                                                                        ? "border-amber-500 bg-amber-50"
                                                                        : "border-gray-200 bg-white hover:border-amber-300"}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-3 h-3 rounded-full ${method.sepayEnv === "sandbox" ? "bg-amber-500" : "bg-gray-300"}`} />
                                                                        <span className="text-sm font-bold text-gray-800">Sandbox</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 mt-1 ml-5">Test, không mất tiền</p>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* IPN URL */}
                                                        <div className="p-3 rounded-xl bg-white/60 border border-emerald-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Label className="text-xs font-bold text-emerald-700">IPN URL (đặt trong Cổng thanh toán → Cấu hình → IPN)</Label>
                                                                <button onClick={() => copyToClipboard(sepayIpnUrl)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                                                                    <Copy className="w-3 h-3" /> Copy
                                                                </button>
                                                            </div>
                                                            <code className="block text-xs text-emerald-800 font-mono bg-emerald-100/50 px-3 py-2 rounded-lg break-all">
                                                                {sepayIpnUrl}
                                                            </code>
                                                        </div>

                                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                                <div className="text-xs text-amber-700">
                                                                    <p className="font-bold">Hướng dẫn cấu hình SePay Payment Gateway:</p>
                                                                    <ol className="list-decimal list-inside mt-1 space-y-0.5">
                                                                        <li>Đăng nhập <a href="https://my.sepay.vn" target="_blank" className="underline">my.sepay.vn</a></li>
                                                                        <li>Vào <strong>Cổng thanh toán</strong> → <strong>Phương thức thanh toán</strong></li>
                                                                        <li>Kích hoạt &quot;Quét mã QR chuyển khoản ngân hàng&quot;</li>
                                                                        <li>Sao chép <strong>Merchant ID</strong> và <strong>Secret Key</strong> vào ô trên</li>
                                                                        <li>Vào <strong>Cổng thanh toán</strong> → <strong>Cấu hình</strong> → <strong>IPN</strong></li>
                                                                        <li>Dán URL IPN ở trên vào và lưu lại</li>
                                                                    </ol>
                                                                    <p className="mt-2 text-amber-600 font-medium">
                                                                        💡 SePay sẽ gửi IPN khi có giao dịch thanh toán thành công. User sẽ được redirect đến trang thanh toán SePay.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bank Transfer Info */}
                                                {method.type === "bank_transfer" && (
                                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🏦</span>
                                                            <span className="text-sm font-bold text-blue-800">Thông tin ngân hàng</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label className="text-xs font-bold text-blue-700">Tên ngân hàng</Label>
                                                                <Input
                                                                    value={method.bankName || ""}
                                                                    onChange={(e) => updateMethod(method.id, "bankName", e.target.value)}
                                                                    placeholder="VD: Vietcombank, MB Bank..."
                                                                    className="rounded-xl mt-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-blue-700">Chi nhánh</Label>
                                                                <Input
                                                                    value={method.bankBranch || ""}
                                                                    onChange={(e) => updateMethod(method.id, "bankBranch", e.target.value)}
                                                                    placeholder="VD: TP.HCM"
                                                                    className="rounded-xl mt-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-blue-700">Số tài khoản</Label>
                                                                <Input
                                                                    value={method.accountNumber || ""}
                                                                    onChange={(e) => updateMethod(method.id, "accountNumber", e.target.value)}
                                                                    placeholder="VD: 1234567890"
                                                                    className="rounded-xl mt-1 font-mono"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold text-blue-700">Chủ tài khoản</Label>
                                                                <Input
                                                                    value={method.accountName || ""}
                                                                    onChange={(e) => updateMethod(method.id, "accountName", e.target.value)}
                                                                    placeholder="VD: NGUYEN VAN A"
                                                                    className="rounded-xl mt-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* QR Image */}
                                                        <div>
                                                            <Label className="text-xs font-bold text-blue-700 mb-2 block">Ảnh QR (tùy chọn)</Label>
                                                            <div className="flex items-center gap-4">
                                                                {method.qrImage && (
                                                                    <div className="relative group">
                                                                        <img src={method.qrImage} alt="QR" className="w-20 h-20 object-contain rounded-xl border border-blue-200" />
                                                                        <button
                                                                            onClick={() => updateMethod(method.id, "qrImage", "")}
                                                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <label className="cursor-pointer">
                                                                    <div className="px-4 py-2 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-300 text-xs text-blue-600 font-bold flex items-center gap-2 transition-colors">
                                                                        <Upload className="w-3.5 h-3.5" />
                                                                        {method.qrImage ? "Đổi ảnh QR" : "Upload ảnh QR"}
                                                                    </div>
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQRUpload(method.id, e)} />
                                                                </label>
                                                            </div>
                                                            <p className="text-[10px] text-blue-400 mt-1">Hệ thống sẽ tự tạo QR VietQR nếu bạn không upload</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Global Settings */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-900">Cài đặt chung</span>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-bold text-gray-500">Thời hạn thanh toán (giờ)</Label>
                            <Input
                                type="number"
                                value={globalSettings.paymentDeadlineHours}
                                onChange={(e) => setGlobalSettings({ ...globalSettings, paymentDeadlineHours: parseInt(e.target.value) || 24 })}
                                className="rounded-xl mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-gray-500">Callback Base URL</Label>
                            <Input
                                value={globalSettings.callbackBaseUrl}
                                onChange={(e) => setGlobalSettings({ ...globalSettings, callbackBaseUrl: e.target.value })}
                                placeholder="https://yourdomain.com"
                                className="rounded-xl mt-1"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Để trống = dùng URL hiện tại</p>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-gray-500">Mẫu nội dung chuyển khoản</Label>
                        <Input
                            value={globalSettings.paymentNote}
                            onChange={(e) => setGlobalSettings({ ...globalSettings, paymentNote: e.target.value })}
                            placeholder="[TÊN GIẢI] - [TÊN VĐV]"
                            className="rounded-xl mt-1"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Dùng [TÊN GIẢI] và [TÊN VĐV] làm placeholder</p>
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-gray-500">Chính sách hoàn tiền</Label>
                        <Input
                            value={globalSettings.refundPolicy}
                            onChange={(e) => setGlobalSettings({ ...globalSettings, refundPolicy: e.target.value })}
                            placeholder="Chính sách hoàn tiền..."
                            className="rounded-xl mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom save button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-efb-blue hover:bg-efb-blue/90 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-efb-blue/20"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu cấu hình
                </Button>
            </div>
        </div>
    );
}
