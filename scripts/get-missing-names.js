require("dotenv").config({ path: ".env.local" });
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");
const workbook = xlsx.readFile(EXCEL_PATH);
const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

let out = "";
for (const row of data) {
    const efvId = row["EFV ID"] || row["EFVID"] || row["EFV_ID"] || row["efvId"];
    const name = row["Name"] || row["Tên"] || row["Player"] || row["VĐV"] || row[Object.keys(row).find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("tên"))];
    if ([257, 947, 1199, 1205].includes(Number(efvId))) {
        out += `EFV: ${efvId}, Name: ${name}\n`;
    }
}
fs.writeFileSync("names.log", out);
