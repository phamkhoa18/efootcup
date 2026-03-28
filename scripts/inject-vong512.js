require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({ status: String }, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    round: Number,
    nextMatch: mongoose.Schema.Types.ObjectId,
    status: String,
    winner: mongoose.Schema.Types.ObjectId,
    homeScore: Number,
    awayScore: Number
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

async function injectVong512Dynamic() {
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };
    await mongoose.connect(process.env.MONGODB_URI);

    // ID của 4 Đội Tái Xuất
    const missingIds = [
        "69c05332f0792ab61163742f",
        "69c201869d4ea1e3cff6c8b2",
        "69c25c1f6daae387df9c6e1b",
        "69c283e26daae387df9cfe81"
    ];
    const missingTeams = await Team.find({ _id: { $in: missingIds } });
    if (missingTeams.length < 4) {
        log("LỖI: Không tìm đủ 4 đội bị rớt trong DB!");
        process.exit(1);
    }
    
    for (const t of missingTeams) {
        t.status = 'active'; // Kích hoạt lại trạng thái
        await t.save();
    }

    log("Đang quét dọn Server để tìm 2 nhánh ma...");
    // Tự động quét để tìm ra 2 nhánh ma (Dead Branches) trong Round 2
    const r2Matches = await Match.find({ tournament: TOURNAMENT_ID, round: 2 }).lean();
    let deadR2Matches = [];
    
    for (const m2 of r2Matches) {
        if (!m2.homeTeam || !m2.awayTeam) continue;
        const ht = await Team.findById(m2.homeTeam).lean();
        const at = await Team.findById(m2.awayTeam).lean();
        
        if (ht && ht.status === "eliminated" && at && at.status === "eliminated") {
            const children = await Match.find({ nextMatch: m2._id, round: 1 }).lean();
            if (children.length === 2) {
                deadR2Matches.push(m2);
                if (deadR2Matches.length === 2) break; // Chỉ cần tìm đúng 2 nhánh là đủ nhét 4 người
            }
        }
    }

    if (deadR2Matches.length < 2) {
        log("LỖI: Sơ đồ hiện tại không có đủ 2 nhánh ma ở Round 2 để chèn VĐV! Báo admin tạo lại sơ đồ.");
        process.exit(1);
    }

    log(`Đã dò ra 2 trận ma lý tưởng (ID: ${deadR2Matches[0]._id} và ${deadR2Matches[1]._id}) - Bắt đầu bơm VĐV!`);

    // Hàm thực hiện Nhét 2 người vào 1 nhánh R2
    async function processBranch(m2Data, missingA, missingB, branchName) {
        const m2 = await Match.findById(m2Data._id);
        const children = await Match.find({ nextMatch: m2._id, round: 1 }).sort({ _id: 1 });

        // BYE Vòng 1024 cho người A
        children[0].homeTeam = missingA._id;
        children[0].awayTeam = null;
        children[0].status = 'bye';
        children[0].winner = missingA._id;
        children[0].homeScore = 0; children[0].awayScore = 0;
        await children[0].save();

        // BYE Vòng 1024 cho người B
        children[1].homeTeam = missingB._id;
        children[1].awayTeam = null;
        children[1].status = 'bye';
        children[1].winner = missingB._id;
        children[1].homeScore = 0; children[1].awayScore = 0;
        await children[1].save();

        // Vòng 512 sẽ là đụng độ A vs B
        let oldWinnerToScrub = m2.winner;
        m2.homeTeam = missingA._id;
        m2.awayTeam = missingB._id;
        m2.status = 'scheduled';
        m2.winner = null;
        m2.homeScore = null; m2.awayScore = null;
        await m2.save();

        // Dọn dẹp leo tháp
        let currentMatchId = m2.nextMatch;
        while (currentMatchId) {
            const m = await Match.findById(currentMatchId);
            if (!m) break;
            log(`[${branchName}] Dọn dẹp cờ ma ảo ở Vòng ${m.round} Trận ${m._id}...`);
            let previousWinner = m.winner;
            
            m.status = 'scheduled';
            m.winner = null;
            m.homeScore = null; m.awayScore = null;

            if (oldWinnerToScrub) {
                if (m.homeTeam && m.homeTeam.toString() === oldWinnerToScrub.toString()) m.homeTeam = null;
                if (m.awayTeam && m.awayTeam.toString() === oldWinnerToScrub.toString()) m.awayTeam = null;
            }
            await m.save();

            if (m.nextMatch) {
                oldWinnerToScrub = previousWinner;
                currentMatchId = m.nextMatch;
                const nextM = await Match.findById(m.nextMatch);
                if (nextM && nextM.status === 'scheduled') {
                     if (oldWinnerToScrub) {
                         if (nextM.homeTeam && nextM.homeTeam.toString() === oldWinnerToScrub.toString()) nextM.homeTeam = null;
                         if (nextM.awayTeam && nextM.awayTeam.toString() === oldWinnerToScrub.toString()) nextM.awayTeam = null;
                         await nextM.save();
                     }
                     break;
                }
            } else {
                break;
            }
        }
        log(`==> [${branchName}] Tiêm thành công vào Vòng 512!`);
    }

    await processBranch(deadR2Matches[0], missingTeams[0], missingTeams[1], "NHÁNH A");
    await processBranch(deadR2Matches[1], missingTeams[2], missingTeams[3], "NHÁNH B");

    log("CHÚC MỪNG: Chèn và khôi phục nhịp Bracket Server thành công 100%!");
    fs.writeFileSync("vong512_dynamic_log.txt", out);
    process.exit(0);
}
injectVong512Dynamic();
