/**
 * Migration script: Set all existing users as verified.
 * Run once after deploying the email verification feature.
 * 
 * Usage: node scripts/migrate-verify-users.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function migrate() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB");

        const result = await mongoose.connection.db.collection("users").updateMany(
            { isVerified: { $exists: false } },
            { $set: { isVerified: true } }
        );

        console.log(`✅ Updated ${result.modifiedCount} existing users to isVerified: true`);

        await mongoose.disconnect();
        console.log("✅ Done!");
    } catch (error) {
        console.error("❌ Migration error:", error);
        process.exit(1);
    }
}

migrate();
