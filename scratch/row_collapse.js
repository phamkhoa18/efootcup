const allMatches = [
    { id: 1, round: 1, y: 0, status: 'completed' },
    { id: 2, round: 1, y: 31, status: 'completed' },
    { id: 3, round: 2, y: 0, status: 'completed' },
    { id: 4, round: 2, y: 15, status: 'completed' },
    { id: 5, round: 3, y: 0, status: 'completed' },
];

const UNIT_HEIGHT = 110;
const rounds = [
    { matches: [allMatches[0], allMatches[1]] },
    { matches: [allMatches[2], allMatches[3]] },
    { matches: [allMatches[4]] }
];
const originalFirstRoundCount = 32;

rounds.forEach((r, rIndex) => {
    const currentMatchCount = 32 / Math.pow(2, Math.floor(rIndex / 2)); // rough approx
    const scale = Math.max(1, originalFirstRoundCount / currentMatchCount);
    r.matches.forEach(m => {
        const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
        m.theoreticalY = topPadding + m.y * UNIT_HEIGHT * scale;
    });
});

console.log(allMatches.map(m => `Match ${m.id}: y=${m.y}, theoY=${m.theoreticalY}`));
