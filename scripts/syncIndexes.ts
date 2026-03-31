import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const RegistrationSchema = new mongoose.Schema({
        tournament: mongoose.Schema.Types.ObjectId,
        user: mongoose.Schema.Types.ObjectId,
        status: String
    });

    RegistrationSchema.index(
        { tournament: 1, user: 1 },
        { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
    );
    RegistrationSchema.index({ tournament: 1, status: 1 });

    const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);

    console.log("Syncing indexes for Registration collection...");
    await Registration.syncIndexes();
    console.log("Successfully rebuilt/synced indexes.");

    // Verify
    const indexes = await Registration.collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    process.exit(0);
}

run().catch(console.error);
