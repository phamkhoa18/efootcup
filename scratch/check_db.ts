import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;
    
    // Check duplicates in bxh2v2s
    const bxh2v2s = db!.collection("bxh2v2s");
    const docs = await bxh2v2s.find({}).toArray();
    console.log("Total bxh2v2s:", docs.length);
    
    const unique = new Set(docs.map(d => d.teamHash + "_" + d.mode));
    console.log("Unique teamHash+mode:", unique.size);
    
    // Check indexes
    const indexes = await bxh2v2s.indexes();
    console.log("Indexes:", indexes);
    
    // Check duplicate documents
    if (docs.length > unique.size) {
        console.log("DELETING DUPLICATES...");
        const seen = new Set();
        for (const doc of docs) {
            const key = doc.teamHash + "_" + doc.mode;
            if (seen.has(key)) {
                await bxh2v2s.deleteOne({ _id: doc._id });
                console.log("Deleted duplicate:", doc._id);
            } else {
                seen.add(key);
            }
        }
        
        // Re-create the index
        await bxh2v2s.createIndex({ teamHash: 1, mode: 1 }, { unique: true });
        console.log("Created unique index");
    }
    
    process.exit(0);
}
run();
