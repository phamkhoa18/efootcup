const UNIT_HEIGHT = 110;

const sectionRounds = [
    { matches: [{ id: 1, y: 0, next: 3 }, { id: 2, y: 1, next: 4 }, { id: 'ghost1', status: 'bye', y: 2, next: 5 }, { id: 'ghost2', status: 'bye', y: 3, next: 6 }] },
    { matches: [{ id: 3, y: 0, next: 7 }, { id: 4, y: 1, next: 7 }, { id: 5, y: 2, next: 8 }, { id: 6, y: 3, next: 8 }] },
    { matches: [{ id: 7, y: 0, next: 9 }, { id: 8, y: 1, next: 9 }] }
];

const firstRoundMatchCount = 4; // Original match count

const allActiveMatches = [];
const displayRds = sectionRounds.map((round, rIndex) => {
    const currentMatchCount = sectionRounds[rIndex].matches.length || 1;
    const scale = Math.max(1, firstRoundMatchCount / currentMatchCount);
    
    const active = round.matches.filter(m => m.status !== 'bye');
    
    active.forEach(match => {
        const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
        match._theoreticalY = topPadding + (match.y || 0) * UNIT_HEIGHT * scale;
        allActiveMatches.push(match);
    });
    
    return { ...round, matches: active };
}).filter(r => r.matches.length > 0);

const uniqueYs = Array.from(new Set(allActiveMatches.map(m => m._theoreticalY))).sort((a, b) => a - b);
console.log("Unique Ys:", uniqueYs);

allActiveMatches.forEach(m => {
    m._compactY = uniqueYs.indexOf(m._theoreticalY);
    console.log(`Match ${m.id} -> _compactY: ${m._compactY}`);
});
