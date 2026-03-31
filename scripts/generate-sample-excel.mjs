/**
 * Script: Generate sample Excel files for tournament import
 * Creates: mau_import_1v1.xlsx and mau_import_2v2.xlsx
 */
import XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "public", "assets");

function makeSheet(data) {
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.max(key.length + 2, ...data.map((row) => String(row[key] || "").length + 2)),
    }));
    ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w.wch, 35) }));
    return ws;
}

// ============================
// 1v1 Template
// ============================
const data1v1 = [
    { "EFV-ID": "", "Tên đội": "FC Sài Gòn", "Tên Viết Tắt": "SGN", "Tên VĐV": "Nguyễn Văn An", "ID Game": "VN-AN2025", "SĐT": "0912345678", "Email": "nguyenvanan@gmail.com", "Nickname": "AnPro", "Facebook": "Nguyễn Văn An", "Tỉnh/TP": "TP. Hồ Chí Minh", "Ngày sinh": "15/03/2000" },
    { "EFV-ID": "", "Tên đội": "FC Hà Nội", "Tên Viết Tắt": "HNI", "Tên VĐV": "Trần Minh Tuấn", "ID Game": "VN-TUAN99", "SĐT": "0987654321", "Email": "tranminhtuan@gmail.com", "Nickname": "TuanKing", "Facebook": "Trần Minh Tuấn", "Tỉnh/TP": "Hà Nội", "Ngày sinh": "22/08/2001" },
    { "EFV-ID": 105, "Tên đội": "", "Tên Viết Tắt": "", "Tên VĐV": "Lê Hoàng Phúc", "ID Game": "PHUC-GAME", "SĐT": "0909123456", "Email": "", "Nickname": "PhucLegend", "Facebook": "", "Tỉnh/TP": "Đà Nẵng", "Ngày sinh": "" },
    { "EFV-ID": "", "Tên đội": "Tự do", "Tên Viết Tắt": "", "Tên VĐV": "Phạm Quốc Bảo", "ID Game": "BAOPQ-01", "SĐT": "0369852147", "Email": "baopham@yahoo.com", "Nickname": "BaoVip", "Facebook": "Phạm Quốc Bảo", "Tỉnh/TP": "Cần Thơ", "Ngày sinh": "01/12/1999" },
    { "EFV-ID": "", "Tên đội": "Team Đồng Nai", "Tên Viết Tắt": "DNI", "Tên VĐV": "Võ Thanh Hùng", "ID Game": "HUNG-EFVN", "SĐT": "0778901234", "Email": "", "Nickname": "", "Facebook": "", "Tỉnh/TP": "Đồng Nai", "Ngày sinh": "" },
];

const instructions1v1 = [
    { "Cột": "EFV-ID", "Mô tả": "Số ID VĐV trên hệ thống. Nếu có → liên kết tài khoản. Để trống → tạo tài khoản mới tự động." },
    { "Cột": "Tên đội", "Mô tả": "Tên đội thi đấu. Để trống sẽ mặc định là 'Tự do'." },
    { "Cột": "Tên Viết Tắt", "Mô tả": "Viết tắt đội (tối đa 4 ký tự). Để trống → auto lấy 3 ký tự đầu tên đội." },
    { "Cột": "Tên VĐV ⭐", "Mô tả": "BẮT BUỘC. Họ tên đầy đủ (tối thiểu 2 ký tự)." },
    { "Cột": "ID Game", "Mô tả": "ID in-game. Để trống → 'TBD'." },
    { "Cột": "SĐT", "Mô tả": "Số điện thoại (chỉ gồm số 0-9)." },
    { "Cột": "Email", "Mô tả": "Email liên hệ. Để trống → auto tạo email hệ thống." },
    { "Cột": "Nickname", "Mô tả": "Biệt danh / tên game." },
    { "Cột": "Facebook", "Mô tả": "Tên Facebook." },
    { "Cột": "Tỉnh/TP", "Mô tả": "Tỉnh thành phố." },
    { "Cột": "Ngày sinh", "Mô tả": "dd/mm/yyyy." },
    { "Cột": "", "Mô tả": "" },
    { "Cột": "⚠️ Lưu ý", "Mô tả": "Chỉ cần cột 'Tên VĐV' là bắt buộc, các cột khác tùy chọn." },
    { "Cột": "", "Mô tả": "VĐV import sẽ được tự động duyệt và gán EFV-ID." },
];

const wb1 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb1, makeSheet(data1v1), "Danh sách VĐV");
const ws1i = XLSX.utils.json_to_sheet(instructions1v1);
ws1i["!cols"] = [{ wch: 20 }, { wch: 70 }];
XLSX.utils.book_append_sheet(wb1, ws1i, "Hướng dẫn");
XLSX.writeFile(wb1, path.join(assetsDir, "mau_import_1v1.xlsx"));
console.log("✅ Generated: mau_import_1v1.xlsx");

