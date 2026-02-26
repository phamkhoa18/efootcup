import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Feedback from "@/models/Feedback";
import Tournament from "@/models/Tournament";
import { requireAuth, requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/feedback
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
        const type = searchParams.get("type");

        const query: any = { tournament: id };
        if (status) query.status = status;
        if (type) query.type = type;

        const feedbacks = await Feedback.find(query)
            .populate("user", "name avatar")
            .populate("repliedBy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const stats = {
            total: feedbacks.length,
            new: feedbacks.filter((f) => f.status === "new").length,
            replied: feedbacks.filter((f) => f.status === "replied").length,
            averageRating:
                feedbacks.length > 0
                    ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
                    feedbacks.filter((f) => f.rating).length
                    : 0,
        };

        return apiResponse({ feedbacks, stats });
    } catch (error) {
        console.error("Get feedback error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments/[id]/feedback — Submit feedback (user)
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;

        let id = idOrSlug;
        if (!mongoose.Types.ObjectId.isValid(idOrSlug)) {
            const tournament = await Tournament.findOne({ slug: idOrSlug }).select("_id").lean();
            if (tournament) id = tournament._id.toString();
        }

        const body = await req.json();

        const feedback = await Feedback.create({
            tournament: id,
            user: authResult.user._id,
            type: body.type || "other",
            subject: body.subject,
            message: body.message,
            rating: body.rating,
        });

        return apiResponse(feedback, 201, "Gửi ý kiến thành công");
    } catch (error: any) {
        console.error("Create feedback error:", error);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/feedback — Reply to feedback (manager)
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;

        const body = await req.json();
        const { feedbackId, reply, status } = body;

        const feedback = await Feedback.findByIdAndUpdate(
            feedbackId,
            {
                reply,
                status: status || "replied",
                repliedBy: authResult.user._id,
                repliedAt: new Date(),
            },
            { new: true }
        ).populate("user", "name avatar");

        if (!feedback) return apiError("Không tìm thấy ý kiến", 404);

        return apiResponse(feedback, 200, "Phản hồi thành công");
    } catch (error) {
        console.error("Reply feedback error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
