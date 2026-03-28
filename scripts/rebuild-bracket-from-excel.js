require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";
const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");

const EXPLICIT_SEEDS = [33, 23, 380, 17, 20, 423, 448, 661];

const TeamSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    status: String, player1: String, seed: Number
}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const RegSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: mongoose.Schema.Types.ObjectId, status: String
}, { strict: false });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegSchema);

const UserSchema = new mongoose.Schema({ efvId: Number, name: String }, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const MatchSchema = new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number, roundName: String, matchNumber: Number,
    homeTeam: mongoose.Schema.Types.ObjectId,
    awayTeam: mongoose.Schema.Types.ObjectId,
    homeScore: Number, awayScore: Number,
    winner: mongoose.Schema.Types.ObjectId,
    status: String, bracketPosition: Object,
    nextMatch: mongoose.Schema.Types.ObjectId
}, { strict: false });
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

const TournamentSchema = new mongoose.Schema({ status: String }, { strict: false });
const Tournament = mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);

async function main() {
    try {
        console.log("⏳ Mở cổng kết nối Database...");
        await mongoose.connect(process.env.MONGODB_URI);

        console.log(`⏳ Đang đọc Excel thần thánh...`);
        const workbook = xlsx.readFile(EXCEL_PATH);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const alivePlayersMap = new Map();
        for (const row of data) {
            const efvId = row["EFV ID"] || row["EFVID"] || row["EFV_ID"] || row["efvId"];
            let vong = row["Vòng"] || row["vong"] || "";
            if (efvId) {
                const vongMatch = String(vong).match(/\d+/);
                alivePlayersMap.set(Number(efvId), vongMatch ? Number(vongMatch[0]) : 512);
            }
        }
        console.log(`✅ Phát hiện ${alivePlayersMap.size} VĐV còn sống.`);

        const registrations = await Registration.find({ tournament: TOURNAMENT_ID, status: 'approved' }).populate('user');
        const teamEfvMap = new Map();
        for (const r of registrations) {
            if (r.team && r.user && r.user.efvId) teamEfvMap.set(r.team.toString(), r.user.efvId);
        }
        
        const allTeams = await Team.find({ tournament: TOURNAMENT_ID });
        const efvTeamMap = new Map();
        allTeams.forEach(t => {
            const efvId = teamEfvMap.get(t._id.toString());
            if (efvId) efvTeamMap.set(efvId, t);
        });

        console.log("⏳ Phân loại Sống / Yếu Thế / Chết...");
        const aliveTeams_Std = [];
        const eliminatedTeams = [];
        const updates = [];
        let eliminatedCount = 0;

        const teamStatusMap = new Map();
        const teamVongMap = new Map(); // teamId -> Number target vong

        for (const t of allTeams) {
            const efvId = teamEfvMap.get(t._id.toString());
            if (!efvId || !alivePlayersMap.has(efvId)) {
                eliminatedTeams.push(t);
                updates.push({ updateOne: { filter: { _id: t._id }, update: { $set: { status: 'eliminated' } } } });
                teamStatusMap.set(t._id.toString(), 'eliminated');
                teamVongMap.set(t._id.toString(), 9999);
                eliminatedCount++;
            } else {
                updates.push({ updateOne: { filter: { _id: t._id }, update: { $set: { status: 'active', seed: null } } } });
                t._vong = alivePlayersMap.get(efvId);
                if (!EXPLICIT_SEEDS.includes(efvId)) aliveTeams_Std.push(t);
                teamStatusMap.set(t._id.toString(), 'alive');
                teamVongMap.set(t._id.toString(), t._vong);
            }
        }

        const aliveTeams_Explicit = EXPLICIT_SEEDS.map(efv => efvTeamMap.get(efv)).filter(Boolean);
        // Vòng càng sâu (256 < 512) -> Hạt giống càng cao
        aliveTeams_Std.sort((a,b) => (a._vong || 999) - (b._vong || 999));
        eliminatedTeams.sort(() => Math.random() - 0.5); // Random lấy bia đỡ đạn

        const finalSeedOrder = [...aliveTeams_Explicit, ...aliveTeams_Std, ...eliminatedTeams];

        console.log(`✅ Phân luồng hạt giống: ${aliveTeams_Explicit.length} Siêu VIP | ${aliveTeams_Std.length} Bình thường | ${eliminatedCount} Đã bị loại (Total: ${finalSeedOrder.length})`);
        await Team.bulkWrite(updates);

        console.log("⏳ Tẩy trang Bản Đồ cũ...");
        await Match.deleteMany({ tournament: TOURNAMENT_ID });

        console.log("⏳ Dệt Bản Đồ 1024 Slots...");
        const N = finalSeedOrder.length;
        let S = 2; while (S < N) S *= 2;
        const totalRounds = Math.log2(S);

        const teamSlots = new Array(S).fill(null);
        const aliveTeams_All = [...aliveTeams_Explicit, ...aliveTeams_Std];

        const getRequiredBlockSize = (v) => {
            if (v <= 64) return 16;
            if (v <= 128) return 8;
            if (v <= 256) return 4;
            return 2;
        };

        const occupiedBlocks = new Array(S).fill(false);

        for (const team of aliveTeams_All) {
            let reqSize = getRequiredBlockSize(team._vong || 512);
            let placed = false;
            
            while (reqSize >= 1 && !placed) {
                const blocks = [];
                for (let i = 0; i < S; i += reqSize) blocks.push(i);
                blocks.sort(() => Math.random() - 0.5); // Randomize branches for visual diversity
                
                for (const i of blocks) {
                    let isFree = true;
                    for (let j = 0; j < reqSize; j++) {
                        if (occupiedBlocks[i + j]) { isFree = false; break; }
                    }
                    if (isFree) {
                        let randomIdx = i + Math.floor(Math.random() * reqSize);
                        teamSlots[randomIdx] = team;
                        for (let j = 0; j < reqSize; j++) occupiedBlocks[i + j] = true;
                        placed = true;
                        break;
                    }
                }
                reqSize /= 2;
            }
            if (!placed) {
                for (let i = 0; i < S; i++) {
                    if (!occupiedBlocks[i]) { teamSlots[i] = team; occupiedBlocks[i] = true; break; }
                }
            }
        }

        let elimIdx = 0;
        const emptyIndices = [];
        for (let i = 0; i < S; i++) if (!teamSlots[i]) emptyIndices.push(i);
        emptyIndices.sort(() => Math.random() - 0.5);
        for (const idx of emptyIndices) {
            if (elimIdx < eliminatedTeams.length) {
                teamSlots[idx] = eliminatedTeams[elimIdx++];
            }
        }

        const getRoundName = (r, max, size) => r === max ? "Chung kết" : r === max - 1 ? "Bán kết" : r === max - 2 ? "Tứ kết" : `Vòng ${size / Math.pow(2, r - 1)}`;

        const matchesMap = new Map();
        for (let r = 1; r <= totalRounds; r++) matchesMap.set(r, new Map());

        for (let r = 2; r <= totalRounds; r++) {
            const matchCount = S / Math.pow(2, r);
            for (let i = 0; i < matchCount; i++) {
                matchesMap.get(r).set(i, new Match({
                    tournament: TOURNAMENT_ID, round: r, roundName: getRoundName(r, totalRounds, S),
                    matchNumber: i + 1, status: "scheduled", bracketPosition: { x: r - 1, y: i }
                }));
            }
        }

        const allMatches = [];
        for (let i = 0; i < S / 2; i++) {
            const teamA = teamSlots[i * 2], teamB = teamSlots[i * 2 + 1];
            const m = new Match({
                tournament: TOURNAMENT_ID, round: 1, roundName: getRoundName(1, totalRounds, S), matchNumber: i + 1,
                homeTeam: teamA ? teamA._id : null, awayTeam: teamB ? teamB._id : null,
                status: "scheduled", bracketPosition: { x: 0, y: i }
            });
            matchesMap.get(1).set(i, m);
        }

        for (let r = 1; r <= totalRounds; r++) {
            for (const [idx, m] of matchesMap.get(r).entries()) {
                if (r < totalRounds) m.nextMatch = matchesMap.get(r + 1).get(Math.floor(idx / 2))._id;
                allMatches.push(m);
            }
        }

        console.log("⏳ KHAI MỞ CHẾ ĐỘ TOÁN HỌC CHUẨN 100% CỦA CHÚA TỂ BRACKET...");
        const matchHasAlive = new Map();
        let autoWins = 0;
        let scheduledCount = 0;

        for (let r = 1; r <= totalRounds; r++) {
            for (const [idx, m] of matchesMap.get(r).entries()) {
                let leftHasAlive = false;
                let rightHasAlive = false;
                
                if (r === 1) {
                    leftHasAlive = m.homeTeam && teamStatusMap.get(m.homeTeam.toString()) === 'alive';
                    rightHasAlive = m.awayTeam && teamStatusMap.get(m.awayTeam.toString()) === 'alive';
                } else {
                    const leftChild = matchesMap.get(r - 1).get(idx * 2);
                    const rightChild = matchesMap.get(r - 1).get(idx * 2 + 1);
                    leftHasAlive = leftChild && matchHasAlive.get(leftChild._id.toString());
                    rightHasAlive = rightChild && matchHasAlive.get(rightChild._id.toString());
                }

                const currentHasAlive = leftHasAlive || rightHasAlive;
                matchHasAlive.set(m._id.toString(), currentHasAlive);

                if (leftHasAlive && rightHasAlive) {
                    m.status = 'scheduled';
                    m.winner = null;
                    scheduledCount++;
                } else if (!leftHasAlive && !rightHasAlive) {
                    if (!m.homeTeam && !m.awayTeam) {
                        m.status = 'bye';
                        m.winner = null;
                    } else {
                        m.status = 'completed';
                        m.winner = m.homeTeam || m.awayTeam;
                        m.homeScore = m.homeTeam ? 3 : 0;
                        m.awayScore = (!m.homeTeam && m.awayTeam) ? 3 : 0;
                        autoWins++;
                    }
                } else {
                    let winnerId;
                    if (leftHasAlive) {
                        winnerId = r === 1 ? m.homeTeam : matchesMap.get(r - 1).get(idx * 2).winner;
                    } else {
                        winnerId = r === 1 ? m.awayTeam : matchesMap.get(r - 1).get(idx * 2 + 1).winner;
                    }
                    m.winner = winnerId;
                    
                    const oppId = leftHasAlive ? m.awayTeam : m.homeTeam;
                    if (!oppId) {
                        m.status = 'bye';
                        m.homeScore = 0;
                        m.awayScore = 0;
                    } else {
                        m.status = 'completed';
                        m.homeScore = leftHasAlive ? 3 : 0;
                        m.awayScore = rightHasAlive ? 3 : 0;
                    }
                    autoWins++;
                }

                if (r < totalRounds && m.winner) {
                    const nextMatch = matchesMap.get(r + 1).get(Math.floor(idx / 2));
                    if (idx % 2 === 0) nextMatch.homeTeam = m.winner;
                    else nextMatch.awayTeam = m.winner;
                }
            }
        }

        console.log(`✅ Đã triệt giải bóng ma! ${autoWins} Auto/BYE | TRẬN THỰC (Chưa đá): ${scheduledCount}`);
        await Match.insertMany(allMatches);
        await Tournament.updateOne({ _id: TOURNAMENT_ID }, { $set: { status: 'ongoing' } });
        console.log("🚀 LÀM PHÉP THÀNH CÔNG! HÃY F5!");
        process.exit(0);

    } catch (err) { console.error("❌ ERROR:", err); process.exit(1); }
}
main();
