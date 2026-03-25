import mongoose from "mongoose";
import Registration from "../models/Registration";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/efootcup";

async function checkDates() {
    await mongoose.connect(MONGODB_URI);
    
    // Find all latest registrations with payment
    const regs = await Registration.find({ paymentStatus: "paid" }).sort({ createdAt: -1 }).limit(10);
    
    for (const reg of regs) {
        console.log(`\nRegistration: ${reg._id}`);
        console.log(`paymentDate: ${reg.paymentDate}`);
        console.log(`paymentConfirmedAt: ${reg.paymentConfirmedAt}`);
        console.log(`paymentNote: ${reg.paymentNote}`);
    }
    
    process.exit(0);
}

checkDates();
