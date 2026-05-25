const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const PointLog = mongoose.model("EfvPointLog2v2", new mongoose.Schema({}, { strict: false }));
    const Bxh = mongoose.model("Bxh2v2", new mongoose.Schema({}, { strict: false }));

    const logs = await PointLog.countDocuments();
    const bxhs = await Bxh.countDocuments();
    console.log("EfvPointLog2v2 count:", logs);
    console.log("Bxh2v2 count:", bxhs);
    
    if (bxhs > 0) {
        const bxhList = await Bxh.find().limit(2);
        console.log(JSON.stringify(bxhList, null, 2));
    }
    
    process.exit(0);
}
run();
