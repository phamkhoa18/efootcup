/**
 * EFV Points System — Constants & Point Tables
 * 
 * MOBILE: EFV250 / EFV500 / EFV1000
 * PC:     EFV50  / EFV100 / EFV200
 * 
 * Quy tắc BXH:
 * - Mobile: EFV250 lấy 5 giải, EFV500 lấy 4 giải, EFV1000 lấy 3 giải gần nhất
 * - PC:     EFV50 lấy 5 giải, EFV100 lấy 4 giải, EFV200 lấy 3 giải gần nhất
 * - BXH Tổng = sum of all tiers in that mode
 */

// ══════════════ MOBILE Point Table ══════════════
export const EFV_POINT_TABLE: Record<string, Record<string, number>> = {
    efv_250: {
        champion: 250,
        runner_up: 200,
        top_4: 150,
        top_8: 100,
        top_16: 50,
        top_32: 40,
        participant: 30,
    },
    efv_500: {
        champion: 500,
        runner_up: 400,
        top_4: 300,
        top_8: 200,
        top_16: 100,
        top_32: 70,
        participant: 50,
    },
    efv_1000: {
        champion: 1000,
        runner_up: 800,
        top_4: 600,
        top_8: 400,
        top_16: 200,
        top_32: 150,
        participant: 100,
    },
    // ══════════════ PC Point Table ══════════════
    efv_50: {
        champion: 50,
        runner_up: 40,
        top_4: 30,
        top_8: 20,
        top_16: 10,
        participant: 5,
    },
    efv_100: {
        champion: 100,
        runner_up: 80,
        top_4: 60,
        top_8: 40,
        top_16: 20,
        participant: 10,
    },
    efv_200: {
        champion: 200,
        runner_up: 160,
        top_4: 120,
        top_8: 80,
        top_16: 40,
        participant: 20,
    },
};

// ══════════════ MOBILE Tier Options (UI) ══════════════
export const EFV_TIER_OPTIONS = [
    {
        value: "efv_250",
        label: "EFV 250",
        description: "Giải nhỏ",
        pointRange: "30 - 250 điểm",
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
        borderColor: "border-blue-200",
    },
    {
        value: "efv_500",
        label: "EFV 500",
        description: "Giải trung",
        pointRange: "50 - 500 điểm",
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        textColor: "text-purple-600",
        borderColor: "border-purple-200",
    },
    {
        value: "efv_1000",
        label: "EFV 1000",
        description: "Giải lớn",
        pointRange: "100 - 1000 điểm",
        color: "from-amber-500 to-amber-600",
        bgColor: "bg-amber-50",
        textColor: "text-amber-600",
        borderColor: "border-amber-200",
    },
];

// ══════════════ PC Tier Options (UI) ══════════════
export const EFV_PC_TIER_OPTIONS = [
    {
        value: "efv_50",
        label: "EFV 50",
        description: "Giải nhỏ",
        pointRange: "5 - 50 điểm",
        color: "from-teal-500 to-teal-600",
        bgColor: "bg-teal-50",
        textColor: "text-teal-600",
        borderColor: "border-teal-200",
    },
    {
        value: "efv_100",
        label: "EFV 100",
        description: "Giải trung",
        pointRange: "10 - 100 điểm",
        color: "from-cyan-500 to-cyan-600",
        bgColor: "bg-cyan-50",
        textColor: "text-cyan-600",
        borderColor: "border-cyan-200",
    },
    {
        value: "efv_200",
        label: "EFV 200",
        description: "Giải lớn",
        pointRange: "20 - 200 điểm",
        color: "from-rose-500 to-rose-600",
        bgColor: "bg-rose-50",
        textColor: "text-rose-600",
        borderColor: "border-rose-200",
    },
];

// All tier options combined
export const ALL_EFV_TIER_OPTIONS = [...EFV_TIER_OPTIONS, ...EFV_PC_TIER_OPTIONS];

// Placement labels in Vietnamese
export const PLACEMENT_LABELS: Record<string, string> = {
    champion: "🥇 Vô địch",
    runner_up: "🥈 Á quân",
    top_4: "🏅 TOP 4",
    top_8: "TOP 8",
    top_16: "TOP 16",
    top_32: "TOP 32",
    participant: "✅ Tham gia hợp lệ",
};

