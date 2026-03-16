/**
 * 🔧 Script sửa lại điểm EFV cho TẤT CẢ giải đã trao điểm.
 * 
 * Logic mới: tính placement dựa trên VÒNG ĐẤU (Vòng 32, Vòng 16, Tứ kết...),
 * KHÔNG phải số trận đã đá.
 * 
 * Chạy:  npx tsx scripts/fix-efv-points.ts
 * 
 * Dry-run (chỉ xem, không sửa):  npx tsx scripts/fix-efv-points.ts --dry-run
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "";
const DRY_RUN = process.argv.includes("--dry-run");

// ── Point tables & placement rank (copy from lib/efv-points.ts) ──
const EFV_POINT_TABLE: Record<string, Record<string, number>> = {
    efv_250: { champion: 250, runner_up: 200, top_4: 150, top_8: 100, top_16: 50, top_32: 40, participant: 30 },
    efv_500: { champion: 500, runner_up: 400, top_4: 300, top_8: 200, top_16: 100, top_32: 70, participant: 50 },
    efv_1000: { champion: 1000, runner_up: 800, top_4: 600, top_8: 400, top_16: 200, top_32: 150, participant: 100 },
    efv_50: { champion: 50, runner_up: 40, top_4: 30, top_8: 20, top_16: 10, participant: 5 },
    efv_100: { champion: 100, runner_up: 80, top_4: 60, top_8: 40, top_16: 20, participant: 10 },
    efv_200: { champion: 200, runner_up: 160, top_4: 120, top_8: 80, top_16: 40, participant: 20 },
};

const PLACEMENT_RANK: Record<string, number> = {
    champion: 1, runner_up: 2, top_4: 3, top_8: 4, top_16: 5, top_32: 6, participant: 99,
};

const EFV_TIER_WINDOWS: Record<string, number> = {
    efv_250: 5, efv_500: 4, efv_1000: 3,
    efv_50: 5, efv_100: 4, efv_200: 3,
};

function getEfvPoints(tier: string, placement: string): number {
    return EFV_POINT_TABLE[tier]?.[placement] ?? 0;
}

function getPlacementFromBracketRound(round: number, totalRounds: number, bracketSize: number): string {
    if (round === totalRounds) return "runner_up";
    const teamsInRound = bracketSize / Math.pow(2, round - 1);
    const key = `top_${teamsInRound}`;
    if (PLACEMENT_RANK[key] !== undefined) return key;
    return "participant";
}

// ── Main ──
async function main() {
    console.log("═══════════════════════════════════════════════════");
    console.log("  🔧 FIX EFV POINTS — Tính lại điểm theo vòng đấu");
    console.log(`  Mode: ${DRY_RUN ? "🔍 DRY-RUN (chỉ xem, không sửa)" : "⚡ THỰC THI (sẽ sửa DB)"}`);
    console.log("═══════════════════════════════════════════════════\n");

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    // Import models after connecting
    const Tournament = (await import("../models/Tournament")).default;
    const Team = (await import("../models/Team")).default;
    const Match = (await import("../models/Match")).default;
    const Registration = (await import("../models/Registration")).default;
    const EfvPointLog = (await import("../models/EfvPointLog")).default;
    const Bxh = (await import("../models/Bxh")).default;
    const User = (await import("../models/User")).default;

    // 1. Find all tournaments that have been awarded points
    const tournaments = await Tournament.find({
        efvPointsAwarded: true,
        efvTier: { $ne: null },
        format: "single_elimination",
    }).lean();

    console.log(`📋 Tìm thấy ${tournaments.length} giải đã trao điểm. Bắt đầu xử lý...\n`);

    const allAffectedUserIds = new Set<string>();
    const affectedModes = new Set<string>();
    let totalChanges = 0;

    for (const tournament of tournaments) {
        console.log(`\n────────────────────────────────────────────────────`);
        console.log(`🏆 ${tournament.title}`);
        console.log(`   ID: ${tournament._id} | Tier: ${tournament.efvTier} | Mode: ${tournament.mode}`);

        // Get teams
        const teams = await Team.find({ tournament: tournament._id }).lean();
        if (teams.length === 0) {
            console.log("   ⚠️ Không có đội nào, bỏ qua.");
            continue;
        }

        // Get matches (include bye)
        const matches = await Match.find({
            tournament: tournament._id,
            status: { $in: ["completed", "bye"] },
        }).sort({ round: 1, matchNumber: 1 }).lean();

        if (matches.filter((m: any) => m.status === "completed").length === 0) {
            console.log("   ⚠️ Không có trận hoàn thành, bỏ qua.");
            continue;
        }

        // Calculate bracket size
        const N = teams.length;
        let S = 2; while (S < N) S *= 2;
        const totalRounds = Math.log2(S);

        console.log(`   Đội: ${N} | Bracket: ${S} | Vòng: ${totalRounds}`);

        // Find max round
        const maxRound = Math.max(...matches.map((m: any) => m.round));
        const finalMatch = matches.find((m: any) => m.round === maxRound);

        // Initialize all teams as "participant"
        const teamPlacements = new Map<string, { placement: string; teamName: string; captainId: string }>();
        for (const team of teams) {
            teamPlacements.set((team as any)._id.toString(), {
                placement: "participant",
                teamName: (team as any).name,
                captainId: (team as any).captain.toString(),
            });
        }

        // Process matches
        for (const match of matches) {
            const m = match as any;
            if (m.status === "bye") continue;
            if (!m.winner || !m.homeTeam || !m.awayTeam) continue;

            const winnerId = m.winner.toString();
            const homeId = m.homeTeam.toString();
            const awayId = m.awayTeam.toString();
            const loserId = winnerId === homeId ? awayId : homeId;

            const isFinal = m.round === maxRound;

            if (isFinal) {
                const existing = teamPlacements.get(loserId);
                if (existing) {
                    teamPlacements.set(loserId, { ...existing, placement: "runner_up" });
                }
            } else {
                const placement = getPlacementFromBracketRound(m.round, totalRounds, S);
                const existing = teamPlacements.get(loserId);
                if (existing) {
                    const currentRank = PLACEMENT_RANK[existing.placement] ?? 99;
                    const newRank = PLACEMENT_RANK[placement] ?? 99;
                    if (newRank < currentRank || existing.placement === "participant") {
                        teamPlacements.set(loserId, { ...existing, placement });
                    }
                }
            }
        }

        // Set champion
        if (finalMatch && (finalMatch as any).winner) {
            const championId = (finalMatch as any).winner.toString();
            const existing = teamPlacements.get(championId);
            if (existing) {
                teamPlacements.set(championId, { ...existing, placement: "champion" });
            }
        }

        // Map team → user
        const registrations = await Registration.find({
            tournament: tournament._id,
            status: "approved",
        }).lean();

        const teamToUser = new Map<string, string>();
        for (const team of teams) {
            teamToUser.set((team as any)._id.toString(), (team as any).captain.toString());
        }
        for (const reg of registrations) {
            const r = reg as any;
            if (r.team) {
                teamToUser.set(r.team.toString(), r.user.toString());
            }
        }

        // Compare with existing EfvPointLog
        const existingLogs = await EfvPointLog.find({ tournament: tournament._id }).lean();
        const existingLogMap = new Map<string, any>();
        for (const log of existingLogs) {
            existingLogMap.set((log as any).user.toString(), log);
        }

        let changesInTournament = 0;
        const updates: { userId: string; teamName: string; oldPlacement: string; newPlacement: string; oldPoints: number; newPoints: number }[] = [];

        for (const [teamId, info] of teamPlacements) {
            const userId = teamToUser.get(teamId);
            if (!userId) continue;

            const newPoints = getEfvPoints(tournament.efvTier!, info.placement);
            const existingLog = existingLogMap.get(userId);

            const oldPlacement = existingLog?.placement || "(không có)";
            const oldPoints = existingLog?.points ?? 0;

            if (oldPlacement !== info.placement || oldPoints !== newPoints) {
                changesInTournament++;
                updates.push({
                    userId,
                    teamName: info.teamName,
                    oldPlacement,
                    newPlacement: info.placement,
                    oldPoints,
                    newPoints,
                });
            }

            allAffectedUserIds.add(userId);
        }

        // Print changes
        if (updates.length > 0) {
            console.log(`\n   📊 Thay đổi (${updates.length}):`);
            for (const u of updates) {
                const arrow = u.newPoints > u.oldPoints ? "⬆️" : u.newPoints < u.oldPoints ? "⬇️" : "↔️";
                console.log(`      ${arrow} ${u.teamName}: ${u.oldPlacement} (${u.oldPoints}đ) → ${u.newPlacement} (${u.newPoints}đ)`);
            }
        } else {
            console.log(`   ✅ Không có thay đổi.`);
        }

        totalChanges += changesInTournament;

        // Apply changes
        if (!DRY_RUN && changesInTournament > 0) {
            const ops: any[] = [];
            const processedUsers = new Set<string>();

            for (const [teamId, info] of teamPlacements) {
                const userId = teamToUser.get(teamId);
                if (!userId || processedUsers.has(userId)) continue;
                processedUsers.add(userId);

                const points = getEfvPoints(tournament.efvTier!, info.placement);

                ops.push({
                    updateOne: {
                        filter: { user: new mongoose.Types.ObjectId(userId), tournament: tournament._id },
                        update: {
                            $set: {
                                user: new mongoose.Types.ObjectId(userId),
                                tournament: tournament._id,
                                mode: tournament.mode,
                                efvTier: tournament.efvTier,
                                placement: info.placement,
                                points,
                                teamName: info.teamName,
                                tournamentTitle: tournament.title,
                                awardedAt: existingLogMap.get(userId)?.awardedAt || new Date(),
                            },
                        },
                        upsert: true,
                    },
                });
            }

            if (ops.length > 0) {
                await EfvPointLog.bulkWrite(ops);
                console.log(`   💾 Đã cập nhật ${ops.length} EfvPointLog entries.`);
            }
        }

        affectedModes.add(tournament.mode);
    }

    // Recalculate BXH for all affected users
    if (!DRY_RUN && allAffectedUserIds.size > 0) {
        console.log(`\n\n═══════════════════════════════════════════════════`);
        console.log(`🔄 Tính lại BXH cho ${allAffectedUserIds.size} VĐV...`);

        for (const mode of affectedModes) {
            const modeUsers = Array.from(allAffectedUserIds);
            
            for (const userId of modeUsers) {
                const allLogs = await EfvPointLog.find({ user: userId, mode })
                    .sort({ awardedAt: -1 })
                    .lean();

                if (allLogs.length === 0) continue;

                const mobileTiers = ["efv_250", "efv_500", "efv_1000"];
                const pcTiers = ["efv_50", "efv_100", "efv_200"];
                const tiers = mode === "pc" ? pcTiers : mobileTiers;

                const tierPoints: Record<string, number> = {};
                const tierCounts: Record<string, number> = {};
                for (const t of tiers) { tierPoints[t] = 0; tierCounts[t] = 0; }

                for (const log of allLogs) {
                    const tier = (log as any).efvTier;
                    if (!tiers.includes(tier)) continue;
                    const maxWindow = EFV_TIER_WINDOWS[tier] ?? 5;
                    if (tierCounts[tier] < maxWindow) {
                        tierCounts[tier]++;
                        tierPoints[tier] += (log as any).points;
                    }
                }

                const totalPoints = Object.values(tierPoints).reduce((a, b) => a + b, 0);
                const latestTeamName = (allLogs[0] as any)?.teamName || "";

                const user = await User.findById(userId).lean() as any;
                if (!user) continue;

                await Bxh.findOneAndUpdate(
                    { gamerId: String(user.efvId || userId), mode },
                    {
                        $set: {
                            gamerId: String(user.efvId || userId),
                            mode,
                            name: user.name,
                            facebook: user.facebookName || user.facebookLink || "",
                            team: latestTeamName,
                            nickname: user.nickname || "",
                            points: totalPoints,
                            pointsEfv250: tierPoints["efv_250"] || 0,
                            pointsEfv500: tierPoints["efv_500"] || 0,
                            pointsEfv1000: tierPoints["efv_1000"] || 0,
                            pointsEfv50: tierPoints["efv_50"] || 0,
                            pointsEfv100: tierPoints["efv_100"] || 0,
                            pointsEfv200: tierPoints["efv_200"] || 0,
                        },
                    },
                    { upsert: true }
                );
            }

            // Recalculate ranks
            const allBxh = await Bxh.find({ mode }).sort({ points: -1 }).lean();
            const bulkOps = allBxh.map((entry: any, index: number) => ({
                updateOne: {
                    filter: { _id: entry._id },
                    update: { $set: { rank: index + 1 } },
                },
            }));
            if (bulkOps.length > 0) {
                await Bxh.bulkWrite(bulkOps);
            }
            console.log(`   ✅ BXH mode "${mode}": đã xếp hạng lại ${allBxh.length} VĐV.`);
        }
    }

    // Summary
    console.log(`\n\n═══════════════════════════════════════════════════`);
    console.log(`📊 TỔNG KẾT`);
    console.log(`   Giải đã xử lý: ${tournaments.length}`);
    console.log(`   Thay đổi placement: ${totalChanges}`);
    console.log(`   VĐV bị ảnh hưởng: ${allAffectedUserIds.size}`);
    if (DRY_RUN) {
        console.log(`\n   🔍 DRY-RUN hoàn tất — KHÔNG có gì bị sửa.`);
        console.log(`   Chạy lại KHÔNG có --dry-run để áp dụng thay đổi.`);
    } else {
        console.log(`\n   ✨ Đã sửa xong tất cả!`);
    }
    console.log(`═══════════════════════════════════════════════════\n`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
});
