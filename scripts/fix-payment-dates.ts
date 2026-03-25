import mongoose from "mongoose";
import Registration from "../models/Registration";

// Load environment variables if script runs independently
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";

function parseVietnamTime(dateString?: string): Date {
    if (!dateString) return new Date();
    if (dateString.includes('T') || dateString.includes('+') || dateString.includes('Z')) {
        return new Date(dateString);
    }
    return new Date(dateString.replace(' ', 'T') + '+07:00');
}

async function fixPaymentDates() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const registrations = await Registration.find({
            paymentNote: { $exists: true, $ne: "" },
            paymentDate: { $exists: true }
        });

        let fixedCount = 0;
        for (const reg of registrations) {
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                const txDateStr = noteData.transactionDate || noteData.bankTransactionDate;
                
                if (txDateStr && typeof txDateStr === 'string' && !txDateStr.includes('T')) {
                    const correctDate = parseVietnamTime(txDateStr);
                    // Check if current paymentDate is different (often by exactly 7 hours)
                    if (reg.paymentDate && reg.paymentDate.getTime() !== correctDate.getTime()) {
                        console.log(`Fixing Reg ${reg._id} (${reg.playerName}):\n  Old: ${reg.paymentDate.toISOString()}\n  New: ${correctDate.toISOString()}\n  Original String: ${txDateStr}`);
                        reg.paymentDate = correctDate;
                        await reg.save();
                        fixedCount++;
                    }
                }
            } catch (e) {
                // Ignore invalid JSON or parsing errors for this document
            }
        }

        console.log(`\nFinished! Successfully fixed ${fixedCount} old registrations.`);
        process.exit(0);
    } catch (error) {
        console.error("Error connecting to DB or running script", error);
        process.exit(1);
    }
}

fixPaymentDates();
