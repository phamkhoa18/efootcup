import mongoose from "mongoose";

export async function resolveGhosts(tournamentId: any, Match: any) {
    const wbR1Byes = await Match.find({ tournament: tournamentId, round: 1, bracketType: "winner", status: "bye" }).lean();
    
    const deadLBSlots = new Map<string, string>();
    for (const m of wbR1Byes) {
        if (m.loserDropsToMatch) {
            const posY = m.bracketPosition?.y ?? 0;
            const side = posY % 2 === 0 ? "homeTeam" : "awayTeam";
            deadLBSlots.set(`${m.loserDropsToMatch}_${side}`, "dead");
        }
    }
    
    const cascadeAdvance = async (matchId: string, winnerId: string, depth = 0) => {
        if (depth > 10) return;
        const match = await Match.findById(matchId);
        if (!match || !match.nextMatch) return;

        const siblings = await Match.find({
            tournament: match.tournament,
            round: match.round,
            nextMatch: match.nextMatch,
        }).sort({ "bracketPosition.y": 1, matchNumber: 1 });

        const idx = siblings.findIndex((m: any) => m._id.toString() === match._id.toString());
        const nextMatch = await Match.findById(match.nextMatch);
        if (nextMatch) {
            const lbR = match.round - 100;
            const side = (lbR % 2 === 1) ? "homeTeam" : (idx % 2 === 0 ? "homeTeam" : "awayTeam");
            nextMatch[side] = winnerId;
            await nextMatch.save();
        }
    };
    
    // Resolve LB R1
    const lbR1Matches = await Match.find({ tournament: tournamentId, round: 101, bracketType: "loser" });
    const doubleDeadR1Matches = new Set<string>();
    
    for (const lbMatch of lbR1Matches) {
        const homeDead = deadLBSlots.has(`${lbMatch._id}_homeTeam`);
        const awayDead = deadLBSlots.has(`${lbMatch._id}_awayTeam`);
        
        if (homeDead && awayDead) {
            lbMatch.status = "bye";
            await lbMatch.save();
            doubleDeadR1Matches.add(lbMatch._id.toString());
        } else if (homeDead && lbMatch.awayTeam && lbMatch.status !== "walkover" && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.awayTeam;
            lbMatch.status = "walkover";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.awayTeam.toString());
        } else if (awayDead && lbMatch.homeTeam && lbMatch.status !== "walkover" && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.homeTeam;
            lbMatch.status = "walkover";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.homeTeam.toString());
        }
    }
    
    // Resolve LB R2 (single ghosts from doubleDeadR1Matches)
    const lbR2Matches = await Match.find({ tournament: tournamentId, round: 102, bracketType: "loser" });
    for (const lbMatch of lbR2Matches) {
        // Find if its previous match in LB R1 was double dead
        const prevMatches = await Match.find({ tournament: tournamentId, round: 101, nextMatch: lbMatch._id }).sort({ "bracketPosition.y": 1 });
        // In LB R1 -> LB R2, it's 1:1 mapping, so there's only 1 previous match!
        if (prevMatches.length > 0) {
            const prev = prevMatches[0];
            if (doubleDeadR1Matches.has(prev._id.toString())) {
                // The homeTeam slot is dead!
                // We know awayTeam gets a drop from WB R2, which is ALWAYS a real team.
                // But wait! WB R2 hasn't been played yet! So awayTeam is null right now!
                // If awayTeam is null right now, we CANNOT walkover it now!
                // So we can only mark the match as having a dead homeTeam.
                // We can set `homeIsGhost: true` so when awayTeam drops in, it auto-wins!
                lbMatch.homeIsGhost = true;
                await lbMatch.save();
            }
        }
    }
}
