const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");
const fs = require("fs");

const envFile = fs.existsSync(resolve(process.cwd(), ".env.production")) ? ".env.production" : ".env.local";
dotenv.config({ path: resolve(process.cwd(), envFile) });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;

    const tournamentId = "69ce29759dcff66e7384cdf9";

    // Reset efvPointsAwarded so we can re-award
    const result = await db.collection("tournaments").updateOne(
        { _id: new mongoose.Types.ObjectId(tournamentId) },
        { $set: { efvPointsAwarded: false } }
    );
    console.log("Reset efvPointsAwarded:", result.modifiedCount === 1 ? "✅" : "❌");

    // Delete existing point logs for this tournament (if any)
    const delLogs = await db.collection("efvpointlog2v2s").deleteMany({ 
        tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    console.log("Deleted existing EfvPointLog2v2s:", delLogs.deletedCount);

    console.log("\nNow you can re-award EFV points via the admin UI or API.");

    process.exit(0);
}
run();
