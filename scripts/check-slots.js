require("dotenv").config({ path: ".env.local" });
const xlsx = require("xlsx");
const path = require("path");

const EXCEL_PATH = path.join(__dirname, "../public/uploads/efv500_consong.xlsx");
const workbook = xlsx.readFile(EXCEL_PATH);
const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

let _64 = 0, _128 = 0, _256 = 0, _512 = 0;

for (const row of data) {
    let vong = row["Vòng"] || row["vong"] || "";
    const vongMatch = String(vong).match(/\d+/);
    let v = vongMatch ? Number(vongMatch[0]) : 512;
    if (v <= 64) _64++;
    else if (v <= 128) _128++;
    else if (v <= 256) _256++;
    else _512++;
}

console.log(`v<=64: ${_64} (reqSize=16) -> ${_64*16} slots`);
console.log(`v<=128: ${_128} (reqSize=8) -> ${_128*8} slots`);
console.log(`v<=256: ${_256} (reqSize=4) -> ${_256*4} slots`);
console.log(`v<=512: ${_512} (reqSize=2) -> ${_512*2} slots`);
console.log(`Total consumed slots: ${_64*16 + _128*8 + _256*4 + _512*2}`);
