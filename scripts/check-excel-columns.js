require("dotenv").config({ path: ".env.local" });
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");
const workbook = xlsx.readFile(EXCEL_PATH);
const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

if (data.length > 0) {
    const cols = Object.keys(data[0]);
    fs.writeFileSync("excel_check.txt", "Cols: " + JSON.stringify(cols) + "\nRows: " + data.length + "\nFirst: " + JSON.stringify(data[0]));
}
