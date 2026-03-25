import mongoose from "mongoose";
import Registration from "../models/Registration";
import Match from "../models/Match";
import fs from "fs";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";

async function findOrphanPlayers() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const tournamentId = "69bd4c8ad4d24902b39db3d5";
        
        let output = `Đang kiểm tra giải đấu: ${tournamentId}...\n`;

        // Tìm tất cả các trận đấu của giải này
        const matches = await Match.find({ tournament: tournamentId });
        
        const teamsInMatches = new Set<string>();
        matches.forEach((m: any) => {
            if (m.homeTeam) teamsInMatches.add(m.homeTeam.toString());
            if (m.awayTeam) teamsInMatches.add(m.awayTeam.toString());
        });

        output += `-> Tìm thấy ${teamsInMatches.size} đội xếp trong lịch thi đấu.\n`;

        const approvedRegs = await Registration.find({ 
            tournament: tournamentId,
            status: "approved"
        });

        output += `-> Tìm thấy ${approvedRegs.length} đơn đăng ký đã được duyệt.\n\n`;
        output += "==================================================================\n";
        output += "DANH SÁCH NGƯỜI CHƠI ĐÃ ĐƯỢC DUYỆT NHƯNG CHƯA CÓ TRONG LỊCH THI ĐẤU\n";
        output += "==================================================================\n";
        
        let missingCount = 0;

        for (const reg of approvedRegs) {
            const teamId = reg.team ? reg.team.toString() : null;

            if (!teamId) {
                output += `[LỖI NGHIÊM TRỌNG] VĐV: ${reg.playerName} (Email: ${reg.email}) được duyệt nhưng mất data Team!\n`;
                missingCount++;
                continue;
            }

            if (!teamsInMatches.has(teamId)) {
                missingCount++;
                output += `👤 VĐV: ${reg.playerName || 'Không rõ'}\n`;
                output += `   - SĐT: ${reg.phone || 'N/A'}\n`;
                output += `   - Nickname game: ${reg.nickname || 'N/A'}\n`;
                output += `   - Đăng ký lúc: ${reg.createdAt ? new Date(reg.createdAt).toLocaleString('vi-VN') : 'N/A'}\n`;
                output += `   - Được duyệt lúc: ${reg.approvedAt ? new Date(reg.approvedAt).toLocaleString('vi-VN') : 'N/A'}\n`;
                output += `   - Kênh TT: ${reg.paymentMethod}\n`;
                output += `   - Mã ĐK: ${reg._id.toString()}\n`;
                output += `   - Mã Team: ${teamId}\n`;
                output += "------------------------------------------------------------------\n";
            }
        }

        if (missingCount === 0) {
            output += "\nTuyệt vời! Không sót ai cả. Tất cả VĐV đã duyệt đều có trong lịch thi đấu.\n";
        } else {
            output += `\n⚠️ Tổng cộng: Có ${missingCount} VĐV bị sót khỏi lịch thi đấu!\n`;
        }

        fs.writeFileSync("output_missing_players.txt", output, "utf-8");
        process.exit(0);
    } catch (err) {
        fs.writeFileSync("output_missing_players.txt", `Lỗi: ${err}`, "utf-8");
        process.exit(1);
    }
}

findOrphanPlayers();
