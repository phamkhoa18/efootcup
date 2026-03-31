import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TournamentExpense from "@/models/TournamentExpense";
import Tournament from "@/models/Tournament";
import Registration from "@/models/Registration";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tournaments/[id]/expenses — Get all expenses + summary
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const tournamentId = tournament._id;

        // Get all expense records
        const expenses = await TournamentExpense.find({ tournament: tournamentId })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Calculate registration income from DB
        const registrations = await Registration.find({
            tournament: tournamentId,
            status: "approved",
            paymentStatus: "paid",
        }).lean();

        const registrationIncome = registrations.length * (tournament.entryFee || 0);
        const registrationCount = registrations.length;

        // Calculate totals from expense records
        const manualIncome = expenses
            .filter(e => e.type === "income")
            .reduce((sum, e) => sum + e.amount, 0);

        const totalExpense = expenses
            .filter(e => e.type === "expense")
            .reduce((sum, e) => sum + e.amount, 0);

        const totalIncome = manualIncome + registrationIncome;
        const balance = totalIncome - totalExpense;

        // Category breakdown
        const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
        expenses.forEach(e => {
            if (!categoryBreakdown[e.category]) {
                categoryBreakdown[e.category] = { income: 0, expense: 0 };
            }
            if (e.type === "income") {
                categoryBreakdown[e.category].income += e.amount;
            } else {
                categoryBreakdown[e.category].expense += e.amount;
            }
        });

        // Add registration category
        if (registrationIncome > 0) {
            if (!categoryBreakdown["registration"]) {
                categoryBreakdown["registration"] = { income: 0, expense: 0 };
            }
            categoryBreakdown["registration"].income += registrationIncome;
        }

        // Prize pool info
        const prizeStr = tournament.prize?.total || "0";
        const prizePool = Number(String(prizeStr).replace(/[^0-9]/g, "")) || 0;

        return apiResponse({
            expenses,
            summary: {
                totalIncome,
                totalExpense,
                balance,
                manualIncome,
                registrationIncome,
                registrationCount,
                prizePool,
                entryFee: tournament.entryFee || 0,
                categoryBreakdown,
            },
        });
    } catch (error: any) {
        console.error("Get expenses error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments/[id]/expenses — Add new expense
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin")
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const { label, amount, type, category, notes, date } = body;

        if (!label || !amount || !type) {
            return apiError("Thiếu thông tin bắt buộc", 400);
        }

        const expense = await TournamentExpense.create({
            tournament: tournament._id,
            label,
            amount: Number(amount),
            type,
            category: category || "other",
            notes: notes || "",
            date: date ? new Date(date) : new Date(),
            createdBy: authResult.user._id,
        });

        return apiResponse(expense, 201, "Đã thêm khoản thu/chi");
    } catch (error: any) {
        console.error("Create expense error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// PUT /api/tournaments/[id]/expenses — Update expense
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin")
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const { expenseId, label, amount, type, category, notes, date } = body;

        if (!expenseId) return apiError("Thiếu ID khoản thu/chi", 400);

        const expense = await TournamentExpense.findOneAndUpdate(
            { _id: expenseId, tournament: tournament._id },
            {
                ...(label && { label }),
                ...(amount !== undefined && { amount: Number(amount) }),
                ...(type && { type }),
                ...(category && { category }),
                ...(notes !== undefined && { notes }),
                ...(date && { date: new Date(date) }),
            },
            { new: true }
        );

        if (!expense) return apiError("Không tìm thấy khoản thu/chi", 404);

        return apiResponse(expense, 200, "Đã cập nhật");
    } catch (error: any) {
        console.error("Update expense error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// DELETE /api/tournaments/[id]/expenses — Delete expense
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin")
            return apiError("Không có quyền", 403);

        const body = await req.json();
        const { expenseId } = body;

        if (!expenseId) return apiError("Thiếu ID khoản thu/chi", 400);

        await TournamentExpense.findOneAndDelete({
            _id: expenseId,
            tournament: tournament._id,
        });

        return apiResponse(null, 200, "Đã xóa khoản thu/chi");
    } catch (error: any) {
        console.error("Delete expense error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}
