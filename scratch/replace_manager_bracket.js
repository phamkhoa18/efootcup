const fs = require('fs');
const path = require('path');
const file = path.resolve('app/(manager)/manager/giai-dau/[id]/so-do/page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /const renderBracketSection = \(sectionRounds: typeof bracketRounds, sectionKey: string\) => \{[\s\S]*?return \([\s\S]*?\);\n    \};/g;

const newFunc = `const renderBracketSection = (sectionRounds: typeof bracketRounds, sectionKey: string) => {
        // Step 1: Filter active matches (ignore "bye")
        const activeRounds = sectionRounds.map(round => ({
            ...round,
            matches: round.matches.filter((m: any) => m.status !== 'bye')
        })).filter(round => round.matches.length > 0);

        if (activeRounds.length === 0) return null;

        const firstRoundMatchCount = sectionRounds[0]?.matches.length || 1; // Use ORIGINAL count for correct scale logic
        const GAP = 128;

        // Step 2: Calculate theoretical Y for all active matches
        const allActiveMatches: any[] = [];
        activeRounds.forEach((round, rIndex) => {
            // Must use the original round matches length to maintain the binary tree scale
            const originalRound = sectionRounds.find(r => r.name === round.name);
            const currentMatchCount = originalRound?.matches.length || 1;
            const scale = Math.max(1, firstRoundMatchCount / currentMatchCount);
            
            round.matches.forEach((match: any) => {
                const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
                match._theoreticalY = topPadding + (match.bracketPosition?.y || 0) * UNIT_HEIGHT * scale;
                match._scale = scale;
                allActiveMatches.push(match);
            });
        });

        // Step 3: Extract unique theoretical Ys and map them to compact Y indexes
        const uniqueYs = Array.from(new Set(allActiveMatches.map(m => m._theoreticalY))).sort((a, b) => a - b);
        allActiveMatches.forEach(m => {
            m._compactY = uniqueYs.indexOf(m._theoreticalY);
        });

        // The total height of the container is based on the number of unique Ys (packed rows)
        const containerHeight = uniqueYs.length * UNIT_HEIGHT;

        return (
            <div className="inline-flex p-12 min-w-full relative z-10">
                {activeRounds.map((round, rIndex) => {
                    const isLastRound = rIndex === activeRounds.length - 1;
                    return (
                        <div key={\`\${sectionKey}-\${rIndex}\`} className="flex">
                            <div className="flex flex-col w-[220px]">
                                <div className="h-10 flex items-center justify-center mb-12">
                                    <div className="w-[160px] py-2 rounded-md bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center shadow-sm">
                                        <span className="text-[13px] font-bold text-gray-800">{round.name}</span>
                                    </div>
                                </div>
                                <div className="relative shrink-0 w-full" style={{ height: \`\${containerHeight}px\`, minHeight: \`\${containerHeight}px\` }}>
                                    {round.matches.map((match: any) => {
                                        const yOffset = match._compactY * UNIT_HEIGHT;
                                        
                                        const matchesSearch = bracketSearch.trim() === "" || [
                                            match.homeTeam?.name, match.homeTeam?.shortName, match.homeTeam?.player1, match.homeTeam?.player2,
                                            match.awayTeam?.name, match.awayTeam?.shortName, match.awayTeam?.player1, match.awayTeam?.player2,
                                            match.p1?.name, match.p2?.name,
                                            match.homeTeam?.efvId != null ? String(match.homeTeam.efvId) : null,
                                            match.awayTeam?.efvId != null ? String(match.awayTeam.efvId) : null,
                                        ].some(v => v && v.toLowerCase().includes(bracketSearch.toLowerCase()));

                                        return (
                                            <div
                                                key={match._id || match.id}
                                                className={\`absolute left-0 flex items-center transition-opacity \${matchesSearch ? 'opacity-100' : 'opacity-20'}\`}
                                                style={{ top: \`\${yOffset}px\`, height: \`\${UNIT_HEIGHT}px\`, width: '100%' }}
                                            >
                                                <MatchCard match={match} onClick={() => setSelectedMatch(match)} />
                                                
                                                {/* Incoming line from previous round */}
                                                {rIndex > 0 && (
                                                    <div className="absolute bg-[#CBD5E1]" style={{ left: \`-\${GAP / 2}px\`, width: \`\${GAP / 2}px\`, height: '1px', top: '50%' }} />
                                                )}
                                                
                                                {/* Outgoing connector lines to next round */}
                                                {match.nextMatch && !isLastRound && (() => {
                                                    const nextRoundMatches = activeRounds[rIndex + 1]?.matches || [];
                                                    const nextMatch = nextRoundMatches.find((m: any) => m._id === match.nextMatch || m.id === match.nextMatch || String(m._id) === String(match.nextMatch));
                                                    
                                                    // If the next match doesn't exist in active rounds (maybe it's a bye that got filtered), we don't draw a line
                                                    if (!nextMatch) return null;

                                                    const myCenterY = yOffset + UNIT_HEIGHT / 2;
                                                    const nextCenterY = nextMatch._compactY * UNIT_HEIGHT + UNIT_HEIGHT / 2;
                                                    
                                                    const isStraightLine = myCenterY === nextCenterY;
                                                    const halfGap = GAP / 2;

                                                    if (isStraightLine) {
                                                        return (
                                                            <div className="absolute bg-[#CBD5E1]" style={{ right: \`-\${halfGap}px\`, width: \`\${halfGap}px\`, height: '1px', top: '50%' }} />
                                                        );
                                                    }

                                                    // Calculate dynamic vertical line
                                                    const vDiff = nextCenterY - myCenterY;
                                                    const isTop = vDiff > 0; // The next match is BELOW us (visually), so we are the top match in the pairing
                                                    const vLen = Math.abs(vDiff);

                                                    return (
                                                        <>
                                                            <div className="absolute bg-[#CBD5E1]" style={{ right: \`-\${halfGap}px\`, width: \`\${halfGap}px\`, height: '1px', top: '50%' }} />
                                                            <div className="absolute bg-[#CBD5E1]" style={{ right: \`-\${halfGap}px\`, width: '1px', height: \`\${vLen}px\`, ...(isTop ? { top: '50%' } : { bottom: '50%' }) }} />
                                                            {isTop && (
                                                                <div className="absolute bg-[#CBD5E1]" style={{ right: \`-\${GAP}px\`, width: \`\${halfGap}px\`, height: '1px', top: \`calc(50% + \${vLen}px)\` }} />
                                                            )}
                                                            {!isTop && (
                                                                <div className="absolute bg-[#CBD5E1]" style={{ right: \`-\${GAP}px\`, width: \`\${halfGap}px\`, height: '1px', top: \`calc(50% - \${vLen}px)\` }} />
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ width: \`\${GAP}px\` }} />
                        </div>
                    );
                })}
            </div>
        );
    };`;

if (!content.match(regex)) {
    console.log('Regex did not match manager view!');
} else {
    content = content.replace(regex, newFunc);
    fs.writeFileSync(file, content);
    console.log('Replaced manager view');
}