// ============================
// 2v2 Template
// ============================
const data2v2 = [
    { "EFV-ID 1": "", "Tên đội": "FC Sài Gòn", "Tên Viết Tắt": "SGN", "Tên VĐV 1": "Nguyễn Văn An", "ID Game 1": "VN-AN2025", "SĐT 1": "0912345678", "Nickname 1": "AnPro", "EFV-ID 2": "", "Tên VĐV 2": "Trần Quốc Đạt", "ID Game 2": "VN-DAT99", "Nickname 2": "DatKing", "Email": "nguyenvanan@gmail.com", "Facebook": "Nguyễn Văn An", "Tỉnh/TP": "TP. Hồ Chí Minh" },
    { "EFV-ID 1": "", "Tên đội": "FC Hà Nội", "Tên Viết Tắt": "HNI", "Tên VĐV 1": "Trần Minh Tuấn", "ID Game 1": "VN-TUAN99", "SĐT 1": "0987654321", "Nickname 1": "TuanKing", "EFV-ID 2": "", "Tên VĐV 2": "Lê Duy Khang", "ID Game 2": "VN-KHANG", "Nickname 2": "KhangPro", "Email": "tranminhtuan@gmail.com", "Facebook": "Trần Minh Tuấn", "Tỉnh/TP": "Hà Nội" },
    { "EFV-ID 1": 105, "Tên đội": "Team ĐN", "Tên Viết Tắt": "TDN", "Tên VĐV 1": "Lê Hoàng Phúc", "ID Game 1": "PHUC-GAME", "SĐT 1": "0909123456", "Nickname 1": "PhucLegend", "EFV-ID 2": 106, "Tên VĐV 2": "Ngô Thanh Sơn", "ID Game 2": "SON-GAME", "Nickname 2": "SonVip", "Email": "", "Facebook": "", "Tỉnh/TP": "Đà Nẵng" },
    { "EFV-ID 1": "", "Tên đội": "", "Tên Viết Tắt": "", "Tên VĐV 1": "Phạm Quốc Bảo", "ID Game 1": "BAOPQ-01", "SĐT 1": "0369852147", "Nickname 1": "BaoVip", "EFV-ID 2": "", "Tên VĐV 2": "Võ Minh Tiến", "ID Game 2": "TIEN-VN", "Nickname 2": "TienPro", "Email": "baopham@yahoo.com", "Facebook": "Phạm Quốc Bảo", "Tỉnh/TP": "Cần Thơ" },
    { "EFV-ID 1": "", "Tên đội": "FCB Bình Dương", "Tên Viết Tắt": "BDG", "Tên VĐV 1": "Võ Thanh Hùng", "ID Game 1": "HUNG-EFVN", "SĐT 1": "0778901234", "Nickname 1": "HungPro", "EFV-ID 2": "", "Tên VĐV 2": "Phan Văn Tài", "ID Game 2": "TAI-EFVN", "Nickname 2": "TaiPro", "Email": "", "Facebook": "", "Tỉnh/TP": "Bình Dương" },
];

const instructions2v2 = [
    { "Cột": "--- VĐV 1 (Đội trưởng) ---", "Mô tả": "" },
    { "Cột": "EFV-ID 1", "Mô tả": "Số ID VĐV 1. Có → liên kết tài khoản. Trống → tạo mới." },
    { "Cột": "Tên đội", "Mô tả": "Tên đội. Trống → 'Tự do'." },
    { "Cột": "Tên Viết Tắt", "Mô tả": "Viết tắt (tối đa 4 ký tự). Trống → auto." },
    { "Cột": "Tên VĐV 1 ⭐", "Mô tả": "BẮT BUỘC. Họ tên VĐV 1 (tối thiểu 2 ký tự)." },
    { "Cột": "ID Game 1", "Mô tả": "ID in-game VĐV 1." },
    { "Cột": "SĐT 1", "Mô tả": "Số điện thoại VĐV 1." },
    { "Cột": "Nickname 1", "Mô tả": "Biệt danh VĐV 1." },
    { "Cột": "", "Mô tả": "" },
    { "Cột": "--- VĐV 2 ---", "Mô tả": "" },
    { "Cột": "EFV-ID 2", "Mô tả": "Số ID VĐV 2. Có → liên kết. Trống → tạo mới." },
    { "Cột": "Tên VĐV 2 ⭐", "Mô tả": "BẮT BUỘC cho giải 2v2. Họ tên VĐV 2 (tối thiểu 2 ký tự)." },
    { "Cột": "ID Game 2", "Mô tả": "ID in-game VĐV 2." },
    { "Cột": "Nickname 2", "Mô tả": "Biệt danh VĐV 2." },
    { "Cột": "", "Mô tả": "" },
    { "Cột": "--- Thông tin chung ---", "Mô tả": "" },
    { "Cột": "Email", "Mô tả": "Email liên hệ đội." },
    { "Cột": "Facebook", "Mô tả": "Tên Facebook." },
    { "Cột": "Tỉnh/TP", "Mô tả": "Tỉnh thành phố." },
    { "Cột": "", "Mô tả": "" },
    { "Cột": "⚠️ Lưu ý", "Mô tả": "Mỗi dòng = 1 đội gồm 2 VĐV. Mỗi VĐV được gán EFV-ID riêng." },
    { "Cột": "", "Mô tả": "VĐV import sẽ được tự động duyệt." },
];

const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, makeSheet(data2v2), "Danh sách đội 2v2");
const ws2i = XLSX.utils.json_to_sheet(instructions2v2);
ws2i["!cols"] = [{ wch: 35 }, { wch: 70 }];
XLSX.utils.book_append_sheet(wb2, ws2i, "Hướng dẫn");
XLSX.writeFile(wb2, path.join(assetsDir, "mau_import_2v2.xlsx"));
console.log("✅ Generated: mau_import_2v2.xlsx");
