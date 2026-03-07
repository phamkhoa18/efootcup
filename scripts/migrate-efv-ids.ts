/**
 * Migration script: Assign EFV-IDs to existing users who don't have one.
 * Run once: npx tsx scripts/migrate-efv-ids.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "";

async function migrate() {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);

    // Import models AFTER connecting
    const Counter = (await import("../models/Counter")).default;
    const User = (await import("../models/User")).default;

    // Find users without efvId, sorted by creation date
    const usersWithout = await User.find({ $or: [{ efvId: null }, { efvId: { $exists: false } }] })
        .sort({ createdAt: 1 });

    console.log(`📋 Found ${usersWithout.length} users without EFV-ID`);

    for (const user of usersWithout) {
        const seq = await Counter.getNextSequence("efvId");
        user.efvId = seq;
        await user.save();
        console.log(`  ✅ ${user.name} → ${user.efvId}`);
    }

    console.log("✨ Migration complete!");
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
