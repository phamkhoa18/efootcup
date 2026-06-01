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
    
    const lbR1Matches = await Match.find({ tournament: tournamentId, round: 101, bracketType: "loser" });
    
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
    
    for (const lbMatch of lbR1Matches) {
        const homeDead = deadLBSlots.has(`${lbMatch._id}_homeTeam`);
        const awayDead = deadLBSlots.has(`${lbMatch._id}_awayTeam`);
        
        if (homeDead && awayDead) {
            lbMatch.status = "bye";
            await lbMatch.save();
        } else if (homeDead && lbMatch.awayTeam && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.awayTeam;
            lbMatch.status = "completed";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.awayTeam.toString());
        } else if (awayDead && lbMatch.homeTeam && lbMatch.status !== "completed") {
            lbMatch.winner = lbMatch.homeTeam;
            lbMatch.status = "completed";
            lbMatch.completedAt = new Date();
            await lbMatch.save();
            if (lbMatch.nextMatch) await cascadeAdvance(lbMatch._id.toString(), lbMatch.homeTeam.toString());
        }
    }
}

