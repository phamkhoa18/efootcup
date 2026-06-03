const fs = require('fs');
const brackets = require('./matches.json'); // I will dump matches to this file
// Mock logic of so-do/page.tsx
const isDoubleElimination = true;
const matches = brackets;
const groupByBracket = (type) => {
    const typeMatches = matches.filter(m => m.bracketType === type);
    const typeRoundMap = {};
    typeMatches.forEach(m => {
        const rn = m.roundName || `Vòng ${m.round}`;
        if (!typeRoundMap[rn]) typeRoundMap[rn] = [];
        typeRoundMap[rn].push(m);
    });
    return Object.entries(typeRoundMap)
        .sort(([, a], [, b]) => (a[0]?.round || 0) - (b[0]?.round || 0))
        .map(([name, rm]) => ({ name, matches: rm }))
        .filter(r => r.matches.length > 0);
};

const wbGroup = groupByBracket('winner');
const gfGroup = groupByBracket('grand_final');
const wbRounds = [...wbGroup, ...gfGroup];

console.log("wbRounds rounds:", wbRounds.map(r => r.name));

const activeRounds = wbRounds.map(round => ({
    ...round,
    matches: round.matches.filter((m) => {
        if (isDoubleElimination) {
            if (m.status === 'bye') return false;
            if (m.status === 'walkover' && (!m.homeTeam || !m.awayTeam)) return false;
        }
        return true;
    })
})).filter(round => round.matches.length > 0);

console.log("activeRounds rounds:", activeRounds.map(r => r.name));
