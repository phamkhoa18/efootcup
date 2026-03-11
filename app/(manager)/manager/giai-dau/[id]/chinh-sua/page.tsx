"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format as formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Trophy, ArrowLeft, Loader2, Calendar as CalendarIcon, Users,
    DollarSign, Settings, Info, Gamepad2, Monitor, Smartphone,
    Globe, MapPin, Wifi, CheckCircle2, Zap, Shield,
    Hash, Award, Crown, Save, BarChart3
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { EFV_TIER_OPTIONS, EFV_PC_TIER_OPTIONS } from "@/lib/efv-points";
import { toast } from "sonner";

/* ===== Helpers ===== */
function formatVNCurrency(val: string | number): string {
    const num = typeof val === "string" ? val.replace(/\D/g, "") : String(val);
    if (!num) return "";
    return Number(num).toLocaleString("vi-VN");
}

function parseVNCurrency(formatted: string): number {
    return parseInt(formatted.replace(/\./g, "").replace(/\D/g, ""), 10) || 0;
}

/* ===== Currency Input ===== */
function CurrencyInput({ value, onChange, placeholder, className }: {
    value: string; onChange: (raw: string) => void; placeholder?: string; className?: string;
}) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "");
        onChange(raw);
    };
    return (
        <Input
            value={value ? formatVNCurrency(value) : ""}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
            inputMode="numeric"
        />
    );
}

