/**
 * Player stat calculation engine (client-side).
 * Handles build point allocation, level interpolation, and condition effects.
 */

/* ── Build categories (order matches EFHUB) ── */
export const BUILD_ORDER = [
    "shooting", "passing", "dribbling", "dexterity",
    "lowerBodyStrength", "aerialStrength", "defending",
    "gk1", "gk2", "gk3",
] as const;

export type BuildCategory = (typeof BUILD_ORDER)[number];

export const BUILD_LABELS: Record<BuildCategory, string> = {
    shooting: "SHOOTING",
    passing: "PASSING",
    dribbling: "DRIBBLING",
    dexterity: "DEXTERITY",
    lowerBodyStrength: "LOWER BODY STRENGTH",
    aerialStrength: "AERIAL STRENGTH",
    defending: "DEFENDING",
    gk1: "GK 1",
    gk2: "GK 2",
    gk3: "GK 3",
};

/** Which stats each build category affects, and by how much per effective point */
export const BUILD_EFFECTS: Record<BuildCategory, [string, number][]> = {
    shooting: [
        ["finishing", 1.6], ["offensiveAwareness", 1.2], ["kickingPower", 0.8],
    ],
    passing: [
        ["lowPass", 1.5], ["loftedPass", 1.3], ["setPieceTaking", 0.8],
    ],
    dribbling: [
        ["ballControl", 1.4], ["dribbling", 1.4], ["tightPossession", 1.3],
    ],
    dexterity: [
        ["offensiveAwareness", 1.1], ["acceleration", 1.2], ["balance", 1.1],
    ],
    lowerBodyStrength: [
        ["speed", 1.2], ["acceleration", 0.9], ["kickingPower", 1.2], ["stamina", 0.8],
    ],
    aerialStrength: [
        ["jump", 1.3], ["physicalContact", 1.1], ["heading", 1.3],
    ],
    defending: [
        ["defensiveAwareness", 1.4], ["ballWinning", 1.4], ["trackingBack", 1.2], ["aggression", 0.7],
    ],
    gk1: [["gkAwareness", 1.5], ["gkCatching", 1.2]],
    gk2: [["gkReflexes", 1.5], ["gkReach", 1.2]],
    gk3: [["gkClearing", 1.5], ["gkAwareness", 1]],
};

/* ── Helpers ── */
function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function interpolate(start: number, end: number, ratio: number) {
    return Math.round(start + (end - start) * ratio);
}

function growthRatioByGain(level: number, maxLevel: number, gain: number) {
    if (maxLevel <= 1) return 0;
    const raw = clamp((level - 1) / (maxLevel - 1), 0, 1);
    if (gain <= 4) return raw;
    const exponent = gain >= 18 ? 0.82 : gain >= 12 ? 0.88 : 0.94;
    const eased = Math.pow(raw, exponent);
    const lateBoost = raw > 0.85 ? (raw - 0.85) * 0.08 : 0;
    return clamp(eased + lateBoost, 0, 1);
}

function perPointBuildMultiplier(pointIndex: number) {
    if (pointIndex <= 4) return 1;
    if (pointIndex <= 8) return 0.9;
    if (pointIndex <= 12) return 0.8;
    if (pointIndex <= 16) return 0.65;
    return 0.5;
}

function effectiveBuildPoints(points: number) {
    const count = Math.max(0, Math.round(points));
    let total = 0;
    for (let i = 1; i <= count; i++) total += perPointBuildMultiplier(i);
    return total;
}

/* ── Condition effects ── */
const CONDITION_PERCENT: Record<string, Record<string, number>> = {
    A: { technical: 0.03, physical: 0.025, goalkeeping: 0.02 },
    B: { technical: 0.015, physical: 0.012, goalkeeping: 0.01 },
    C: { technical: 0, physical: 0, goalkeeping: 0 },
    D: { technical: -0.015, physical: -0.012, goalkeeping: -0.01 },
    E: { technical: -0.03, physical: -0.025, goalkeeping: -0.02 },
};

const GK_STATS = new Set(["gkawareness", "gkcatching", "gkclearing", "gkreflexes", "gkreach"]);
const PHYSICAL_STATS = new Set(["speed", "acceleration", "stamina", "physicalcontact", "jump", "balance"]);

