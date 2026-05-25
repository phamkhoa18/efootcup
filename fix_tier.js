const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const Tournament = mongoose.model("Tournament", new mongoose.Schema({
        efvTier: String
    }, { strict: false }));

    const tId = "69fd45298012cb393997cc4a";
    await Tournament.findByIdAndUpdate(tId, { efvTier: "efv_250" });
    console.log("Updated efvTier to efv_250");
    process.exit(0);
}
run();
