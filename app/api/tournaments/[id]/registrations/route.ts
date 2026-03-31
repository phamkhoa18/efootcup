import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireAuth, requireManager, apiResponse, apiError, getCurrentUser } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/registrations — Get registrations (supports pagination)
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
        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");
        const search = (searchParams.get("search") || "").trim();

        const query: any = { tournament: id };
        if (status && status !== "all") query.status = status;

        // If page param exists, do paginated query with search
        if (pageParam) {
            const page = Math.max(1, parseInt(pageParam));
            const limit = Math.min(200, Math.max(1, parseInt(limitParam || "50")));

            // Add search filter
            if (search) {
                const searchRegex = new RegExp(search, "i");
                const orConditions: any[] = [
                    { playerName: searchRegex },
                    { teamName: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex },
                    { gamerId: searchRegex },
                    { nickname: searchRegex },
                    { facebookName: searchRegex },
                    { province: searchRegex },
                    { ingameId: searchRegex },
                    { player2Name: searchRegex },
                    { player2GamerId: searchRegex },
                    { player2Nickname: searchRegex },
                ];

                // Support EFV-ID search (numeric or starts with #)
                const cleanSearch = search.replace(/^#/, '');
                if (/^\d+$/.test(cleanSearch)) {
                    const efvIdNum = parseInt(cleanSearch);
                    const matchingUsers = await User.find({ efvId: efvIdNum }).select('_id').lean();
                    if (matchingUsers.length > 0) {
                        orConditions.push({ user: { $in: matchingUsers.map(u => u._id) } });
                    }
                }

                query.$or = orConditions;
            }

            const total = await Registration.countDocuments(query);
            const totalPages = Math.ceil(total / limit);
            const skip = (page - 1) * limit;

            const registrations = await Registration.find(query)
                .populate("user", "name email avatar gamerId efvId")
                .populate("player2User", "name email avatar gamerId efvId")
                .populate("approvedBy", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Get stats from unfiltered data (same tournament)
            const statsQuery: any = { tournament: id };
            const allCount = await Registration.countDocuments(statsQuery);
            const pendingCount = await Registration.countDocuments({ ...statsQuery, status: "pending" });
            const approvedCount = await Registration.countDocuments({ ...statsQuery, status: "approved" });
            const rejectedCount = await Registration.countDocuments({ ...statsQuery, status: "rejected" });
            const paidCount = await Registration.countDocuments({ ...statsQuery, paymentStatus: "paid" });
            const pendingPaymentCount = await Registration.countDocuments({ ...statsQuery, paymentStatus: "pending_verification" });

            return apiResponse({
                registrations,
                pagination: { page, limit, total, totalPages },
                stats: {
                    total: allCount,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                    paid: paidCount,
                    pendingPayment: pendingPaymentCount,
                },
            });
        }

        // Non-paginated (legacy): return all
        const registrations = await Registration.find(query)
            .populate("user", "name email avatar gamerId efvId")
            .populate("player2User", "name email avatar gamerId efvId")
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

        // Check duplicate - allow re-registration in certain cases
        const existing = await Registration.findOne({
            tournament: id,
            user: authResult.user._id,
        });
        if (existing) {
            // Already approved → can never re-register
            if (existing.status === "approved") {
                return apiError("Bạn đã được duyệt vào giải đấu này rồi", 409);
            }
            // Pending but already paid → can't re-register (wait for approval)
            if (existing.status === "pending" && existing.paymentStatus === "paid") {
                return apiError("Đăng ký của bạn đang chờ duyệt và đã thanh toán. Vui lòng chờ Manager xét duyệt.", 409);
            }
            // Pending with pending_verification → can't re-register (payment being verified)
            if (existing.status === "pending" && existing.paymentStatus === "pending_verification") {
                return apiError("Đăng ký của bạn đang chờ xác nhận thanh toán. Vui lòng chờ.", 409);
            }
            // Rejected, cancelled, or pending+unpaid → allow re-registration by removing old record
            await Registration.deleteOne({ _id: existing._id });
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
            // Extended player info
            dateOfBirth: body.dateOfBirth || "",
            facebookName: body.facebookName || "",
            facebookLink: body.facebookLink || "",
            nickname: body.nickname || "",
            province: body.province || "",
            personalPhoto: body.personalPhoto || "",
            teamLineupPhoto: body.teamLineupPhoto || "",
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

// PUT /api/tournaments/[id]/registrations — Approve/Reject/UpdateStatus/UpdatePayment (manager only)
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

            // Check payment status for paid tournaments
            if (tournament.entryFee > 0 && registration.paymentStatus !== "paid") {
                return apiError(
                    "VĐV chưa thanh toán lệ phí. Vui lòng xác nhận thanh toán trước khi duyệt.",
                    400
                );
            }

            // Create team — auto-generate name/shortName if not provided
            const teamName = registration.teamName || registration.playerName || "Team";
            const teamShort = registration.teamShortName || teamName.substring(0, 4).toUpperCase();
            const team = await Team.create({
                name: teamName,
                shortName: teamShort,
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
            // If was approved → rollback: delete team, decrement count
            if (registration.status === "approved") {
                if (registration.team) {
                    await Team.findByIdAndDelete(registration.team);
                }
                await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: -1 } });
                registration.team = undefined;
                registration.approvedBy = undefined;
                registration.approvedAt = undefined;
            }

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
        } else if (action === "update_status") {
            // Manager updates registration status (e.g. approved→pending, rejected→pending)
            const newStatus = body.newStatus;
            if (!newStatus || !["pending", "approved", "rejected"].includes(newStatus)) {
                return apiError("Trạng thái không hợp lệ", 400);
            }

            const oldStatus = registration.status;

            // Rollback if was approved & new status != approved
            if (oldStatus === "approved" && newStatus !== "approved") {
                if (registration.team) {
                    await Team.findByIdAndDelete(registration.team);
                }
                await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: -1 } });
                registration.team = undefined;
                registration.approvedBy = undefined;
                registration.approvedAt = undefined;
            }

            // If setting to approved from non-approved
            if (newStatus === "approved" && oldStatus !== "approved") {
                if (tournament.currentTeams >= tournament.maxTeams) {
                    return apiError("Giải đấu đã đủ đội", 400);
                }
                // Check payment for paid tournaments
                if (tournament.entryFee > 0 && registration.paymentStatus !== "paid") {
                    return apiError("VĐV chưa thanh toán lệ phí. Vui lòng xác nhận thanh toán trước.", 400);
                }
                const teamName = registration.teamName || registration.playerName || "Team";
                const teamShort = registration.teamShortName || teamName.substring(0, 4).toUpperCase();
                const team = await Team.create({
                    name: teamName,
                    shortName: teamShort,
                    tournament: id,
                    captain: registration.user,
                    members: [{ user: registration.user, role: "captain", joinedAt: new Date() }],
                });
                registration.team = team._id;
                registration.approvedBy = authResult.user._id as any;
                registration.approvedAt = new Date();
                await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: 1 } });
            }

            registration.status = newStatus;
            if (newStatus === "rejected") {
                registration.rejectionReason = body.reason || "Manager cập nhật trạng thái";
            }
            await registration.save();

            console.log(`🔄 Manager updated reg ${registrationId} status: ${oldStatus} → ${newStatus}`);
            return apiResponse(registration, 200, `Đã cập nhật trạng thái: ${oldStatus} → ${newStatus}`);

        } else if (action === "update_payment") {
            // Manager updates payment status directly
            const newPaymentStatus = body.newPaymentStatus;
            if (!newPaymentStatus || !["unpaid", "pending_verification", "paid", "refunded"].includes(newPaymentStatus)) {
                return apiError("Trạng thái thanh toán không hợp lệ", 400);
            }

            const oldPaymentStatus = registration.paymentStatus;

            // If changing from paid → unpaid/refunded AND was auto-approved → rollback approval
            if (oldPaymentStatus === "paid" && (newPaymentStatus === "unpaid" || newPaymentStatus === "refunded")) {
                if (registration.status === "approved") {
                    // Rollback approval: delete team, decrement count
                    if (registration.team) {
                        await Team.findByIdAndDelete(registration.team);
                    }
                    await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: -1 } });
                    registration.status = "pending";
                    registration.team = undefined;
                    registration.approvedBy = undefined;
                    registration.approvedAt = undefined;
                    console.log(`⏪ Rolled back approval for reg ${registrationId} due to payment revert`);
                }
            }

            // If changing to paid from non-paid
            if (newPaymentStatus === "paid" && oldPaymentStatus !== "paid") {
                registration.paymentConfirmedBy = authResult.user._id as any;
                registration.paymentConfirmedAt = new Date();
                registration.paymentAmount = body.paymentAmount || tournament.entryFee;
            }

            // If changing from paid to non-paid (e.g., pending_verification), clear confirmation data
            if (newPaymentStatus !== "paid") {
                registration.paymentConfirmedBy = undefined;
                registration.paymentConfirmedAt = undefined;
            }

            // If changing to unpaid or refunded, clear payment data
            if (newPaymentStatus === "unpaid" || newPaymentStatus === "refunded") {
                registration.paymentProof = "";
                registration.paymentAmount = 0;
            }

            registration.paymentStatus = newPaymentStatus;
            await registration.save();

            console.log(`💰 Manager updated reg ${registrationId} payment: ${oldPaymentStatus} → ${newPaymentStatus}`);
            return apiResponse(registration, 200, `Đã cập nhật thanh toán: ${oldPaymentStatus} → ${newPaymentStatus}`);
        } else if (action === "update_info") {
            // Manager updates registration info (player name, team name, gamer ID, phone, email, etc.)
            const allowedFields = [
                "playerName", "teamName", "teamShortName", "gamerId",
                "phone", "email", "nickname", "facebookName", "facebookLink",
                "province", "dateOfBirth", "notes",
                "personalPhoto", "teamLineupPhoto",
                "player2Name", "player2GamerId", "player2Nickname", "player2Phone",
            ];

            const updates: any = {};
            for (const field of allowedFields) {
                if (body[field] !== undefined) {
                    updates[field] = body[field];
                }
            }

            if (Object.keys(updates).length === 0) {
                return apiError("Không có thông tin nào để cập nhật", 400);
            }

            // Validate required fields if they are being updated
            if (updates.playerName !== undefined && !updates.playerName.trim()) {
                return apiError("Tên VĐV không được để trống", 400);
            }

            // Apply updates
            Object.assign(registration, updates);
            await registration.save();

            // If registration is approved and team exists, sync team name/shortName
            if (registration.status === "approved" && registration.team) {
                const teamUpdates: any = {};
                if (updates.teamName) teamUpdates.name = updates.teamName;
                if (updates.teamShortName) teamUpdates.shortName = updates.teamShortName;
                if (Object.keys(teamUpdates).length > 0) {
                    await Team.findByIdAndUpdate(registration.team, teamUpdates);
                }
            }

            console.log(`📝 Manager updated reg ${registrationId} info:`, Object.keys(updates));
            return apiResponse(registration, 200, "Đã cập nhật thông tin đăng ký");
        }

        return apiResponse(registration, 200, `${action === "approve" ? "Phê duyệt" : "Từ chối"} thành công`);
    } catch (error) {
        console.error("Update registration error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/tournaments/[id]/registrations — Cancel registration (user self-cancel or manager force-delete)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const id = tournament._id;

        // Check for manager force-delete mode
        const url = new URL(req.url);
        const registrationId = url.searchParams.get("registrationId");
        const isManager = (
            authResult.user.role === "admin" ||
            (authResult.user.role === "manager" && tournament.createdBy.toString() === authResult.user._id)
        );

        if (registrationId && isManager) {
            // Manager force-delete any registration
            const registration = await Registration.findById(registrationId);
            if (!registration) return apiError("Không tìm thấy đăng ký", 404);

            // If was approved → cleanup: delete team and decrement count
            if (registration.status === "approved") {
                if (registration.team) {
                    await Team.findByIdAndDelete(registration.team);
                }
                await Tournament.findByIdAndUpdate(id, { $inc: { currentTeams: -1 } });
            }

            await Registration.deleteOne({ _id: registration._id });
            console.log(`🗑️ Manager force-deleted reg ${registrationId} (player: ${registration.playerName})`);

            return apiResponse(null, 200, `Đã xóa đăng ký của ${registration.playerName}`);
        }

        // User self-cancel
        const registration = await Registration.findOne({
            tournament: id,
            user: authResult.user._id,
        });
        if (!registration) return apiError("Không tìm thấy đăng ký", 404);

        // Only allow cancel if not yet approved
        if (registration.status === "approved") {
            return apiError("Đăng ký đã được duyệt, không thể hủy", 400);
        }

        await Registration.deleteOne({ _id: registration._id });

        return apiResponse(null, 200, "Đã hủy đăng ký thành công");
    } catch (error) {
        console.error("Cancel registration error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
