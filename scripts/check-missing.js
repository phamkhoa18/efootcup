require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const TeamSchema = new mongoose.Schema({}, { strict: false });
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

async function checkMissing() {
    await mongoose.connect(process.env.MONGODB_URI);
    const missingIds = [
        "69c05332f0792ab61163742f",
        "69c201869d4ea1e3cff6c8b2",
        "69c25c1f6daae387df9c6e1b",
        "69c283e26daae387df9cfe81"
    ];

    let out = "";
    const teams = await Team.find({ _id: { $in: missingIds } }).lean();
    for (const t of teams) {
        out += JSON.stringify(t, null, 2) + "\n";
    }
    fs.writeFileSync("check_missing.log", out, "utf-8");
    process.exit(0);
}
checkMissing();
