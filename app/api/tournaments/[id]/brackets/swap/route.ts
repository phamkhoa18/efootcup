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
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);
        const isOwner = tournament.createdBy.toString() === authResult.user._id;
        const isCollaborator = (tournament.collaborators || []).some(
            (c: any) => c.userId.toString() === authResult.user._id
        );
        if (!isOwner && !isCollaborator && authResult?.user?.role !== "admin")
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

        // =======================================================
        // Re-evaluate ALL matches after swap (sorted by round ASC)
        // Only round 1 can have genuine walkovers.
        // Round 2+ should be 'scheduled' waiting for results.
        // =======================================================
        const allMatches = await Match.find({ tournament: id })
            .sort({ round: 1, 'bracketPosition.y': 1, matchNumber: 1 });

        for (const m of allMatches) {
            // Don't touch completed matches
            if (m.status === 'completed') continue;

            if (m.round === 1) {
                // --- Round 1: evaluate walkover/bye/scheduled ---
                if (m.homeTeam && m.awayTeam) {
                    // Both teams present → scheduled
                    if (m.status === 'walkover' || m.status === 'bye') {
                        m.status = 'scheduled';
                        m.winner = null;
                        m.homeScore = null as any;
                        m.awayScore = null as any;
                    }
                    await m.save();
                } else if (m.homeTeam || m.awayTeam) {
                    // One team → walkover
                    const walkoverWinner = m.homeTeam || m.awayTeam;
                    m.status = 'walkover';
                    m.winner = walkoverWinner;
                    m.homeScore = null as any;
                    m.awayScore = null as any;
                    // Normalize: always put remaining team in homeTeam
                    if (!m.homeTeam && m.awayTeam) {
                        m.homeTeam = m.awayTeam;
                        m.awayTeam = null as any;
                    }
                    await m.save();

                    // Advance walkover winner to next round match
                    if (m.nextMatch && walkoverWinner) {
                        const siblings = await Match.find({
                            tournament: id,
                            round: m.round,
                            nextMatch: m.nextMatch,
                        }).sort({ 'bracketPosition.y': 1, matchNumber: 1 });
                        const idx = siblings.findIndex(s => s._id.toString() === m._id.toString());
                        const slot = idx === 0 ? 'homeTeam' : 'awayTeam';
                        await Match.findByIdAndUpdate(m.nextMatch, { [slot]: walkoverWinner });
                    }
                } else {
                    // No teams → bye
                    m.status = 'bye';
                    m.winner = null;
                    await m.save();
                }
            } else {
                // --- Round 2+: NEVER set to walkover from swap ---
                // These matches are waiting for results from previous rounds.
                // Reset if incorrectly marked as walkover/bye.
                if (m.status === 'walkover' || m.status === 'bye') {
                    m.status = 'scheduled';
                    m.winner = null;
                    m.homeScore = null as any;
                    m.awayScore = null as any;
                    await m.save();
                }
            }
        }

        return apiResponse({}, 200, "Đổi vị trí thành công");
    } catch (e) {
        console.error(e);
        return apiError("Có lỗi xảy ra", 500);
    }
}
