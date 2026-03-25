"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
    Plus, UserCheck, Search, Download, Loader2, Check, X,
    Users, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus, Upload,
    CreditCard, Eye, Banknote, ImageIcon, DollarSign, AlertTriangle,
    Phone, Mail, Facebook, ExternalLink, MapPin, Calendar as CalendarIcon, Gamepad2, User,
    FileSpreadsheet, Hash, Shield, Sparkles, Trophy,
    Trash2, Edit3, MoreVertical, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, Camera, ChevronsUpDown, MapPinned,
    ArrowDownToLine, Wallet, Receipt, LinkIcon, BadgeCheck, CircleDollarSign, ShieldCheck
} from "lucide-react";
import { tournamentAPI, tournamentPaymentAPI } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    unpaid: { label: "Chưa thanh toán", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle },
    pending_verification: { label: "Chờ xác nhận", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
    paid: { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 },
    refunded: { label: "Đã hoàn tiền", color: "bg-blue-50 text-blue-600 border-blue-100", icon: CreditCard },
};

export default function DangKyPage() {
    const params = useParams();
    const id = params.id as string;

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [tournament, setTournament] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filter, setFilter] = useState("all");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [perPage, setPerPage] = useState(20);
    const [serverStats, setServerStats] = useState<any>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<"manual" | "excel">("manual");
    const [isAutoFormat, setIsAutoFormat] = useState(true);
    const [manualRows, setManualRows] = useState([
        { teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }
    ]);

    // Payment proof viewer
    const [paymentProofView, setPaymentProofView] = useState<string | null>(null);
    const [paymentDetailView, setPaymentDetailView] = useState<any>(null);
    const [playerDetailView, setPlayerDetailView] = useState<any>(null);

    // Edit/Delete modals
    const [editStatusReg, setEditStatusReg] = useState<any>(null);
    const [editPaymentReg, setEditPaymentReg] = useState<any>(null);
    const [deleteConfirmReg, setDeleteConfirmReg] = useState<any>(null);
    const [actionMenuReg, setActionMenuReg] = useState<{ id: string; reg: any; rect: DOMRect } | null>(null);

    // Edit registration info
    const [editInfoReg, setEditInfoReg] = useState<any>(null);
    const [editInfoData, setEditInfoData] = useState<any>({});
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [editUploadingPersonal, setEditUploadingPersonal] = useState(false);
    const [editUploadingLineup, setEditUploadingLineup] = useState(false);
    const [editProvinceOpen, setEditProvinceOpen] = useState(false);
    const [vnProvinces, setVnProvinces] = useState<{ name: string; code: number }[]>([]);

    // SePay transactions
    const [isSepayDialogOpen, setIsSepayDialogOpen] = useState(false);
    const [sepayTransactions, setSepayTransactions] = useState<any[]>([]);
    const [isLoadingSepay, setIsLoadingSepay] = useState(false);
    const [sepayError, setSepayError] = useState<string | null>(null);
    const [sepayTab, setSepayTab] = useState<"issues" | "all">("issues");
    const [sepayConfirmTx, setSepayConfirmTx] = useState<any>(null);
    const [isProcessingSepay, setIsProcessingSepay] = useState<string | null>(null);
    const [sepayPage, setSepayPage] = useState(1);
    const [sepayDateFrom, setSepayDateFrom] = useState('');
    const [sepayDateTo, setSepayDateTo] = useState('');
    const SEPAY_PER_PAGE = 10;

    /* ---- Client-side image compressor (canvas-based, no deps) ---- */
    const compressImage = (file: File, maxDim = 1280, quality = 0.7): Promise<File> =>
        new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality,
                );
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });

    const handleUploadEditImage = async (file: File, field: 'personalPhoto' | 'teamLineupPhoto') => {
        const setter = field === 'personalPhoto' ? setEditUploadingPersonal : setEditUploadingLineup;
        setter(true);
        try {
            let toUpload: File = file;
            if (file.type.startsWith('image/') || /\.(jpe?g|jfif|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i.test(file.name)) {
                toUpload = await compressImage(file);
            }
            const formData = new FormData();
            formData.append('file', toUpload);
            formData.append('type', 'registration');
            const headers: Record<string, string> = {};
            const savedToken = localStorage.getItem('efootcup_token');
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;

            let lastError = '';
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const res = await fetch('/api/upload', { method: 'POST', headers, body: formData });
                    if (res.ok) {
                        const data = await res.json();
                        const url = data.data?.url || data.url;
                        if (url) {
                            setEditInfoData((prev: any) => ({ ...prev, [field]: url }));
                            toast.success('Tải ảnh thành công!');
                            return;
                        }
                        lastError = data.message || 'Không nhận được URL';
                        break;
                    }
                    lastError = `HTTP ${res.status}`;
                    if (res.status === 401) { toast.error('Phiên đăng nhập hết hạn'); return; }
                    if (![403, 408, 429, 500, 502, 503, 504].includes(res.status)) break;
                } catch { lastError = 'Lỗi mạng'; }
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
            }
            toast.error(`Tải ảnh thất bại: ${lastError}`);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Có lỗi khi tải ảnh lên');
        } finally {
            setter(false);
        }
    };

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset to page 1 when search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filter]);

    // Load registrations when page/search/filter/perPage changes
    useEffect(() => {
        loadRegistrations();
    }, [id, currentPage, debouncedSearch, filter, perPage]);

    useEffect(() => {
        loadTournament();
    }, [id]);

    const loadTournament = async () => {
        try {
            const res = await tournamentAPI.getById(id);
            if (res.success) {
                setTournament(res.data?.tournament || res.data);
            }
        } catch (e) {
            console.error("Load tournament error:", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const xlsx = await import("xlsx");
            const reader = new FileReader();

            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = xlsx.read(bstr, { type: "binary" });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = xlsx.utils.sheet_to_json(ws);

                    if (data.length === 0) {
                        toast.error("File excel trống");
                        setIsUploading(false);
                        return;
                    }

                    const formattedData = data.map((row: any) => {
                        if (isAutoFormat) {
                            if (row['Tên Đội Trưởng']) row['Tên Đội Trưởng'] = autoFormatName(row['Tên Đội Trưởng']);
                            if (row['Tên VĐV 1']) row['Tên VĐV 1'] = autoFormatName(row['Tên VĐV 1']);
                            if (row['VĐV 1']) row['VĐV 1'] = autoFormatName(row['VĐV 1']);
                            if (row['playerName']) row['playerName'] = autoFormatName(row['playerName']);
                        }
                        return row;
                    });

                    const res = await tournamentAPI.importRegistrations(id, formattedData);
                    if (res.success) {
                        toast.success(res.message || `Đã import thành công`);
                        loadRegistrations();
                        setIsAddModalOpen(false);
                    } else {
                        toast.error(res.message || "Import thất bại");
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("Lỗi khi đọc file");
                } finally {
                    setIsUploading(false);
                    e.target.value = "";
                }
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi import file");
            setIsUploading(false);
        }
    };

    const autoFormatName = (name: string) => {
        if (!name) return "";
        return name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
    };

    const handleAddManualRows = (count: number) => {
        const newRows = Array(count).fill(null).map(() => ({ teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }));
        setManualRows([...manualRows, ...newRows]);
    };

    const handleSaveManual = async () => {
        const validRows = manualRows.filter(r => r.playerName.trim().length >= 2);
        if (validRows.length === 0) {
            return toast.error("Vui lòng nhập tên VĐV hợp lệ (tối thiểu 2 ký tự)");
        }

        setIsUploading(true);
        const data = validRows.map(r => ({
            teamName: r.teamName.trim() || r.playerName.trim(),
            teamShortName: r.teamShortName.trim() || (r.teamName.trim() || r.playerName.trim()).substring(0, 3).toUpperCase(),
            playerName: isAutoFormat ? autoFormatName(r.playerName.trim()) : r.playerName.trim(),
            gamerId: r.gamerId.trim() || "TBD",
            phone: r.phone.trim() || "000",
            email: r.email.trim() || "noemail@vntournament.com",
            nickname: r.nickname.trim() || "",
        }));

        try {
            const res = await tournamentAPI.importRegistrations(id, data);
            if (res.success) {
                toast.success(res.message || "Đã thêm thành công");
                loadRegistrations();
                setIsAddModalOpen(false);
                setManualRows([{ teamName: "", teamShortName: "", playerName: "", gamerId: "", phone: "", email: "", nickname: "" }]);
            } else {
                toast.error(res.message || "Thêm thất bại");
            }
        } catch (err) {
            console.error(err);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsUploading(false);
        }
    };

    const loadRegistrations = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(currentPage),
                limit: String(perPage),
            };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (filter !== "all") params.status = filter;

            const res = await tournamentAPI.getRegistrations(id, params);
            if (res.success) {
                setRegistrations(res.data?.registrations || res.data || []);
                if (res.data?.pagination) {
                    setTotalPages(res.data.pagination.totalPages);
                    setTotalItems(res.data.pagination.total);
                }
                if (res.data?.stats) {
                    setServerStats(res.data.stats);
                }
            }
        } catch (e) {
            console.error("Load registrations error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (regId: string, action: "approve" | "reject") => {
        setProcessing(regId);
        try {
            const res = await tournamentAPI.handleRegistration(id, {
                registrationId: regId,
                action,
            });
            if (res.success) {
                toast.success(action === "approve" ? "Đã duyệt đăng ký" : "Đã từ chối đăng ký");
                setRegistrations((prev) =>
                    prev.map((r) =>
                        r._id === regId
                            ? { ...r, status: action === "approve" ? "approved" : "rejected" }
                            : r
                    )
                );
            } else {
                toast.error(res.message || "Thao tác thất bại");
            }
        } catch (e) {
            console.error("Handle registration error:", e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    // Payment actions
    const handleConfirmPayment = async (regId: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentPaymentAPI.confirmPayment(id, regId);
            if (res.success) {
                toast.success("✅ Đã xác nhận thanh toán");
                setRegistrations(prev =>
                    prev.map(r => r._id === regId ? { ...r, paymentStatus: "paid" } : r)
                );
            } else {
                toast.error(res.message || "Xác nhận thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectPayment = async (regId: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentPaymentAPI.rejectPayment(id, regId);
            if (res.success) {
                toast.success("Đã từ chối thanh toán");
                setRegistrations(prev =>
                    prev.map(r => r._id === regId ? { ...r, paymentStatus: "unpaid", paymentProof: "" } : r)
                );
            } else {
                toast.error(res.message || "Thao tác thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    const hasFee = tournament?.entryFee > 0;

    // Manager: Update registration status
    const handleUpdateStatus = async (regId: string, newStatus: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentAPI.updateRegistrationStatus(id, regId, newStatus);
            if (res.success) {
                toast.success(res.message || "Đã cập nhật trạng thái");
                loadRegistrations();
                setEditStatusReg(null);
            } else {
                toast.error(res.message || "Cập nhật thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    // Manager: Update payment status
    const handleUpdatePayment = async (regId: string, newPaymentStatus: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentAPI.updatePaymentStatus(id, regId, newPaymentStatus);
            if (res.success) {
                toast.success(res.message || "Đã cập nhật thanh toán");
                loadRegistrations();
                setEditPaymentReg(null);
            } else {
                toast.error(res.message || "Cập nhật thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    // Manager: Force-delete registration
    const handleDeleteRegistration = async (regId: string) => {
        setProcessing(regId);
        try {
            const res = await tournamentAPI.deleteRegistration(id, regId);
            if (res.success) {
                toast.success(res.message || "Đã xóa đăng ký");
                setRegistrations(prev => prev.filter(r => r._id !== regId));
                setDeleteConfirmReg(null);
            } else {
                toast.error(res.message || "Xóa thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setProcessing(null);
        }
    };

    // Manager: Open edit info dialog
    const handleOpenEditInfo = (reg: any) => {
        setEditInfoData({
            playerName: reg.playerName || "",
            teamName: reg.teamName || "",
            teamShortName: reg.teamShortName || "",
            gamerId: reg.gamerId || "",
            phone: reg.phone || "",
            email: reg.email || "",
            nickname: reg.nickname || "",
            facebookName: reg.facebookName || "",
            facebookLink: reg.facebookLink || "",
            province: reg.province || "",
            dateOfBirth: reg.dateOfBirth || "",
            notes: reg.notes || "",
            personalPhoto: reg.personalPhoto || "",
            teamLineupPhoto: reg.teamLineupPhoto || "",
        });
        setEditUploadingPersonal(false);
        setEditUploadingLineup(false);
        setEditInfoReg(reg);
    };

    // Manager: Save edited info
    const handleSaveEditInfo = async () => {
        if (!editInfoReg) return;
        if (!editInfoData.playerName?.trim()) {
            return toast.error("Tên VĐV không được để trống");
        }
        setIsSavingInfo(true);
        try {
            const res = await tournamentAPI.handleRegistration(id, {
                registrationId: editInfoReg._id,
                action: "update_info",
                ...editInfoData,
            });
            if (res.success) {
                toast.success("Đã cập nhật thông tin đăng ký");
                // Update local state
                setRegistrations(prev => prev.map(r =>
                    r._id === editInfoReg._id ? { ...r, ...editInfoData } : r
                ));
                setEditInfoReg(null);
            } else {
                toast.error(res.message || "Cập nhật thất bại");
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleExportExcel = async () => {
        toast.info("Đang tải dữ liệu xuất Excel...");
        let allRegs = registrations;
        try {
            const res = await tournamentAPI.getRegistrations(id);
            if (res.success) allRegs = res.data?.registrations || res.data || [];
        } catch {}
        if (allRegs.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        const data = allRegs.map((r: any, idx: number) => {
            // Parse paymentNote JSON to extract payment details
            let noteData: any = {};
            try {
                noteData = JSON.parse(r.paymentNote || "{}");
            } catch {
                // Not JSON — use raw string
            }

            const row: Record<string, any> = {
                "STT": idx + 1,
                "EFV-ID": r.user?.efvId != null ? r.user.efvId : "",
                "Tên VĐV": r.playerName || "",
                "Nickname": r.nickname || "",
                "ID Game": r.gamerId || "",
                "Tên đội": r.teamName || "",
                "Viết tắt": r.teamShortName || "",
                "Số điện thoại": r.phone || "",
                "Email": r.email || "",
                "Ngày sinh": r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString('vi-VN') : "",
                "Tỉnh/TP": r.province || "",
                "Facebook": r.facebookName || "",
                "Link Facebook": r.facebookLink || "",
                "Ảnh cá nhân": r.personalPhoto ? `${window.location.origin}${r.personalPhoto}` : "",
                "Ảnh đội hình": r.teamLineupPhoto ? `${window.location.origin}${r.teamLineupPhoto}` : "",
                "Ghi chú": r.notes || "",
                "Trạng thái": r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : r.status === 'cancelled' ? 'Đã hủy' : 'Chờ duyệt',
                // === THANH TOÁN ===
                "Thanh toán": r.paymentStatus === 'paid' ? 'Đã thanh toán' : r.paymentStatus === 'pending_verification' ? 'Chờ xác nhận' : r.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán',
                "Số tiền (VNĐ)": r.paymentAmount || 0,
                "Phương thức TT": r.paymentMethod || "",
                "Ngày TT": r.paymentDate ? new Date(r.paymentDate).toLocaleString('vi-VN') : "",
                "Xác nhận TT lúc": (r.paymentConfirmedAt && r.paymentStatus === 'paid') ? new Date(r.paymentConfirmedAt).toLocaleString('vi-VN') : "",
                // === THÔNG TIN THANH TOÁN (ĐỐI CHIẾU) ===
                "Mã hóa đơn (EFCUP)": noteData.invoiceNumber || "",
                "Mã PAY (SePay)": noteData.bankPayCode || noteData.orderCode || "",
                "SePay Transaction ID": noteData.transactionId || noteData.bankTransactionId || "",
                "SePay Order ID": noteData.sepayOrderId || "",
                "Mã GD Ngân hàng": noteData.bankDetails?.referenceCode || noteData.referenceCode || "",
                "Thời gian GD": noteData.transactionDate || noteData.bankTransactionDate || "",
                "Nguồn xác nhận": noteData.confirmedByIPN ? "PG IPN (tự động)" : noteData.confirmedByWebhook ? "Bank Webhook (tự động)" : noteData.confirmedByVerify ? "Verify (thủ công)" : noteData.source || "",
                "Ngân hàng": noteData.bankDetails?.gateway || noteData.bankGateway || noteData.gateway || "",
                "Nội dung CK": noteData.bankDetails?.content || noteData.bankContent || noteData.content || "",
                "Cảnh báo số tiền": noteData.amountMismatch ? `⚠️ Nhận ${noteData.receivedAmount}, cần ${noteData.expectedAmount}` : "",
                // === KHÁC ===
                "Minh chứng TT": r.paymentProof ? `${window.location.origin}${r.paymentProof}` : "",
                "Duyệt bởi": r.approvedBy?.name || "",
                "Duyệt lúc": r.approvedAt ? new Date(r.approvedAt).toLocaleString('vi-VN') : "",
                "Lý do từ chối": r.rejectionReason || "",
                "Ngày đăng ký": r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : "",
            };
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-width columns
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(
                key.length + 2,
                ...data.map(row => String(row[key] || "").length)
            )
        }));
        ws["!cols"] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách đăng ký");

        const fileName = `DangKy_${tournament?.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'GiaiDau'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất toàn bộ ${data.length} bản đăng ký ra Excel`);
    };

    // =============================================
    // SePay Transactions
    // =============================================
    const loadSepayTransactions = async (fromDate?: string, toDate?: string) => {
        setIsLoadingSepay(true);
        setSepayError(null);
        try {
            const headers: Record<string, string> = {};
            const token = localStorage.getItem("efootcup_token");
            if (token) headers.Authorization = `Bearer ${token}`;

            const params = new URLSearchParams();
            const fd = fromDate ?? sepayDateFrom;
            const td = toDate ?? sepayDateTo;
            if (fd) params.set("from_date", fd);
            if (td) params.set("to_date", td);

            const qs = params.toString() ? `?${params.toString()}` : "";
            const res = await fetch(`/api/tournaments/${id}/sepay-transactions${qs}`, { headers });
            const json = await res.json();

            if (json.success) {
                setSepayTransactions(json.data?.transactions || []);
                toast.success(`Loaded ${json.data?.transactions?.length || 0} transactions`);
            } else {
                setSepayError(json.message || "Error loading transactions");
                toast.error(json.message || "Error loading SePay transactions");
            }
        } catch (err) {
            console.error(err);
            setSepayError("Connection error with SePay API");
            toast.error("Error loading transactions");
        } finally {
            setIsLoadingSepay(false);
        }
    };

    const handleExportSepayTransactions = () => {
        if (sepayTransactions.length === 0) {
            toast.error("Không có giao dịch để xuất");
            return;
        }

        const data = sepayTransactions.map((tx: any, idx: number) => ({
            "STT": idx + 1,
            "ID GD SePay": tx.id || "",
            "Ngày GD": tx.transactionDate || "",
            "Số tiền vào (VNĐ)": tx.amountIn || 0,
            "Số tiền ra (VNĐ)": tx.amountOut || 0,
            "Nội dung CK": tx.content || "",
            "Mã thanh toán": tx.code || "",
            "Mã tham chiếu": tx.referenceNumber || "",
            "Ngân hàng": tx.bankBrandName || "",
            "Số tài khoản": tx.accountNumber || "",
            "Tài khoản ảo": tx.subAccount || "",
            "Lũy kế (VNĐ)": tx.accumulated || "",
            // Matched registration info
            "Khớp VĐV": tx.registration?.playerName || "❌ Không khớp",
            "Khớp Đội": tx.registration?.teamName || "",
            "EFV-ID": tx.registration?.efvId != null ? `#${tx.registration.efvId}` : "",
            "Trạng thái ĐK": tx.registration?.status === 'approved' ? 'Đã duyệt' : tx.registration?.status === 'rejected' ? 'Từ chối' : tx.registration?.status || "",
            "Trạng thái TT": tx.registration?.paymentStatus === 'paid' ? 'Đã TT' : tx.registration?.paymentStatus === 'pending_verification' ? 'Chờ xác nhận' : tx.registration?.paymentStatus || "",
            "Invoice Number": tx.registration?.invoiceNumber || "",
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(key.length + 2, ...data.map(row => String((row as any)[key] || "").length))
        }));
        ws["!cols"] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Giao dịch SePay");

        const fileName = `GD_SePay_${tournament?.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'GiaiDau'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất ${data.length} giao dịch SePay ra Excel`);
    };

    // Batch verify all unpaid SePay registrations via SePay PG SDK
    const [isVerifyingAll, setIsVerifyingAll] = useState(false);
    const handleBatchVerifySepay = async () => {
        setIsVerifyingAll(true);
        try {
            const res = await fetch(`/api/tournaments/${id}/verify-all-payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                toast.success(`Đã kiểm tra ${d.total} đăng ký: ${d.verified} xác nhận TT, ${d.notPaid} chưa TT, ${d.errors} lỗi`);
                if (d.verified > 0) {
                    // Refresh data
                    loadRegistrations();
                    loadSepayTransactions();
                }
            } else {
                toast.error(json.message || "Lỗi khi đồng bộ");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsVerifyingAll(false);
        }
    };

    // Quick approve: Confirm payment + Approve registration from SePay dialog
    const handleSepayQuickApprove = async (tx: any) => {
        if (!tx?.registration?._id) return;
        const regId = tx.registration._id;
        setIsProcessingSepay(regId);
        try {
            // Step 1: Confirm payment
            const payRes = await tournamentPaymentAPI.confirmPayment(id, regId);
            if (!payRes.success) {
                toast.error(payRes.message || "Xác nhận thanh toán thất bại");
                setIsProcessingSepay(null);
                return;
            }

            // Step 2: Approve registration (if still pending)
            if (tx.registration.status !== "approved") {
                const approveRes = await tournamentAPI.handleRegistration(id, {
                    registrationId: regId,
                    action: "approve",
                });
                if (!approveRes.success) {
                    toast.error(approveRes.message || "Duyệt đăng ký thất bại (thanh toán đã xác nhận)");
                    setIsProcessingSepay(null);
                    return;
                }
            }

            toast.success(`✅ Đã xác nhận thanh toán & duyệt VĐV "${tx.registration.playerName}"`);

            // Update local SePay transaction state
            setSepayTransactions(prev => prev.map(t =>
                t.id === tx.id ? {
                    ...t,
                    registration: { ...t.registration, paymentStatus: "paid", status: "approved" }
                } : t
            ));

            // Update registration list too
            setRegistrations(prev => prev.map(r =>
                r._id === regId ? { ...r, paymentStatus: "paid", status: "approved" } : r
            ));

            setSepayConfirmTx(null);
        } catch (err) {
            console.error("Quick approve error:", err);
            toast.error("Có lỗi xảy ra khi xử lý");
        } finally {
            setIsProcessingSepay(null);
        }
    };

    // Quick confirm payment only (no approve)
    const handleSepayConfirmPaymentOnly = async (tx: any) => {
        if (!tx?.registration?._id) return;
        const regId = tx.registration._id;
        setIsProcessingSepay(regId);
        try {
            const payRes = await tournamentPaymentAPI.confirmPayment(id, regId);
            if (payRes.success) {
                toast.success(`✅ Đã xác nhận thanh toán cho "${tx.registration.playerName}"`);
                setSepayTransactions(prev => prev.map(t =>
                    t.id === tx.id ? {
                        ...t,
                        registration: { ...t.registration, paymentStatus: "paid" }
                    } : t
                ));
                setRegistrations(prev => prev.map(r =>
                    r._id === regId ? { ...r, paymentStatus: "paid" } : r
                ));
                setSepayConfirmTx(null);
            } else {
                toast.error(payRes.message || "Xác nhận thanh toán thất bại");
            }
        } catch (err) {
            console.error(err);
            toast.error("Có lỗi xảy ra");
        } finally {
            setIsProcessingSepay(null);
        }
    };

    const handleExportPlayerList = async () => {
        toast.info("Đang tải dữ liệu xuất danh sách VĐV...");
        let allRegs = registrations;
        try {
            const res = await tournamentAPI.getRegistrations(id);
            if (res.success) allRegs = res.data?.registrations || res.data || [];
        } catch {}
        if (allRegs.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        // Only export approved registrations for the player list
        const approvedRegs = allRegs.filter((r: any) => r.status === "approved");
        if (approvedRegs.length === 0) {
            toast.error("Chưa có VĐV nào được duyệt");
            return;
        }

        // Fetch EFV point data if tournament has awarded points
        let efvMap = new Map<string, { placement: string; points: number }>();
        const isAwarded = tournament?.efvPointsAwarded === true;

        if (isAwarded) {
            try {
                const headers: Record<string, string> = {};
                const token = localStorage.getItem("efootcup_token");
                if (token) headers.Authorization = `Bearer ${token}`;

                const res = await fetch(`/api/tournaments/${id}/award-efv-points`, { headers });
                if (res.ok) {
                    const json = await res.json();
                    const logs = json.data?.logs || [];
                    for (const log of logs) {
                        efvMap.set(log.userId, {
                            placement: log.placement,
                            points: log.points,
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to fetch EFV points:", e);
            }
        }

        // Placement labels for display
        const placementLabels: Record<string, string> = {
            champion: "🥇 Vô địch",
            runner_up: "🥈 Á quân",
            top_4: "🏅 TOP 4",
            top_8: "TOP 8",
            top_16: "TOP 16",
            top_32: "TOP 32",
            participant: "Tham gia",
        };

        const data = approvedRegs.map((r: any, idx: number) => {
            const userId = r.user?._id?.toString?.() || r.user?.toString?.() || "";
            const efvData = efvMap.get(userId);

            const row: Record<string, any> = {
                "STT": idx + 1,
                "EFV-ID": r.user?.efvId != null ? r.user.efvId : "",
                "Tên VĐV": r.playerName || "",
                "Nickname": r.nickname || "",
                "ID Game": r.gamerId || "",
                "Tên đội": r.teamName || "",
                "Viết tắt": r.teamShortName || "",
                "Số điện thoại": r.phone || "",
                "Email": r.email || "",
                "Ngày sinh": r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString('vi-VN') : "",
                "Tỉnh/TP": r.province || "",
                "Facebook": r.facebookName || "",
                "Link Facebook": r.facebookLink || "",
                "Ghi chú": r.notes || "",
                "Ngày đăng ký": r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : "",
            };

            // Add EFV columns if tournament has awarded points
            if (isAwarded) {
                row["Xếp hạng"] = efvData ? (placementLabels[efvData.placement] || efvData.placement) : "";
                row["Điểm EFV"] = efvData ? efvData.points : "";
            }

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-width columns
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(
                key.length + 2,
                ...data.map(row => String(row[key] || "").length)
            )
        }));
        ws["!cols"] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách VĐV");

        const fileName = `DS_VDV_${tournament?.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'GiaiDau'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất danh sách ${data.length} VĐV ra Excel${isAwarded ? " (kèm điểm EFV)" : ""}`);
    };

    // Data is already filtered server-side via pagination API
    const filtered = registrations;

    const counts = serverStats || {
        total: registrations.length,
        pending: registrations.filter((r) => r.status === "pending").length,
        approved: registrations.filter((r) => r.status === "approved").length,
        rejected: registrations.filter((r) => r.status === "rejected").length,
        paid: registrations.filter((r) => r.paymentStatus === "paid").length,
        pendingPayment: registrations.filter((r) => r.paymentStatus === "pending_verification").length,
    };

    // Build page numbers for pagination UI
    const paginationPages = useMemo(() => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    }, [currentPage, totalPages]);

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);

    return (
        <div className="space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Trophy className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-bold text-efb-dark tracking-tight">Đăng ký thi đấu</h1>
                            <p className="text-sm text-efb-text-muted mt-0.5">
                                Quản lý danh sách đăng ký tham gia giải đấu
                                {hasFee && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Lệ phí: {tournament?.entryFee?.toLocaleString("vi-VN")} {tournament?.currency || "VNĐ"}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="default"
                        size="sm"
                        className="rounded-xl h-9 text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Thêm VĐV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={handleExportPlayerList}
                        disabled={registrations.length === 0}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Danh sách VĐV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={handleExportExcel}
                        disabled={registrations.length === 0}
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
                    </Button>
                    {hasFee && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-9 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                            onClick={() => {
                                setIsSepayDialogOpen(true);
                                if (sepayTransactions.length === 0) loadSepayTransactions();
                            }}
                        >
                            <Wallet className="w-3.5 h-3.5 mr-1.5" /> Giao dịch SePay
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs border-gray-200 hover:bg-gray-50" onClick={loadRegistrations}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className={`grid ${hasFee ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"} gap-3`}>
                {[
                    { label: "Tổng đăng ký", value: counts.total, icon: Users, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "Chờ duyệt", value: counts.pending, icon: Clock, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "Đã duyệt", value: counts.approved, icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-600" },
                    { label: "Đã từ chối", value: counts.rejected, icon: XCircle, gradient: "from-red-500 to-red-600", bg: "bg-red-50", text: "text-red-600" },
                    ...(hasFee ? [
                        { label: "Đã thanh toán", value: counts.paid, icon: CreditCard, gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50", text: "text-teal-600" },
                        { label: "Chờ xác nhận TT", value: counts.pendingPayment, icon: Banknote, gradient: "from-orange-500 to-orange-600", bg: "bg-orange-50", text: "text-orange-600" },
                    ] : []),
                ].map((s, idx) => (
                    <Card key={s.label} className="py-0 border-gray-100/80 hover:shadow-md transition-all duration-300 group cursor-default overflow-hidden">
                        <CardContent className="p-4 px-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                                    <s.icon className="w-4 h-4 text-white" />
                                </div>
                                <div className={`text-2xl font-extrabold ${s.text} tracking-tight tabular-nums`}>{s.value}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Payment Warning Banner */}
            {hasFee && counts.pendingPayment > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-800">
                            Có {counts.pendingPayment} đăng ký chờ xác nhận thanh toán
                        </h4>
                        <p className="text-xs text-amber-600/80 mt-0.5">
                            Vui lòng kiểm tra minh chứng thanh toán và xác nhận để VĐV có thể được duyệt vào giải
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm VĐV theo EFV ID, tên, SĐT, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                    />
                </div>
                <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto min-w-0">
                    <TabsList className="h-auto sm:h-10 rounded-xl bg-gray-100/80 p-1 gap-0.5 w-full sm:w-auto flex flex-wrap sm:flex-nowrap">
                        <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-3 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">{"Tất cả"}</TabsTrigger>
                        <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold px-2.5 sm:px-3 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">{"Chờ duyệt"}</TabsTrigger>
                        <TabsTrigger value="approved" className="rounded-lg text-xs font-semibold px-2.5 sm:px-3 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">{"Đã duyệt"}</TabsTrigger>
                        <TabsTrigger value="rejected" className="rounded-lg text-xs font-semibold px-2.5 sm:px-3 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm">{"Từ chối"}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Đang tải dữ liệu...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Users className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700">Chưa có đăng ký nào</h3>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">Đăng ký sẽ hiển thị khi có người đăng ký tham gia giải đấu</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-slate-50/50">
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-amber-500 uppercase tracking-widest">EFV ID</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nhân sự / CLB</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">In-game ID</th>
                                    <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Ngày ĐK</th>
                                    {hasFee && (
                                        <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <span className="flex items-center justify-center gap-1">
                                                <CreditCard className="w-3 h-3" />
                                                Thanh toán
                                            </span>
                                        </th>
                                    )}
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                                    <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const payConfig = paymentStatusConfig[r.paymentStatus] || paymentStatusConfig.unpaid;
                                    const PayIcon = payConfig.icon;
                                    const rowNumber = (currentPage - 1) * perPage + i + 1;

                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            key={r._id || i}
                                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-4 text-sm text-gray-400 font-medium">{rowNumber}</td>
                                            <td className="px-4 py-4">
                                                {r.user?.efvId != null ? (
                                                    <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md tabular-nums">#{r.user.efvId}</span>
                                                ) : (
                                                    <span className="text-[11px] text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {r.playerName || r.teamName || r.name || "—"}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-efb-blue">{r.teamName || "Tự do"}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                            <span>{r.phone || r.email || ""}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setPlayerDetailView(r)}
                                                        className="ml-1 w-7 h-7 rounded-lg bg-blue-50 text-efb-blue hover:bg-efb-blue hover:text-white flex items-center justify-center transition-all flex-shrink-0"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell font-medium">{r.gamerId || r.ingameId || "—"}</td>
                                            <td className="px-4 py-4 text-sm text-gray-400 hidden lg:table-cell">
                                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"}
                                            </td>
                                            {hasFee && (
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={`${payConfig.color} font-medium text-[10px] inline-flex items-center gap-1`}
                                                        >
                                                            <PayIcon className="w-3 h-3" />
                                                            {payConfig.label}
                                                        </Badge>
                                                        {/* Payment proof button */}
                                                        {r.paymentProof && (
                                                            <button
                                                                onClick={() => setPaymentDetailView(r)}
                                                                className="text-[10px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors"
                                                            >
                                                                <Eye className="w-3 h-3" /> Xem minh chứng
                                                            </button>
                                                        )}
                                                        {/* Payment actions for pending_verification */}
                                                        {r.paymentStatus === "pending_verification" && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <button
                                                                    onClick={() => handleConfirmPayment(r._id)}
                                                                    disabled={processing === r._id}
                                                                    className="px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-0.5"
                                                                >
                                                                    <Check className="w-3 h-3" /> Xác nhận
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectPayment(r._id)}
                                                                    disabled={processing === r._id}
                                                                    className="px-2 py-1 rounded-md bg-red-50 text-red-500 text-[10px] font-bold hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-0.5"
                                                                >
                                                                    <X className="w-3 h-3" /> Từ chối
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        r.status === "approved"
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-medium"
                                                            : r.status === "rejected"
                                                                ? "bg-red-50 text-red-500 border-red-100 font-medium"
                                                                : "bg-amber-50 text-amber-600 border-amber-100 font-medium"
                                                    }
                                                >
                                                    {r.status === "approved" ? "Đã xác nhận" : r.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {r.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(r._id, "approve")}
                                                                disabled={processing === r._id || (hasFee && r.paymentStatus !== "paid")}
                                                                className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm"
                                                                title={hasFee && r.paymentStatus !== "paid" ? "Phải xác nhận thanh toán trước" : "Duyệt"}
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(r._id, "reject")}
                                                                disabled={processing === r._id}
                                                                className="w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm"
                                                                title="Từ chối"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* More actions button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const btn = e.currentTarget;
                                                            const rect = btn.getBoundingClientRect();
                                                            setActionMenuReg(actionMenuReg?.id === r._id ? null : { id: r._id, reg: r, rect });
                                                        }}
                                                        className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-all duration-200"
                                                        title="Thêm thao tác"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ===== Premium Pagination Bar ===== */}
                    {totalPages > 0 && (
                        <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50/30 via-white to-gray-50/30 px-3 sm:px-5 py-3 sm:py-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                {/* Info + Per page selector */}
                                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 w-full sm:w-auto justify-between sm:justify-start">
                                    <span className="font-medium whitespace-nowrap">
                                        <span className="hidden sm:inline">Hiển thị </span>
                                        <span className="font-bold text-gray-700">{startItem}–{endItem}</span>
                                        <span className="hidden sm:inline"> trong </span>
                                        <span className="sm:hidden"> / </span>
                                        <span className="font-bold text-blue-600">{totalItems}</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-400 hidden sm:inline">|</span>
                                        <select
                                            value={perPage}
                                            onChange={(e) => {
                                                setPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer hover:border-gray-300 transition-colors appearance-none pr-5 sm:pr-6"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                                        >
                                            {[10, 20, 50, 100].map(n => (
                                                <option key={n} value={n}>{n}/trang</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Page buttons */}
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                    {/* First page */}
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                        title="Trang đầu"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                                    </button>
                                    {/* Prev */}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 border border-transparent hover:border-blue-100"
                                        title="Trang trước"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {/* Page numbers */}
                                    {paginationPages.map((p, idx) => (
                                        p === 'ellipsis' ? (
                                            <span key={`e${idx}`} className="w-6 sm:w-8 h-8 flex items-center justify-center text-gray-300 text-xs select-none">•••</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p as number)}
                                                className={`min-w-[32px] sm:min-w-[36px] h-8 sm:h-9 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                                                    currentPage === p
                                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105'
                                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent hover:border-gray-200'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}

                                    {/* Next */}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 border border-transparent hover:border-blue-100"
                                        title="Trang sau"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    {/* Last page */}
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                        title="Trang cuối"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Fixed-position Action Menu (rendered outside table to avoid overflow clipping) */}
            <AnimatePresence>
                {actionMenuReg && (() => {
                    const { reg: menuReg, rect: btnRect } = actionMenuReg;
                    // Position the menu to the left of the button, below it
                    const menuTop = btnRect.bottom + 4;
                    const menuRight = window.innerWidth - btnRect.right;
                    return (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setActionMenuReg(null)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                                style={{ top: menuTop, right: menuRight }}
                                className="fixed z-[101] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
                            >
                                <button
                                    onClick={() => { handleOpenEditInfo(menuReg); setActionMenuReg(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 transition-colors"
                                >
                                    <User className="w-3.5 h-3.5" /> Sửa thông tin VĐV
                                </button>
                                <button
                                    onClick={() => { setEditStatusReg(menuReg); setActionMenuReg(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Sửa trạng thái
                                </button>
                                {hasFee && (
                                    <button
                                        onClick={() => { setEditPaymentReg(menuReg); setActionMenuReg(null); }}
                                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-amber-50 text-gray-700 hover:text-amber-600 transition-colors"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" /> Sửa thanh toán
                                    </button>
                                )}
                                <div className="border-t border-gray-100" />
                                <button
                                    onClick={() => { setDeleteConfirmReg(menuReg); setActionMenuReg(null); }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Xóa đăng ký
                                </button>
                            </motion.div>
                        </>
                    );
                })()}
            </AnimatePresence>

            {/* Payment Detail Modal */}
            <Dialog open={!!paymentDetailView} onOpenChange={(open) => !open && setPaymentDetailView(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-xl p-0 overflow-hidden max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100">
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-efb-blue" />
                            Chi tiết thanh toán
                        </DialogTitle>
                    </div>
                    {paymentDetailView && (() => {
                        // Parse paymentNote JSON for payment details
                        let noteData: any = {};
                        try {
                            noteData = JSON.parse(paymentDetailView.paymentNote || "{}");
                        } catch {
                            // Not JSON
                        }
                        return (
                            <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                                {/* Player Info */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                    <div className="w-10 h-10 rounded-lg bg-efb-blue/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-efb-blue" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{paymentDetailView.playerName}</div>
                                        <div className="text-xs text-gray-400">{paymentDetailView.teamName}</div>
                                    </div>
                                </div>

                                {/* Amount Mismatch Warning */}
                                {noteData.amountMismatch && (
                                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
                                        <AlertTriangle className="w-4.5 h-4.5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs font-bold text-red-700">Số tiền không khớp!</div>
                                            <div className="text-[11px] text-red-600 mt-0.5">
                                                Nhận: {noteData.receivedAmount?.toLocaleString("vi-VN")}đ — Lệ phí: {noteData.expectedAmount?.toLocaleString("vi-VN")}đ
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái</div>
                                        <Badge
                                            variant="outline"
                                            className={`mt-1.5 ${paymentStatusConfig[paymentDetailView.paymentStatus]?.color || ""}`}
                                        >
                                            {paymentStatusConfig[paymentDetailView.paymentStatus]?.label || "N/A"}
                                        </Badge>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phương thức</div>
                                        <div className="text-sm font-medium text-gray-800 mt-1.5 capitalize">{paymentDetailView.paymentMethod || "N/A"}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gray-50">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số tiền</div>
                                        <div className="text-sm font-bold text-gray-900 mt-1.5">
                                            {(paymentDetailView.paymentAmount || 0)?.toLocaleString("vi-VN")} VNĐ
                                        </div>
                                    </div>
                                    {paymentDetailView.paymentDate && (
                                        <div className="p-3 rounded-xl bg-gray-50">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày thanh toán</div>
                                            <div className="text-sm font-medium text-gray-800 mt-1.5">
                                                {new Date(paymentDetailView.paymentDate).toLocaleString("vi-VN")}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Transaction Details */}
                                {(paymentDetailView.paymentMethod === "sepay" || paymentDetailView.paymentMethod === "payos") && (noteData.invoiceNumber || noteData.bankPayCode || noteData.transactionId) && (
                                    <div>
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <Shield className="w-3 h-3" />
                                            Thông tin giao dịch (đối chiếu)
                                        </div>
                                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 overflow-hidden">
                                            {noteData.invoiceNumber && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Mã hóa đơn (EFCUP)</span>
                                                    <span className="text-[12px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{noteData.invoiceNumber}</span>
                                                </div>
                                            )}
                                            {(noteData.bankPayCode || noteData.orderCode) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Mã PAY (SePay)</span>
                                                    <span className="text-[12px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{noteData.bankPayCode || noteData.orderCode}</span>
                                                </div>
                                            )}
                                            {(noteData.transactionId || noteData.bankTransactionId) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">SePay Transaction ID</span>
                                                    <span className="text-[11px] font-mono text-gray-700">{noteData.transactionId || noteData.bankTransactionId}</span>
                                                </div>
                                            )}
                                            {noteData.sepayOrderId && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">SePay Order ID</span>
                                                    <span className="text-[11px] font-mono text-gray-700">{noteData.sepayOrderId}</span>
                                                </div>
                                            )}
                                            {(noteData.bankDetails?.referenceCode || noteData.referenceCode) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Mã GD ngân hàng</span>
                                                    <span className="text-[12px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{noteData.bankDetails?.referenceCode || noteData.referenceCode}</span>
                                                </div>
                                            )}
                                            {(noteData.transactionDate || noteData.bankTransactionDate) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Thời gian GD</span>
                                                    <span className="text-[11px] text-gray-700">{noteData.transactionDate || noteData.bankTransactionDate}</span>
                                                </div>
                                            )}
                                            {(noteData.bankDetails?.gateway || noteData.bankGateway || noteData.gateway) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Ngân hàng</span>
                                                    <span className="text-[11px] font-medium text-gray-800">{noteData.bankDetails?.gateway || noteData.bankGateway || noteData.gateway}</span>
                                                </div>
                                            )}
                                            {(noteData.bankDetails?.content || noteData.bankContent || noteData.content) && (
                                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100/50">
                                                    <span className="text-[11px] text-gray-500">Nội dung CK</span>
                                                    <span className="text-[11px] text-gray-700 truncate max-w-[200px]">{noteData.bankDetails?.content || noteData.bankContent || noteData.content}</span>
                                                </div>
                                            )}
                                            <div className="px-4 py-2.5 flex items-center justify-between">
                                                <span className="text-[11px] text-gray-500">Nguồn xác nhận</span>
                                                <Badge variant="outline" className={`text-[10px] ${(noteData.confirmedByIPN || noteData.confirmedByWebhook) ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                    {noteData.confirmedByIPN ? "PG IPN (tự động)" : noteData.confirmedByWebhook ? "Bank Webhook (tự động)" : noteData.confirmedByVerify ? "Verify (kiểm tra)" : noteData.source || "Chưa xác nhận"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Proof Image */}
                                {paymentDetailView.paymentProof && (
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Minh chứng thanh toán</div>
                                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                            <img
                                                src={paymentDetailView.paymentProof}
                                                alt="Payment proof"
                                                className="w-full max-h-[400px] object-contain cursor-pointer"
                                                onClick={() => window.open(paymentDetailView.paymentProof, "_blank")}
                                            />
                                        </div>
                                        <button
                                            onClick={() => window.open(paymentDetailView.paymentProof, "_blank")}
                                            className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 mt-2 transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Xem ảnh gốc
                                        </button>
                                    </div>
                                )}

                                {/* Actions */}
                                {paymentDetailView.paymentStatus === "pending_verification" && (
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={() => {
                                                handleConfirmPayment(paymentDetailView._id);
                                                setPaymentDetailView(null);
                                            }}
                                            className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl h-11 font-bold"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Xác nhận thanh toán
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                handleRejectPayment(paymentDetailView._id);
                                                setPaymentDetailView(null);
                                            }}
                                            className="flex-1 rounded-xl h-11 font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Từ chối
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Player Detail Modal */}
            <Dialog open={!!playerDetailView} onOpenChange={(open) => !open && setPlayerDetailView(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh]">
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100/80">
                        <DialogTitle className="text-base font-medium text-gray-900 tracking-tight">Chi tiết đăng ký</DialogTitle>
                    </div>
                    {playerDetailView && (
                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 72px)' }}>
                            {/* Profile Header */}
                            <div className="px-6 py-5 flex items-center gap-4">
                                {playerDetailView.personalPhoto ? (
                                    <img
                                        src={playerDetailView.personalPhoto}
                                        alt="Ảnh cá nhân"
                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 cursor-pointer hover:ring-efb-blue/30 transition-all"
                                        onClick={() => window.open(playerDetailView.personalPhoto, '_blank')}
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-300" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-gray-900 tracking-tight">{playerDetailView.playerName || '—'}</h3>
                                    <p className="text-[13px] text-gray-500 font-light">{playerDetailView.teamName} {playerDetailView.teamShortName ? `· ${playerDetailView.teamShortName}` : ''}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-normal ${playerDetailView.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : playerDetailView.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200'
                                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                                }`}
                                        >
                                            {playerDetailView.status === 'approved' ? 'Đã duyệt' : playerDetailView.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                        </Badge>
                                        {playerDetailView.user?.efvId != null && (
                                            <span className="text-[10px] font-mono text-gray-400">#{playerDetailView.user.efvId}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Rows — clean Apple list style */}
                            <div className="border-t border-gray-100/80">
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">ID Game</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.gamerId || '—'}</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Nickname</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.nickname || '—'}</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Tên Team</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.teamName || '—'}</span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Số điện thoại</span>
                                    <a href={`tel:${playerDetailView.phone}`} className="text-[13px] text-efb-blue font-normal">{playerDetailView.phone || '—'}</a>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Email</span>
                                    <a href={`mailto:${playerDetailView.email}`} className="text-[13px] text-efb-blue font-normal truncate max-w-[220px]">{playerDetailView.email || '—'}</a>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Ngày sinh</span>
                                    <span className="text-[13px] text-gray-900 font-normal">
                                        {playerDetailView.dateOfBirth ? new Date(playerDetailView.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                                    </span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[13px] text-gray-400 font-light">Tỉnh / Thành phố</span>
                                    <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.province || '—'}</span>
                                </div>
                                {playerDetailView.facebookName && (
                                    <div className="px-6 py-3 flex items-center justify-between border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light">Facebook</span>
                                        <span className="text-[13px] text-gray-900 font-normal">{playerDetailView.facebookName}</span>
                                    </div>
                                )}
                                {playerDetailView.facebookLink && (
                                    <div className="px-6 py-3 border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light block mb-1">Link Facebook</span>
                                        <a href={playerDetailView.facebookLink} target="_blank" rel="noopener noreferrer" className="text-[12px] text-efb-blue hover:underline break-all flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" /> {playerDetailView.facebookLink}
                                        </a>
                                    </div>
                                )}
                                {playerDetailView.notes && (
                                    <div className="px-6 py-3 border-b border-gray-50">
                                        <span className="text-[13px] text-gray-400 font-light block mb-1">Ghi chú</span>
                                        <p className="text-[13px] text-gray-700 font-light">{playerDetailView.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Photos section */}
                            {(playerDetailView.teamLineupPhoto || playerDetailView.personalPhoto) && (
                                <div className="px-6 py-4 border-t border-gray-100/80">
                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-3">Hình ảnh</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {playerDetailView.personalPhoto && (
                                            <div>
                                                <p className="text-[11px] text-gray-400 font-light mb-1.5">Ảnh cá nhân</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                                                    <img
                                                        src={playerDetailView.personalPhoto}
                                                        alt="Ảnh cá nhân"
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => window.open(playerDetailView.personalPhoto, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {playerDetailView.teamLineupPhoto && (
                                            <div>
                                                <p className="text-[11px] text-gray-400 font-light mb-1.5">Đội hình thi đấu</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                                                    <img
                                                        src={playerDetailView.teamLineupPhoto}
                                                        alt="Đội hình"
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => window.open(playerDetailView.teamLineupPhoto, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Section */}
                            {hasFee && (
                                <div className="px-6 py-4 border-t border-gray-100/80">
                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-3">Thanh toán</p>
                                    <div className="space-y-0">
                                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                            <span className="text-[13px] text-gray-400 font-light">Trạng thái</span>
                                            <Badge variant="outline" className={`${paymentStatusConfig[playerDetailView.paymentStatus]?.color || ''} text-[10px] font-normal`}>
                                                {paymentStatusConfig[playerDetailView.paymentStatus]?.label || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                            <span className="text-[13px] text-gray-400 font-light">Số tiền</span>
                                            <span className="text-[13px] text-gray-900 font-medium">{(playerDetailView.paymentAmount || tournament?.entryFee || 0)?.toLocaleString('vi-VN')} VNĐ</span>
                                        </div>
                                        {playerDetailView.paymentMethod && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Phương thức</span>
                                                <span className="text-[13px] text-gray-900 font-normal capitalize">{playerDetailView.paymentMethod}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentDate && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Ngày TT</span>
                                                <span className="text-[13px] text-gray-900 font-normal">{new Date(playerDetailView.paymentDate).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentConfirmedAt && playerDetailView.paymentStatus === 'paid' && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                                <span className="text-[13px] text-gray-400 font-light">Xác nhận lúc</span>
                                                <span className="text-[13px] text-gray-900 font-normal">{new Date(playerDetailView.paymentConfirmedAt).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {playerDetailView.paymentProof && (
                                            <div className="pt-3">
                                                <p className="text-[11px] text-gray-400 font-light mb-2">Minh chứng thanh toán</p>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                                    <img
                                                        src={playerDetailView.paymentProof}
                                                        alt="Minh chứng TT"
                                                        className="w-full max-h-[240px] object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                                                        onClick={() => window.open(playerDetailView.paymentProof, '_blank')}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Meta info */}
                            <div className="px-6 py-3 border-t border-gray-100/80 flex items-center justify-between">
                                <span className="text-[11px] text-gray-300 font-light">Đăng ký lúc</span>
                                <span className="text-[11px] text-gray-400 font-light">{playerDetailView.createdAt ? new Date(playerDetailView.createdAt).toLocaleString('vi-VN') : '—'}</span>
                            </div>
                            {playerDetailView.approvedAt && (
                                <div className="px-6 py-2 pb-3 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-300 font-light">Duyệt lúc</span>
                                    <span className="text-[11px] text-gray-400 font-light">{new Date(playerDetailView.approvedAt).toLocaleString('vi-VN')}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="px-6 pb-5 pt-2 space-y-2">
                                {playerDetailView.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => {
                                                handleAction(playerDetailView._id, 'approve');
                                                setPlayerDetailView(null);
                                            }}
                                            disabled={hasFee && playerDetailView.paymentStatus !== 'paid'}
                                            className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-xl h-10 font-normal text-[13px]"
                                        >
                                            Duyệt VĐV
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                handleAction(playerDetailView._id, 'reject');
                                                setPlayerDetailView(null);
                                            }}
                                            className="flex-1 rounded-xl h-10 font-normal text-[13px] text-red-500 border-gray-200 hover:bg-red-50 hover:border-red-200"
                                        >
                                            Từ chối
                                        </Button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-xl h-9 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                        onClick={() => { handleOpenEditInfo(playerDetailView); setPlayerDetailView(null); }}
                                    >
                                        <User className="w-3.5 h-3.5 mr-1.5" /> Sửa thông tin
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-xl h-9 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => { setEditStatusReg(playerDetailView); setPlayerDetailView(null); }}
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Sửa trạng thái
                                    </Button>
                                    {hasFee && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 rounded-xl h-9 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                            onClick={() => { setEditPaymentReg(playerDetailView); setPlayerDetailView(null); }}
                                        >
                                            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Sửa thanh toán
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-9 text-xs text-red-500 border-red-200 hover:bg-red-50"
                                        onClick={() => { setDeleteConfirmReg(playerDetailView); setPlayerDetailView(null); }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Thêm VĐV */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full bg-white border-0 shadow-2xl p-0 gap-0 rounded-2xl overflow-hidden">
                    {/* Modal Header with gradient */}
                    <div className="p-5 px-6 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/50">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">Thêm VĐV</DialogTitle>
                            <p className="text-xs text-gray-400 mt-0.5">Thêm vận động viên mới vào giải đấu</p>
                        </div>
                    </div>

                    <div className="px-6 py-5 pb-2">
                        {/* Tabs using shadcn */}
                        <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "manual" | "excel")} className="w-full">
                            <TabsList className="w-full h-11 rounded-xl bg-gray-100/70 p-1 mb-6">
                                <TabsTrigger
                                    value="manual"
                                    className="flex-1 rounded-lg text-sm font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Nhập thủ công
                                </TabsTrigger>
                                <TabsTrigger
                                    value="excel"
                                    className="flex-1 rounded-lg text-sm font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Tải lên Excel
                                </TabsTrigger>
                            </TabsList>

                            {/* Manual Tab */}
                            <TabsContent value="manual" className="mt-0">
                                <div className="space-y-4">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <div className="min-w-[800px]">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-[40px_minmax(100px,1fr)_60px_minmax(120px,1.2fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(90px,1fr)] gap-2 items-center mb-3 px-2">
                                                <Label className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest justify-center">
                                                    <Hash className="w-3 h-3" />
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Shield className="w-3 h-3 mr-1" /> Tên đội
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Viết tắt
                                                </Label>
                                                <Label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                                    <User className="w-3 h-3 mr-1" /> Tên VĐV *
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    ID Game
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Phone className="w-3 h-3 mr-1" /> SĐT
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Email
                                                </Label>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Nickname
                                                </Label>
                                            </div>

                                            <Separator className="mb-3" />

                                            {/* Scrollable Rows */}
                                            <ScrollArea className="max-h-[40vh]">
                                                <div className="space-y-2.5 px-2 pb-2">
                                                    {manualRows.map((row, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.03 }}
                                                            className="grid grid-cols-[40px_minmax(100px,1fr)_60px_minmax(120px,1.2fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(120px,1fr)_minmax(90px,1fr)] gap-2 items-center group/row"
                                                        >
                                                            <div className="text-xs font-bold text-gray-300 text-center tabular-nums group-hover/row:text-blue-400 transition-colors">{index + 1}</div>
                                                            <Input
                                                                value={row.teamName}
                                                                placeholder="Tên đội"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].teamName = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.teamShortName}
                                                                placeholder="VT"
                                                                maxLength={4}
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].teamShortName = e.target.value.toUpperCase(); setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all text-center uppercase placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.playerName}
                                                                placeholder="Họ tên VĐV *"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].playerName = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-blue-200 bg-blue-50/30 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-blue-300 font-medium"
                                                            />
                                                            <Input
                                                                value={row.gamerId}
                                                                placeholder="In-game ID"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].gamerId = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.phone}
                                                                placeholder="0912..."
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].phone = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.email}
                                                                placeholder="email@..."
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].email = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                            <Input
                                                                value={row.nickname}
                                                                placeholder="Nickname"
                                                                onChange={(e) => { const newRows = [...manualRows]; newRows[index].nickname = e.target.value; setManualRows(newRows); }}
                                                                className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 transition-all placeholder:text-gray-300"
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 px-2">
                                        <Button
                                            onClick={() => handleAddManualRows(1)}
                                            variant="outline"
                                            className="h-10 px-5 rounded-xl text-sm border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-600 font-medium transition-all duration-200"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Thêm 1 VĐV
                                        </Button>
                                        <Button
                                            onClick={() => handleAddManualRows(10)}
                                            variant="outline"
                                            className="h-10 px-5 rounded-xl text-sm border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 font-medium transition-all duration-200"
                                        >
                                            <Users className="w-4 h-4 mr-2" /> Tạo nhanh 10 đội
                                        </Button>
                                    </div>

                                    {/* Info Notes */}
                                    <div className="px-2 pb-3">
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-blue-600/80 space-y-0.5">
                                                <p><span className="font-bold">Tên VĐV</span> là bắt buộc (tối thiểu 2 ký tự). Các trường khác để trống sẽ sử dụng giá trị mặc định.</p>
                                                <p>Tên đội trống → auto lấy tên VĐV. Viết tắt trống → auto lấy 3 ký tự đầu.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Excel Tab */}
                            <TabsContent value="excel" className="mt-0">
                                <div className="space-y-5">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="hidden"
                                        id="excelUploadModal"
                                        onChange={handleFileUpload}
                                    />

                                    {/* Upload Zone */}
                                    <div
                                        className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-10 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 group"
                                        onClick={() => document.getElementById("excelUploadModal")?.click()}
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700">Kéo và thả file Excel vào đây</p>
                                        <p className="text-xs text-gray-400 mt-1">hoặc <span className="text-blue-500 font-medium">nhấp để chọn file</span> (.xlsx, .xls)</p>
                                    </div>

                                    <Separator />

                                    {/* Auto Format Switch */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={isAutoFormat}
                                                onCheckedChange={setIsAutoFormat}
                                            />
                                            <div>
                                                <Label className="text-sm font-semibold text-gray-800 cursor-pointer">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
                                                    Tự động định dạng tên
                                                </Label>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Vd: NGUYỄN văn A {'=> '} Nguyễn Văn A
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://vntournament.com/assets/excel/example.xlsx"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors px-4 py-2 rounded-xl hover:bg-blue-50 border border-blue-100"
                                        >
                                            <Download className="w-4 h-4" /> Tải file mẫu
                                        </a>
                                    </div>

                                    {/* Notes Card */}
                                    <Card className="py-0 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                <Label className="text-sm font-bold text-amber-700">Lưu ý quan trọng</Label>
                                            </div>
                                            <ul className="space-y-2 text-sm text-gray-600">
                                                {[
                                                    <>Tối đa <span className="font-bold text-red-500">128</span> đội cho nội dung này</>,
                                                    <>Số hạt giống tối đa = <span className="font-bold">1/4</span> tổng số đội</>,
                                                    <>Cột &quot;VĐV 1&quot; <span className="text-red-500 font-medium">tối thiểu 2 ký tự</span></>,
                                                    <>SĐT chỉ gồm số (0-9), không gồm ký tự đặc biệt</>,
                                                    <>Cột &quot;Hạt giống&quot; phải là số nguyên dương</>,
                                                    <>Dòng <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-[10px] mx-0.5">màu đỏ</Badge> = dữ liệu không hợp lệ</>,
                                                ].map((note, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                                        <span>{note}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 px-6 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-slate-50/50 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-6 rounded-xl font-semibold border-gray-200 text-gray-600 hover:bg-gray-100 transition-all"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={addMode === "manual" ? handleSaveManual : () => document.getElementById("excelUploadModal")?.click()}
                            disabled={isUploading}
                            className="h-10 px-8 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            {addMode === "manual" ? "Lưu danh sách" : "Tải lên"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Edit Registration Status Modal */}
            <Dialog open={!!editStatusReg} onOpenChange={(open) => !open && setEditStatusReg(null)}>
                <DialogContent className="max-w-sm bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-white">
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-blue-500" /> Sửa trạng thái đăng ký
                        </DialogTitle>
                        {editStatusReg && (
                            <p className="text-xs text-gray-400 mt-1">
                                {editStatusReg.playerName} — Hiện tại: <span className="font-bold">{editStatusReg.status === 'approved' ? 'Đã duyệt' : editStatusReg.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</span>
                            </p>
                        )}
                    </div>
                    {editStatusReg && (
                        <div className="p-5 space-y-2.5">
                            {editStatusReg.status === "approved" && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Lưu ý khi thay đổi từ "Đã duyệt"</p>
                                        <p className="mt-0.5">Team sẽ bị xóa và số đội trong giải sẽ giảm đi 1.</p>
                                    </div>
                                </div>
                            )}
                            {[
                                { status: "pending", label: "Chờ duyệt", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100", icon: Clock },
                                { status: "approved", label: "Đã duyệt", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", icon: CheckCircle2 },
                                { status: "rejected", label: "Từ chối", color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100", icon: XCircle },
                            ].filter(s => s.status !== editStatusReg.status).map(s => (
                                <button
                                    key={s.status}
                                    onClick={() => handleUpdateStatus(editStatusReg._id, s.status)}
                                    disabled={processing === editStatusReg._id}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${s.color}`}
                                >
                                    <s.icon className="w-4 h-4" />
                                    Chuyển sang: {s.label}
                                    {processing === editStatusReg._id && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                                </button>
                            ))}
                            <Button variant="outline" className="w-full mt-2 rounded-xl h-10 text-sm" onClick={() => setEditStatusReg(null)}>Hủy</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Payment Status Modal */}
            <Dialog open={!!editPaymentReg} onOpenChange={(open) => !open && setEditPaymentReg(null)}>
                <DialogContent className="max-w-sm bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-amber-50/50 to-white">
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-amber-500" /> Sửa trạng thái thanh toán
                        </DialogTitle>
                        {editPaymentReg && (
                            <p className="text-xs text-gray-400 mt-1">
                                {editPaymentReg.playerName} — Hiện tại: <span className="font-bold">{paymentStatusConfig[editPaymentReg.paymentStatus]?.label || 'N/A'}</span>
                            </p>
                        )}
                    </div>
                    {editPaymentReg && (
                        <div className="p-5 space-y-2.5">
                            {editPaymentReg.paymentStatus === "paid" && editPaymentReg.status === "approved" && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Cảnh báo quan trọng!</p>
                                        <p className="mt-0.5">VĐV đã được duyệt. Nếu đổi thanh toán sang "Chưa TT" hoặc "Hoàn tiền", hệ thống sẽ <b>tự động hủy duyệt</b>, xóa team và giảm số đội.</p>
                                    </div>
                                </div>
                            )}
                            {[
                                { status: "unpaid", label: "Chưa thanh toán", color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100", icon: AlertCircle },
                                { status: "pending_verification", label: "Chờ xác nhận", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100", icon: Clock },
                                { status: "paid", label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", icon: CheckCircle2 },
                                { status: "refunded", label: "Đã hoàn tiền", color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100", icon: RotateCcw },
                            ].filter(s => s.status !== editPaymentReg.paymentStatus).map(s => (
                                <button
                                    key={s.status}
                                    onClick={() => handleUpdatePayment(editPaymentReg._id, s.status)}
                                    disabled={processing === editPaymentReg._id}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${s.color}`}
                                >
                                    <s.icon className="w-4 h-4" />
                                    Chuyển sang: {s.label}
                                    {processing === editPaymentReg._id && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                                </button>
                            ))}
                            <Button variant="outline" className="w-full mt-2 rounded-xl h-10 text-sm" onClick={() => setEditPaymentReg(null)}>Hủy</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirmReg} onOpenChange={(open) => !open && setDeleteConfirmReg(null)}>
                <DialogContent className="max-w-sm bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-red-50/50 to-white">
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-500" /> Xóa đăng ký
                        </DialogTitle>
                    </div>
                    {deleteConfirmReg && (
                        <div className="p-5 space-y-4">
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                <p className="text-sm text-red-700 font-medium">
                                    Bạn có chắc chắn muốn xóa đăng ký của <span className="font-bold">{deleteConfirmReg.playerName}</span>?
                                </p>
                                {deleteConfirmReg.status === "approved" && (
                                    <p className="text-xs text-red-600 mt-2 flex items-start gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        VĐV đã được duyệt — Team sẽ bị xóa và số đội trong giải sẽ giảm đi 1.
                                    </p>
                                )}
                                {deleteConfirmReg.paymentStatus === "paid" && (
                                    <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5">
                                        <CreditCard className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        VĐV đã thanh toán — Hãy đảm bảo đã hoàn tiền trước khi xóa.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-10 text-sm"
                                    onClick={() => setDeleteConfirmReg(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={() => handleDeleteRegistration(deleteConfirmReg._id)}
                                    disabled={processing === deleteConfirmReg._id}
                                    className="flex-1 rounded-xl h-10 text-sm bg-red-500 text-white hover:bg-red-600 font-bold"
                                >
                                    {processing === deleteConfirmReg._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Xác nhận xóa
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Registration Info Modal */}
            <Dialog open={!!editInfoReg} onOpenChange={(open) => !open && setEditInfoReg(null)}>
                <DialogContent className="max-w-lg bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh]">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-emerald-50/50 to-white">
                        <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" /> Sửa thông tin đăng ký
                        </DialogTitle>
                        {editInfoReg && (
                            <p className="text-xs text-gray-400 mt-1">
                                Chỉnh sửa thông tin của <span className="font-bold text-gray-600">{editInfoReg.playerName}</span>
                            </p>
                        )}
                    </div>
                    {editInfoReg && (
                        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            {/* Player Name */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên VĐV *</Label>
                                <Input
                                    value={editInfoData.playerName}
                                    onChange={(e) => setEditInfoData({ ...editInfoData, playerName: e.target.value })}
                                    placeholder="Họ và tên"
                                    className="h-10 rounded-xl text-sm border-gray-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                                />
                            </div>

                            {/* Team Info */}
                            <div className="grid grid-cols-[1fr_80px] gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên đội</Label>
                                    <Input
                                        value={editInfoData.teamName}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, teamName: e.target.value })}
                                        placeholder="Tên đội"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Viết tắt</Label>
                                    <Input
                                        value={editInfoData.teamShortName}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, teamShortName: e.target.value.toUpperCase() })}
                                        placeholder="VT"
                                        maxLength={4}
                                        className="h-10 rounded-xl text-sm text-center uppercase"
                                    />
                                </div>
                            </div>

                            {/* Game Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Game</Label>
                                    <Input
                                        value={editInfoData.gamerId}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, gamerId: e.target.value })}
                                        placeholder="In-game ID"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nickname</Label>
                                    <Input
                                        value={editInfoData.nickname}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, nickname: e.target.value })}
                                        placeholder="Nickname in-game"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Số điện thoại
                                    </Label>
                                    <Input
                                        value={editInfoData.phone}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, phone: e.target.value })}
                                        placeholder="0912..."
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Email
                                    </Label>
                                    <Input
                                        value={editInfoData.email}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, email: e.target.value })}
                                        placeholder="email@..."
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Facebook */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Facebook className="w-3 h-3" /> Tên Facebook
                                    </Label>
                                    <Input
                                        value={editInfoData.facebookName}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, facebookName: e.target.value })}
                                        placeholder="Tên Facebook"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Link Facebook</Label>
                                    <Input
                                        value={editInfoData.facebookLink}
                                        onChange={(e) => setEditInfoData({ ...editInfoData, facebookLink: e.target.value })}
                                        placeholder="https://facebook.com/..."
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Location & DOB */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <MapPinned className="w-3 h-3" /> Tỉnh / TP
                                    </Label>
                                    <Popover open={editProvinceOpen} onOpenChange={(open) => { setEditProvinceOpen(open); if (open && vnProvinces.length === 0) { fetch('https://provinces.open-api.vn/api/p/').then(r => r.json()).then((data: { name: string; code: number }[]) => setVnProvinces(data)).catch(() => { }); } }}>
                                        <PopoverTrigger asChild>
                                            <button type="button" className={`flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 px-3 text-sm transition-all hover:bg-gray-50 focus:outline-none focus:border-emerald-400 ${!editInfoData.province ? 'text-gray-400' : 'text-gray-900'}`}>
                                                <div className="flex items-center gap-2 truncate">
                                                    <MapPinned className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{editInfoData.province || 'Chọn tỉnh thành...'}</span>
                                                </div>
                                                <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Tìm tỉnh thành..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy</CommandEmpty>
                                                    <CommandGroup>
                                                        {vnProvinces.map(p => (
                                                            <CommandItem key={p.code} value={p.name} onSelect={() => { setEditInfoData((prev: any) => ({ ...prev, province: p.name })); setEditProvinceOpen(false); }}>
                                                                <Check className={`w-3.5 h-3.5 mr-2 ${editInfoData.province === p.name ? 'opacity-100' : 'opacity-0'}`} />
                                                                {p.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" /> Ngày sinh
                                    </Label>
                                    <DatePicker
                                        value={editInfoData.dateOfBirth ? new Date(editInfoData.dateOfBirth + 'T00:00:00') : undefined}
                                        onChange={(date) => setEditInfoData((prev: any) => ({ ...prev, dateOfBirth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '' }))}
                                        placeholder="dd/mm/yyyy"
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            {/* Photos */}
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hình ảnh</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Personal Photo */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] text-gray-400 font-medium">Ảnh cá nhân (rõ mặt)</span>
                                        {editInfoData.personalPhoto ? (
                                            <div className="relative group">
                                                <img
                                                    src={editInfoData.personalPhoto}
                                                    alt="Ảnh cá nhân"
                                                    className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-300 cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(editInfoData.personalPhoto, '_blank')}
                                                />
                                                <div className="absolute top-1.5 right-1.5 flex gap-1">
                                                    <label className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors cursor-pointer">
                                                        <Camera className="w-3 h-3" />
                                                        <input type="file" accept="image/*" className="hidden" disabled={editUploadingPersonal}
                                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f, 'personalPhoto'); e.target.value = ''; }} />
                                                    </label>
                                                    <button type="button" onClick={() => setEditInfoData({ ...editInfoData, personalPhoto: '' })}
                                                        className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block">
                                                <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all aspect-square">
                                                    {editUploadingPersonal ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : <Camera className="w-6 h-6 text-gray-300" />}
                                                    <span className="text-[10px] text-gray-400 text-center">Tải ảnh cá nhân</span>
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" disabled={editUploadingPersonal}
                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f, 'personalPhoto'); e.target.value = ''; }} />
                                            </label>
                                        )}
                                    </div>
                                    {/* Team Lineup Photo */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] text-gray-400 font-medium">Đội hình thẻ thi đấu</span>
                                        {editInfoData.teamLineupPhoto ? (
                                            <div className="relative group">
                                                <img
                                                    src={editInfoData.teamLineupPhoto}
                                                    alt="Đội hình"
                                                    className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-300 cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(editInfoData.teamLineupPhoto, '_blank')}
                                                />
                                                <div className="absolute top-1.5 right-1.5 flex gap-1">
                                                    <label className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors cursor-pointer">
                                                        <Camera className="w-3 h-3" />
                                                        <input type="file" accept="image/*" className="hidden" disabled={editUploadingLineup}
                                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f, 'teamLineupPhoto'); e.target.value = ''; }} />
                                                    </label>
                                                    <button type="button" onClick={() => setEditInfoData({ ...editInfoData, teamLineupPhoto: '' })}
                                                        className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block">
                                                <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all aspect-square">
                                                    {editUploadingLineup ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                                                    <span className="text-[10px] text-gray-400 text-center">Tải ảnh đội hình</span>
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" disabled={editUploadingLineup}
                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadEditImage(f, 'teamLineupPhoto'); e.target.value = ''; }} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</Label>
                                <textarea
                                    value={editInfoData.notes}
                                    onChange={(e) => setEditInfoData({ ...editInfoData, notes: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                />
                            </div>

                            {/* Approved warning */}
                            {editInfoReg.status === "approved" && (
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">VĐV đã được duyệt</p>
                                        <p className="mt-0.5">Thay đổi tên đội hoặc viết tắt sẽ được đồng bộ sang Team trong giải đấu.</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-11 text-sm"
                                    onClick={() => setEditInfoReg(null)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveEditInfo}
                                    disabled={isSavingInfo}
                                    className="flex-1 rounded-xl h-11 text-sm bg-emerald-500 text-white hover:bg-emerald-600 font-bold"
                                >
                                    {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ================================ */}
            {/* SePay Transactions Dialog */}
            {/* ================================ */}
            <Dialog open={isSepayDialogOpen} onOpenChange={(open) => { setIsSepayDialogOpen(open); if (open) { setSepayPage(1); setSepayDateFrom(''); setSepayDateTo(''); } }}>
                <DialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-4rem)] !w-full h-[calc(100vh-4rem)] overflow-hidden p-0 flex flex-col">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold text-gray-900">{"Đối chiếu giao dịch SePay"}</DialogTitle>
                                    <p className="text-sm text-gray-400 mt-0.5">{"Giao dịch ngân hàng \u2022 Đối chiếu đăng ký"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-[52px] sm:ml-0 flex-wrap">
                                <Button variant="outline" size="sm" className="h-9 text-sm px-3 gap-1.5" onClick={handleExportSepayTransactions} disabled={sepayTransactions.length === 0}>
                                    <Download className="w-4 h-4" /> {"Xuất Excel"}
                                </Button>
                                <Button variant="outline" size="sm" className="h-9 text-sm px-3 gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50" onClick={handleBatchVerifySepay} disabled={isVerifyingAll}>
                                    {isVerifyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {"Đồng bộ SePay"}
                                </Button>
                                <Button variant="outline" size="sm" className="h-9 text-sm px-3 gap-1.5" onClick={() => loadSepayTransactions()} disabled={isLoadingSepay}>
                                    <RefreshCw className={`w-4 h-4 ${isLoadingSepay ? 'animate-spin' : ''}`} /> {"Tải lại"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        {sepayError && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-700">{sepayError}</p>
                                    <p className="text-sm text-red-400 mt-1">{"Vào Admin \u2192 Thanh toán \u2192 SePay \u2192 API Token để cấu hình"}</p>
                                </div>
                            </div>
                        )}

                        {isLoadingSepay && (
                            <div className="flex flex-col items-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
                                <p className="text-sm text-gray-400">{"Đang tải giao dịch từ SePay..."}</p>
                            </div>
                        )}

                        {!isLoadingSepay && !sepayError && sepayTransactions.length === 0 && (
                            <div className="text-center py-20">
                                <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-base text-gray-400 font-medium">{"Chưa có giao dịch"}</p>
                                <p className="text-sm text-gray-300 mt-1">{"Nhấn \"Tải lại\" để lấy dữ liệu từ SePay"}</p>
                            </div>
                        )}

                        {!isLoadingSepay && sepayTransactions.length > 0 && (() => {
                            const filteredByDate = sepayTransactions.filter((tx: any) => {
                                if (!tx.transactionDate) return true;
                                const txDate = new Date(tx.transactionDate).toISOString().slice(0, 10);
                                if (sepayDateFrom && txDate < sepayDateFrom) return false;
                                if (sepayDateTo && txDate > sepayDateTo) return false;
                                return true;
                            });
                            const issueTransactions = filteredByDate.filter((tx: any) =>
                                tx.registration && tx.amountIn > 0 &&
                                (tx.registration.paymentStatus !== "paid" || tx.registration.status !== "approved")
                            );
                            const okCount = filteredByDate.filter((tx: any) => tx.registration?.paymentStatus === "paid" && tx.registration?.status === "approved").length;
                            const unmatchedCount = filteredByDate.filter((tx: any) => !tx.registration && tx.amountIn > 0).length;
                            const totalIn = filteredByDate.reduce((sum: number, t: any) => sum + (parseFloat(t.amountIn) || 0), 0);
                            const allDisplayed = sepayTab === "issues" ? issueTransactions : filteredByDate;
                            const totalPages = Math.ceil(allDisplayed.length / SEPAY_PER_PAGE);
                            const currentPage = Math.min(sepayPage, totalPages || 1);
                            const displayedTransactions = allDisplayed.slice((currentPage - 1) * SEPAY_PER_PAGE, currentPage * SEPAY_PER_PAGE);

                            return (
                                <>
                                    {/* Date filter + Stats */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 mb-4">
                                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            <input type="date" value={sepayDateFrom} onChange={e => { setSepayDateFrom(e.target.value); setSepayPage(1); }} className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
                                            <span className="text-gray-300 text-sm">{"\u2192"}</span>
                                            <input type="date" value={sepayDateTo} onChange={e => { setSepayDateTo(e.target.value); setSepayPage(1); }} className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
                                            <button className="h-8 px-3 text-xs font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1" disabled={isLoadingSepay} onClick={() => { setSepayPage(1); loadSepayTransactions(sepayDateFrom, sepayDateTo); }}>
                                                <Search className="w-3.5 h-3.5" /> {"Lọc"}
                                            </button>
                                            {(sepayDateFrom || sepayDateTo) && (
                                                <button className="text-xs text-gray-400 hover:text-gray-600 underline ml-1" onClick={() => { setSepayDateFrom(''); setSepayDateTo(''); setSepayPage(1); loadSepayTransactions('', ''); }}>{"Xóa lọc"}</button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm flex-wrap flex-1 sm:justify-end">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Receipt className="w-4 h-4" />
                                                <span className="font-medium">{filteredByDate.length}</span> {"giao dịch"}
                                            </div>
                                            <span className="text-gray-200">|</span>
                                            {issueTransactions.length > 0 ? (
                                                <div className="flex items-center gap-1.5 text-orange-500 font-medium cursor-pointer hover:underline" onClick={() => { setSepayTab("issues"); setSepayPage(1); }}>
                                                    <AlertTriangle className="w-4 h-4" />
                                                    {issueTransactions.length} {"cần xử lý"}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-emerald-500">
                                                    <CheckCircle2 className="w-4 h-4" /> {"Tất cả OK"}
                                                </div>
                                            )}
                                            <span className="text-gray-200">|</span>
                                            <div className="flex items-center gap-1.5 text-emerald-600">
                                                <BadgeCheck className="w-4 h-4" /> {okCount} {"hoàn tất"}
                                            </div>
                                            {unmatchedCount > 0 && (
                                                <>
                                                    <span className="text-gray-200">|</span>
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <LinkIcon className="w-4 h-4" /> {unmatchedCount} {"chưa khớp"}
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-base">
                                                <CircleDollarSign className="w-4 h-4" />
                                                {Number(totalIn).toLocaleString('vi-VN')} {"VNĐ"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Issue banner */}
                                    {issueTransactions.length > 0 && sepayTab !== "issues" && (
                                        <div className="mb-4 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-3 cursor-pointer hover:bg-orange-100/50 transition-colors" onClick={() => { setSepayTab("issues"); setSepayPage(1); }}>
                                            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                            <p className="text-sm text-orange-700 flex-1">
                                                <span className="font-semibold">{issueTransactions.length} {"giao dịch"}</span> {"đã nhận tiền nhưng chưa được xác nhận trên hệ thống"}
                                            </p>
                                            <ChevronRight className="w-4 h-4 text-orange-300" />
                                        </div>
                                    )}

                                    {/* Tabs */}
                                    <div className="flex items-center gap-1 mb-4 border-b border-gray-100">
                                        <button className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${sepayTab === "issues" ? 'border-orange-400 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`} onClick={() => { setSepayTab("issues"); setSepayPage(1); }}>
                                            {"Cần xử lý"}
                                            {issueTransactions.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600 font-semibold">{issueTransactions.length}</span>}
                                        </button>
                                        <button className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${sepayTab === "all" ? 'border-purple-400 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`} onClick={() => { setSepayTab("all"); setSepayPage(1); }}>
                                            {"Tất cả"} ({filteredByDate.length})
                                        </button>
                                    </div>

                                    {/* Empty issues */}
                                    {sepayTab === "issues" && issueTransactions.length === 0 && (
                                        <div className="text-center py-16">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                                            <p className="text-base text-emerald-600 font-medium">{"Tất cả đã được xử lý"}</p>
                                            <p className="text-sm text-gray-400 mt-1">{"Không có giao dịch nào cần xác nhận"}</p>
                                        </div>
                                    )}

                                    {/* Table */}
                                    {displayedTransactions.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">{"Thời gian"}</th>
                                                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">{"Số tiền"}</th>
                                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">{"Nội dung CK"}</th>
                                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">{"VĐV khớp"}</th>
                                                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">TT</th>
                                                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">{"ĐK"}</th>
                                                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {displayedTransactions.map((tx: any, i: number) => {
                                                            const globalIndex = (currentPage - 1) * SEPAY_PER_PAGE + i;
                                                            const hasIssue = tx.registration && tx.amountIn > 0 && (tx.registration.paymentStatus !== "paid" || tx.registration.status !== "approved");
                                                            const isOk = tx.registration?.paymentStatus === "paid" && tx.registration?.status === "approved";
                                                            return (
                                                                <tr key={tx.id || globalIndex} className={`transition-colors ${hasIssue ? 'bg-orange-50/50' : 'hover:bg-gray-50/60'}`}>
                                                                    <td className="px-4 py-3.5 text-sm text-gray-400 font-mono">{globalIndex + 1}</td>
                                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-700 font-medium">{tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString('vi-VN') : '\u2014'}</div>
                                                                        <div className="text-xs text-gray-400 mt-0.5">{tx.transactionDate ? new Date(tx.transactionDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                                        {tx.amountIn > 0 && <span className="text-emerald-600 font-semibold text-sm">+{Number(tx.amountIn).toLocaleString('vi-VN')}{"\u0111"}</span>}
                                                                        {tx.amountOut > 0 && <span className="text-red-500 font-semibold text-sm">-{Number(tx.amountOut).toLocaleString('vi-VN')}{"\u0111"}</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3.5 max-w-[300px]">
                                                                        <div className="text-sm text-gray-600 truncate" title={tx.content}>{tx.content || '\u2014'}</div>
                                                                        {tx.code && <div className="text-xs text-purple-400 font-mono mt-1 truncate">{tx.code}</div>}
                                                                    </td>
                                                                    <td className="px-4 py-3.5">
                                                                        {tx.registration ? (
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                                                    <User className="w-4 h-4 text-purple-500" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="text-sm text-gray-800 font-medium truncate">{tx.registration.playerName}</div>
                                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                                        {tx.registration.efvId != null && (
                                                                                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                                                <Hash className="w-3 h-3" />{tx.registration.efvId}
                                                                                            </span>
                                                                                        )}
                                                                                        {tx.registration.teamName && tx.registration.teamName !== 'T\u1ef1 do' && (
                                                                                            <span className="text-xs text-gray-400">{tx.registration.teamName}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-gray-300 italic">{"Không khớp VĐV"}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        {tx.registration ? (
                                                                            tx.registration.paymentStatus === 'paid'
                                                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                                                : <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                                                        ) : <span className="text-gray-200">{"\u2014"}</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        {tx.registration ? (
                                                                            tx.registration.status === 'approved'
                                                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                                                : tx.registration.status === 'rejected'
                                                                                    ? <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                                                                    : <Clock className="w-5 h-5 text-amber-400 mx-auto" />
                                                                        ) : <span className="text-gray-200">{"\u2014"}</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        {hasIssue ? (
                                                                            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50" disabled={isProcessingSepay === tx.registration._id} onClick={() => setSepayConfirmTx(tx)}>
                                                                                {isProcessingSepay === tx.registration._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Edit3 className="w-3 h-3" /> {"Xử lý"}</>}
                                                                            </button>
                                                                        ) : isOk ? (
                                                                            <CheckCircle2 className="w-5 h-5 text-emerald-300 mx-auto" />
                                                                        ) : null}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Pagination */}
                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                                    <p className="text-sm text-gray-500">
                                                        {"Hiển thị"} <span className="font-medium">{(currentPage - 1) * SEPAY_PER_PAGE + 1}</span>{"\u2013"}<span className="font-medium">{Math.min(currentPage * SEPAY_PER_PAGE, allDisplayed.length)}</span> / <span className="font-medium">{allDisplayed.length}</span> {"giao dịch"}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <button className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center" disabled={currentPage <= 1} onClick={() => setSepayPage(p => Math.max(1, p - 1))}>
                                                            <ChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                                                            <button key={page} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-purple-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`} onClick={() => setSepayPage(page)}>
                                                                {page}
                                                            </button>
                                                        ))}
                                                        <button className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center" disabled={currentPage >= totalPages} onClick={() => setSepayPage(p => Math.min(totalPages, p + 1))}>
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* SePay Confirm Dialog */}
            <Dialog open={!!sepayConfirmTx} onOpenChange={(open) => { if (!open) setSepayConfirmTx(null); }}>
                <DialogContent className="sm:!max-w-lg p-0">
                    {sepayConfirmTx && (
                        <>
                            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-semibold text-gray-900">{"Xác nhận giao dịch"}</DialogTitle>
                                        <p className="text-sm text-gray-400">{"SePay đã nhận tiền \u2014 Website chưa cập nhật"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <div className="p-4 rounded-xl bg-gray-50 space-y-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <Banknote className="w-3.5 h-3.5" /> {"Giao dịch SePay"}
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-semibold text-emerald-600">+{Number(sepayConfirmTx.amountIn).toLocaleString('vi-VN')}{"\u0111"}</span>
                                        <span className="text-sm text-gray-400">{sepayConfirmTx.transactionDate ? new Date(sepayConfirmTx.transactionDate).toLocaleString('vi-VN') : '\u2014'}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 break-all">{sepayConfirmTx.content || '\u2014'}</div>
                                    {sepayConfirmTx.code && <div className="text-xs font-mono text-purple-400">{sepayConfirmTx.code}</div>}
                                    {sepayConfirmTx.bankBrandName && <div className="text-sm text-gray-400">{sepayConfirmTx.bankBrandName}</div>}
                                </div>
                                <div className="p-4 rounded-xl bg-gray-50 space-y-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <User className="w-3.5 h-3.5" /> {"Đăng ký tương ứng"}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <div>
                                                <div className="text-base font-medium text-gray-900">{sepayConfirmTx.registration?.playerName}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {sepayConfirmTx.registration?.efvId != null && (
                                                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                            <Hash className="w-3 h-3" />{sepayConfirmTx.registration.efvId}
                                                        </span>
                                                    )}
                                                    {sepayConfirmTx.registration?.teamName && <span className="text-sm text-gray-400">{sepayConfirmTx.registration.teamName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className={`flex items-center gap-1.5 text-xs font-medium ${sepayConfirmTx.registration?.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-red-400'}`}>
                                                {sepayConfirmTx.registration?.paymentStatus === 'paid' ? <><CheckCircle2 className="w-3.5 h-3.5" /> {"Đã thanh toán"}</> : <><XCircle className="w-3.5 h-3.5" /> {"Chưa thanh toán"}</>}
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs font-medium ${sepayConfirmTx.registration?.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {sepayConfirmTx.registration?.status === 'approved' ? <><CheckCircle2 className="w-3.5 h-3.5" /> {"Đã duyệt"}</> : <><Clock className="w-3.5 h-3.5" /> {"Chờ duyệt"}</>}
                                            </div>
                                        </div>
                                    </div>
                                    {tournament?.entryFee > 0 && (
                                        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${sepayConfirmTx.amountIn >= tournament.entryFee ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {sepayConfirmTx.amountIn >= tournament.entryFee
                                                ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {"Số tiền khớp ("}{Number(sepayConfirmTx.amountIn).toLocaleString('vi-VN')}{"\u0111 \u2265 "}{Number(tournament.entryFee).toLocaleString('vi-VN')}{"\u0111)"}</>
                                                : <><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {"Thiếu ("}{Number(sepayConfirmTx.amountIn).toLocaleString('vi-VN')}{"\u0111 / "}{Number(tournament.entryFee).toLocaleString('vi-VN')}{"\u0111)"}</>
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2.5 pt-1">
                                    {sepayConfirmTx.registration?.status !== "approved" && (
                                        <Button className="w-full rounded-xl h-10 text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600" disabled={isProcessingSepay === sepayConfirmTx.registration?._id} onClick={() => handleSepayQuickApprove(sepayConfirmTx)}>
                                            {isProcessingSepay === sepayConfirmTx.registration?._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                            {"Xác nhận thanh toán & Duyệt VĐV"}
                                        </Button>
                                    )}
                                    {sepayConfirmTx.registration?.paymentStatus !== "paid" && (
                                        <Button variant="outline" className="w-full rounded-xl h-10 text-sm font-medium" disabled={isProcessingSepay === sepayConfirmTx.registration?._id} onClick={() => handleSepayConfirmPaymentOnly(sepayConfirmTx)}>
                                            {isProcessingSepay === sepayConfirmTx.registration?._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                            {"Chỉ xác nhận thanh toán"}
                                        </Button>
                                    )}
                                    <button className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2" onClick={() => setSepayConfirmTx(null)}>{"Đóng"}</button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
