import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tournament, { SCORING_DEFAULTS } from "@/models/Tournament";
import { requireAuth, requireManager, apiResponse, apiError } from "@/lib/auth";

// GET /api/tournaments — List all tournaments (public)
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const status = searchParams.get("status");
        const format = searchParams.get("format");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort") || "-createdAt";
        const featured = searchParams.get("featured");
        const createdBy = searchParams.get("createdBy");

        // Build query
        const query: any = {};

        // If not manager's own tournaments, only show public
        if (!createdBy) {
            query.isPublic = true;
        } else {
            query.createdBy = createdBy;
        }

        if (status) query.status = status;
        if (format) query.format = format;
        if (featured === "true") query.isFeatured = true;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search, "i")] } },
            ];
        }

        const skip = (page - 1) * limit;

        const [tournaments, total] = await Promise.all([
            Tournament.find(query)
                .populate("createdBy", "name avatar")
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Tournament.countDocuments(query),
        ]);

        return apiResponse({
            tournaments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        console.error("Get tournaments error:", error);
        return apiError("Có lỗi xảy ra", 500);
    }
}

// POST /api/tournaments — Create tournament (manager only)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();

        const body = await req.json();

        // Clean schedule — remove empty date strings
        const schedule: any = {};
        if (body.schedule) {
            if (body.schedule.registrationStart) schedule.registrationStart = new Date(body.schedule.registrationStart);
            if (body.schedule.registrationEnd) schedule.registrationEnd = new Date(body.schedule.registrationEnd);
            if (body.schedule.tournamentStart) schedule.tournamentStart = new Date(body.schedule.tournamentStart);
            if (body.schedule.tournamentEnd) schedule.tournamentEnd = new Date(body.schedule.tournamentEnd);
        }

        // Clean prize — remove empty strings
        const prize: any = { total: "0 VNĐ" };
        if (body.prize) {
            if (body.prize.total) prize.total = body.prize.total;
            if (body.prize.first) prize.first = body.prize.first;
            if (body.prize.second) prize.second = body.prize.second;
            if (body.prize.third) prize.third = body.prize.third;
        }

        // Apply format-specific scoring defaults
        const format = body.format || "single_elimination";
        const scoringDefaults = SCORING_DEFAULTS[format] || {};
        const scoring = body.scoring || {
            pointsPerWin: scoringDefaults.pointsPerWin ?? 3,
            pointsPerDraw: scoringDefaults.pointsPerDraw ?? 1,
            pointsPerLoss: scoringDefaults.pointsPerLoss ?? 0,
            tiebreakers: scoringDefaults.tiebreakers || [],
            teamsPerGroup: scoringDefaults.teamsPerGroup,
            advancePerGroup: scoringDefaults.advancePerGroup,
            numberOfRounds: scoringDefaults.numberOfRounds,
            resetFinal: scoringDefaults.resetFinal,
        };

        // Auto-calculate Swiss rounds
        if (format === "swiss" && (!scoring.numberOfRounds || scoring.numberOfRounds === 0)) {
            scoring.numberOfRounds = Math.ceil(Math.log2(body.maxTeams || 8));
        }

        const tournamentData = {
            title: body.title,
            description: body.description || "",
            gameVersion: body.gameVersion || "eFootball 2025",
            format,
            platform: body.platform || "cross_platform",
            maxTeams: body.maxTeams || 16,
            teamSize: body.teamSize || 1,
            isOnline: body.isOnline !== undefined ? body.isOnline : true,
            location: body.location || "",
            schedule,
            prize,
            scoring,
            entryFee: body.entryFee || 0,
            rules: body.rules || "",
            settings: {
                matchDuration: body.settings?.matchDuration || 10,
                extraTime: body.settings?.extraTime !== undefined ? body.settings.extraTime : true,
                penalties: body.settings?.penalties !== undefined ? body.settings.penalties : true,
                legsPerRound: body.settings?.legsPerRound || 1,
                homeAwayRule: body.settings?.homeAwayRule || false,
                awayGoalRule: body.settings?.awayGoalRule || false,
                seedingEnabled: body.settings?.seedingEnabled || false,
                autoAdvance: body.settings?.autoAdvance || false,
            },
            contact: {
                phone: body.contact?.phone || "",
                email: body.contact?.email || "",
                facebook: body.contact?.facebook || "",
                discord: body.contact?.discord || "",
                zalo: body.contact?.zalo || "",
            },
            isPublic: body.isPublic !== undefined ? body.isPublic : true,
            tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
            status: body.status || "draft",
            createdBy: authResult.user._id,
        };

        const tournament = await Tournament.create(tournamentData);

        return apiResponse(tournament, 201, "Tạo giải đấu thành công");
    } catch (error: any) {
        console.error("Create tournament error:", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (err: any) => err.message
            );
            return apiError(messages.join(", "), 400);
        }

        if (error.code === 11000) {
            return apiError("Tên giải đấu đã tồn tại", 409);
        }

        return apiError("Có lỗi xảy ra", 500);
    }
}
