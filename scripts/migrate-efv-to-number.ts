/**
 * Migration script: Convert efvId from string "EFV-000001" to number 1, 2, 3...
 * 
 * This script will:
 * 1. Reset the "efvId" counter in the counters collection
 * 2. Clear all existing efvId values (old string format)
 * 3. Re-assign efvId as sequential numbers based on user creation date
 * 
 * Run once: npx tsx scripts/migrate-efv-to-number.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "";

async function migrate() {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    // Import models AFTER connecting
    const Counter = (await import("../models/Counter")).default;
    const User = (await import("../models/User")).default;

    // Step 1: Reset the efvId counter
    console.log("1️⃣  Resetting efvId counter...");
    await Counter.deleteOne({ _id: "efvId" });
    console.log("   ✅ Counter reset\n");

    // Step 2: Clear all existing efvId values (could be old string format)
    console.log("2️⃣  Clearing old efvId values...");
    const clearResult = await User.updateMany(
        {},
        { $unset: { efvId: "" } }
    );
    console.log(`   ✅ Cleared efvId from ${clearResult.modifiedCount} users\n`);

    // Step 3: Re-assign efvId as numbers, sorted by creation date
    console.log("3️⃣  Assigning new numeric efvId values...");
    const allUsers = await User.find({}).sort({ createdAt: 1 });
    console.log(`   📋 Found ${allUsers.length} users total\n`);

    let count = 0;
    for (const user of allUsers) {
        const seq = await Counter.getNextSequence("efvId");
        // Use updateOne to bypass pre-save hook (avoid duplicate assignment)
        await User.updateOne(
            { _id: user._id },
            { $set: { efvId: seq } }
        );
        count++;
        console.log(`   ✅ ${user.name} → #${seq}`);
    }

    console.log(`\n✨ Migration complete! Assigned numeric efvId to ${count} users.`);
    console.log("   New format: 1, 2, 3, ... (instead of EFV-000001, EFV-000002, ...)");

    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
