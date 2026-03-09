/**
 * Script tạo dữ liệu test nhanh cho tournament bracket
 * 
 * Chạy: node scripts/seed-test-data.js
 * 
 * Tạo:
 * - 1 manager user (nếu chưa có)
 * - 1 tournament (single_elimination, 9 người)
 * - 9 test users + registrations (approved) + teams
 * 
 * Sau khi chạy xong, vào manager → giải đấu → tạo sơ đồ để test bracket
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = "mongodb://localhost:27017/efootcup";

// ========== Inline Schemas (avoid TS import issues) ==========

const CounterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 },
});
CounterSchema.statics.getNextSequence = async function (name) {
    const counter = await this.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};
const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

const UserSchema = new mongoose.Schema({
    efvId: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "user"], default: "user" },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    gamerId: { type: String, default: "" },
    nickname: { type: String, default: "" },
    teamName: { type: String, default: "" },
    facebookName: { type: String, default: "" },
    country: { type: String, default: "Việt Nam" },
    province: { type: String, default: "" },
    stats: {
        tournamentsCreated: { type: Number, default: 0 },
        tournamentsJoined: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        goalsScored: { type: Number, default: 0 },
        goalsConceded: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const TournamentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    format: { type: String, enum: ["single_elimination", "round_robin", "group_stage"], default: "single_elimination" },
    mode: { type: String, default: "mobile" },
    status: { type: String, enum: ["draft", "upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },
    maxTeams: { type: Number, default: 16 },
    teamSize: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    registrationOpen: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    efvTier: { type: String, default: "" },
    efvPointsAwarded: { type: Boolean, default: false },
}, { timestamps: true });
const Tournament = mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shortName: { type: String, default: "" },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, role: { type: String, default: "captain" }, joinedAt: { type: Date, default: Date.now } }],
    seed: { type: Number },
    stats: {
        played: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        goalsFor: { type: Number, default: 0 },
        goalsAgainst: { type: Number, default: 0 },
        goalDifference: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
    },
    status: { type: String, default: "active" },
    registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

const RegistrationSchema = new mongoose.Schema({
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    teamName: { type: String, default: "" },
    teamShortName: { type: String, default: "" },
    playerName: { type: String, required: true },
    gamerId: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    nickname: { type: String, default: "" },
    province: { type: String, default: "" },
    status: { type: String, default: "approved" },
    paymentStatus: { type: String, default: "paid" },
}, { timestamps: true });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);

// ========== Test Data ==========

const TEST_PLAYERS = [
    { name: "Nguyễn Văn An", nickname: "ProAN", province: "Hà Nội" },
    { name: "Trần Minh Bình", nickname: "BinhTOP", province: "TP.HCM" },
    { name: "Lê Hoàng Cường", nickname: "CuongPES", province: "Đà Nẵng" },
    { name: "Phạm Quốc Dũng", nickname: "DungKR", province: "Hải Phòng" },
    { name: "Hoàng Thanh Em", nickname: "EmStar", province: "Cần Thơ" },
    { name: "Vũ Đức Phúc", nickname: "PhucGG", province: "Nghệ An" },
    { name: "Đỗ Công Giang", nickname: "GiangEF", province: "Huế" },
    { name: "Bùi Văn Hải", nickname: "HaiPro99", province: "Bình Dương" },
    { name: "Ngô Quang Ý", nickname: "YMaster", province: "Long An" },
];

// ========== Main ==========

async function main() {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    // 1. Create or find manager user
    const hashedPw = await bcrypt.hash("12345678", 10);
    let manager = await User.findOne({ email: "manager@test.com" });
    if (!manager) {
        const seq = await Counter.getNextSequence("efvId");
        manager = await User.create({
            efvId: seq,
            name: "Test Manager",
            email: "manager@test.com",
            password: hashedPw,
            role: "manager",
            isVerified: true,
        });
        console.log(`✅ Tạo manager: manager@test.com / 12345678 (EFV-${manager.efvId})`);
    } else {
        console.log(`ℹ️  Manager đã tồn tại: manager@test.com (EFV-${manager.efvId})`);
    }

    // 2. Create tournament
    const slug = `test-bracket-${Date.now()}`;
    const tournament = await Tournament.create({
        title: `[TEST] Bracket 9 người - ${new Date().toLocaleString("vi-VN")}`,
        slug,
        description: "Giải test tự động để kiểm tra bracket với 9 người chơi",
        format: "single_elimination",
        mode: "mobile",
        status: "upcoming",
        maxTeams: 16,
        teamSize: 1,
        createdBy: manager._id,
        registrationOpen: false,
    });
    console.log(`✅ Tạo giải: "${tournament.title}" (ID: ${tournament._id})\n`);

    // 3. Create test users, teams, registrations
    console.log("👥 Tạo 9 người chơi test...\n");
    const createdUsers = [];

    for (let i = 0; i < TEST_PLAYERS.length; i++) {
        const p = TEST_PLAYERS[i];
        const email = `testplayer${i + 1}@test.com`;

        // Create or find user
        let user = await User.findOne({ email });
        if (!user) {
            const seq = await Counter.getNextSequence("efvId");
            user = await User.create({
                efvId: seq,
                name: p.name,
                email,
                password: hashedPw,
                role: "user",
                nickname: p.nickname,
                gamerId: `GID-${1000 + i}`,
                province: p.province,
                isVerified: true,
            });
        }

        // Create team
        const teamName = `Team ${p.nickname}`;
        const shortName = p.nickname.substring(0, 4).toUpperCase();
        const team = await Team.create({
            name: teamName,
            shortName,
            tournament: tournament._id,
            captain: user._id,
            members: [{ user: user._id, role: "captain" }],
        });

        // Create registration (approved)
        await Registration.create({
            tournament: tournament._id,
            user: user._id,
            team: team._id,
            teamName,
            teamShortName: shortName,
            playerName: p.name,
            gamerId: user.gamerId || `GID-${1000 + i}`,
            phone: `090${String(i + 1).padStart(7, "0")}`,
            email,
            nickname: p.nickname,
            province: p.province,
            status: "approved",
            paymentStatus: "paid",
        });

        createdUsers.push({ name: p.name, nickname: p.nickname, email, efvId: user.efvId });
        console.log(`   ${i + 1}. ${p.name} (${p.nickname}) - EFV-${user.efvId} - ${email}`);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 HOÀN TẤT! Đã tạo:`);
    console.log(`   • 1 Manager: manager@test.com / 12345678`);
    console.log(`   • 1 Giải đấu: "${tournament.title}"`);
    console.log(`   • ${TEST_PLAYERS.length} người chơi + đội + đăng ký`);
    console.log(`${"=".repeat(60)}`);
    console.log(`\n📋 Bước tiếp theo:`);
    console.log(`   1. Đăng nhập manager@test.com / 12345678`);
    console.log(`   2. Vào quản lý giải đấu → "${tournament.title}"`);
    console.log(`   3. Chọn tab "Sơ đồ" → Tạo sơ đồ thi đấu`);
    console.log(`   4. Kiểm tra bracket hiển thị đủ 9 người + BYE matches\n`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
}

main().catch((err) => {
    console.error("❌ Error:", err);
    mongoose.disconnect();
    process.exit(1);
});
