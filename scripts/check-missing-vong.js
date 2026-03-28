require("dotenv").config({ path: ".env.local" });
const xlsx = require("xlsx");
const path = require("path");

const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");
const workbook = xlsx.readFile(EXCEL_PATH);
const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

for (const row of data) {
    const efvId = Number(row["EFV ID"] || row["EFVID"] || row["EFV_ID"] || row["efvId"]);
    if ([257, 947, 1199, 1205].includes(efvId)) {
        console.log(`EFV: ${efvId}, Vòng: ${row["Vòng"] || row["vong"]}`);
    }
}
