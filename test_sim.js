const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { resolve } = require("path");

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
    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

    for (const r of rounds) {
        if (r == null) continue;
        const roundMatches = matches.filter(m => m.round === r);
        for (const m of roundMatches) {
            if (m.status === "completed" || m.status === "bye") {
                if (m.status === "bye" && m.homeTeam && !m.winner) {
                    m.winner = m.homeTeam;
                    await m.save();
                    console.log(`Round ${r} Match ${m.matchNumber} was bye. Winner set to homeTeam`);
                    
                    const nextRound = r + 1;
                    const nextMatchNumber = Math.ceil(m.matchNumber / 2);
                    const isHome = m.matchNumber % 2 !== 0;

                    const nextMatch = await Match.findOne({ tournament: tId, round: nextRound, matchNumber: nextMatchNumber });
                    if (nextMatch) {
                        if (isHome) nextMatch.homeTeam = m.winner;
                        else nextMatch.awayTeam = m.winner;
                        await nextMatch.save();
                    }
                }
                continue;
            }

            if (m.homeTeam && m.awayTeam) {
                const homeStr = m.homeTeam.toString();
                const awayStr = m.awayTeam.toString();
                
                const winnerId = Math.random() > 0.5 ? m.homeTeam : m.awayTeam;
                const homeScore = winnerId.toString() === homeStr ? 3 : 1;
                const awayScore = winnerId.toString() === homeStr ? 1 : 3;

                m.winner = winnerId;
                m.homeScore = homeScore;
                m.awayScore = awayScore;
                m.status = "completed";
                await m.save();
                console.log(`Round ${r} Match ${m.matchNumber} completed. Winner: ${winnerId}`);

                const nextRound = r + 1;
                const nextMatchNumber = Math.ceil(m.matchNumber / 2);
                const isHome = m.matchNumber % 2 !== 0;

                const nextMatch = await Match.findOne({ tournament: tId, round: nextRound, matchNumber: nextMatchNumber });
                if (nextMatch) {
                    if (isHome) nextMatch.homeTeam = winnerId;
                    else nextMatch.awayTeam = winnerId;
                    await nextMatch.save();
                }

            }
        }
        
        // Wait briefly for next round to catch up if we are fetching fresh matches, but we fetch from DB every time for nextMatch
    }

    await Tournament.findByIdAndUpdate(tId, { status: "completed" });
    console.log("Tournament marked as completed.");
    process.exit(0);
}
run();
