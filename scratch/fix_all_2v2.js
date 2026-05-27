const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");
const fs = require("fs");

const envFile = fs.existsSync(resolve(process.cwd(), ".env.production")) ? ".env.production" : ".env.local";
dotenv.config({ path: resolve(process.cwd(), envFile) });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    const db = mongoose.connection.db;

    // Fix ALL 2v2 tournaments — add missing player2 to team members
    const tournaments = await db.collection("tournaments").find({ teamSize: 2 }).toArray();
    
    let totalFixed = 0;
    for (const t of tournaments) {
        const teams = await db.collection("teams").find({ tournament: t._id }).toArray();
        const badTeams = teams.filter(team => !team.members || team.members.length < 2);
        
        for (const team of badTeams) {
            const reg = await db.collection("registrations").findOne({ team: team._id });
            if (!reg || !reg.player2User) continue;

            await db.collection("teams").updateOne(
                { _id: team._id },
                { $push: { members: { user: reg.player2User, role: "player", joinedAt: new Date() } } }
            );
            totalFixed++;
            console.log(`✅ Fixed: ${team.name} in "${t.title}" — added ${reg.player2Name}`);
        }
    }

    console.log(`\nTotal fixed: ${totalFixed}`);
    process.exit(0);
}
run();
