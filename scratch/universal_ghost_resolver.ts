import mongoose from "mongoose";

export async function universalResolveGhosts(tournamentId: any, Match: any) {
    let resolvedAny = true;
    let iteration = 0;
    
    while (resolvedAny && iteration < 20) {
        resolvedAny = false;
        iteration++;
        
        // Find all scheduled matches
        const matches = await Match.find({ tournament: tournamentId, status: "scheduled" });
        
        for (const match of matches) {
            let homeDead = false;
            let awayDead = false;
            
            // Check homeTeam slot
            if (!match.homeTeam) {
                // Find previous matches that feed into this one
                const prevHome = await Match.find({ tournament: tournamentId, nextMatch: match._id });
                // We need to know which one feeds into home and which into away.
                // It's usually sorted by bracketPosition.y
                // But wait, what if the previous match doesn't exist?
            }
        }
    }
}