/* ===== Date Picker ===== */
function DatePicker({ label, value, onChange }: {
    label: string; value: Date | undefined; onChange: (date: Date | undefined) => void;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`w-full h-12 rounded-xl justify-start text-left font-normal px-3 ${!value ? "text-muted-foreground" : ""}`}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                    {value ? (
                        <span className="truncate">
                            {formatDate(value, "dd/MM/yyyy", { locale: vi })}
                        </span>
                    ) : (
                        <span className="text-gray-400">{label}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    className="rounded-md"
                />
            </PopoverContent>
        </Popover>
    );
}

/* ===== Constants ===== */
const formatOptions = [
    { value: "single_elimination", label: "Loại trực tiếp", icon: Zap, desc: "Thua 1 trận là bị loại.", color: "text-red-600 bg-red-50" },
    { value: "double_elimination", label: "Loại kép", icon: Shield, desc: "Thua 2 trận mới bị loại.", color: "text-orange-600 bg-orange-50" },
    { value: "round_robin", label: "Vòng tròn", icon: Users, desc: "Mỗi đội đấu với tất cả đội khác.", color: "text-blue-600 bg-blue-50" },
    { value: "group_stage", label: "Vòng bảng + Loại trực tiếp", icon: BarChart3, desc: "Chia bảng đấu vòng tròn.", color: "text-purple-600 bg-purple-50" },
    { value: "swiss", label: "Swiss System", icon: Hash, desc: "Ghép cặp theo thành tích.", color: "text-emerald-600 bg-emerald-50" },
];

const platformOptions = [
    { value: "pc", label: "PC", icon: Monitor },
    { value: "ps5", label: "PS5", icon: Gamepad2 },
    { value: "ps4", label: "PS4", icon: Gamepad2 },
    { value: "mobile", label: "Mobile", icon: Smartphone },
    { value: "cross_platform", label: "Đa nền tảng", icon: Globe },
];

const teamSizeOptions = [
    { value: 1, label: "1v1" },
    { value: 2, label: "2v2" },
    { value: 3, label: "3v3" },
    { value: 5, label: "5v5" },
    { value: 11, label: "11v11" },
];

/* ===== Extract raw number from prize string like "5.000.000 VNĐ" ===== */
function extractPrizeRaw(prizeStr: string | undefined): string {
    if (!prizeStr) return "";
    const digits = prizeStr.replace(/[^\d]/g, "");
    return digits && Number(digits) > 0 ? digits : "";
}

/* ===== Main Component ===== */
export default function EditTournamentPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    // Basic Info
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gameVersion, setGameVersion] = useState("eFootball 2025");
    const [tags, setTags] = useState("");

    // Mode & EFV Tier
    const [mode, setMode] = useState<"mobile" | "pc" | "free">("mobile");
    const [efvTier, setEfvTier] = useState<string | null>(null);

    // Format & Settings
    const [format, setFormat] = useState("single_elimination");
    const [platform, setPlatform] = useState("cross_platform");
    const [maxTeamsStr, setMaxTeamsStr] = useState("16");
    const [teamSize, setTeamSize] = useState(1);
    const [isOnline, setIsOnline] = useState(true);
    const [location, setLocation] = useState("");

    // Scoring
    const [pointsPerWin, setPointsPerWin] = useState("3");
    const [pointsPerDraw, setPointsPerDraw] = useState("1");
    const [pointsPerLoss, setPointsPerLoss] = useState("0");
    const [teamsPerGroup, setTeamsPerGroup] = useState("4");
    const [advancePerGroup, setAdvancePerGroup] = useState("2");
    const [numberOfRounds, setNumberOfRounds] = useState("0");
    const [resetFinal, setResetFinal] = useState(true);

    // Schedule
    const [registrationStart, setRegistrationStart] = useState<Date | undefined>();
    const [registrationEnd, setRegistrationEnd] = useState<Date | undefined>();
    const [tournamentStart, setTournamentStart] = useState<Date | undefined>();
    const [tournamentEnd, setTournamentEnd] = useState<Date | undefined>();

    // Prize
    const [prizeTotal, setPrizeTotal] = useState("");
    const [prizeFirst, setPrizeFirst] = useState("");
    const [prizeSecond, setPrizeSecond] = useState("");
    const [prizeThird, setPrizeThird] = useState("");
    const [entryFee, setEntryFee] = useState("");

    // Rules & Settings
    const [rules, setRules] = useState("");
    const [matchDuration, setMatchDuration] = useState("10");
    const [extraTime, setExtraTime] = useState(true);
    const [penalties, setPenalties] = useState(true);
    const [legsPerRound, setLegsPerRound] = useState(1);
    const [isPublic, setIsPublic] = useState(true);

    // Contact
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactFacebook, setContactFacebook] = useState("");
    const [contactDiscord, setContactDiscord] = useState("");
    const [contactZalo, setContactZalo] = useState("");

    const maxTeams = parseInt(maxTeamsStr, 10) || 2;
    const showScoringConfig = ["round_robin", "group_stage", "swiss"].includes(format);

    /* ===== Load tournament data ===== */
    useEffect(() => {
        const loadTournament = async () => {
            try {
                const res = await tournamentAPI.getById(id);
                if (res.success && res.data?.tournament) {
                    const t = res.data.tournament;
                    setTitle(t.title || "");
                    setDescription(t.description || "");
                    setGameVersion(t.gameVersion || "eFootball 2025");
                    setTags(Array.isArray(t.tags) ? t.tags.join(", ") : "");
                    setMode(t.mode || "mobile");
                    setEfvTier(t.efvTier || null);
                    setFormat(t.format || "single_elimination");
                    setPlatform(t.platform || "cross_platform");
                    setMaxTeamsStr(String(t.maxTeams || 16));
                    setTeamSize(t.teamSize || 1);
                    setIsOnline(t.isOnline !== false);
                    setLocation(t.location || "");

                    // Scoring
                    setPointsPerWin(String(t.scoring?.pointsPerWin ?? 3));
                    setPointsPerDraw(String(t.scoring?.pointsPerDraw ?? 1));
                    setPointsPerLoss(String(t.scoring?.pointsPerLoss ?? 0));
                    setTeamsPerGroup(String(t.scoring?.teamsPerGroup ?? 4));
                    setAdvancePerGroup(String(t.scoring?.advancePerGroup ?? 2));
                    setNumberOfRounds(String(t.scoring?.numberOfRounds ?? 0));
                    setResetFinal(t.scoring?.resetFinal !== false);

                    // Schedule
                    if (t.schedule?.registrationStart) setRegistrationStart(new Date(t.schedule.registrationStart));
                    if (t.schedule?.registrationEnd) setRegistrationEnd(new Date(t.schedule.registrationEnd));
                    if (t.schedule?.tournamentStart) setTournamentStart(new Date(t.schedule.tournamentStart));
                    if (t.schedule?.tournamentEnd) setTournamentEnd(new Date(t.schedule.tournamentEnd));

                    // Prize
                    setPrizeTotal(extractPrizeRaw(t.prize?.total));
                    setPrizeFirst(extractPrizeRaw(t.prize?.first));
                    setPrizeSecond(extractPrizeRaw(t.prize?.second));
                    setPrizeThird(extractPrizeRaw(t.prize?.third));
                    setEntryFee(String(t.entryFee || ""));

                    // Rules & Settings
                    setRules(t.rules || "");
                    setMatchDuration(String(t.settings?.matchDuration || 10));
                    setExtraTime(t.settings?.extraTime !== false);
                    setPenalties(t.settings?.penalties !== false);
                    setLegsPerRound(t.settings?.legsPerRound || 1);
                    setIsPublic(t.isPublic !== false);

                    // Contact
                    setContactPhone(t.contact?.phone || "");
                    setContactEmail(t.contact?.email || "");
                    setContactFacebook(t.contact?.facebook || "");
                    setContactDiscord(t.contact?.discord || "");
                    setContactZalo(t.contact?.zalo || "");
                } else {
                    setError("Không tìm thấy giải đấu");
                }
            } catch {
                setError("Lỗi tải thông tin giải đấu");
            } finally {
                setIsLoading(false);
            }
        };
        loadTournament();
    }, [id]);

    /* ===== Handle Save ===== */
    const handleSave = async () => {
        if (!title.trim()) {
            setError("Vui lòng nhập tên giải đấu");
            return;
        }
        setError("");
        setIsSaving(true);

        try {
            const scoring: any = {
                pointsPerWin: parseInt(pointsPerWin, 10) || 0,
                pointsPerDraw: parseInt(pointsPerDraw, 10) || 0,
                pointsPerLoss: parseInt(pointsPerLoss, 10) || 0,
            };

            switch (format) {
                case "round_robin":
                    scoring.tiebreakers = ["points", "goalDifference", "goalsFor", "headToHead"];
                    break;
                case "group_stage":
                    scoring.tiebreakers = ["points", "goalDifference", "goalsFor", "headToHead"];
                    scoring.teamsPerGroup = parseInt(teamsPerGroup, 10) || 4;
                    scoring.advancePerGroup = parseInt(advancePerGroup, 10) || 2;
                    break;
                case "swiss":
                    scoring.tiebreakers = ["points", "buchholz", "goalDifference", "goalsFor"];
                    scoring.numberOfRounds = parseInt(numberOfRounds, 10) || Math.ceil(Math.log2(maxTeams));
                    break;
                case "double_elimination":
                    scoring.resetFinal = resetFinal;
                    break;
            }

            const formatPrize = (raw: string) => raw ? formatVNCurrency(raw) + " VNĐ" : "";

            const updateData = {
                title,
                description,
                gameVersion,
                format,
                platform,
                maxTeams,
                teamSize,
                isOnline,
                location,
                schedule: {
                    registrationStart: registrationStart?.toISOString() || undefined,
                    registrationEnd: registrationEnd?.toISOString() || undefined,
                    tournamentStart: tournamentStart?.toISOString() || undefined,
                    tournamentEnd: tournamentEnd?.toISOString() || undefined,
                },
                prize: {
                    total: prizeTotal ? formatPrize(prizeTotal) : "0 VNĐ",
                    first: formatPrize(prizeFirst),
                    second: formatPrize(prizeSecond),
                    third: formatPrize(prizeThird),
                },
                scoring,
                entryFee: parseVNCurrency(entryFee),
                rules,
                settings: {
                    matchDuration: parseInt(matchDuration, 10) || 10,
                    extraTime,
                    penalties,
                    legsPerRound,
                },
                contact: {
                    phone: contactPhone,
                    email: contactEmail,
                    facebook: contactFacebook,
                    discord: contactDiscord,
                    zalo: contactZalo,
                },
                isPublic,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                mode,
                efvTier: efvTier || null,
            };

            const res = await tournamentAPI.update(id, updateData);

            if (res.success) {
                toast.success("✅ Đã cập nhật giải đấu thành công!");
                router.push(`/manager/giai-dau/${id}`);
            } else {
                setError(res.message || "Có lỗi xảy ra khi cập nhật giải đấu");
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-efb-blue" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push(`/manager/giai-dau/${id}`)}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-efb-text-secondary" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold text-efb-dark">Chỉnh sửa giải đấu</h1>
                    <p className="text-sm text-efb-text-muted">Cập nhật thông tin giải đấu</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-11 px-6"
                >
                    {isSaving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" />Lưu thay đổi</>
                    )}
                </Button>
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                {/* ===== Section 1: Thông tin cơ bản ===== */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-white p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Info className="w-5 h-5 text-efb-blue" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Thông tin cơ bản</h2>
                            <p className="text-xs text-efb-text-muted">Tên, mô tả và thông tin chung</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tên giải đấu *</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: eFootball Cup VN Season 5" className="h-12 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Mô tả</Label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Giới thiệu về giải đấu..." rows={4}
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Phiên bản game</Label>
                        <Input value={gameVersion} onChange={(e) => setGameVersion(e.target.value)} placeholder="eFootball 2025" className="h-12 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags (phân cách bằng dấu phẩy)</Label>
                        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="efootball, tournament, vietnam" className="h-12 rounded-xl" />
                    </div>

                    {/* Mode */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <Label className="text-sm font-medium">Chế độ thi đấu *</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <button type="button" onClick={() => setMode("mobile")}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${mode === "mobile" ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === "mobile" ? "bg-efb-blue/10" : "bg-gray-100"}`}>
                                    <Smartphone className={`w-5 h-5 ${mode === "mobile" ? "text-efb-blue" : "text-gray-400"}`} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${mode === "mobile" ? "text-efb-blue" : "text-gray-600"}`}>Mobile</div>
                                    <div className="text-[11px] text-gray-400">eFootball Mobile</div>
                                </div>
                            </button>
                            <button type="button" onClick={() => { setMode("pc"); setEfvTier(null); }}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${mode === "pc" ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === "pc" ? "bg-efb-blue/10" : "bg-gray-100"}`}>
                                    <Monitor className={`w-5 h-5 ${mode === "pc" ? "text-efb-blue" : "text-gray-400"}`} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${mode === "pc" ? "text-efb-blue" : "text-gray-600"}`}>Console</div>
                                    <div className="text-[11px] text-gray-400">eFootball Console</div>
                                </div>
                            </button>
                            <button type="button" onClick={() => { setMode("free"); setEfvTier(null); }}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${mode === "free" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === "free" ? "bg-emerald-100" : "bg-gray-100"}`}>
                                    <Gamepad2 className={`w-5 h-5 ${mode === "free" ? "text-emerald-600" : "text-gray-400"}`} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${mode === "free" ? "text-emerald-600" : "text-gray-600"}`}>Tự do</div>
                                    <div className="text-[11px] text-gray-400">Không tính điểm</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* EFV Tier */}
                    {mode !== "free" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-500" />
                                <Label className="text-sm font-medium">Hạng điểm EFV ({mode === "mobile" ? "Mobile" : "Console"}) *</Label>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {(mode === "mobile" ? EFV_TIER_OPTIONS : EFV_PC_TIER_OPTIONS).map((tier) => (
                                    <button key={tier.value} type="button" onClick={() => setEfvTier(tier.value)}
                                        className={`relative p-4 rounded-xl border-2 transition-all text-center group ${efvTier === tier.value ? `${tier.borderColor} ${tier.bgColor}` : "border-gray-200 hover:border-gray-300"}`}>
                                        <div className={`w-10 h-10 rounded-xl mx-auto mb-2.5 bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                            <Crown className="w-5 h-5 text-white" />
                                        </div>
                                        <div className={`text-sm font-bold ${efvTier === tier.value ? tier.textColor : "text-gray-700"}`}>{tier.label}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{tier.description}</div>
                                        <div className={`text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full inline-block ${efvTier === tier.value ? `${tier.bgColor} ${tier.textColor}` : "bg-gray-100 text-gray-500"}`}>
                                            {tier.pointRange}
                                        </div>
                                        {efvTier === tier.value && (
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-efb-blue flex items-center justify-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {mode === "free" && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
                            <p className="text-sm text-gray-500 font-medium">🎯 Giải tự do — không tính điểm EFV</p>
                        </div>
                    )}
                </motion.div>

                {/* ===== Section 2: Thể thức & Cài đặt ===== */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-white p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Thể thức & Cài đặt</h2>
                            <p className="text-xs text-efb-text-muted">Thể thức thi đấu và cấu hình</p>
                        </div>
                    </div>

                    {/* Format */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Thể thức thi đấu *</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {formatOptions.map((fmt) => (
                                <button key={fmt.value} type="button" onClick={() => setFormat(fmt.value)}
                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${format === fmt.value ? "border-efb-blue bg-efb-blue/[0.03]" : "border-gray-200 hover:border-gray-300"}`}>
                                    <div className={`w-8 h-8 rounded-lg ${fmt.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <fmt.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-efb-dark">{fmt.label}</div>
                                        <div className="text-xs text-efb-text-muted mt-0.5">{fmt.desc}</div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${format === fmt.value ? "border-efb-blue" : "border-gray-300"}`}>
                                        {format === fmt.value && <div className="w-2.5 h-2.5 rounded-full bg-efb-blue" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scoring Config */}
                    {showScoringConfig && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-efb-blue" />
                                <Label className="text-sm font-semibold text-efb-dark">Cấu hình điểm số</Label>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Thắng</Label>
                                    <Input value={pointsPerWin} onChange={(e) => setPointsPerWin(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl text-center font-bold text-emerald-600" inputMode="numeric" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Hòa</Label>
                                    <Input value={pointsPerDraw} onChange={(e) => setPointsPerDraw(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl text-center font-bold text-amber-600" inputMode="numeric" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Thua</Label>
                                    <Input value={pointsPerLoss} onChange={(e) => setPointsPerLoss(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl text-center font-bold text-red-500" inputMode="numeric" />
                                </div>
                            </div>
                            {format === "group_stage" && (
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-efb-text-muted">Số đội/bảng</Label>
                                        <Input value={teamsPerGroup} onChange={(e) => setTeamsPerGroup(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" inputMode="numeric" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-efb-text-muted">Đội đi tiếp/bảng</Label>
                                        <Input value={advancePerGroup} onChange={(e) => setAdvancePerGroup(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" inputMode="numeric" />
                                    </div>
                                </div>
                            )}
                            {format === "swiss" && (
                                <div className="pt-2 border-t border-gray-200 space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Số vòng đấu (0 = tự tính: {Math.ceil(Math.log2(maxTeams))} vòng)</Label>
                                    <Input value={numberOfRounds} onChange={(e) => setNumberOfRounds(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" inputMode="numeric" />
                                </div>
                            )}
                            {format === "double_elimination" && (
                                <div className="pt-2 border-t border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={resetFinal} onChange={(e) => setResetFinal(e.target.checked)} className="rounded border-gray-300 text-efb-blue focus:ring-efb-blue" />
                                        <span className="text-sm text-efb-text-secondary">Grand Final Reset</span>
                                    </label>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Platform */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Nền tảng</Label>
                        <div className="flex flex-wrap gap-2">
                            {platformOptions.map((p) => (
                                <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${platform === p.value ? "border-efb-blue bg-efb-blue/5 text-efb-blue font-medium" : "border-gray-200 text-efb-text-secondary hover:border-gray-300"}`}>
                                    <p.icon className="w-4 h-4" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Số đội tối đa *</Label>
                            <Input value={maxTeamsStr} onChange={(e) => setMaxTeamsStr(e.target.value.replace(/\D/g, ""))}
                                onBlur={() => { const n = parseInt(maxTeamsStr, 10); if (!n || n < 2) setMaxTeamsStr("2"); else if (n > 1024) setMaxTeamsStr("1024"); }}
                                placeholder="16" className="h-12 rounded-xl" inputMode="numeric" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Kích thước đội</Label>
                            <div className="flex gap-2">
                                {teamSizeOptions.map((s) => (
                                    <button key={s.value} type="button" onClick={() => setTeamSize(s.value)}
                                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${teamSize === s.value ? "border-efb-blue bg-efb-blue/5 text-efb-blue" : "border-gray-200 text-efb-text-secondary"}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Online/Offline */}
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsOnline(true)}
                            className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${isOnline ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <Wifi className={`w-5 h-5 ${isOnline ? "text-efb-blue" : "text-gray-400"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-medium ${isOnline ? "text-efb-blue" : "text-gray-600"}`}>Online</div>
                                <div className="text-[11px] text-gray-400">Thi đấu trực tuyến</div>
                            </div>
                        </button>
                        <button type="button" onClick={() => setIsOnline(false)}
                            className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${!isOnline ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}>
                            <MapPin className={`w-5 h-5 ${!isOnline ? "text-efb-blue" : "text-gray-400"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-medium ${!isOnline ? "text-efb-blue" : "text-gray-600"}`}>Offline</div>
                                <div className="text-[11px] text-gray-400">Thi đấu trực tiếp</div>
                            </div>
                        </button>
                    </div>
                    {!isOnline && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Địa điểm</Label>
                            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nhập địa chỉ thi đấu" className="h-12 rounded-xl" />
                        </div>
                    )}
                </motion.div>

                {/* ===== Section 3: Lịch trình & Giải thưởng ===== */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-white p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Lịch trình & Giải thưởng</h2>
                            <p className="text-xs text-efb-text-muted">Thời gian và giải thưởng</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Bắt đầu đăng ký</Label>
                            <DatePicker label="Chọn ngày" value={registrationStart} onChange={setRegistrationStart} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Kết thúc đăng ký</Label>
                            <DatePicker label="Chọn ngày" value={registrationEnd} onChange={setRegistrationEnd} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Ngày bắt đầu giải</Label>
                            <DatePicker label="Chọn ngày" value={tournamentStart} onChange={setTournamentStart} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Ngày kết thúc giải</Label>
                            <DatePicker label="Chọn ngày" value={tournamentEnd} onChange={setTournamentEnd} />
                        </div>
                    </div>

                    {/* Prize */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-4 h-4 text-amber-500" />
                            <Label className="text-sm font-semibold text-efb-dark">Giải thưởng</Label>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Tổng giải thưởng (VNĐ)</Label>
                                <CurrencyInput value={prizeTotal} onChange={setPrizeTotal} placeholder="VD: 10.000.000" className="h-12 rounded-xl" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥇 Nhất</Label>
                                    <CurrencyInput value={prizeFirst} onChange={setPrizeFirst} placeholder="5.000.000" className="h-10 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥈 Nhì</Label>
                                    <CurrencyInput value={prizeSecond} onChange={setPrizeSecond} placeholder="3.000.000" className="h-10 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥉 Ba</Label>
                                    <CurrencyInput value={prizeThird} onChange={setPrizeThird} placeholder="1.000.000" className="h-10 rounded-xl text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label className="text-xs text-efb-text-muted">Phí tham gia (0 = miễn phí)</Label>
                            <CurrencyInput value={entryFee} onChange={setEntryFee} placeholder="0" className="h-12 rounded-xl" />
                        </div>
                    </div>
                </motion.div>

                {/* ===== Section 4: Nội quy & Liên hệ ===== */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-white p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Nội quy & Liên hệ</h2>
                            <p className="text-xs text-efb-text-muted">Cài đặt trận đấu, nội quy và thông tin liên hệ</p>
                        </div>
                    </div>

                    {/* Match Settings */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Cài đặt trận đấu</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Thời gian trận (phút)</Label>
                                <Input value={matchDuration} onChange={(e) => setMatchDuration(e.target.value.replace(/\D/g, ""))} className="h-10 rounded-xl" inputMode="numeric" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Lượt/vòng</Label>
                                <div className="flex gap-2">
                                    {[1, 2].map((v) => (
                                        <button key={v} type="button" onClick={() => setLegsPerRound(v)}
                                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${legsPerRound === v ? "border-efb-blue bg-efb-blue/5 text-efb-blue" : "border-gray-200 text-efb-text-secondary"}`}>
                                            {v} lượt
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={extraTime} onChange={(e) => setExtraTime(e.target.checked)} className="rounded border-gray-300 text-efb-blue focus:ring-efb-blue" />
                                <span className="text-sm text-efb-text-secondary">Hiệp phụ</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={penalties} onChange={(e) => setPenalties(e.target.checked)} className="rounded border-gray-300 text-efb-blue focus:ring-efb-blue" />
                                <span className="text-sm text-efb-text-secondary">Penalty</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-gray-300 text-efb-blue focus:ring-efb-blue" />
                                <span className="text-sm text-efb-text-secondary">Công khai</span>
                            </label>
                        </div>
                    </div>

                    {/* Rules */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Nội quy giải đấu</Label>
                        <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Nhập nội quy, quy định của giải đấu..." rows={5}
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                        />
                    </div>

                    {/* Contact */}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <Label className="text-sm font-semibold">Thông tin liên hệ</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Số điện thoại</Label>
                                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0xxx xxx xxx" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Email</Label>
                                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@example.com" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Facebook</Label>
                                <Input value={contactFacebook} onChange={(e) => setContactFacebook(e.target.value)} placeholder="Link Facebook" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Discord</Label>
                                <Input value={contactDiscord} onChange={(e) => setContactDiscord(e.target.value)} placeholder="Link Discord" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label className="text-xs text-efb-text-muted">Zalo</Label>
                                <Input value={contactZalo} onChange={(e) => setContactZalo(e.target.value)} placeholder="Link/SĐT Zalo" className="h-10 rounded-xl text-sm" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Save Button (bottom) */}
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={() => router.push(`/manager/giai-dau/${id}`)} className="rounded-xl h-11 px-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-11 px-8">
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" />Lưu thay đổi</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
