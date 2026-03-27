import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Registration from "@/models/Registration";
import { requireManager, apiError } from "@/lib/auth";
import * as XLSX from "xlsx";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/tournaments/[id]/export-players
 * 
 * Export TOÀN BỘ VĐV của giải đấu ra file Excel.
 * Bao gồm cả VĐV đã bị loại lẫn còn thi đấu.
 * Dùng cho recovery: manager kiểm tra danh sách đầy đủ.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query).lean();
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        const tournamentId = tournament._id;

        // 1. Lấy TẤT CẢ teams (active + eliminated + withdrawn + disqualified)
        const allTeams = await Team.find({ tournament: tournamentId })
            .populate("captain", "name email efvId avatar phone gamerId nickname facebookName facebookLink")
            .sort({ status: 1, seed: 1, registeredAt: 1 })
            .lean();

        // 2. Lấy TẤT CẢ registrations approved
        const registrations = await Registration.find({
            tournament: tournamentId,
            status: "approved",
        }).populate("user", "name email efvId phone gamerId nickname facebookName facebookLink")
          .lean();

        // Map team → registration
        const regByTeam = new Map<string, any>();
        for (const reg of registrations) {
            const tId = (reg.team?._id || reg.team)?.toString();
            if (tId) regByTeam.set(tId, reg);
        }




        // 3. Try to get match-based elimination data from notifications
        const Notification = (await import("@/models/Notification")).default;
        const notifications = await Notification.find({
            type: "tournament",
            $or: [
                { message: { $regex: (tournament as any).title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                { link: { $regex: tournamentId.toString() } },
            ]
        }).sort({ createdAt: 1 }).lean();

        // Parse notifications for match results
        const resultPattern = /kết quả trận đấu:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s+trong giải/i;
        const matchResults: { homeShort: string; awayShort: string; homeScore: number; awayScore: number; date: Date }[] = [];
        
        for (const notif of notifications as any[]) {
            if (!notif.message) continue;
            const match = notif.message.match(resultPattern);
            if (match) {
                matchResults.push({
                    homeShort: match[1].trim().toUpperCase(),
                    awayShort: match[4].trim().toUpperCase(),
                    homeScore: parseInt(match[2]),
                    awayScore: parseInt(match[3]),
                    date: notif.createdAt,
                });
            }
        }

        // Determine winners/losers from notifications
        const teamShortToId = new Map<string, string>();
        for (const t of allTeams as any[]) {
            if (t.shortName) teamShortToId.set(t.shortName.toUpperCase(), t._id.toString());
        }

        // Track match history per team from notifications
        const teamMatchHistory = new Map<string, { wins: number; losses: number; lastMatch: string }>();
        
        // Deduplicate by matchup
        const matchupResults = new Map<string, { homeShort: string; awayShort: string; homeScore: number; awayScore: number }>();
        for (const mr of matchResults) {
            const key = [mr.homeShort, mr.awayShort].sort().join(" vs ");
            matchupResults.set(key, mr); // Latest wins
        }

        for (const [, mr] of matchupResults) {
            const homeId = teamShortToId.get(mr.homeShort);
            const awayId = teamShortToId.get(mr.awayShort);
            
            if (homeId && awayId) {
                if (mr.homeScore > mr.awayScore) {
                    // Home wins
                    const hw = teamMatchHistory.get(homeId) || { wins: 0, losses: 0, lastMatch: "" };
                    hw.wins++;
                    hw.lastMatch = `Thắng ${mr.awayShort} (${mr.homeScore}-${mr.awayScore})`;
                    teamMatchHistory.set(homeId, hw);

                    const al = teamMatchHistory.get(awayId) || { wins: 0, losses: 0, lastMatch: "" };
                    al.losses++;
                    al.lastMatch = `Thua ${mr.homeShort} (${mr.awayScore}-${mr.homeScore})`;
                    teamMatchHistory.set(awayId, al);
                } else if (mr.awayScore > mr.homeScore) {
                    // Away wins
                    const aw = teamMatchHistory.get(awayId) || { wins: 0, losses: 0, lastMatch: "" };
                    aw.wins++;
                    aw.lastMatch = `Thắng ${mr.homeShort} (${mr.awayScore}-${mr.homeScore})`;
                    teamMatchHistory.set(awayId, aw);

                    const hl = teamMatchHistory.get(homeId) || { wins: 0, losses: 0, lastMatch: "" };
                    hl.losses++;
                    hl.lastMatch = `Thua ${mr.awayShort} (${mr.homeScore}-${mr.awayScore})`;
                    teamMatchHistory.set(homeId, hl);
                }
            }
        }

        // 4. Build Excel rows
        const rows: any[] = [];
        let stt = 0;

        for (const team of allTeams as any[]) {
            stt++;
            const teamId = team._id.toString();
            const reg = regByTeam.get(teamId);
            const captain = team.captain || {};
            const history = teamMatchHistory.get(teamId);

            // Determine display status
            let displayStatus = "Còn thi đấu";
            let statusNote = "";

            if (team.status === "eliminated") {
                displayStatus = "Đã bị loại";
                if (history?.lastMatch) {
                    statusNote = history.lastMatch;
                }
            } else if (team.status === "withdrawn") {
                displayStatus = "Bỏ cuộc";
            } else if (team.status === "disqualified") {
                displayStatus = "Bị loại tư cách";
            } else {
                // active — check if they have losses in notification history
                if (history?.losses && history.losses > 0) {
                    displayStatus = "Đã bị loại (từ lịch sử)";
                    statusNote = history.lastMatch || "";
                } else {
                    displayStatus = "Còn thi đấu";
                }
            }

            rows.push({
                "STT": stt,
                "EFV-ID": captain.efvId ?? "",
                "Tên VĐV": reg?.playerName || captain.name || team.name || "",
                "Nickname": reg?.nickname || captain.nickname || "",
                "Gamer ID": reg?.gamerId || captain.gamerId || "",
                "Tên đội": team.name || "",
                "Viết tắt": team.shortName || "",
                "Email": reg?.email || captain.email || "",
                "SĐT": reg?.phone || captain.phone || "",
                "Facebook": reg?.facebookName || captain.facebookName || "",
                "Link FB": reg?.facebookLink || captain.facebookLink || "",
                "Tỉnh/TP": reg?.province || "",
                "Trạng thái": displayStatus,
                "Ghi chú trận": statusNote,
                "Thắng (notif)": history?.wins ?? 0,
                "Thua (notif)": history?.losses ?? 0,
                "Seed": team.seed ?? "",
                "Team Status (DB)": team.status || "",
            });
        }

        // Also add registrations that don't have a team (edge case)
        for (const reg of registrations as any[]) {
            const regTeamId = (reg.team?._id || reg.team)?.toString();
            if (regTeamId && regByTeam.has(regTeamId)) continue; // Already covered by team loop
            if (!regTeamId) {
                stt++;
                rows.push({
                    "STT": stt,
                    "EFV-ID": reg.user?.efvId ?? "",
                    "Tên VĐV": reg.playerName || reg.user?.name || "",
                    "Nickname": reg.nickname || "",
                    "Gamer ID": reg.gamerId || "",
                    "Tên đội": reg.teamName || "",
                    "Viết tắt": reg.teamShortName || "",
                    "Email": reg.email || "",
                    "SĐT": reg.phone || "",
                    "Facebook": reg.facebookName || "",
                    "Link FB": reg.facebookLink || "",
                    "Tỉnh/TP": reg.province || "",
                    "Trạng thái": "Chưa có team",
                    "Ghi chú trận": "",
                    "Thắng (notif)": 0,
                    "Thua (notif)": 0,
                    "Seed": "",
                    "Team Status (DB)": "",
                });
            }
        }

        // Sort: Active first, then eliminated
        const statusOrder: Record<string, number> = {
            "Còn thi đấu": 1,
            "Đã bị loại": 2,
            "Đã bị loại (từ lịch sử)": 3,
            "Bỏ cuộc": 4,
            "Bị loại tư cách": 5,
            "Chưa có team": 6,
        };
        rows.sort((a, b) => (statusOrder[a["Trạng thái"]] || 99) - (statusOrder[b["Trạng thái"]] || 99));
        // Re-number STT
        rows.forEach((r, i) => r["STT"] = i + 1);

        // 5. Generate Excel
        const ws = XLSX.utils.json_to_sheet(rows);

        // Column widths
        ws["!cols"] = [
            { wch: 5 },   // STT
            { wch: 8 },   // EFV-ID
            { wch: 25 },  // Tên VĐV
            { wch: 15 },  // Nickname
            { wch: 15 },  // Gamer ID
            { wch: 25 },  // Tên đội
            { wch: 8 },   // Viết tắt
            { wch: 25 },  // Email
            { wch: 15 },  // SĐT
            { wch: 20 },  // Facebook
            { wch: 30 },  // Link FB
            { wch: 15 },  // Tỉnh/TP
            { wch: 22 },  // Trạng thái
            { wch: 30 },  // Ghi chú trận
            { wch: 12 },  // Thắng
            { wch: 12 },  // Thua
            { wch: 6 },   // Seed
            { wch: 12 },  // Team Status
        ];

        const wb = XLSX.utils.book_new();

        // Summary sheet
        const activeCount = rows.filter(r => r["Trạng thái"] === "Còn thi đấu").length;
        const elimCount = rows.filter(r => r["Trạng thái"].includes("loại")).length;
        const summaryRows = [
            { "Thông tin": "Giải đấu", "Giá trị": (tournament as any).title },
            { "Thông tin": "ID", "Giá trị": tournamentId.toString() },
            { "Thông tin": "Trạng thái", "Giá trị": (tournament as any).status },
            { "Thông tin": "Tổng VĐV", "Giá trị": rows.length },
            { "Thông tin": "Còn thi đấu", "Giá trị": activeCount },
            { "Thông tin": "Đã bị loại", "Giá trị": elimCount },
            { "Thông tin": "Kết quả từ notifications", "Giá trị": matchupResults.size },
            { "Thông tin": "Xuất lúc", "Giá trị": new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
        summaryWs["!cols"] = [{ wch: 25 }, { wch: 50 }];

        XLSX.utils.book_append_sheet(wb, summaryWs, "Tổng quan");
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách VĐV");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `DS_VDV_${(tournament as any).title?.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, "_").substring(0, 30)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        return new Response(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
            },
        });
    } catch (error) {
        console.error("Export players error:", error);
        return apiError("Có lỗi xảy ra khi xuất danh sách", 500);
    }
}
