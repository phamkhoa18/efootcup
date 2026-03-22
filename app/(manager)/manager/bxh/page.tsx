"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Trophy, Medal, Edit, Trash2, Loader2, Award, Upload, FileSpreadsheet, Download, RefreshCw, Database, Smartphone, Monitor, Shield, ImageIcon, Link2, X } from "lucide-react";
import Image from "next/image";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManagerBxhPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const { confirm } = useConfirmDialog();

    // New Excel states
    const [addMode, setAddMode] = useState<"manual" | "excel">("manual");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelPreview, setExcelPreview] = useState<any[]>([]);
    const [excelReplaceAll, setExcelReplaceAll] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        gamerId: "",
        name: "",
        nickname: "",
        team: "",
        facebook: "",
        points: 0,
        rank: 0,
    });

    const [error, setError] = useState<string | null>(null);
    const [isReloading, setIsReloading] = useState(false);
    const [activeMode, setActiveMode] = useState<"mobile" | "pc" | "teams">("mobile");

    // ═══ SEO STATE ═══
    const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
    const [seoForm, setSeoForm] = useState({ bxhMobileOgImage: "", bxhConsoleOgImage: "", bxhTeamsOgImage: "" });
    const [isSeoLoading, setIsSeoLoading] = useState(false);
    const [seoUploadMode, setSeoUploadMode] = useState<"link" | "upload">("link");
    const [seoFile, setSeoFile] = useState<File | null>(null);
    const seoInputRef = useRef<HTMLInputElement>(null);

    // ═══ TEAMS STATE ═══
    const [teams, setTeams] = useState<any[]>([]);
    const [isTeamsLoading, setIsTeamsLoading] = useState(false);
    const [teamsSearch, setTeamsSearch] = useState("");
    const [teamsPage, setTeamsPage] = useState(1);
    const [isTeamAddOpen, setIsTeamAddOpen] = useState(false);
    const [isTeamEditOpen, setIsTeamEditOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [teamAddMode, setTeamAddMode] = useState<"manual" | "excel">("manual");
    const [teamExcelFile, setTeamExcelFile] = useState<File | null>(null);
    const [teamExcelPreview, setTeamExcelPreview] = useState<any[]>([]);
    const [teamExcelReplace, setTeamExcelReplace] = useState(false);
    const teamFileRef = useRef<HTMLInputElement>(null);
    const [teamForm, setTeamForm] = useState({ rank: 0, clubName: "", leader: "", point: 0, logo: "" });
    const [teamError, setTeamError] = useState<string | null>(null);
    const [logoMode, setLogoMode] = useState<"link" | "upload">("link");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState("");
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Convert Google Drive share link to direct image URL
    const toDirectImageUrl = (url: string): string => {
        if (!url) return url;
        // https://drive.google.com/file/d/FILE_ID/view?...
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        // https://drive.google.com/open?id=FILE_ID
        const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
        if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
        // https://drive.google.com/uc?id=FILE_ID (already direct-ish but lh3 is more reliable)
        const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
        if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
        return url;
    };

    useEffect(() => {
        if (activeMode === "teams") { loadTeams(); } else { loadData(); }
    }, [activeMode]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/bxh?mode=${activeMode}`, { cache: "no-store" });
            const result = await res.json();
            if (result.data && Array.isArray(result.data.data)) {
                setPlayers(result.data.data);
            } else {
                setPlayers([]);
            }
        } catch (error) {
            console.error("Error loading BXH:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSeo = async () => {
        setIsSeoLoading(true);
        setIsSeoModalOpen(true);
        setSeoUploadMode("link");
        setSeoFile(null);
        try {
            const res = await fetch("/api/bxh/seo");
            const result = await res.json();
            if (result.success) {
                setSeoForm({
                    bxhMobileOgImage: result.data.bxhMobileOgImage || "",
                    bxhConsoleOgImage: result.data.bxhConsoleOgImage || "",
                    bxhTeamsOgImage: result.data.bxhTeamsOgImage || "",
                });
            }
        } catch (error) {
            toast.error("Không thể tải cấu hình SEO");
        } finally {
            setIsSeoLoading(false);
        }
    };

    const handleSaveSeo = async () => {
        setIsSeoLoading(true);
        try {
            const currentField = activeMode === "mobile" ? "bxhMobileOgImage" : activeMode === "pc" ? "bxhConsoleOgImage" : "bxhTeamsOgImage";
            let finalImageUrl = (seoForm as any)[currentField];
            
            if (seoUploadMode === "upload" && seoFile) {
                const fd = new FormData();
                fd.append("file", seoFile);
                fd.append("type", "general");
                const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.message || "Lỗi tải ảnh lên");
                finalImageUrl = toDirectImageUrl(uploadData.data.url);
            }

            const payload = { [currentField]: finalImageUrl };

            const res = await fetch("/api/bxh/seo", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success("Đã cập nhật ảnh SEO thành công");
            setSeoForm(prev => ({ ...prev, ...payload }));
            setIsSeoModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Lưu thất bại");
        } finally {
            setIsSeoLoading(false);
        }
    };

    const handleAdd = () => {
        setForm({
            gamerId: "",
            name: "",
            nickname: "",
            team: "",
            facebook: "",
            points: 0,
            rank: 0,
        });
        setAddMode("manual");
        setExcelFile(null);
        setExcelPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setError(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (p: any) => {
        setSelectedPlayer(p);
        setForm({
            gamerId: p.id,
            name: p.name,
            nickname: p.nickname || "",
            team: p.team || "",
            facebook: p.facebook || "",
            points: p.points || 0,
            rank: p.rank || 0,
        });
        setAddMode("manual");
        setError(null);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (p: any) => {
        const ok = await confirm({
            title: "Xóa VĐV?",
            description: `Bạn có chắc muốn xóa VĐV ${p.name} khỏi bảng xếp hạng?`,
            variant: "danger",
            confirmText: "Xóa VĐV",
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/bxh/${p._id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Xóa thất bại");

            loadData();
            toast.success(`Đã xóa VĐV ${p.name}`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDeleteAll = async () => {
        const ok = await confirm({
            title: "⚠️ Xóa toàn bộ VĐV?",
            description: "CẢNH BÁO: Bạn sẽ xóa TOÀN BỘ VĐV khỏi bảng xếp hạng! Hành động này không thể hoàn tác.",
            variant: "danger",
            confirmText: "Xóa toàn bộ",
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/bxh?mode=${activeMode}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Xóa thất bại");

            loadData();
            setPage(1);
            toast.success("Đã xóa toàn bộ danh sách");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (addMode === "excel") {
            handleExcelSubmit();
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const isEdit = isEditModalOpen;
            const url = isEdit ? `/api/bxh/${selectedPlayer._id}` : `/api/bxh`;
            const method = isEdit ? "PUT" : "POST";

            const payload = {
                ...form,
                points: Number(form.points),
                rank: Number(form.rank),
                mode: activeMode,
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Có lỗi xảy ra");
            }

            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            loadData();
            toast.success(data.message || "Đã lưu thành công");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setExcelFile(null);
            setExcelPreview([]);
            return;
        }
        setExcelFile(file);
        setError(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (typeof bstr !== "string") return;
            try {
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                let mapped = data.map((row: any) => {
                    const findVal = (keywords: string[]) => {
                        const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                        return key ? row[key] : "";
                    };

                    return {
                        gamerId: String(row["ID-EFV"] || row.ID || row.Id || row.id || row.gamerId || findVal(["id"])).trim(),
                        name: String(row["Họ và tên VĐV"] || row["Họ tên"] || row.Name || row.name || findVal(["tên", "name"])).trim(),
                        nickname: String(row["Nickname eFootball"] || row.Nickname || row.nickname || findVal(["nick"])).trim(),
                        team: String(row.Team || row.team || findVal(["team", "đội"])).trim(),
                        points: Number(row["Điểm EFV"] || row["Điểm"] || row.Points || row.points || findVal(["điểm", "point"]) || 0),
                        facebook: String(row["Link Facebook cá nhân"] || row.Facebook || row.facebook || findVal(["face", "fb"])).trim(),
                        rank: Number(row["Xếp hạng "] || row["Xếp hạng"] || row["Hạng"] || row["STT"] || row["Thứ hạng"] || row.Rank || row.rank || row.__EMPTY || findVal(["hạng", "rank", "stt", "thứ"])) || 0
                    };
                }).filter(r => r.gamerId && r.name && r.gamerId !== "undefined" && r.name !== "undefined");

                // Nếu file Excel bị mất Header chuẩn, hoặc dùng Header ẩn danh khiến rank bị bằng 0 toàn bộ
                if (mapped.length === 0 || mapped.every(r => !r.rank || r.rank === 0)) {
                    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    const fallbackMapped = [];

                    for (let i = 0; i < rawData.length; i++) {
                        const row: any = rawData[i];
                        if (!row || row.length < 3) continue;

                        const col0 = String(row[0]).toLowerCase();
                        const col1 = String(row[1]).toLowerCase();
                        // Bỏ qua dòng Header
                        if (col0.includes("hạng") || col0.includes("stt") || col1.includes("id")) continue;

                        const rank = Number(row[0]) || 0;
                        const gamerId = String(row[1] || "").trim();
                        const name = String(row[2] || "").trim();

                        if (!gamerId || !name || gamerId === "undefined") continue;

                        let facebook = "";
                        let team = "";
                        let nickname = "";
                        let points = 0;

                        // Quét các cột còn lại để nhận diện dữ liệu
                        for (let j = 3; j < row.length; j++) {
                            const val = String(row[j] || "").trim();
                            if (!val || val === "-" || val === "—") continue;

                            if (val.startsWith("http")) {
                                facebook = val;
                            } else if (!isNaN(Number(val)) && Number(val) > 0) {
                                points = Number(val);
                            } else {
                                if (!team && j === 4) team = val;
                                else nickname = val;
                            }
                        }

                        fallbackMapped.push({ gamerId, name, nickname, team, points, facebook, rank });
                    }

                    // Nếu Fallback cứu được dữ liệu thì lấy Fallback
                    if (fallbackMapped.length > 0) {
                        mapped = fallbackMapped;
                    }
                }

                setExcelPreview(mapped);
                if (mapped.length === 0) {
                    setError("Không tìm thấy dữ liệu hợp lệ. File template cần có các cột chuẩn là 'ID-EFV' và 'Họ và tên VĐV'.");
                }
            } catch (err: any) {
                setError("Lỗi đọc file: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExcelSubmit = async () => {
        if (excelPreview.length === 0) {
            setError("Chưa có dữ liệu để tải lên");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/bxh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: excelPreview,
                    replaceAll: excelReplaceAll,
                    mode: activeMode,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");

            toast.success(data.message || `Đã nhập xong ${excelPreview.length} VĐV thành công!`);
            setIsAddModalOpen(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReloadSystem = async () => {
        const modeLabel = activeMode === "mobile" ? "Mobile" : "Console";
        const yes = await confirm({
            title: `Reload BXH ${modeLabel} từ hệ thống?`,
            description: `Toàn bộ BXH ${modeLabel} hiện tại sẽ được xóa và thay bằng dữ liệu tính từ các giải đấu EFV trong hệ thống (cơ chế cửa sổ trượt). Dữ liệu Excel sẽ bị thay thế.`,
            confirmText: `Reload ${modeLabel}`,
            variant: "warning",
        });
        if (!yes) return;

        setIsReloading(true);
        try {
            const res = await fetch("/api/bxh/reload-system", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: activeMode }),
            });
            const json = await res.json();
            if (json.success !== false) {
                toast.success(`✅ ${json.message}`);
                await loadData();
            } else {
                toast.error(`❌ ${json.message}`);
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi reload BXH");
        } finally {
            setIsReloading(false);
        }
    };

    const handleExportExcel = (mode: "mobile" | "pc", data: any[]) => {
        const modeLabel = mode === "mobile" ? "Mobile" : "Console";
        const rows = data.map((p: any) => ({
            "Hạng": p.rank || "",
            "EFV ID": p.id || "",
            "Họ Tên VĐV": p.name || "",
            "Team": p.team || "",
            "Nickname": p.nickname || "",
            "Điểm": p.points || 0,
            "Facebook": p.facebook || "",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        // Set column widths
        ws["!cols"] = [
            { wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 35 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `BXH ${modeLabel}`);
        XLSX.writeFile(wb, `BXH_${modeLabel}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.xlsx`);
        toast.success(`Đã tải BXH ${modeLabel} (${data.length} VĐV)`);
    };

    // ═══ TEAMS FUNCTIONS ═══
    const loadTeams = async () => {
        setIsTeamsLoading(true);
        try {
            const res = await fetch("/api/bxh-teams", { cache: "no-store" });
            const result = await res.json();
            const raw = result.data?.data || [];
            // Auto-sort by points desc, then preserve insertion order for equal points
            const sorted = [...raw].sort((a: any, b: any) => (Number(b.point) || 0) - (Number(a.point) || 0));
            // Auto-assign rank
            sorted.forEach((t: any, i: number) => { t.rank = i + 1; });
            setTeams(sorted);
        } catch { setTeams([]); }
        finally { setIsTeamsLoading(false); }
    };
    const handleTeamAdd = () => {
        setTeamForm({ rank: 0, clubName: "", leader: "", point: 0, logo: "" });
        setTeamAddMode("manual"); setTeamExcelFile(null); setTeamExcelPreview([]);
        setLogoMode("link"); setLogoFile(null); setLogoPreview("");
        setTeamError(null); setIsTeamAddOpen(true);
    };
    const handleTeamEdit = (t: any) => {
        setSelectedTeam(t);
        setTeamForm({ rank: t.rank||0, clubName: t.clubName, leader: t.leader, point: t.point||0, logo: t.logo||"" });
        setLogoMode("link"); setLogoPreview(t.logo ? toDirectImageUrl(t.logo) : ""); setLogoFile(null);
        setTeamError(null); setTeamAddMode("manual"); setIsTeamEditOpen(true);
    };
    const handleTeamDelete = async (t: any) => {
        const ok = await confirm({ title: "Xóa đội?", description: `Xóa ${t.clubName} khỏi BXH Teams?`, variant: "danger", confirmText: "Xóa" });
        if (!ok) return;
        try { const res = await fetch(`/api/bxh-teams/${t._id}`, { method: "DELETE" }); const d = await res.json(); if (!res.ok) throw new Error(d.message); loadTeams(); toast.success(`Đã xóa ${t.clubName}`); } catch (e: any) { toast.error(e.message); }
    };
    const handleTeamDeleteAll = async () => {
        const ok = await confirm({ title: "⚠️ Xóa toàn bộ BXH Teams?", description: "Hành động này không thể hoàn tác.", variant: "danger", confirmText: "Xóa toàn bộ" });
        if (!ok) return;
        try { const res = await fetch("/api/bxh-teams", { method: "DELETE" }); const d = await res.json(); if (!res.ok) throw new Error(d.message); loadTeams(); setTeamsPage(1); toast.success("Đã xóa toàn bộ"); } catch (e: any) { toast.error(e.message); }
    };
    const handleTeamSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (teamAddMode === "excel") { handleTeamExcelSubmit(); return; }
        setIsSubmitting(true); setTeamError(null);
        try {
            let logoUrl = teamForm.logo;
            if (logoMode === "upload" && logoFile) {
                const fd = new FormData(); fd.append("file", logoFile); fd.append("type", "general");
                const ur = await fetch("/api/upload", { method: "POST", body: fd }); const ud = await ur.json();
                if (!ur.ok) throw new Error(ud.message); logoUrl = ud.data.url;
            }
            const isEdit = isTeamEditOpen;
            const url = isEdit ? `/api/bxh-teams/${selectedTeam._id}` : "/api/bxh-teams";
            const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clubName: teamForm.clubName, leader: teamForm.leader, point: Number(teamForm.point), logo: toDirectImageUrl(logoUrl) }) });
            const data = await res.json(); if (!res.ok) throw new Error(data.message);
            setIsTeamAddOpen(false); setIsTeamEditOpen(false); loadTeams(); toast.success(data.message || "Đã lưu");
        } catch (err: any) { setTeamError(err.message); toast.error(err.message); } finally { setIsSubmitting(false); }
    };
    const handleTeamExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) { setTeamExcelFile(null); setTeamExcelPreview([]); return; }
        setTeamExcelFile(file); setTeamError(null);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result; if (typeof bstr !== "string") return;
            try {
                const wb = XLSX.read(bstr, { type: "binary" }); const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                const fv = (row: any, kws: string[]) => { const k = Object.keys(row).find(k => kws.some(w => k.toLowerCase().includes(w.toLowerCase()))); return k ? row[k] : ""; };
                let mapped = data.map((row: any) => ({
                    rank: Number(row.RANK||row.Rank||row.rank||fv(row,["rank","hạng","stt"]))||0,
                    clubName: String(row["CLUB NAME"]||row["Club Name"]||row.clubName||fv(row,["club","clb","đội","team"])).trim(),
                    leader: String(row.Leader||row.leader||row.LEADER||fv(row,["leader","trưởng"])).trim(),
                    point: Number(row.Point||row.point||row.Points||fv(row,["point","điểm"]))||0,
                    logo: toDirectImageUrl(String(row.Logo||row.logo||fv(row,["logo","hình","image"])).trim()),
                })).filter(r => r.clubName && r.clubName !== "undefined");
                if (mapped.length === 0) {
                    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
                    const fb: any[] = [];
                    for (const row of raw) { if (!row||row.length<3) continue; if (String(row[0]).toLowerCase().includes("rank")||String(row[0]).toLowerCase().includes("hạng")) continue; const cn=String(row[1]||"").trim(); if (!cn) continue; fb.push({rank:Number(row[0])||0,clubName:cn,leader:String(row[2]||"").trim(),point:Number(row[3])||0,logo:toDirectImageUrl(String(row[4]||"").trim())}); }
                    if (fb.length>0) mapped=fb;
                }
                setTeamExcelPreview(mapped);
                if (mapped.length===0) setTeamError("Không tìm thấy dữ liệu. Cần cột: RANK, CLUB NAME, Leader, Point");
            } catch (err: any) { setTeamError("Lỗi đọc file: "+err.message); }
        }; reader.readAsBinaryString(file);
    };
    const handleTeamExcelSubmit = async () => {
        if (teamExcelPreview.length===0) { setTeamError("Chưa có dữ liệu"); return; }
        setIsSubmitting(true); setTeamError(null);
        try {
            const res = await fetch("/api/bxh-teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: teamExcelPreview, replaceAll: teamExcelReplace }) });
            const d = await res.json(); if (!res.ok) throw new Error(d.message);
            toast.success(d.message); setIsTeamAddOpen(false); loadTeams();
        } catch (err: any) { setTeamError(err.message); toast.error(err.message); } finally { setIsSubmitting(false); }
    };
    const handleTeamExport = () => {
        const rows = teams.map(t => ({ "RANK": t.rank, "CLUB NAME": t.clubName, "Leader": t.leader, "Point": t.point, "Logo": t.logo||""}));
        const ws = XLSX.utils.json_to_sheet(rows); ws["!cols"]=[{wch:8},{wch:25},{wch:20},{wch:10},{wch:40}];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "BXH Teams");
        XLSX.writeFile(wb, `BXH_Teams_${new Date().toLocaleDateString("vi-VN").replace(/\//g,"-")}.xlsx`);
        toast.success(`Đã tải BXH Teams (${teams.length} đội)`);
    };
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setLogoFile(file);
        const reader = new FileReader(); reader.onload = (ev) => setLogoPreview(ev.target?.result as string); reader.readAsDataURL(file);
    };
    const filteredTeams = (Array.isArray(teams)?teams:[]).filter(t => String(t.clubName||"").toLowerCase().includes(teamsSearch.toLowerCase()) || String(t.leader||"").toLowerCase().includes(teamsSearch.toLowerCase()));
    const teamsTotalPages = Math.max(1, Math.ceil(filteredTeams.length / perPage));
    const teamsCurrentPage = Math.min(teamsPage, teamsTotalPages);
    const pagedTeams = filteredTeams.slice((teamsCurrentPage-1)*perPage, teamsCurrentPage*perPage);
    useEffect(() => { setTeamsPage(1); }, [teamsSearch]);

    const handleExportBoth = async () => {
        toast.info("Đang tải dữ liệu cả 2 chế độ...");
        try {
            const [mobileRes, pcRes] = await Promise.all([
                fetch(`/api/bxh?mode=mobile`, { cache: "no-store" }).then(r => r.json()),
                fetch(`/api/bxh?mode=pc`, { cache: "no-store" }).then(r => r.json()),
            ]);
            const mobileData = mobileRes.data?.data || [];
            const pcData = pcRes.data?.data || [];

            const toRows = (data: any[]) => data.map((p: any) => ({
                "Hạng": p.rank || "",
                "EFV ID": p.id || "",
                "Họ Tên VĐV": p.name || "",
                "Team": p.team || "",
                "Nickname": p.nickname || "",
                "Điểm": p.points || 0,
                "Facebook": p.facebook || "",
            }));

            const wb = XLSX.utils.book_new();
            const wsMobile = XLSX.utils.json_to_sheet(toRows(mobileData));
            wsMobile["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 35 }];
            XLSX.utils.book_append_sheet(wb, wsMobile, "BXH Mobile");

            const wsPC = XLSX.utils.json_to_sheet(toRows(pcData));
            wsPC["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 35 }];
            XLSX.utils.book_append_sheet(wb, wsPC, "BXH Console");

            XLSX.writeFile(wb, `BXH_Full_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.xlsx`);
            toast.success(`Đã tải BXH đầy đủ (Mobile: ${mobileData.length}, Console: ${pcData.length} VĐV)`);
        } catch {
            toast.error("Lỗi khi tải dữ liệu BXH");
        }
    };

    const filtered = (Array.isArray(players) ? players : []).filter(p =>
        (p.name && String(p.name).toLowerCase().includes(search.toLowerCase())) ||
        (p.id && String(p.id).toLowerCase().includes(search.toLowerCase())) ||
        (p.nickname && String(p.nickname).toLowerCase().includes(search.toLowerCase())) ||
        (p.team && String(p.team).toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const pagedPlayers = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    useEffect(() => { setPage(1); }, [search, perPage]);

    return (
        <div className="space-y-6 font-sans antialiased text-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
                        <Award className="w-6 h-6 text-indigo-600" /> Quản lý Bảng xếp hạng
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">{activeMode === "teams" ? "Quản lý bảng xếp hạng đội (Teams)." : "Cập nhật điểm và thứ hạng của các VĐV."}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {activeMode === "teams" ? (<>
                        <Button variant="outline" onClick={handleTeamExport} disabled={teams.length===0} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl shadow-sm flex-1 sm:flex-none"><Download className="w-4 h-4 mr-2" /> Tải Excel</Button>
                        {teams.length>0 && <Button variant="destructive" onClick={handleTeamDeleteAll} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-sm flex-1 sm:flex-none"><Trash2 className="w-4 h-4 mr-2" /> Xóa toàn bộ</Button>}
                        <Button onClick={handleTeamAdd} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm flex-1 sm:flex-none"><Plus className="w-4 h-4 mr-2" /> Thêm đội</Button>
                    </>) : (<>
                        <Button onClick={handleReloadSystem} disabled={isReloading} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl shadow-sm flex-1 sm:flex-none">
                            {isReloading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang reload...</>) : (<><Database className="w-4 h-4 mr-2" /> Reload {activeMode === "mobile" ? "Mobile" : "Console"}</>)}
                        </Button>
                        <Button variant="outline" onClick={() => handleExportExcel(activeMode as "mobile"|"pc", filtered)} disabled={filtered.length === 0} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl shadow-sm flex-1 sm:flex-none">
                            <Download className="w-4 h-4 mr-2" /> Tải Excel {activeMode === "mobile" ? "Mobile" : "Console"}
                        </Button>
                        <Button variant="outline" onClick={handleExportBoth} className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl shadow-sm flex-1 sm:flex-none">
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Tải cả 2 chế độ
                        </Button>
                        {players.length > 0 && <Button variant="destructive" onClick={handleDeleteAll} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-sm flex-1 sm:flex-none"><Trash2 className="w-4 h-4 mr-2" /> Xóa toàn bộ</Button>}
                        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex-1 sm:flex-none"><Plus className="w-4 h-4 mr-2" /> Thêm VĐV</Button>
                    </>)}
                    <Button onClick={handleOpenSeo} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl shadow-sm flex-1 sm:flex-none">
                        <ImageIcon className="w-4 h-4 mr-2" /> Cài đặt SEO
                    </Button>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-xl border border-slate-200 p-1 sm:p-1.5 shadow-sm w-full sm:w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveMode("mobile")}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${activeMode === "mobile"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                >
                    <Smartphone className="w-4 h-4" /> <span className="hidden xs:inline">Mobile</span><span className="xs:hidden">MB</span>
                </button>
                <button
                    onClick={() => setActiveMode("pc")}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${activeMode === "pc"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                >
                    <Monitor className="w-4 h-4" /> Console
                </button>
                <button
                    onClick={() => setActiveMode("teams")}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${activeMode === "teams"
                        ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                >
                    <Shield className="w-4 h-4" /> Teams
                </button>
            </div>

            {activeMode !== "teams" && <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm VĐV..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[13px] font-medium text-slate-500">Hiển thị:</span>
                        {[20, 50, 100].map(n => (
                            <button
                                key={n}
                                onClick={() => setPerPage(n)}
                                className={`px-2.5 py-1 text-[13px] rounded-md transition-colors ${perPage === n ? "bg-slate-800 text-white font-semibold shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fc] border-b border-gray-100 uppercase tracking-widest text-[10px] font-bold text-gray-500">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Hạng</th>
                                <th className="px-6 py-4">ID VĐV</th>
                                <th className="px-6 py-4">Họ Tên / Nickname</th>
                                <th className="px-6 py-4 text-center">Team</th>
                                <th className="px-6 py-4 text-center">Điểm số</th>
                                <th className="px-6 py-4 text-right w-24">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : pagedPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Không tìm thấy VĐV nào trong bảng xếp hạng.
                                    </td>
                                </tr>
                            ) : (
                                pagedPlayers.map((p, index) => (
                                    <tr key={p._id || index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-center">
                                            {p.rank === 1 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">1</div>
                                            ) : p.rank === 2 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">2</div>
                                            ) : p.rank === 3 ? (
                                                <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">3</div>
                                            ) : p.rank > 0 ? (
                                                <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-500 font-bold">{p.rank}</div>
                                            ) : (
                                                <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-300 font-bold">-</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[13px] font-medium text-indigo-500">{p.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-[14px]">{p.name}</div>
                                            {p.nickname && <div className="text-[12px] text-slate-500 font-medium">{p.nickname}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.team ? <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">{p.team}</span> : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-extrabold text-[#1a1f2e] text-[15px]">{p.points}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <p className="text-[13px] text-slate-500 font-medium tracking-tight">
                            Hiển thị <span className="font-bold text-slate-700">{(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, filtered.length)}</span> trên <span className="font-bold text-slate-700">{filtered.length}</span> VĐV
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Trước
                            </button>
                            <span className="px-3 py-1.5 text-[13px] font-semibold text-slate-700">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>}

            {/* ═══ TEAMS CONTENT ═══ */}
            {activeMode === "teams" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Tìm kiếm đội..." value={teamsSearch} onChange={(e) => setTeamsSearch(e.target.value)} className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[13px] font-medium text-slate-500">Hiển thị:</span>
                        {[20, 50, 100].map(n => (
                            <button key={n} onClick={() => setPerPage(n)} className={`px-2.5 py-1 text-[13px] rounded-md transition-colors ${perPage === n ? "bg-slate-800 text-white font-semibold shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>{n}</button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fc] border-b border-gray-100 uppercase tracking-widest text-[10px] font-bold text-gray-500">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Hạng</th>
                                <th className="px-6 py-4 w-16 text-center">Logo</th>
                                <th className="px-6 py-4">Tên CLB</th>
                                <th className="px-6 py-4">Leader</th>
                                <th className="px-6 py-4 text-center">Điểm</th>
                                <th className="px-6 py-4 text-right w-24">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isTeamsLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />Đang tải...</td></tr>
                            ) : pagedTeams.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Không tìm thấy đội nào.</td></tr>
                            ) : pagedTeams.map((t, i) => (
                                <tr key={t._id||i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-center">
                                        {t.rank===1 ? <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">1</div>
                                        : t.rank===2 ? <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">2</div>
                                        : t.rank===3 ? <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm font-bold text-[13px]">3</div>
                                        : t.rank>0 ? <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-500 font-bold">{t.rank}</div>
                                        : <div className="w-7 h-7 mx-auto flex items-center justify-center text-slate-300 font-bold">-</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {t.logo ? <img src={toDirectImageUrl(t.logo)} alt={t.clubName} className="w-12 h-12 rounded-[4px] object-cover border border-slate-200 mx-auto" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                                        : <div className="w-12 h-12 rounded-[4px] bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto border border-orange-200"><Shield className="w-5 h-5 text-orange-400" /></div>}
                                    </td>
                                    <td className="px-6 py-4"><div className="font-bold text-slate-800 text-[14px]">{t.clubName}</div></td>
                                    <td className="px-6 py-4"><span className="text-[13px] text-slate-600 font-medium">{t.leader}</span></td>
                                    <td className="px-6 py-4 text-center"><span className="font-extrabold text-[#1a1f2e] text-[15px]">{t.point}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={()=>handleTeamEdit(t)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-orange-600 transition-colors"><Edit className="w-4 h-4" /></button>
                                            <button onClick={()=>handleTeamDelete(t)} className="w-8 h-8 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {teamsTotalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <p className="text-[13px] text-slate-500 font-medium">Hiển thị <span className="font-bold text-slate-700">{(teamsCurrentPage-1)*perPage+1} - {Math.min(teamsCurrentPage*perPage, filteredTeams.length)}</span> trên <span className="font-bold text-slate-700">{filteredTeams.length}</span> đội</p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={()=>setTeamsPage(p=>Math.max(1,p-1))} disabled={teamsCurrentPage===1} className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Trước</button>
                            <span className="px-3 py-1.5 text-[13px] font-semibold text-slate-700">Trang {teamsCurrentPage} / {teamsTotalPages}</span>
                            <button onClick={()=>setTeamsPage(p=>Math.min(teamsTotalPages,p+1))} disabled={teamsCurrentPage===teamsTotalPages} className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Sau</button>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Modal */}
            <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(v) => {
                if (!v) { setIsAddModalOpen(false); setIsEditModalOpen(false); }
            }}>
                <DialogContent className="sm:max-w-[500px] max-h-[95dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditModalOpen ? "Cập nhật VĐV" : "Thêm VĐV vào Bảng xếp hạng"}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={addMode} onValueChange={(v) => { if (!isEditModalOpen) setAddMode(v as "manual" | "excel") }} className="w-full mt-2">
                        {!isEditModalOpen && (
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual" className="font-semibold text-[13px]">Thêm thủ công</TabsTrigger>
                                <TabsTrigger value="excel" className="flex items-center gap-1.5 font-semibold text-[13px]">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    File Excel
                                </TabsTrigger>
                            </TabsList>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <TabsContent value="manual" className="space-y-4 m-0 outline-none">
                                <div className="space-y-2">
                                    <Label>ID VĐV (Gamer ID)</Label>
                                    <Input
                                        required
                                        value={form.gamerId}
                                        onChange={e => setForm({ ...form, gamerId: e.target.value })}
                                        placeholder="VD: efoot-123"
                                        disabled={isEditModalOpen}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Họ Tên</Label>
                                    <Input
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nickname (Tùy chọn)</Label>
                                        <Input
                                            value={form.nickname}
                                            onChange={e => setForm({ ...form, nickname: e.target.value })}
                                            placeholder="VD: Tun Tỏn"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Team (Tùy chọn)</Label>
                                        <Input
                                            value={form.team}
                                            onChange={e => setForm({ ...form, team: e.target.value })}
                                            placeholder="VD: MU"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Điểm số</Label>
                                        <Input
                                            required
                                            type="number"
                                            min={0}
                                            value={form.points}
                                            onChange={e => setForm({ ...form, points: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Thứ hạng tĩnh (Tùy chọn)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={form.rank || ""}
                                            onChange={e => setForm({ ...form, rank: Number(e.target.value) })}
                                            placeholder="Tự động xếp hạng nếu để trống"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Link Facebook (Tùy chọn)</Label>
                                    <Input
                                        type="url"
                                        value={form.facebook}
                                        onChange={e => setForm({ ...form, facebook: e.target.value })}
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="excel" className="space-y-4 m-0 outline-none">
                                <div className="flex justify-between items-center text-[13px]">
                                    <p className="text-gray-500">Tải lên file định dạng <span className="font-semibold text-gray-700">.xlsx, .csv</span></p>
                                    <a href="/assets/bxh.xlsx" download="BXH_Mau.xlsx" className="text-efb-blue hover:underline flex items-center gap-1 font-semibold">
                                        <Download className="w-3.5 h-3.5" /> Tải file mẫu
                                    </a>
                                </div>

                                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors relative cursor-pointer ${excelFile ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'}`}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleExcelChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className={`w-8 h-8 mx-auto mb-3 transition-transform group-hover:scale-110 ${excelFile ? 'text-emerald-500' : 'text-blue-400'}`} />
                                    <p className={`text-sm font-semibold ${excelFile ? 'text-emerald-900' : 'text-blue-900'}`}>
                                        {excelFile ? excelFile.name : "Kéo thả hoặc click để chọn file"}
                                    </p>
                                    {!excelFile && <p className="text-[11px] text-blue-500 mt-1.5 uppercase font-medium tracking-wide">Dung lượng tối đa 5MB</p>}
                                </div>



                                {excelPreview.length > 0 && (
                                    <>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <div className="flex items-center h-5">
                                                    <input
                                                        type="checkbox"
                                                        checked={excelReplaceAll}
                                                        onChange={(e) => setExcelReplaceAll(e.target.checked)}
                                                        className="w-4 h-4 border-slate-300 rounded text-indigo-600 focus:ring-indigo-600"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-800">Xóa dữ liệu cũ và thay thế toàn bộ (Replace All)</span>
                                                    <span className="text-[12px] text-slate-500">Hệ thống sẽ xóa sạch danh sách hiện tại và chỉ lưu các VĐV trong file Excel này. Nếu không chọn, hệ thống sẽ thêm/cập nhật danh sách cũ.</span>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 max-h-[180px] overflow-y-auto">
                                            <p className="text-[13px] font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                                Xem trước ({excelPreview.length} VĐV hợp lệ/ {excelPreview.length > 5 ? "hiển thị 5" : "tất cả"}):
                                            </p>
                                            <div className="space-y-1.5">
                                                {excelPreview.slice(0, 5).map((row, i) => (
                                                    <div key={i} className="text-[13px] flex gap-2 text-slate-600 border-b border-emerald-100/50 pb-1.5 last:border-0 last:pb-0">
                                                        <span className="font-bold text-slate-400 w-8 shrink-0">#{row.rank || "?"}</span>
                                                        <span className="font-mono text-indigo-500 w-24 shrink-0 font-medium truncate">{row.gamerId}</span>
                                                        <span className="font-bold text-slate-800 truncate flex-1 min-w-0">{row.name}</span>
                                                        <span className="ml-auto font-black text-slate-900 shrink-0 whitespace-nowrap">{row.points}</span>
                                                    </div>
                                                ))}
                                                {excelPreview.length > 5 && (
                                                    <div className="text-[12px] text-emerald-600/80 font-medium text-center pt-2 italic">
                                                        ... và {excelPreview.length - 5} VĐV khác 🚀
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="w-full flex-1" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
                                    Hủy
                                </Button>
                                <Button type="submit" className={`w-full flex-1 text-white ${addMode === "excel" && excelReplaceAll ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"}`} disabled={isSubmitting || (addMode === "excel" && excelPreview.length === 0)}>
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : addMode === "excel" ? (excelReplaceAll ? `Thay thế bằng ${excelPreview.length || ""} VĐV` : `Lưu ${excelPreview.length || ""} VĐV`) : "Lưu lại"}
                                </Button>
                            </div>
                        </form>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* ═══ TEAMS MODAL ═══ */}
            <Dialog open={isTeamAddOpen || isTeamEditOpen} onOpenChange={(v) => { if (!v) { setIsTeamAddOpen(false); setIsTeamEditOpen(false); } }}>
                <DialogContent className="sm:max-w-[520px] max-h-[95dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{isTeamEditOpen ? "Cập nhật đội" : "Thêm đội vào BXH Teams"}</DialogTitle></DialogHeader>
                    <Tabs value={teamAddMode} onValueChange={(v) => { if (!isTeamEditOpen) setTeamAddMode(v as "manual"|"excel") }} className="w-full mt-2">
                        {!isTeamEditOpen && <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="manual" className="font-semibold text-[13px]">Thêm thủ công</TabsTrigger><TabsTrigger value="excel" className="flex items-center gap-1.5 font-semibold text-[13px]"><FileSpreadsheet className="w-4 h-4" />File Excel</TabsTrigger></TabsList>}
                        <form onSubmit={handleTeamSubmit} className="space-y-4 pt-4">
                            {teamError && <div className="p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-lg border border-red-100">{teamError}</div>}
                            <TabsContent value="manual" className="space-y-4 m-0 outline-none">
                                <div className="space-y-2">
                                    <Label>Điểm</Label>
                                    <Input required type="number" min={0} value={teamForm.point} onChange={e=>setTeamForm({...teamForm,point:Number(e.target.value)})} placeholder="0" />
                                    <p className="text-[11px] text-slate-400">Thứ hạng sẽ tự động tính dựa vào điểm số (điểm cao = hạng cao hơn)</p>
                                </div>
                                <div className="space-y-2"><Label>Tên CLB</Label><Input required value={teamForm.clubName} onChange={e=>setTeamForm({...teamForm,clubName:e.target.value})} placeholder="FC Barcelona" /></div>
                                <div className="space-y-2"><Label>Leader</Label><Input required value={teamForm.leader} onChange={e=>setTeamForm({...teamForm,leader:e.target.value})} placeholder="Nguyễn Văn A" /></div>
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <div className="flex items-center gap-2 mb-2">
                                        <button type="button" onClick={()=>{setLogoMode("link");setLogoFile(null)}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${logoMode==="link"?"bg-orange-100 text-orange-700 border border-orange-200":"bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}><Link2 className="w-3.5 h-3.5" /> Link URL</button>
                                        <button type="button" onClick={()=>setLogoMode("upload")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${logoMode==="upload"?"bg-orange-100 text-orange-700 border border-orange-200":"bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}><ImageIcon className="w-3.5 h-3.5" /> Upload ảnh</button>
                                    </div>
                                    {logoMode==="link" ? <Input type="url" value={teamForm.logo} onChange={e=>{setTeamForm({...teamForm,logo:e.target.value});setLogoPreview(e.target.value)}} placeholder="https://example.com/logo.png" />
                                    : <div className={`border-2 border-dashed rounded-xl p-4 text-center relative cursor-pointer ${logoFile?'border-orange-300 bg-orange-50/50':'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                                        <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <ImageIcon className={`w-6 h-6 mx-auto mb-2 ${logoFile?'text-orange-500':'text-slate-400'}`} />
                                        <p className={`text-[12px] font-semibold ${logoFile?'text-orange-900':'text-slate-600'}`}>{logoFile?logoFile.name:"Kéo thả hoặc click chọn ảnh"}</p>
                                    </div>}
                                    {logoPreview && <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                        <img src={logoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                                        <span className="text-[12px] text-slate-500 flex-1 truncate">Preview logo</span>
                                        <button type="button" onClick={()=>{setLogoPreview("");setTeamForm({...teamForm,logo:""});setLogoFile(null)}} className="w-6 h-6 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300"><X className="w-3.5 h-3.5" /></button>
                                    </div>}
                                </div>
                            </TabsContent>
                            <TabsContent value="excel" className="space-y-4 m-0 outline-none">
                                <div className="flex justify-between items-center text-[13px]"><p className="text-gray-500">File <span className="font-semibold text-gray-700">.xlsx, .csv</span></p><p className="text-[11px] text-slate-400">RANK, CLUB NAME, Leader, Point, Logo</p></div>
                                <div className={`border-2 border-dashed rounded-xl p-8 text-center relative cursor-pointer ${teamExcelFile?'border-emerald-300 bg-emerald-50/50':'border-orange-200 bg-orange-50/50 hover:bg-orange-50'}`}>
                                    <input type="file" ref={teamFileRef} accept=".xlsx,.xls,.csv" onChange={handleTeamExcelChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <Upload className={`w-8 h-8 mx-auto mb-3 ${teamExcelFile?'text-emerald-500':'text-orange-400'}`} />
                                    <p className={`text-sm font-semibold ${teamExcelFile?'text-emerald-900':'text-orange-900'}`}>{teamExcelFile?teamExcelFile.name:"Kéo thả hoặc click để chọn file"}</p>
                                </div>
                                {teamExcelPreview.length>0 && <>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input type="checkbox" checked={teamExcelReplace} onChange={e=>setTeamExcelReplace(e.target.checked)} className="w-4 h-4 mt-0.5 border-slate-300 rounded text-orange-600" />
                                            <div><span className="text-[13px] font-bold text-slate-800">Thay thế toàn bộ (Replace All)</span><br/><span className="text-[12px] text-slate-500">Xóa sạch danh sách cũ và chỉ lưu file này.</span></div>
                                        </label>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 max-h-[180px] overflow-y-auto">
                                        <p className="text-[13px] font-bold text-emerald-800 mb-3">Xem trước ({teamExcelPreview.length} đội):</p>
                                        {teamExcelPreview.slice(0,5).map((r,i)=>(<div key={i} className="text-[13px] flex gap-2 text-slate-600 border-b border-emerald-100/50 pb-1.5 last:border-0"><span className="font-bold text-slate-400 w-8">#{r.rank||"?"}</span><span className="font-bold text-slate-800 truncate flex-1">{r.clubName}</span><span className="text-[12px] text-slate-500">{r.leader}</span><span className="ml-auto font-black text-slate-900">{r.point}</span></div>))}
                                        {teamExcelPreview.length>5 && <div className="text-[12px] text-emerald-600/80 font-medium text-center pt-2 italic">... và {teamExcelPreview.length-5} đội khác 🏆</div>}
                                    </div>
                                </>}
                            </TabsContent>
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="w-full flex-1" onClick={()=>{setIsTeamAddOpen(false);setIsTeamEditOpen(false)}}>Hủy</Button>
                                <Button type="submit" className={`w-full flex-1 text-white ${teamAddMode==="excel"&&teamExcelReplace?"bg-rose-500 hover:bg-rose-600":"bg-orange-600 hover:bg-orange-700"}`} disabled={isSubmitting||(teamAddMode==="excel"&&teamExcelPreview.length===0)}>
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : teamAddMode==="excel" ? (teamExcelReplace?`Thay thế ${teamExcelPreview.length} đội`:`Lưu ${teamExcelPreview.length} đội`) : "Lưu lại"}
                                </Button>
                            </div>
                        </form>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* ═══ SEO MODAL ═══ */}
            <Dialog open={isSeoModalOpen} onOpenChange={(v) => { if (!v) setIsSeoModalOpen(false); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Cài đặt SEO - Bảng xếp hạng {activeMode === "mobile" ? "Mobile" : activeMode === "pc" ? "Console" : "Teams"}</DialogTitle>
                    </DialogHeader>
                    {isSeoLoading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                    ) : (
                        <div className="space-y-4 pt-4 text-[13px]">
                            <p className="text-slate-500">Cấu hình ảnh Thumbnail dùng khi chia sẻ ({activeMode === "mobile" ? "Mobile" : activeMode === "pc" ? "Console" : "Teams"}) lên Facebook, Zalo, Telegram...</p>
                            
                            <div className="space-y-2">
                                <Label>Ảnh Thumbnail (Open Graph Image)</Label>
                                <div className="flex items-center gap-2 mb-2">
                                    <button type="button" onClick={() => { setSeoUploadMode("link"); setSeoFile(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${seoUploadMode === "link" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}><Link2 className="w-3.5 h-3.5" /> Link URL</button>
                                    <button type="button" onClick={() => setSeoUploadMode("upload")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${seoUploadMode === "upload" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}><ImageIcon className="w-3.5 h-3.5" /> Upload ảnh</button>
                                </div>
                                
                                {seoUploadMode === "link" ? (
                                    <Input
                                        type="url"
                                        value={(seoForm as any)[activeMode === "mobile" ? "bxhMobileOgImage" : activeMode === "pc" ? "bxhConsoleOgImage" : "bxhTeamsOgImage"]}
                                        onChange={e => setSeoForm({ ...seoForm, [activeMode === "mobile" ? "bxhMobileOgImage" : activeMode === "pc" ? "bxhConsoleOgImage" : "bxhTeamsOgImage"]: e.target.value })}
                                        placeholder="https://example.com/seo-image.jpg"
                                    />
                                ) : (
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center relative cursor-pointer ${seoFile ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                                        <input type="file" ref={seoInputRef} accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setSeoFile(file);
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <ImageIcon className={`w-6 h-6 mx-auto mb-2 ${seoFile ? 'text-purple-500' : 'text-slate-400'}`} />
                                        <p className={`text-[12px] font-semibold ${seoFile ? 'text-purple-900' : 'text-slate-600'}`}>{seoFile ? seoFile.name : "Kéo thả hoặc click chọn ảnh upload"}</p>
                                    </div>
                                )}
                                
                                <div className="mt-3">
                                    <Label className="text-[12px] text-slate-400">Xem trước (Kích thước chuẩn: 1200x630)</Label>
                                    <div className="w-full aspect-[1200/630] rounded-xl overflow-hidden border border-slate-200 mt-2 bg-slate-100 flex flex-col items-center justify-center relative">
                                        {(seoUploadMode === "upload" && seoFile) ? (
                                            <img src={URL.createObjectURL(seoFile)} alt="SEO Preview" className="w-full h-full object-cover" />
                                        ) : (seoForm as any)[activeMode === "mobile" ? "bxhMobileOgImage" : activeMode === "pc" ? "bxhConsoleOgImage" : "bxhTeamsOgImage"] ? (
                                            <img src={(seoForm as any)[activeMode === "mobile" ? "bxhMobileOgImage" : activeMode === "pc" ? "bxhConsoleOgImage" : "bxhTeamsOgImage"]} alt="SEO Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/efootball_bg.webp"; }} />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-slate-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="w-full flex-1" onClick={() => setIsSeoModalOpen(false)}>Hủy</Button>
                                <Button type="button" className="w-full flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={isSeoLoading} onClick={handleSaveSeo}>
                                    {isSeoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu cài đặt SEO"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
