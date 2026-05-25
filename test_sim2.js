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

    const tId = "69fd45298012cb393997cc4a";
    
    // We'll loop up to 10 rounds to be safe
    for (let r = 1; r <= 10; r++) {
        let roundMatches = await Match.find({ tournament: tId, round: r }).sort({ matchNumber: 1 });
        if (roundMatches.length === 0) break; // no more rounds

        let modified = false;
        for (const m of roundMatches) {
            if (m.status === "completed" || m.status === "bye") {
                // If it's a bye, make sure winner is pushed forward
                if (m.status === "bye" && m.homeTeam && !m.winner) {
                    m.winner = m.homeTeam;
                    await m.save();
                    
                    const nextRound = r + 1;
                    const nextMatchNumber = Math.ceil(m.matchNumber / 2);
                    const isHome = m.matchNumber % 2 !== 0;

                    await Match.updateOne(
                        { tournament: tId, round: nextRound, matchNumber: nextMatchNumber },
                        isHome ? { homeTeam: m.winner } : { awayTeam: m.winner }
                    );
                }
                // Even if completed, make sure next match has the teams
                if (m.winner) {
                    const nextRound = r + 1;
                    const nextMatchNumber = Math.ceil(m.matchNumber / 2);
                    const isHome = m.matchNumber % 2 !== 0;

                    await Match.updateOne(
                        { tournament: tId, round: nextRound, matchNumber: nextMatchNumber },
                        isHome ? { homeTeam: m.winner } : { awayTeam: m.winner }
                    );
                }
                continue;
            }

            if (m.homeTeam && m.awayTeam) {
                const homeStr = m.homeTeam.toString();
                
                const winnerId = Math.random() > 0.5 ? m.homeTeam : m.awayTeam;
                const homeScore = winnerId.toString() === homeStr ? 3 : 1;
                const awayScore = winnerId.toString() === homeStr ? 1 : 3;

                m.winner = winnerId;
                m.homeScore = homeScore;
                m.awayScore = awayScore;
                m.status = "completed";
                await m.save();
                modified = true;

                const nextRound = r + 1;
                const nextMatchNumber = Math.ceil(m.matchNumber / 2);
                const isHome = m.matchNumber % 2 !== 0;

                await Match.updateOne(
                    { tournament: tId, round: nextRound, matchNumber: nextMatchNumber },
                    isHome ? { homeTeam: m.winner } : { awayTeam: m.winner }
                );
            }
        }
    }
    
    // Check if any matches remain incomplete
    const remaining = await Match.countDocuments({ tournament: tId, status: { $nin: ["completed", "bye"] } });
    console.log("Remaining incomplete matches:", remaining);

    process.exit(0);
}
run();
