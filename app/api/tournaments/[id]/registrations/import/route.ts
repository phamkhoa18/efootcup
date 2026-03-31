import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import User from "@/models/User";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/registrations/import — Bulk import registrations
// Logic:
//   - Có EFV-ID: Tìm user HỆ THỐNG theo EFV-ID. Nếu có → link. Nếu KHÔNG có → báo lỗi, KHÔNG tự tạo.
//   - Không có EFV-ID: Tạo "ghost registration" chỉ tồn tại trong giải này (user = null).
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        const isAdmin = authResult.user.role === "admin";
        const isCreator = tournament.createdBy.toString() === authResult.user._id;
        const isCollaborator = tournament.collaborators?.some(
            (c: any) => c.userId?.toString() === authResult.user._id
        );
        if (!isAdmin && !isCreator && !isCollaborator) return apiError("Không có quyền", 403);

        const body = await req.json();
        const { registrations } = body;
        if (!Array.isArray(registrations) || registrations.length === 0) {
            return apiError("Dữ liệu không hợp lệ", 400);
        }

        const maxAllowed = tournament.maxTeams - tournament.currentTeams;
        if (registrations.length > maxAllowed) {
            return apiError(`Chỉ còn trống ${maxAllowed} suất, không thể import ${registrations.length} đội`, 400);
        }

        let addedCount = 0;
        let skippedCount = 0;
        const results: any[] = [];
        const teamSize = tournament.teamSize || 1;

        /**
         * Resolve a player:
         *  - efvIdNum provided → look up existing user. Return error if not found (NO auto-create).
         *  - efvIdNum null/0   → return userId = null (ghost player, no account).
         */
        async function resolvePlayer(efvIdNum: number | null): Promise<
            { userId: mongoose.Types.ObjectId | null; efvId?: number; error?: string }
        > {
            if (efvIdNum && !isNaN(efvIdNum) && efvIdNum > 0) {
                const existingUser = await User.findOne({ efvId: efvIdNum }).select('_id efvId').lean();
                if (existingUser) {
                    return { userId: existingUser._id as mongoose.Types.ObjectId, efvId: (existingUser as any).efvId };
                }
                // Not found — do NOT auto-create
                return {
                    userId: null,
                    error: `EFV #${efvIdNum} không tồn tại trong hệ thống. Hãy bỏ trống EFV-ID nếu muốn thêm VĐV không có tài khoản.`,
                };
            }
            // No EFV ID → ghost player
            return { userId: null, efvId: undefined };
        }

        for (const data of registrations) {
            try {
                const playerName = String(
                    data.playerName || data['Tên Đội Trưởng'] || data['VĐV 1'] || data['Tên VĐV 1'] || data['Tên VĐV'] || ''
                ).trim();

                if (playerName.length < 2) {
                    skippedCount++;
                    results.push({ playerName: playerName || '?', status: "skipped", reason: "Tên VĐV phải có ít nhất 2 ký tự" });
                    continue;
                }

                let teamName = String(
                    data.teamName || data.name || data['Tên đội'] || data['Tên Đội'] || ''
                ).trim() || playerName;

                const gamerId    = data.gamerId    || data.ingameId    || data['In-game ID'] || data['ID Game']  || data['ID Game 1'] || 'TBD';
                const phone      = data.phone      || data['Số điện thoại'] || data['SĐT'] || data['SĐT 1'] || '000';
                const email      = data.email      || data['Email']    || data['Email 1']  || '';
                const nickname   = data.nickname   || data['Nickname'] || data['Nickname 1'] || '';
                const dateOfBirth = data.dateOfBirth || data['Ngày sinh'] || '';
                const province   = data.province   || data['Tỉnh/TP'] || data['Tỉnh'] || '';
                const facebookName = data.facebookName || data['Facebook'] || '';
                const facebookLink = data.facebookLink || data['Link Facebook'] || '';

                // === Resolve Player 1 ===
                const rawEfvId  = data.efvId || data['EFV-ID'] || data['EFVID'] || data['efv_id'] || data['EFV-ID 1'] || null;
                const efvIdNum  = rawEfvId ? parseInt(String(rawEfvId).replace(/[^0-9]/g, ''), 10) : null;

                const p1 = await resolvePlayer(efvIdNum && !isNaN(efvIdNum) && efvIdNum > 0 ? efvIdNum : null);

                if (p1.error) {
                    skippedCount++;
                    results.push({ teamName, playerName, status: "error", reason: p1.error });
                    continue;
                }

                // Check duplicate for linked users
                if (p1.userId) {
                    const existingReg = await Registration.findOne({ tournament: id, user: p1.userId });
                    if (existingReg) {
                        results.push({ teamName, playerName, efvId: p1.efvId, status: "skipped", reason: "VĐV đã đăng ký trong giải" });
                        skippedCount++;
                        continue;
                    }
                }

                // === Resolve Player 2 (if teamSize >= 2) ===
                let player2UserId: mongoose.Types.ObjectId | null = null;
                let player2EfvId: number | undefined;
                let player2Name = '';
                let player2GamerId = '';
                let player2Nickname = '';
                let player2Phone = '';
                let player2FacebookName = '';
                let player2FacebookLink = '';

                if (teamSize >= 2) {
                    player2Name      = String(data.player2Name || data['VĐV 2'] || data['Tên VĐV 2'] || '').trim();
                    player2GamerId   = data.player2GamerId  || data['ID Game 2']  || '';
                    player2Nickname  = data.player2Nickname || data['Nickname 2'] || '';
                    player2Phone     = data.player2Phone    || data['SĐT 2']      || '';
                    player2FacebookName = data.player2FacebookName || data['Facebook 2'] || '';
                    player2FacebookLink = data.player2FacebookLink || data['Link Facebook 2'] || '';

                    if (player2Name.length >= 2) {
                        const rawP2EfvId  = data.player2EfvId || data['EFV-ID 2'] || data['EFVID 2'] || null;
                        const p2EfvIdNum  = rawP2EfvId ? parseInt(String(rawP2EfvId).replace(/[^0-9]/g, ''), 10) : null;

                        const p2 = await resolvePlayer(p2EfvIdNum && !isNaN(p2EfvIdNum) && p2EfvIdNum > 0 ? p2EfvIdNum : null);

                        if (p2.error) {
                            // Player 2 EFV ID not found — skip entire row
                            skippedCount++;
                            results.push({ teamName, playerName, status: "error", reason: `VĐV 2: ${p2.error}` });
                            continue;
                        }
                        player2UserId = p2.userId;
                        player2EfvId  = p2.efvId;
                    }
                }

                // === Create Registration ===
                const teamShortName = (data.teamShortName || data.shortName || data['Tên Viết Tắt'] || teamName.substring(0, 3)).toString().toUpperCase();

                const regOptions: any = {
                    tournament: id,
                    // user = null for ghost players (no EFV ID)
                    user: p1.userId || undefined,
                    teamName,
                    teamShortName,
                    playerName,
                    gamerId,
                    phone,
                    email: email || (p1.efvId ? `efv_${p1.efvId}@efootball.vn` : `ghost_${Date.now().toString(36)}@efootball.vn`),
                    nickname,
                    dateOfBirth,
                    province,
                    facebookName,
                    facebookLink,
                    status: "approved",
                    paymentStatus: "paid",
                    approvedBy: authResult.user._id as any,
                    approvedAt: new Date(),
                };

                if (teamSize >= 2 && player2Name.length >= 2) {
                    regOptions.player2User         = player2UserId || undefined;
                    regOptions.player2Name         = player2Name;
                    regOptions.player2GamerId      = player2GamerId || 'TBD';
                    regOptions.player2Nickname     = player2Nickname;
                    regOptions.player2Phone        = player2Phone;
                    regOptions.player2FacebookName = player2FacebookName;
                    regOptions.player2FacebookLink = player2FacebookLink;
                }

                try {
                    // Preemptively drop old faulty index if it exists
                    await Registration.collection.dropIndex("tournament_1_user_1").catch(() => {});
                } catch (e) {}

                if (!regOptions.user) delete regOptions.user;
                if (!regOptions.player2User) delete regOptions.player2User;

                const reg: any = await Registration.create(regOptions);

                // === Create Team ===
                const teamMembers: any[] = [];
                if (p1.userId) teamMembers.push({ user: p1.userId, role: "captain", joinedAt: new Date() });
                if (player2UserId) teamMembers.push({ user: player2UserId, role: "player", joinedAt: new Date() });

                const teamOptions: any = {
                    name: reg.teamName,
                    shortName: reg.teamShortName,
                    tournament: id,
                    members: teamMembers,
                };
                if (p1.userId) teamOptions.captain = p1.userId;

                const team = await Team.create(teamOptions);

                reg.team = team._id;
                await reg.save();

                addedCount++;
                results.push({
                    teamName: reg.teamName,
                    playerName: reg.playerName,
                    efvId: p1.efvId,
                    isGhost: !p1.userId,
                    player2Name: player2Name || undefined,
                    player2EfvId: player2EfvId,
                    status: "success",
                });
            } catch (rowErr: any) {
                console.error("Import row error:", rowErr);
                skippedCount++;
                results.push({
                    teamName: data.teamName || "?",
                    playerName: data.playerName || "?",
                    status: "error",
                    reason: rowErr.message,
                });
            }
        }

        if (addedCount > 0) {
            await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: addedCount } });
        }

        return apiResponse(
            { addedCount, skippedCount, teamSize, results },
            201,
            `Đã import thành công ${addedCount} VĐV${skippedCount > 0 ? ` (bỏ qua ${skippedCount})` : ''}`
        );
    } catch (error: any) {
        console.error("Import registration error:", error);
        return apiError("Có lỗi xảy ra khi import", 500);
    }
}
