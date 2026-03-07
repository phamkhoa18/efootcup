/**
 * EFV Points System — Constants & Point Tables
 * 
 * Điểm EFV được tính dựa trên:
 * - Hạng giải (efvTier): efv_250 | efv_500 | efv_1000
 * - Thành tích (placement): champion | runner_up | top_4 | top_8 | top_16 | top_32 | participant
 * 
 * Quy tắc BXH: Chỉ tính 5 giải Mobile gần nhất
 */

// Bảng điểm EFV theo tier và placement
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
};

// Tier options for UI
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

// Maximum number of recent tournaments to count for BXH
export const EFV_MAX_WINDOW = 5;

/**
 * Determine placement based on elimination round in single_elimination bracket.
 * 
 * @param totalTeams - Total number of teams in the tournament
 * @param eliminatedAtRound - The round number where the team was eliminated (1-based)
 *                            For the champion, pass -1 or use "champion" placement directly
 * @param totalRounds - Total number of rounds in the bracket
 * @param isChampion - Whether this team won the tournament
 * @param isRunnerUp - Whether this team lost in the final
 */
export function getPlacementFromRound(
    totalRounds: number,
    eliminatedAtRound: number,
    isChampion: boolean,
    isRunnerUp: boolean
): string {
    if (isChampion) return "champion";
    if (isRunnerUp) return "runner_up";

    // Round numbering: round 1 = first round, totalRounds = final
    // eliminatedAtRound = round they LOST in
    const roundsFromFinal = totalRounds - eliminatedAtRound;

    switch (roundsFromFinal) {
        case 0: // Lost in final = runner_up (handled above, but safety)
            return "runner_up";
        case 1: // Lost in semi-final
            return "top_4";
        case 2: // Lost in quarter-final
            return "top_8";
        case 3: // Lost in round of 16
            return "top_16";
        case 4: // Lost in round of 32
            return "top_32";
        default:
            return "participant";
    }
}

/**
 * Get points for a given tier and placement
 */
export function getEfvPoints(tier: string, placement: string): number {
    return EFV_POINT_TABLE[tier]?.[placement] ?? 0;
}
