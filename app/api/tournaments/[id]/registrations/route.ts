import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import { requireAuth, requireManager, apiResponse, apiError, getCurrentUser } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/registrations — Get registrations
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;

        let id = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) id = tournament._id.toString();
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const query: any = { tournament: id };
        if (status) query.status = status;

        const registrations = await Registration.find(query)
            .populate("user", "name email avatar gamerId")
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const stats = {
            total: registrations.length,
            pending: registrations.filter((r) => r.status === "pending").length,
            approved: registrations.filter((r) => r.status === "approved").length,
            rejected: registrations.filter((r) => r.status === "rejected").length,
        };

        return apiResponse({ registrations, stats });
    } catch (error) {
        console.error("Get registrations error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments/[id]/registrations — Register for tournament (user)
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        // Check tournament
        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const id = tournament._id;

        if (tournament.status !== "registration") {
            return apiError("Giải đấu chưa mở đăng ký hoặc đã đóng", 400);
        }

        if (tournament.currentTeams >= tournament.maxTeams) {
            return apiError("Giải đấu đã đủ đội", 400);
        }

        // Check duplicate
        const existing = await Registration.findOne({
            tournament: id,
            user: authResult.user._id,
        });
        if (existing) {
            return apiError("Bạn đã đăng ký giải đấu này rồi", 409);
        }

        const body = await req.json();

        const registration = await Registration.create({
            tournament: id,
            user: authResult.user._id,
            teamName: body.teamName,
            teamShortName: body.teamShortName,
            playerName: body.playerName || authResult.user.name,
            gamerId: body.gamerId,
            phone: body.phone,
            email: body.email || authResult.user.email,
            notes: body.notes,
            paymentStatus: tournament.entryFee > 0 ? "unpaid" : "paid",
        });

        // Notify the tournament manager
        await Notification.create({
            recipient: tournament.createdBy,
            type: "registration",
            title: "Yêu cầu đăng ký mới",
            message: `VĐV "${registration.playerName}" vừa đăng ký tham gia giải đấu "${tournament.title}".`,
            link: `/manager/giai-dau/${id}/dang-ky`,
        });

        return apiResponse(registration, 201, "Đăng ký thành công! Chờ phê duyệt.");
    } catch (error: any) {
        console.error("Create registration error:", error);
        if (error.code === 11000) {
            return apiError("Bạn đã đăng ký giải đấu này rồi", 409);
        }
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/registrations — Approve/Reject (manager only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const id = tournament._id;
        if (tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const { registrationId, action, rejectionReason } = body;

        const registration = await Registration.findById(registrationId);
        if (!registration) return apiError("Không tìm thấy đăng ký", 404);

        if (action === "approve") {
            if (tournament.currentTeams >= tournament.maxTeams) {
                return apiError("Giải đấu đã đủ đội", 400);
            }

            // Create team
            const team = await Team.create({
                name: registration.teamName,
                shortName: registration.teamShortName,
                tournament: id,
                captain: registration.user,
                members: [
                    {
                        user: registration.user,
                        role: "captain",
                        joinedAt: new Date(),
                    },
                ],
            });

            registration.status = "approved";
            registration.team = team._id;
            registration.approvedBy = authResult.user._id as any;
            registration.approvedAt = new Date();
            await registration.save();

            // Update tournament count
            await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: 1 } });
            await tournament.save();

            // Notify the user about approval
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "Đăng ký thành công",
                message: `Yêu cầu tham gia giải "${tournament.title}" đã được phê duyệt.`,
                link: `/giai-dau/${id}`,
            });

            return apiResponse(registration, 200, "Phê duyệt thành công");
        } else if (action === "reject") {
            registration.status = "rejected";
            registration.rejectionReason = body.reason || "Không đủ điều kiện";
            await registration.save();

            // Notify the user
            await Notification.create({
                recipient: registration.user,
                type: "system",
                title: "Đăng ký thất bại",
                message: `Yêu cầu tham gia giải "${tournament.title}" đã bị từ chối.`,
                link: `/giai-dau/${id}`,
            });

            return apiResponse(registration, 200, "Đã từ chối đăng ký");
        }

        return apiResponse(registration, 200, `${action === "approve" ? "Phê duyệt" : "Từ chối"} thành công`);
    } catch (error) {
        console.error("Update registration error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