// ══════════════ Placement Rank (lower = better) ══════════════
export const PLACEMENT_RANK: Record<string, number> = {
    champion: 1,
    runner_up: 2,
    top_4: 3,
    top_8: 4,
    top_16: 5,
    top_32: 6,
    participant: 99,
};

// ══════════════ Sliding Windows — PER TIER ══════════════
export const EFV_TIER_WINDOWS: Record<string, number> = {
    // Mobile
    efv_250: 5,
    efv_500: 4,
    efv_1000: 3,
    // PC
    efv_50: 5,
    efv_100: 4,
    efv_200: 3,
};

// Kept for backward compatibility — max across all tiers
export const EFV_MAX_WINDOW = 5;

// Mobile tiers list
export const MOBILE_TIERS = ["efv_250", "efv_500", "efv_1000"] as const;
// PC tiers list
export const PC_TIERS = ["efv_50", "efv_100", "efv_200"] as const;

/** Get the sliding window size for a specific tier */
export function getTierWindow(tier: string): number {
    return EFV_TIER_WINDOWS[tier] ?? 5;
}

/** Get tiers for a given mode */
export function getTiersForMode(mode: string): string[] {
    return mode === "pc" ? [...PC_TIERS] : [...MOBILE_TIERS];
}

/** Get tier label from tier value */
export function getTierLabel(tier: string): string {
    const option = ALL_EFV_TIER_OPTIONS.find(t => t.value === tier);
    return option?.label || tier;
}

/**
 * Determine placement based on elimination round in single_elimination bracket.
 * @deprecated Use getPlacementFromBracketRound instead for accurate bracket-based placement.
 */
export function getPlacementFromRound(
    totalRounds: number,
    eliminatedAtRound: number,
    isChampion: boolean,
    isRunnerUp: boolean
): string {
    if (isChampion) return "champion";
    if (isRunnerUp) return "runner_up";

    const roundsFromFinal = totalRounds - eliminatedAtRound;

    switch (roundsFromFinal) {
        case 0:
            return "runner_up";
        case 1:
            return "top_4";
        case 2:
            return "top_8";
        case 3:
            return "top_16";
        case 4:
            return "top_32";
        default:
            return "participant";
    }
}

/**
 * Determine placement based on bracket structure — fully dynamic.
 * Uses the actual bracket size (S = next power of 2 >= teams)
 * to calculate the number of teams in each round, then maps to placement.
 * 
 * Works for ANY bracket size (2, 4, 8, 16, 32, 64, 128, 256, 512, 1024).
 * 
 * Examples (bracket 512, 500 players):
 *   Round 1 → 512 teams → "Vòng 512" → top_512 (if exists) or participant
 *   Round 2 → 256 teams → "Vòng 256" → top_256 (if exists) or participant
 *   ...
 *   Round 5 → 32 teams → "Vòng 32"  → top_32
 *   Round 6 → 16 teams → "Vòng 16"  → top_16
 *   Round 7 →  8 teams → "Tứ kết"   → top_8
 *   Round 8 →  4 teams → "Bán kết"  → top_4
 *   Round 9 →  2 teams → "Chung kết" → runner_up (loser) / champion (winner)
 * 
 * @param round - The round number where the player was eliminated (1-based)
 * @param totalRounds - Total rounds in bracket = log2(S)
 * @param bracketSize - S = the bracket size (next power of 2 >= number of teams)
 */
export function getPlacementFromBracketRound(
    round: number,
    totalRounds: number,
    bracketSize: number
): string {
    // Final round loser = runner_up
    if (round === totalRounds) {
        return "runner_up";
    }

    // Calculate how many teams are in this round
    // Round 1 → S teams, Round 2 → S/2, Round 3 → S/4, etc.
    const teamsInRound = bracketSize / Math.pow(2, round - 1);

    // Build the placement key dynamically: "top_4", "top_8", "top_16", "top_32", etc.
    const placementKey = `top_${teamsInRound}`;

    // If this placement exists in the ranking system, use it
    // Otherwise fall back to "participant"
    if (PLACEMENT_RANK[placementKey] !== undefined) {
        return placementKey;
    }

    return "participant";
}

/**
 * Get points for a given tier and placement
 */
export function getEfvPoints(tier: string, placement: string): number {
    return EFV_POINT_TABLE[tier]?.[placement] ?? 0;
}
