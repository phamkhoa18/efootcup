function generateDE(S: number) {
    const totalWBRounds = Math.log2(S);
    const totalLBRounds = 2 * (totalWBRounds - 1);

    const lbRoundMatchCounts: number[] = [];
    let lbMatchCount = S / 4;
    for (let lbR = 1; lbR <= totalLBRounds; lbR++) {
        lbRoundMatchCounts.push(lbMatchCount);
        if (lbR % 2 === 0) {
            lbMatchCount = Math.max(1, lbMatchCount / 2);
        }
    }
    console.log(`S=${S}, LB Matches:`, lbRoundMatchCounts);
}
generateDE(16);
generateDE(8);
