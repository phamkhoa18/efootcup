"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format as formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Trophy, ArrowLeft, ArrowRight, Loader2, Calendar as CalendarIcon, Users,
    DollarSign, Settings, Info, Gamepad2, Monitor, Smartphone,
    Globe, MapPin, Wifi, CheckCircle2, BarChart3, Zap, Shield,
    Hash, Award
} from "lucide-react";
import { tournamentAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/* ===== Helpers ===== */

// Format number to Vietnamese currency style: 10.000.000
function formatVNCurrency(val: string | number): string {
    const num = typeof val === "string" ? val.replace(/\D/g, "") : String(val);
    if (!num) return "";
    return Number(num).toLocaleString("vi-VN");
}

// Parse Vietnamese formatted number back to raw number
function parseVNCurrency(formatted: string): number {
    return parseInt(formatted.replace(/\./g, "").replace(/\D/g, ""), 10) || 0;
}

/* ===== Currency Input ===== */
function CurrencyInput({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (raw: string) => void;
    placeholder?: string;
    className?: string;
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
function DatePicker({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
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

/* ===== Format Options ===== */
const formatOptions = [
    {
        value: "single_elimination", label: "Loại trực tiếp", icon: Zap,
        desc: "Thua 1 trận là bị loại. Nhanh gọn, phù hợp giải nhỏ.",
        scoring: "Không tính điểm, thua = loại",
        color: "text-red-600 bg-red-50",
    },
    {
        value: "double_elimination", label: "Loại kép", icon: Shield,
        desc: "Thua 2 trận mới bị loại. Có nhánh thắng và nhánh thua.",
        scoring: "Thua lần 1 → nhánh thua, thua lần 2 → loại",
        color: "text-orange-600 bg-orange-50",
    },
    {
        value: "round_robin", label: "Vòng tròn", icon: Users,
        desc: "Mỗi đội đấu với tất cả đội khác. Công bằng nhất.",
        scoring: "Thắng=3đ, Hòa=1đ, Thua=0đ",
        color: "text-blue-600 bg-blue-50",
    },
    {
        value: "group_stage", label: "Vòng bảng + Loại trực tiếp", icon: BarChart3,
        desc: "Chia bảng đấu vòng tròn, đội đứng đầu vào vòng loại trực tiếp.",
        scoring: "Vòng bảng: Thắng=3đ, Hòa=1đ. Knock-out: Thua=loại",
        color: "text-purple-600 bg-purple-50",
    },
    {
        value: "swiss", label: "Swiss System", icon: Hash,
        desc: "Ghép cặp theo thành tích hiện tại. Nhiều trận, ít vòng.",
        scoring: "Thắng=3đ, Hòa=1đ. XH: Điểm → Buchholz → Hiệu số",
        color: "text-emerald-600 bg-emerald-50",
    },
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

const tiebreakerLabels: Record<string, string> = {
    points: "Điểm số",
    goalDifference: "Hiệu số bàn thắng",
    goalsFor: "Bàn thắng ghi được",
    headToHead: "Đối đầu trực tiếp",
    buchholz: "Hệ số Buchholz",
};

/* ===== Main Component ===== */
export default function TaoGiaiDauPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Basic Info
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gameVersion, setGameVersion] = useState("eFootball 2025");
    const [tags, setTags] = useState("");

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

    // Schedule (Date objects)
    const [registrationStart, setRegistrationStart] = useState<Date | undefined>();
    const [registrationEnd, setRegistrationEnd] = useState<Date | undefined>();
    const [tournamentStart, setTournamentStart] = useState<Date | undefined>();
    const [tournamentEnd, setTournamentEnd] = useState<Date | undefined>();

    // Prize (raw number strings for formatting)
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

    // Derived values
    const maxTeams = parseInt(maxTeamsStr, 10) || 2;

    const handleFormatChange = (newFormat: string) => {
        setFormat(newFormat);
        switch (newFormat) {
            case "single_elimination":
            case "double_elimination":
                setPointsPerWin("0");
                setPointsPerDraw("0");
                setPointsPerLoss("0");
                break;
            case "round_robin":
            case "group_stage":
            case "swiss":
                setPointsPerWin("3");
                setPointsPerDraw("1");
                setPointsPerLoss("0");
                break;
        }
        if (newFormat === "group_stage") {
            setTeamsPerGroup("4");
            setAdvancePerGroup("2");
        }
        if (newFormat === "double_elimination") {
            setResetFinal(true);
        }
    };

    const getFormatInfo = () => {
        const n = maxTeams;
        const tpg = parseInt(teamsPerGroup, 10) || 4;
        const apg = parseInt(advancePerGroup, 10) || 2;
        const nr = parseInt(numberOfRounds, 10) || Math.ceil(Math.log2(n));

        switch (format) {
            case "single_elimination":
                return { rounds: Math.ceil(Math.log2(n)), matches: n - 1 };
            case "double_elimination":
                return { rounds: Math.ceil(Math.log2(n)) * 2 + 1, matches: 2 * n - 2 + (resetFinal ? 1 : 0) };
            case "round_robin":
                return { rounds: n - 1, matches: (n * (n - 1)) / 2 };
            case "group_stage": {
                const groups = Math.ceil(n / tpg);
                const groupMatches = groups * ((tpg * (tpg - 1)) / 2);
                const knockoutTeams = groups * apg;
                const knockoutMatches = knockoutTeams > 0 ? knockoutTeams - 1 : 0;
                return { rounds: tpg - 1 + Math.ceil(Math.log2(knockoutTeams || 1)), matches: groupMatches + knockoutMatches };
            }
            case "swiss":
                return { rounds: nr, matches: Math.floor(n / 2) * nr };
            default:
                return { rounds: 0, matches: 0 };
        }
    };

    const handleSubmit = async () => {
        setError("");
        setIsSubmitting(true);

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

            // Format prize values for display
            const formatPrize = (raw: string) => raw ? formatVNCurrency(raw) + " VNĐ" : "";

            const tournamentData = {
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
                status: "draft",
            };

            const res = await tournamentAPI.create(tournamentData);

            if (res.success) {
                router.push(`/manager/giai-dau/${res.data._id}`);
            } else {
                setError(res.message || "Có lỗi xảy ra khi tạo giải đấu");
            }
        } catch {
            setError("Có lỗi xảy ra, vui lòng thử lại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalSteps = 4;
    const formatInfo = getFormatInfo();
    const selectedFormat = formatOptions.find(f => f.value === format);
    const showScoringConfig = ["round_robin", "group_stage", "swiss"].includes(format);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-efb-text-secondary" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-efb-dark">Tạo giải đấu mới</h1>
                    <p className="text-sm text-efb-text-muted">
                        Bước {step}/{totalSteps}
                    </p>
                </div>
            </div>

            {/* Progress */}
            <div className="flex gap-2 mb-8">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-efb-blue" : "bg-gray-200"}`}
                    />
                ))}
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

            {/* ===== Step 1: Basic Info ===== */}
            {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-white p-6 space-y-5">
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
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: eFootball Cup VN Season 5"
                            className="h-12 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Mô tả</Label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Giới thiệu về giải đấu..."
                            rows={4}
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-efb-blue/20 focus:border-efb-blue transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Phiên bản game</Label>
                        <Input
                            value={gameVersion}
                            onChange={(e) => setGameVersion(e.target.value)}
                            placeholder="eFootball 2025"
                            className="h-12 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags (phân cách bằng dấu phẩy)</Label>
                        <Input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="efootball, tournament, vietnam"
                            className="h-12 rounded-xl"
                        />
                    </div>
                </motion.div>
            )}

            {/* ===== Step 2: Format & Settings ===== */}
            {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-white p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Thể thức & Cài đặt</h2>
                            <p className="text-xs text-efb-text-muted">Chọn thể thức thi đấu và cấu hình điểm số</p>
                        </div>
                    </div>

                    {/* Format */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Thể thức thi đấu *</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {formatOptions.map((fmt) => (
                                <button
                                    key={fmt.value}
                                    type="button"
                                    onClick={() => handleFormatChange(fmt.value)}
                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${format === fmt.value
                                        ? "border-efb-blue bg-efb-blue/[0.03]"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg ${fmt.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <fmt.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-efb-dark">{fmt.label}</div>
                                        <div className="text-xs text-efb-text-muted mt-0.5">{fmt.desc}</div>
                                        <div className="text-[11px] text-efb-blue font-medium mt-1 bg-efb-blue/5 px-2 py-0.5 rounded-md inline-block">
                                            📊 {fmt.scoring}
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${format === fmt.value ? "border-efb-blue" : "border-gray-300"}`}>
                                        {format === fmt.value && <div className="w-2.5 h-2.5 rounded-full bg-efb-blue" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Format-specific scoring */}
                    {showScoringConfig && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-efb-blue" />
                                <Label className="text-sm font-semibold text-efb-dark">Cấu hình điểm số</Label>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Thắng</Label>
                                    <Input
                                        value={pointsPerWin}
                                        onChange={(e) => setPointsPerWin(e.target.value.replace(/\D/g, ""))}
                                        className="h-10 rounded-xl text-center font-bold text-emerald-600"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Hòa</Label>
                                    <Input
                                        value={pointsPerDraw}
                                        onChange={(e) => setPointsPerDraw(e.target.value.replace(/\D/g, ""))}
                                        className="h-10 rounded-xl text-center font-bold text-amber-600"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">Thua</Label>
                                    <Input
                                        value={pointsPerLoss}
                                        onChange={(e) => setPointsPerLoss(e.target.value.replace(/\D/g, ""))}
                                        className="h-10 rounded-xl text-center font-bold text-red-500"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            {format === "group_stage" && (
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-efb-text-muted">Số đội/bảng</Label>
                                        <Input
                                            value={teamsPerGroup}
                                            onChange={(e) => setTeamsPerGroup(e.target.value.replace(/\D/g, ""))}
                                            className="h-10 rounded-xl"
                                            inputMode="numeric"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-efb-text-muted">Đội đi tiếp/bảng</Label>
                                        <Input
                                            value={advancePerGroup}
                                            onChange={(e) => setAdvancePerGroup(e.target.value.replace(/\D/g, ""))}
                                            className="h-10 rounded-xl"
                                            inputMode="numeric"
                                        />
                                    </div>
                                </div>
                            )}

                            {format === "swiss" && (
                                <div className="pt-2 border-t border-gray-200 space-y-1.5">
                                    <Label className="text-xs text-efb-text-muted">
                                        Số vòng đấu (0 = tự tính: {Math.ceil(Math.log2(maxTeams))} vòng)
                                    </Label>
                                    <Input
                                        value={numberOfRounds}
                                        onChange={(e) => setNumberOfRounds(e.target.value.replace(/\D/g, ""))}
                                        className="h-10 rounded-xl"
                                        inputMode="numeric"
                                    />
                                </div>
                            )}

                            {format === "double_elimination" && (
                                <div className="pt-2 border-t border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={resetFinal}
                                            onChange={(e) => setResetFinal(e.target.checked)}
                                            className="rounded border-gray-300 text-efb-blue focus:ring-efb-blue"
                                        />
                                        <span className="text-sm text-efb-text-secondary">
                                            Grand Final Reset (đá lại nếu đội nhánh thua thắng trận 1)
                                        </span>
                                    </label>
                                </div>
                            )}

                            {["round_robin", "group_stage", "swiss"].includes(format) && (
                                <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 mb-1.5">Thứ tự xếp hạng:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(format === "swiss"
                                            ? ["points", "buchholz", "goalDifference", "goalsFor"]
                                            : ["points", "goalDifference", "goalsFor", "headToHead"]
                                        ).map((tb, i) => (
                                            <span key={tb} className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 px-2 py-1 rounded-lg">
                                                <span className="text-efb-blue font-bold">{i + 1}.</span>
                                                {tiebreakerLabels[tb]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Format summary */}
                    <div className="flex items-center gap-4 p-3.5 rounded-xl bg-efb-blue/[0.04] border border-efb-blue/10">
                        <div className="text-center">
                            <p className="text-lg font-bold text-efb-blue">{formatInfo.rounds}</p>
                            <p className="text-[10px] text-efb-text-muted">Vòng</p>
                        </div>
                        <div className="w-px h-8 bg-efb-blue/10" />
                        <div className="text-center">
                            <p className="text-lg font-bold text-efb-blue">{formatInfo.matches}</p>
                            <p className="text-[10px] text-efb-text-muted">Trận đấu</p>
                        </div>
                        <div className="w-px h-8 bg-efb-blue/10" />
                        <div className="text-center">
                            <p className="text-lg font-bold text-efb-blue">{maxTeams}</p>
                            <p className="text-[10px] text-efb-text-muted">Đội</p>
                        </div>
                    </div>

                    {/* Platform */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Nền tảng</Label>
                        <div className="flex flex-wrap gap-2">
                            {platformOptions.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPlatform(p.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${platform === p.value
                                        ? "border-efb-blue bg-efb-blue/5 text-efb-blue font-medium"
                                        : "border-gray-200 text-efb-text-secondary hover:border-gray-300"
                                        }`}
                                >
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
                            <Input
                                value={maxTeamsStr}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setMaxTeamsStr(val);
                                }}
                                onBlur={() => {
                                    const n = parseInt(maxTeamsStr, 10);
                                    if (!n || n < 2) setMaxTeamsStr("2");
                                    else if (n > 256) setMaxTeamsStr("256");
                                }}
                                placeholder="16"
                                className="h-12 rounded-xl"
                                inputMode="numeric"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Kích thước đội</Label>
                            <div className="flex gap-2">
                                {teamSizeOptions.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setTeamSize(s.value)}
                                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${teamSize === s.value
                                            ? "border-efb-blue bg-efb-blue/5 text-efb-blue"
                                            : "border-gray-200 text-efb-text-secondary"
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Online/Offline */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsOnline(true)}
                            className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${isOnline ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}
                        >
                            <Wifi className={`w-5 h-5 ${isOnline ? "text-efb-blue" : "text-gray-400"}`} />
                            <div className="text-left">
                                <div className={`text-sm font-medium ${isOnline ? "text-efb-blue" : "text-gray-600"}`}>Online</div>
                                <div className="text-[11px] text-gray-400">Thi đấu trực tuyến</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOnline(false)}
                            className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${!isOnline ? "border-efb-blue bg-efb-blue/5" : "border-gray-200 hover:border-gray-300"}`}
                        >
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
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Nhập địa chỉ thi đấu"
                                className="h-12 rounded-xl"
                            />
                        </div>
                    )}
                </motion.div>
            )}

            {/* ===== Step 3: Schedule & Prize ===== */}
            {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-white p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Lịch trình & Giải thưởng</h2>
                            <p className="text-xs text-efb-text-muted">Thời gian và giải thưởng</p>
                        </div>
                    </div>

                    {/* Dates with Shadcn Calendar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Bắt đầu đăng ký</Label>
                            <DatePicker
                                label="Chọn ngày"
                                value={registrationStart}
                                onChange={setRegistrationStart}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Kết thúc đăng ký</Label>
                            <DatePicker
                                label="Chọn ngày"
                                value={registrationEnd}
                                onChange={setRegistrationEnd}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Ngày bắt đầu giải</Label>
                            <DatePicker
                                label="Chọn ngày"
                                value={tournamentStart}
                                onChange={setTournamentStart}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Ngày kết thúc giải</Label>
                            <DatePicker
                                label="Chọn ngày"
                                value={tournamentEnd}
                                onChange={setTournamentEnd}
                            />
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
                                <CurrencyInput
                                    value={prizeTotal}
                                    onChange={setPrizeTotal}
                                    placeholder="VD: 10.000.000"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥇 Nhất</Label>
                                    <CurrencyInput
                                        value={prizeFirst}
                                        onChange={setPrizeFirst}
                                        placeholder="5.000.000"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥈 Nhì</Label>
                                    <CurrencyInput
                                        value={prizeSecond}
                                        onChange={setPrizeSecond}
                                        placeholder="3.000.000"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-efb-text-muted">🥉 Ba</Label>
                                    <CurrencyInput
                                        value={prizeThird}
                                        onChange={setPrizeThird}
                                        placeholder="1.000.000"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <Label className="text-xs text-efb-text-muted">Phí tham gia (0 = miễn phí)</Label>
                            <CurrencyInput
                                value={entryFee}
                                onChange={setEntryFee}
                                placeholder="0"
                                className="h-12 rounded-xl"
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ===== Step 4: Rules & Contact ===== */}
            {step === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-white p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-efb-dark">Nội quy & Liên hệ</h2>
                            <p className="text-xs text-efb-text-muted">Bước cuối cùng</p>
                        </div>
                    </div>

                    {/* Match Settings */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Cài đặt trận đấu</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Thời gian trận (phút)</Label>
                                <Input
                                    value={matchDuration}
                                    onChange={(e) => setMatchDuration(e.target.value.replace(/\D/g, ""))}
                                    className="h-10 rounded-xl"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-efb-text-muted">Lượt/vòng</Label>
                                <div className="flex gap-2">
                                    {[1, 2].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setLegsPerRound(v)}
                                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${legsPerRound === v
                                                ? "border-efb-blue bg-efb-blue/5 text-efb-blue"
                                                : "border-gray-200 text-efb-text-secondary"
                                                }`}
                                        >
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
                        <textarea
                            value={rules}
                            onChange={(e) => setRules(e.target.value)}
                            placeholder="Nhập nội quy, quy định của giải đấu..."
                            rows={5}
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

                    {/* Summary */}
                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-efb-dark mb-3">📋 Tóm tắt giải đấu</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2.5 rounded-lg bg-gray-50/80">
                                <p className="text-[11px] text-gray-400">Tên</p>
                                <p className="font-medium text-gray-900 truncate">{title || "—"}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-gray-50/80">
                                <p className="text-[11px] text-gray-400">Thể thức</p>
                                <p className="font-medium text-gray-900">{selectedFormat?.label || "—"}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-gray-50/80">
                                <p className="text-[11px] text-gray-400">Số đội</p>
                                <p className="font-medium text-gray-900">{maxTeams}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-gray-50/80">
                                <p className="text-[11px] text-gray-400">Số trận dự kiến</p>
                                <p className="font-medium text-gray-900">{formatInfo.matches}</p>
                            </div>
                            {prizeTotal && (
                                <div className="p-2.5 rounded-lg bg-gray-50/80 col-span-2">
                                    <p className="text-[11px] text-gray-400">Tổng giải thưởng</p>
                                    <p className="font-medium text-gray-900">{formatVNCurrency(prizeTotal)} VNĐ</p>
                                </div>
                            )}
                            {showScoringConfig && (
                                <div className="p-2.5 rounded-lg bg-gray-50/80 col-span-2">
                                    <p className="text-[11px] text-gray-400">Tính điểm</p>
                                    <p className="font-medium text-gray-900">
                                        Thắng={pointsPerWin}đ, Hòa={pointsPerDraw}đ, Thua={pointsPerLoss}đ
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pb-8">
                {step > 1 ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setError(""); setStep(step - 1); }}
                        className="rounded-xl h-11 px-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                ) : (
                    <div />
                )}

                {step < totalSteps ? (
                    <Button
                        type="button"
                        onClick={() => {
                            if (step === 1 && !title.trim()) {
                                setError("Vui lòng nhập tên giải đấu");
                                return;
                            }
                            setError("");
                            setStep(step + 1);
                        }}
                        className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-11 px-6 group"
                    >
                        Tiếp theo
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-efb-blue text-white hover:bg-efb-blue-light rounded-xl h-11 px-8 group"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Trophy className="w-4 h-4 mr-2" />
                                Tạo giải đấu
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
