require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");

const TOURNAMENT_ID = "69bd4c8ad4d24902b39db3d5";

const RegSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, team: mongoose.Schema.Types.ObjectId }, { strict: false });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegSchema);
const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function checkMissing() {
    await mongoose.connect(process.env.MONGODB_URI);
    const missingIds = [
        "69c05332f0792ab61163742f",
        "69c201869d4ea1e3cff6c8b2",
        "69c25c1f6daae387df9c6e1b",
        "69c283e26daae387df9cfe81"
    ];

    const regs = await Registration.find({ tournament: TOURNAMENT_ID }).populate("user").lean();
    
    // Find efvIds of missing teams
    const missingEfvIds = new Set();
    const missingDetails = [];
    for (const r of regs) {
        if (missingIds.includes(r.team?.toString())) {
            let efv = r.user?.efvId;
            missingEfvIds.add(efv);
            missingDetails.push({ teamId: r.team.toString(), efv });
        }
    }

    let out = "Missing Teams EFV IDs:\n" + JSON.stringify(missingDetails, null, 2) + "\n\n";

    // Find other teams with the same EFV IDs
    for (const efv of missingEfvIds) {
        const matchingRegs = regs.filter(r => r.user?.efvId === efv);
        out += `Teams with EFV ID ${efv}:\n`;
        matchingRegs.forEach(r => {
            out += `   - Team: ${r.team}, Reg ID: ${r._id}\n`;
        });
    }

    fs.writeFileSync("check_missing_efv.log", out, "utf-8");
    process.exit(0);
}
checkMissing();
