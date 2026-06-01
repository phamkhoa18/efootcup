import fs from 'fs';

const filePath = 'app/api/tournaments/[id]/brackets/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const functionToAdd = `
async function propagateByes(tournamentId: string) {
    const Match = mongoose.models.Match;
    
    // Find all WB R1 BYEs
    const wbR1Byes = await Match.find({ tournament: tournamentId, round: 1, bracketType: "winner", status: "bye" });
    
    const deadLBSlots = new Map();
    for (const m of wbR1Byes) {
        if (m.loserDropsToMatch) {
            const posY = m.bracketPosition?.y ?? 0;
            const side = posY % 2 === 0 ? "homeTeam" : "awayTeam";
            deadLBSlots.set(m.loserDropsToMatch.toString() + "_" + side, true);
        }
    }
    
    // Resolve LB R1 matches
    const lbR1Matches = await Match.find({ tournament: tournamentId, round: 101, bracketType: "loser" });
    
    for (const lbMatch of lbR1Matches) {
        const matchIdStr = lbMatch._id.toString();
        const homeDead = deadLBSlots.has(matchIdStr + "_homeTeam");
        const awayDead = deadLBSlots.has(matchIdStr + "_awayTeam");
        
        if (homeDead) lbMatch.homeIsGhost = true;
        if (awayDead) lbMatch.awayIsGhost = true;
        
        if (homeDead || awayDead) {
            await lbMatch.save();
        }
    }
}
`;
// Wait, I can't just modify route.ts easily without replace_file_content.
