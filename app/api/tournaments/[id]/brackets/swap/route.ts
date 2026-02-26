import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";
import mongoose from "mongoose";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id } = await params;
        const body = await req.json();
        const { team1Id, team2Id } = body;

        if (!team1Id || !team2Id || team1Id === team2Id) {
            return apiError("ID đội không hợp lệ", 400);
        }

        const tournament = await Tournament.findById(id);
        if (!tournament || tournament.createdBy.toString() !== authResult.user._id)
            return apiError("Không có quyền", 403);

        const t1 = new mongoose.Types.ObjectId(team1Id);
        const t2 = new mongoose.Types.ObjectId(team2Id);
        const temp = new mongoose.Types.ObjectId();

        // Swap homeTeam
        await Match.updateMany({ tournament: id, homeTeam: t1 }, { $set: { homeTeam: temp } });
        await Match.updateMany({ tournament: id, homeTeam: t2 }, { $set: { homeTeam: t1 } });
        await Match.updateMany({ tournament: id, homeTeam: temp }, { $set: { homeTeam: t2 } });

        // Swap awayTeam
        await Match.updateMany({ tournament: id, awayTeam: t1 }, { $set: { awayTeam: temp } });
        await Match.updateMany({ tournament: id, awayTeam: t2 }, { $set: { awayTeam: t1 } });
        await Match.updateMany({ tournament: id, awayTeam: temp }, { $set: { awayTeam: t2 } });

        // Update walkovers
        const affectedMatches = await Match.find({ tournament: id, $or: [{ homeTeam: t1 }, { homeTeam: t2 }, { awayTeam: t1 }, { awayTeam: t2 }] });

        for (const m of affectedMatches) {
            if (!m.homeTeam || !m.awayTeam) {
                m.status = "walkover";
                m.winner = m.homeTeam || m.awayTeam;
            } else if (m.status === "walkover") {
                m.status = "scheduled";
                m.winner = null as any;
            }
            await m.save();
        }

        return apiResponse({}, 200, "Đổi vị trí thành công");
    } catch (e) {
        console.error(e);
        return apiError("Có lỗi xảy ra", 500);
    }
}
