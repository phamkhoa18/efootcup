import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Registration from "@/models/Registration";
import { requireAuth, requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id] — Get single tournament
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query)
            .populate("createdBy", "name email avatar")
            .lean();

        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        const id = tournament._id;

        // Increment views
        await Tournament.findByIdAndUpdate(id, { $inc: { views: 1 } });

        // Get related data
        const [teams, registrations, matches] = await Promise.all([
            Team.find({ tournament: id })
                .populate("captain", "name avatar")
                .sort({ "stats.points": -1, "stats.goalDifference": -1 })
                .lean(),
            Registration.find({ tournament: id })
                .populate("user", "name email avatar")
                .sort({ createdAt: -1 })
                .lean(),
            Match.find({ tournament: id })
                .populate("homeTeam", "name shortName logo")
                .populate("awayTeam", "name shortName logo")
                .populate("winner", "name shortName")
                .sort({ round: 1, matchNumber: 1 })
                .lean(),
        ]);

        return apiResponse({
            tournament,
            teams,
            registrations,
            matches,
            stats: {
                totalTeams: teams.length,
                totalMatches: matches.length,
                completedMatches: matches.filter((m) => m.status === "completed").length,
                pendingRegistrations: registrations.filter((r) => r.status === "pending").length,
                totalRegistrations: registrations.length,
            },
        });
    } catch (error) {
        console.error("Get tournament error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id] — Update tournament (owner manager only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        // Check ownership
        const tournament = await Tournament.findOne(query);
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        const id = tournament._id;

        if (tournament.createdBy.toString() !== authResult.user._id) {
            return apiError("Bạn không có quyền chỉnh sửa giải đấu này", 403);
        }

        const body = await req.json();

        // Prevent changing certain fields
        delete body.createdBy;
        delete body._id;
        delete body.slug;

        const updated = await Tournament.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        // Notify players about tournament update (especially if schedule/status changed)
        try {
            const teams = await Team.find({ tournament: id }).populate("captain", "name email");
            const captains = teams.map(t => t.captain).filter(Boolean);

            if (captains.length > 0) {
                const Notification = (await import('@/models/Notification')).default;
                const { sendNotificationEmail } = await import('@/lib/email');

                const title = "Cập nhật giải đấu";
                const message = `Giải đấu "${updated?.title}" bạn tham gia đã được quản lý cập nhật thông tin mới nhất về lịch thi đấu hoặc trạng thái.`;
                const link = `/giai-dau/${updated?._id}`;

                // Create web notifications
                const notifications = captains.map(captain => ({
                    recipient: captain._id,
                    type: "tournament" as const,
                    title,
                    message,
                    link,
                }));
                await Notification.insertMany(notifications);

                // Send emails (async, don't wait for all to finish to response quickly)
                captains.forEach(captain => {
                    if ((captain as any).email) {
                        sendNotificationEmail(
                            (captain as any).email,
                            (captain as any).name,
                            title,
                            message,
                            link
                        ).catch(err => console.error("Email send fail:", err));
                    }
                });
            }
        } catch (notifyErr) {
            console.error("Notify tournament update error:", notifyErr);
        }

        return apiResponse(updated, 200, "Cập nhật giải đấu thành công");
    } catch (error: any) {
        console.error("Update tournament error:", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }

        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/tournaments/[id] — Delete tournament (owner manager only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) {
            return apiError("Không tìm thấy giải đấu", 404);
        }

        const id = tournament._id;

        if (tournament.createdBy.toString() !== authResult.user._id) {
            return apiError("Bạn không có quyền xóa giải đấu này", 403);
        }

        // Delete related data
        await Promise.all([
            Team.deleteMany({ tournament: id }),
            Match.deleteMany({ tournament: id }),
            Registration.deleteMany({ tournament: id }),
            Tournament.findByIdAndDelete(id),
        ]);

        return apiResponse(null, 200, "Xóa giải đấu thành công");
    } catch (error) {
        console.error("Delete tournament error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
