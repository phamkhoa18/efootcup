import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");

    const Match = mongoose.model("Match", new mongoose.Schema({
        tournament: mongoose.Schema.Types.ObjectId,
        round: Number,
        matchNumber: Number,
        homeTeam: mongoose.Schema.Types.ObjectId,
        awayTeam: mongoose.Schema.Types.ObjectId,
        winner: mongoose.Schema.Types.ObjectId,
        status: String,
        homeScore: Number,
        awayScore: Number,
    }, { strict: false }));

    const Tournament = mongoose.model("Tournament", new mongoose.Schema({
        status: String
    }, { strict: false }));

    const tId = "69fd45298012cb393997cc4a";
    const matches = await Match.find({ tournament: tId }).sort({ round: 1, matchNumber: 1 });
    console.log("Found matches:", matches.length);

    // Group by round
    const rounds = [...new Set(matches.map(m => m.round))].sort();

    for (const r of rounds) {
        const roundMatches = matches.filter(m => m.round === r);
        for (const m of roundMatches) {
            if (m.status === "completed" || m.status === "bye") continue;

            if (m.homeTeam && m.awayTeam) {
                // Random winner
                const winnerId = Math.random() > 0.5 ? m.homeTeam : m.awayTeam;
                const homeScore = winnerId.toString() === m.homeTeam.toString() ? 3 : 1;
                const awayScore = winnerId.toString() === m.homeTeam.toString() ? 1 : 3;

                m.winner = winnerId;
                m.homeScore = homeScore;
                m.awayScore = awayScore;
                m.status = "completed";
                await m.save();
                console.log(`Round ${r} Match ${m.matchNumber} completed. Winner: ${winnerId}`);

                // Move winner to next match if single elimination
                // The next match is usually found by matchNumber / 2
                // We'll let the existing bracket logic handle it, but since we are simulating from script, we might need to do it manually.
                const nextRound = (r || 0) + 1;
                const nextMatchNumber = Math.ceil((m.matchNumber || 0) / 2);
                const isHome = (m.matchNumber || 0) % 2 !== 0;

                const nextMatch = await Match.findOne({ tournament: tId, round: nextRound, matchNumber: nextMatchNumber });
                if (nextMatch) {
                    if (isHome) {
                        nextMatch.homeTeam = winnerId;
                    } else {
                        nextMatch.awayTeam = winnerId;
                    }
                    await nextMatch.save();
                    console.log(`Propagated winner to Round ${nextRound} Match ${nextMatchNumber}`);
                }

            } else if (m.homeTeam && !m.awayTeam) {
                // bye or waiting?
            }
        }
    }

    await Tournament.findByIdAndUpdate(tId, { status: "completed" });
    console.log("Tournament marked as completed.");
    process.exit(0);
}
run();
