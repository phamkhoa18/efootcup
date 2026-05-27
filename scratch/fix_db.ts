import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db!;
    
    console.log("Fixing bxh2v2...");
    const bxh2v2 = db.collection("bxh2v2");
    const docs = await bxh2v2.find({}).toArray();
    const seen = new Set();
    for (const doc of docs) {
        const key = doc.teamHash + "_" + doc.mode;
        if (seen.has(key)) {
            await bxh2v2.deleteOne({ _id: doc._id });
            console.log("Deleted duplicate bxh2v2:", doc._id);
        } else {
            seen.add(key);
        }
    }
    await bxh2v2.createIndex({ teamHash: 1, mode: 1 }, { unique: true });
    
    console.log("Fixing efvpointlog2v2...");
    const efvlogs = db.collection("efvpointlog2v2");
    const logs = await efvlogs.find({}).toArray();
    const seenLogs = new Set();
    for (const log of logs) {
        const key = log.teamHash + "_" + log.tournament;
        if (seenLogs.has(key)) {
            await efvlogs.deleteOne({ _id: log._id });
            console.log("Deleted duplicate efvpointlog2v2:", log._id);
        } else {
            seenLogs.add(key);
        }
    }
    await efvlogs.createIndex({ teamHash: 1, tournament: 1 }, { unique: true });
    
    console.log("Done fixing DB.");
    process.exit(0);
}
run();