function resolveConditionGroup(statKey: string): "technical" | "physical" | "goalkeeping" {
    const k = statKey.toLowerCase();
    if (GK_STATS.has(k)) return "goalkeeping";
    if (PHYSICAL_STATS.has(k)) return "physical";
    return "technical";
}

/* ── Empty allocations ── */
export function emptyAllocations(): Record<BuildCategory, number> {
    const a: any = {};
    BUILD_ORDER.forEach(k => (a[k] = 0));
    return a;
}

/** Encode build allocations to a compact dash-separated string for URLs */
export function encodeBuild(alloc: Record<BuildCategory, number>): string {
    return BUILD_ORDER.map(k => String(Math.max(0, alloc[k] || 0))).join("-");
}

export function decodeBuild(raw: string): Record<BuildCategory, number> {
    const vals = raw.split("-").map(s => parseInt(s, 10));
    const out = emptyAllocations();
    BUILD_ORDER.forEach((k, i) => { out[k] = (Number.isFinite(vals[i]) && vals[i] > 0) ? vals[i] : 0; });
    return out;
}

/* ── Calculate stats at a given level (interpolation) ── */

/** Known stat key mappings (maxLevel sometimes uses different casing) */
const MAX_KEY_ALT: Record<string, string> = {
    gkAwareness: "Goalkeeping",
    gkCatching: "Gk Catching",
    physicalContact: "Physical",
};

export function deriveStatsAtLevel(
    level1: Record<string, number>,
    maxLevel: Record<string, number>,
    level: number,
    maxLevelNum: number,
    overallBase: number,
    overallMax: number,
) {
    const safeLevel = clamp(Math.round(level), 1, Math.max(1, maxLevelNum));
    const stats: Record<string, number> = {};

    // Only iterate over level1 keys — they are the canonical stat keys.
    // maxLevel may contain junk keys (body measurements with different casing).
    Object.keys(level1).forEach(key => {
        const lv1 = Number(level1[key] || 0);
        if (!Number.isFinite(lv1)) return;

        // Try to find matching maxLevel value (handle inconsistent casing)
        let mx = Number(maxLevel[key]);
        if (!Number.isFinite(mx) || mx <= 0) {
            const altKey = MAX_KEY_ALT[key];
            if (altKey) mx = Number(maxLevel[altKey]);
        }
        if (!Number.isFinite(mx) || mx <= 0) mx = lv1;

        const gain = mx - lv1;
        const ratio = growthRatioByGain(safeLevel, maxLevelNum, gain);
        stats[key] = interpolate(lv1, mx, ratio);
    });

    const overallGain = overallMax - overallBase;
    const overallRatio = growthRatioByGain(safeLevel, maxLevelNum, overallGain);
    const overall = interpolate(overallBase, overallMax, overallRatio);

    return { stats, overall, level: safeLevel };
}

/* ── Apply build point bonuses ── */
export function applyBuildBonuses(
    baseStats: Record<string, number>,
    allocations: Record<BuildCategory, number>,
): Record<string, number> {
    const output = { ...baseStats };
    BUILD_ORDER.forEach(category => {
        const amount = Math.max(0, allocations[category] || 0);
        if (amount <= 0) return;
        const ep = effectiveBuildPoints(amount);
        BUILD_EFFECTS[category].forEach(([stat, weight]) => {
            if (output[stat] === undefined) return;
            output[stat] = clamp(Math.round(Number(output[stat] || 0) + ep * weight), 0, 120);
        });
    });
    return output;
}

/* ── Apply condition ── */
export function applyCondition(stats: Record<string, number>, condition: string): Record<string, number> {
    const c = condition.toUpperCase();
    if (c === "C") return { ...stats };
    const output: Record<string, number> = {};
    Object.keys(stats).forEach(key => {
        const val = Number(stats[key] || 0);
        const group = resolveConditionGroup(key);
        const pct = CONDITION_PERCENT[c]?.[group] ?? 0;
        if (pct === 0) { output[key] = val; return; }
        const rawDelta = val * pct;
        const delta = rawDelta > 0 ? Math.max(1, Math.round(rawDelta)) : Math.min(-1, Math.round(rawDelta));
        output[key] = clamp(val + delta, 0, 120);
    });
    return output;
}

