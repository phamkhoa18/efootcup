import { NextRequest } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import User from "@/models/User";
import Counter from "@/models/Counter";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/registrations/import — Bulk import registrations
// Supports: real User accounts with EFV-IDs, Player 2 for 2v2+ tournaments
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

        const defaultPasswordHash = await bcrypt.hash("EfvPlayer@2026", 12);
        const teamSize = tournament.teamSize || 1;

        // Helper: create or find a User by EFV-ID or create new
        async function createOrFindUser(opts: {
            efvIdNum: number | null;
            playerName: string;
            gamerId: string;
            phone: string;
            email: string;
            nickname: string;
            dateOfBirth?: string;
            province?: string;
            teamName?: string;
            facebookName?: string;
            facebookLink?: string;
        }): Promise<{ userId: mongoose.Types.ObjectId; efvId?: number; error?: string }> {
            const { efvIdNum, playerName, gamerId, phone, email, nickname, dateOfBirth, province, teamName, facebookName, facebookLink } = opts;

            const makeUser = async (overrideEmail?: string, overrideEfvId?: number) => {
                return User.create({
                    ...(overrideEfvId ? { efvId: overrideEfvId } : {}),
                    name: playerName,
                    email: overrideEmail || `import_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}@efootball.vn`,
                    password: defaultPasswordHash,
                    phone: phone !== '000' ? phone : '',
                    gamerId: gamerId !== 'TBD' ? gamerId : '',
                    nickname: nickname || '',
                    dateOfBirth: dateOfBirth || '',
                    province: province || '',
                    teamName: (teamName && teamName !== 'Tự do') ? teamName : '',
                    facebookName: facebookName || '',
                    facebookLink: facebookLink || '',
                    isVerified: true,
                    role: "user",
                });
            };

            if (efvIdNum && !isNaN(efvIdNum) && efvIdNum > 0) {
                // Try to find existing user by EFV-ID
                const existingUser = await User.findOne({ efvId: efvIdNum });
                if (existingUser) {
                    return { userId: existingUser._id, efvId: existingUser.efvId };
                }
                // Create new with specified EFV-ID
                const userEmail = (email && email.trim() && !email.includes('@efootball.vn'))
                    ? email.trim()
                    : `efv${efvIdNum}_${Date.now().toString(36)}@efootball.vn`;
                try {
                    const newUser = await makeUser(userEmail, efvIdNum);
                    await Counter.findByIdAndUpdate("efvId", { $max: { seq: efvIdNum } }, { upsert: true });
                    return { userId: newUser._id, efvId: efvIdNum };
                } catch (e: any) {
                    if (e.code === 11000) {
                        const dupField = Object.keys(e.keyPattern || {})[0];
                        if (dupField === 'efvId') {
                            const found = await User.findOne({ efvId: efvIdNum });
                            if (found) return { userId: found._id, efvId: found.efvId };
                        }
                        // Retry with more unique email
                        try {
                            const retryEmail = `efv${efvIdNum}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}@efootball.vn`;
                            const newUser = await makeUser(retryEmail, efvIdNum);
                            await Counter.findByIdAndUpdate("efvId", { $max: { seq: efvIdNum } }, { upsert: true });
                            return { userId: newUser._id, efvId: efvIdNum };
                        } catch (e2: any) {
                            return { userId: new mongoose.Types.ObjectId(), error: e2.message };
                        }
                    }
                    return { userId: new mongoose.Types.ObjectId(), error: e.message };
                }
            } else {
                // Auto EFV-ID
                const userEmail = (email && email.trim() && !email.includes('@efootball.vn'))
                    ? email.trim()
                    : `import_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}@efootball.vn`;
                try {
                    const newUser = await makeUser(userEmail);
                    return { userId: newUser._id, efvId: newUser.efvId };
                } catch (e: any) {
                    if (e.code === 11000 && Object.keys(e.keyPattern || {})[0] === 'email') {
                        try {
                            const newUser = await makeUser(undefined); // uses random email
                            return { userId: newUser._id, efvId: newUser.efvId };
                        } catch (e2: any) {
                            return { userId: new mongoose.Types.ObjectId(), error: e2.message };
                        }
                    }
                    return { userId: new mongoose.Types.ObjectId(), error: e.message };
                }
            }
        }

        for (const data of registrations) {
            try {
                let teamName = data.teamName || data.name || data['Tên đội'] || data['Tên Đội'];
                const player1 = data.playerName || data['Tên Đội Trưởng'] || data['VĐV 1'] || data['Tên VĐV 1'] || data['Tên VĐV'];

                if (!player1 || String(player1).trim().length < 2) {
                    skippedCount++;
                    continue;
                }

                if (!teamName || String(teamName).trim() === '') {
                    teamName = "Tự do";
                } else {
                    teamName = String(teamName).trim();
                }

                const playerName = String(player1).trim();
                const gamerId = data.gamerId || data.ingameId || data['In-game ID'] || data['ID Game'] || data['ID Game 1'] || 'TBD';
                const phone = data.phone || data['Số điện thoại'] || data['SĐT'] || data['SĐT 1'] || '000';
                const email = data.email || data['Email'] || data['Email 1'] || '';
                const nickname = data.nickname || data['Nickname'] || data['Nickname 1'] || '';
                const dateOfBirth = data.dateOfBirth || data['Ngày sinh'] || '';
                const province = data.province || data['Tỉnh/TP'] || data['Tỉnh'] || '';
                const facebookName = data.facebookName || data['Facebook'] || '';
                const facebookLink = data.facebookLink || data['Link Facebook'] || '';

                // === Player 1 ===
                const rawEfvId = data.efvId || data['EFV-ID'] || data['EFVID'] || data['efv_id'] || data['EFV-ID 1'] || null;
                const efvIdNum = rawEfvId ? parseInt(String(rawEfvId).replace(/[^0-9]/g, ''), 10) : null;

                const p1 = await createOrFindUser({
                    efvIdNum: (efvIdNum && !isNaN(efvIdNum) && efvIdNum > 0) ? efvIdNum : null,
                    playerName, gamerId, phone, email, nickname,
                    dateOfBirth, province, teamName, facebookName, facebookLink,
                });

                if (p1.error) {
                    skippedCount++;
                    results.push({ teamName, playerName, status: "error", reason: p1.error });
                    continue;
                }

                // Check duplicate
                const existingReg = await Registration.findOne({ tournament: id, user: p1.userId });
                if (existingReg) {
                    results.push({ teamName, playerName, efvId: p1.efvId, status: "skipped", reason: "VĐV đã đăng ký trong giải" });
                    skippedCount++;
                    continue;
                }

                // === Player 2 (if teamSize >= 2) ===
                let player2UserId: mongoose.Types.ObjectId | undefined;
                let player2EfvId: number | undefined;
                let player2Name = '';
                let player2GamerId = '';
                let player2Nickname = '';
                let player2Phone = '';

                if (teamSize >= 2) {
                    player2Name = data.player2Name || data['VĐV 2'] || data['Tên VĐV 2'] || '';
                    player2GamerId = data.player2GamerId || data['ID Game 2'] || '';
                    player2Nickname = data.player2Nickname || data['Nickname 2'] || '';
                    player2Phone = data.player2Phone || data['SĐT 2'] || '';
                    const p2Email = data.player2Email || data['Email 2'] || '';

                    if (player2Name && String(player2Name).trim().length >= 2) {
                        player2Name = String(player2Name).trim();
                        const rawP2EfvId = data.player2EfvId || data['EFV-ID 2'] || data['EFVID 2'] || null;
                        const p2EfvIdNum = rawP2EfvId ? parseInt(String(rawP2EfvId).replace(/[^0-9]/g, ''), 10) : null;

                        const p2 = await createOrFindUser({
                            efvIdNum: (p2EfvIdNum && !isNaN(p2EfvIdNum) && p2EfvIdNum > 0) ? p2EfvIdNum : null,
                            playerName: player2Name,
                            gamerId: player2GamerId || 'TBD',
                            phone: player2Phone || '000',
                            email: p2Email,
                            nickname: player2Nickname,
                        });

                        if (!p2.error) {
                            player2UserId = p2.userId;
                            player2EfvId = p2.efvId;
                        }
                    }
                }

                // Create Registration
                const regOptions: any = {
                    tournament: id,
                    user: p1.userId,
                    teamName,
                    teamShortName: data.teamShortName || data.shortName || data['Tên Viết Tắt'] || teamName.substring(0, 3).toUpperCase(),
                    playerName,
                    gamerId,
                    phone,
                    email: email || `efv_${p1.efvId || 'x'}@efootball.vn`,
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

                if (player2UserId) {
                    regOptions.player2User = player2UserId;
                    regOptions.player2Name = player2Name;
                    regOptions.player2GamerId = player2GamerId || 'TBD';
                    regOptions.player2Nickname = player2Nickname;
                    regOptions.player2Phone = player2Phone;
                }

                const reg: any = await Registration.create(regOptions);

                // Create Team
                const teamMembers: any[] = [
                    { user: p1.userId, role: "captain", joinedAt: new Date() },
                ];
                if (player2UserId) {
                    teamMembers.push({ user: player2UserId, role: "player", joinedAt: new Date() });
                }

                const team = await Team.create({
                    name: reg.teamName,
                    shortName: reg.teamShortName,
                    tournament: id,
                    captain: p1.userId,
                    members: teamMembers,
                });

                reg.team = team._id;
                await reg.save();

                addedCount++;
                results.push({
                    teamName: reg.teamName,
                    playerName: reg.playerName,
                    efvId: p1.efvId,
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
            `Đã import thành công ${addedCount} đội${skippedCount > 0 ? ` (bỏ qua ${skippedCount})` : ''}`
        );
    } catch (error: any) {
        console.error("Import registration error:", error);
        return apiError("Có lỗi xảy ra khi import", 500);
    }
}
