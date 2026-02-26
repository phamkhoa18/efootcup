import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/tournaments/[id]/registrations/import — Bulk import registrations
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        // Check tournament
        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const id = tournament._id;
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const { registrations } = body; // Expected to be an array of parsed excel rows
        if (!Array.isArray(registrations) || registrations.length === 0) {
            return apiError("Dữ liệu không hợp lệ", 400);
        }

        const maxAllowed = tournament.maxTeams - tournament.currentTeams;
        if (registrations.length > maxAllowed) {
            return apiError(`Chỉ còn trống ${maxAllowed} suất, không thể import ${registrations.length} đội`, 400);
        }

        let addedCount = 0;
        const results = [];

        for (const data of registrations) {
            let teamName = data.teamName || data.name || data['Tên đội'] || data['Tên Đội'];
            const player1 = data.playerName || data['Tên Đội Trưởng'] || data['VĐV 1'];

            // "Cột VĐV 1 là bắt buộc và tối thiểu 2 ký tự"
            if (!player1 || String(player1).trim().length < 2) {
                continue; // Skip invalid rows
            }

            // "Tên đội để trống mặc định sẽ là "Tự do""
            if (!teamName || String(teamName).trim() === '') {
                teamName = "Tự do";
            } else {
                teamName = String(teamName).trim();
            }

            // Create dummy user ID to bypass unique [tournament, user] DB constraint
            const dummyUserId = new mongoose.Types.ObjectId();

            // Create Registration
            const regOptions: any = {
                tournament: id,
                user: dummyUserId, // Assign guest ID so it doesn't conflict with other imports
                teamName: teamName,
                teamShortName: data.teamShortName || data.shortName || data['Tên Viết Tắt'] || teamName.substring(0, 3).toUpperCase(),
                playerName: String(player1).trim() || authResult.user.name,
                gamerId: data.gamerId || data.ingameId || data['In-game ID'] || data['VĐV 2'] || 'TBD',
                phone: data.phone || data['Số điện thoại'] || data['SĐT'] || '000',
                email: data.email || data['Email'] || 'noemail@vntournament.com',
                status: "approved", // Automatically approve imported teams
                paymentStatus: "paid", // Data shows 'Lệ phí' column, ignoring for now or defaulting to paid
                approvedBy: authResult.user._id as any,
                approvedAt: new Date()
            };

            const reg: any = await Registration.create(regOptions);

            // Create Team
            const team = await Team.create({
                name: reg.teamName,
                shortName: reg.teamShortName,
                tournament: id,
                captain: reg.user,
                members: [
                    {
                        user: reg.user,
                        role: "captain",
                        joinedAt: new Date(),
                    },
                ],
            });

            reg.team = team._id;
            await reg.save();

            addedCount++;
            results.push({ teamName: reg.teamName, status: "success" });
        }

        // Update tournament count
        if (addedCount > 0) {
            await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: addedCount } });
        }

        return apiResponse({ addedCount, results }, 201, `Đã import thành công ${addedCount} đội`);
    } catch (error: any) {
        console.error("Import registration error:", error);
        return apiError("Có lỗi xảy ra khi import", 500);
    }
}