/* ── Smart build preset (auto-distribute based on position) ── */
const FWD = new Set(["CF", "SS", "LWF", "RWF"]);
const MID = new Set(["AMF", "CMF", "DMF", "LMF", "RMF"]);
const DEF = new Set(["CB", "LB", "RB"]);

function allocateByWeights(cap: number, weighted: [BuildCategory, number][]) {
    const alloc = emptyAllocations();
    if (cap <= 0 || weighted.length === 0) return alloc;
    const totalW = weighted.reduce((s, [, w]) => s + w, 0);
    if (totalW <= 0) return alloc;
    let used = 0;
    weighted.forEach(([cat, w]) => {
        const target = Math.floor((cap * w) / totalW);
        const applied = clamp(target, 0, 20);
        alloc[cat] = applied;
        used += applied;
    });
    while (used < cap) {
        let changed = false;
        for (const [cat] of weighted) {
            if (used >= cap) break;
            if (alloc[cat] >= 20) continue;
            alloc[cat]++;
            used++;
            changed = true;
        }
        if (!changed) break;
    }
    return alloc;
}

export function smartBuild(position: string, pointsCap: number): Record<BuildCategory, number> {
    const pos = position.toUpperCase();
    if (pos === "GK") return allocateByWeights(pointsCap, [["gk1", 5], ["gk2", 4], ["gk3", 4], ["passing", 2], ["aerialStrength", 2]]);
    if (FWD.has(pos)) return allocateByWeights(pointsCap, [["shooting", 5], ["dexterity", 4], ["dribbling", 4], ["lowerBodyStrength", 3], ["passing", 2], ["aerialStrength", 2]]);
    if (MID.has(pos)) return allocateByWeights(pointsCap, [["passing", 5], ["dribbling", 4], ["dexterity", 4], ["lowerBodyStrength", 3], ["defending", 3], ["shooting", 2]]);
    if (DEF.has(pos)) return allocateByWeights(pointsCap, [["defending", 5], ["lowerBodyStrength", 4], ["aerialStrength", 4], ["passing", 3], ["dexterity", 2]]);
    return allocateByWeights(pointsCap, [["passing", 4], ["dribbling", 4], ["dexterity", 4], ["lowerBodyStrength", 3], ["defending", 3], ["shooting", 2]]);
}

export function attackBuild(pointsCap: number): Record<BuildCategory, number> {
    return allocateByWeights(pointsCap, [["shooting", 6], ["dexterity", 4], ["dribbling", 4], ["lowerBodyStrength", 3], ["passing", 2], ["aerialStrength", 2]]);
}

export function creativeBuild(pointsCap: number): Record<BuildCategory, number> {
    return allocateByWeights(pointsCap, [["passing", 6], ["dribbling", 5], ["dexterity", 4], ["lowerBodyStrength", 3], ["shooting", 2]]);
}

export function defenseBuild(pointsCap: number): Record<BuildCategory, number> {
    return allocateByWeights(pointsCap, [["defending", 6], ["aerialStrength", 4], ["lowerBodyStrength", 4], ["passing", 2], ["dexterity", 2]]);
}

export function goalkeeperBuild(pointsCap: number): Record<BuildCategory, number> {
    return allocateByWeights(pointsCap, [["gk1", 5], ["gk2", 4], ["gk3", 4], ["passing", 2], ["aerialStrength", 2]]);
}

/** Max build: put all points into every category equally */
export function maxBuild(pointsCap: number): Record<BuildCategory, number> {
    return allocateByWeights(pointsCap, BUILD_ORDER.map(k => [k, 1]));
}

/** All preset types */
export type BuildPreset = "max" | "smart" | "attack" | "creative" | "defense" | "goalkeeper";

export function applyPresetBuild(preset: BuildPreset, position: string, cap: number): Record<BuildCategory, number> {
    switch (preset) {
        case "max": return maxBuild(cap);
        case "smart": return smartBuild(position, cap);
        case "attack": return attackBuild(cap);
        case "creative": return creativeBuild(cap);
        case "defense": return defenseBuild(cap);
        case "goalkeeper": return goalkeeperBuild(cap);
    }
}

