const fs = require('fs');
const path = require('path');
const p = path.resolve('app/(main)/giai-dau/[id]/TournamentDetailClient.tsx');
let content = fs.readFileSync(p, 'utf8');

const replacement = `
                                {/* Unified Tournament Stage */}
                                <div className="bg-[#FDFDFD] rounded-2xl border p-8 overflow-auto min-h-[500px] relative shadow-inner" ref={scrollContainerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
                                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: \`radial-gradient(#E2E8F0 1.2px, transparent 1.2px)\`, backgroundSize: '32px 32px' }} />

                                    {isDoubleElimination ? (
                                        <div className="flex flex-col gap-16 p-8 min-w-max relative z-10">
                                            {/* Winner Bracket */}
                                            {wbRounds.length > 0 && (
                                                <div className="flex flex-col">
                                                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider flex items-center gap-3">
                                                        <Trophy className="w-6 h-6 text-yellow-500" />
                                                        Nhánh Thắng
                                                    </h3>
                                                    <div className="pl-4">
                                                        {renderPublicBracketSection(wbRounds, 'wb')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Loser Bracket */}
                                            {lbRounds.length > 0 && (
                                                <div className="flex flex-col">
                                                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider flex items-center gap-3 mt-4">
                                                        <RefreshCcw className="w-6 h-6 text-orange-500" />
                                                        Nhánh Thua
                                                    </h3>
                                                    <div className="pl-4">
                                                        {renderPublicBracketSection(lbRounds, 'lb')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Grand Final */}
                                            {gfRounds.length > 0 && (
                                                <div className="flex flex-col">
                                                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider flex items-center gap-3 mt-4">
                                                        <Swords className="w-6 h-6 text-purple-500" />
                                                        Chung Kết Tổng
                                                    </h3>
                                                    <div className="pl-4 flex justify-center">
                                                        <div className="max-w-lg space-y-6 w-full py-8">
                                                            {gfRounds.map((round, rIndex) => (
                                                                <div key={rIndex}>
                                                                    <div className="text-center mb-6">
                                                                        <span className="inline-block py-1.5 px-6 rounded-full bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-800 text-sm font-black uppercase tracking-widest shadow-sm border border-purple-200">
                                                                            {round.name}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-6">
                                                                        {round.matches.map((match: any) => {
                                                                            const matchesSearch = bracketSearch.trim() === "" || [
                                                                                match.homeTeam?.name, match.homeTeam?.shortName, match.homeTeam?.player1, match.homeTeam?.player2,
                                                                                match.awayTeam?.name, match.awayTeam?.shortName, match.awayTeam?.player1, match.awayTeam?.player2,
                                                                                match.p1?.name, match.p2?.name,
                                                                                match.homeTeam?.efvId != null ? String(match.homeTeam.efvId) : null,
                                                                                match.awayTeam?.efvId != null ? String(match.awayTeam.efvId) : null,
                                                                            ].some(v => v && v.toLowerCase().includes(bracketSearch.toLowerCase()));

                                                                            return (
                                                                                <div key={match._id || match.id} className={\`transition-opacity \${matchesSearch ? 'opacity-100' : 'opacity-30'}\`}>
                                                                                    <MatchCard
                                                                                        match={match}
                                                                                        onClick={() => setSelectedMatch(match)}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="inline-flex p-12 min-w-full relative z-10">
                                            {renderPublicBracketSection(bracketRounds, 'se')}
                                        </div>
                                    )}
                                </div>
`;

// Also need to define renderPublicBracketSection
const renderFunc = \`
    const UNIT_HEIGHT = 120;

    const renderPublicBracketSection = (sectionRounds: typeof bracketRounds, sectionKey: string) => {
        const displayRds = sectionRounds;
        const firstRoundMatchCount = displayRds[0]?.matches.length || 1;
        return (
            <div className="inline-flex min-w-full relative z-10">
                {displayRds.map((round, rIndex) => {
                    const isLastRound = rIndex === displayRds.length - 1;
                    const currentMatchCount = round.matches.length || 1;
                    const scale = Math.max(1, firstRoundMatchCount / currentMatchCount);
                    const GAP = 128;

                    return (
                        <div key={\`\${sectionKey}-\${rIndex}\`} className="flex">
                            <div className="flex flex-col w-[200px]">
                                <div className="h-10 flex items-center justify-center mb-12">
                                    <div className="w-[140px] py-1.5 rounded-sm bg-[#FEEBDB] flex items-center justify-center">
                                        <span className="text-[12px] font-bold text-gray-800">{round.name}</span>
                                    </div>
                                </div>
                                <div className="relative flex-1" style={{ height: \`\${firstRoundMatchCount * UNIT_HEIGHT}px\` }}>
                                    {round.matches.map((match: any, mIdx: number) => {
                                        const topPadding = (scale - 1) * (UNIT_HEIGHT / 2);
                                        const yOffset = topPadding + (match.bracketPosition?.y || 0) * UNIT_HEIGHT * scale;

                                        const matchesSearch = bracketSearch.trim() === "" || [
                                            match.homeTeam?.name, match.homeTeam?.shortName, match.homeTeam?.player1, match.homeTeam?.player2,
                                            match.awayTeam?.name, match.awayTeam?.shortName, match.awayTeam?.player1, match.awayTeam?.player2,
                                            match.p1?.name, match.p2?.name,
                                            match.homeTeam?.efvId != null ? String(match.homeTeam.efvId) : null,
                                            match.awayTeam?.efvId != null ? String(match.awayTeam.efvId) : null,
                                        ].some(v => v && v.toLowerCase().includes(bracketSearch.toLowerCase()));

                                        if (match.status === 'bye') return null;

                                        return (
                                            <div
                                                key={match._id || match.id}
                                                className={\`absolute left-0 flex items-center transition-opacity \${matchesSearch ? 'opacity-100' : 'opacity-30'}\`}
                                                style={{
                                                    top: \`\${yOffset}px\`,
                                                    height: \`\${UNIT_HEIGHT}px\`,
                                                    width: '100%'
                                                }}
                                            >
                                                <MatchCard
                                                    match={match}
                                                    onClick={() => setSelectedMatch(match)}
                                                />

                                                {/* Connector lines to next round */}
                                                {match.nextMatch && !isLastRound && (() => {
                                                    const bY = match.bracketPosition?.y ?? 0;
                                                    const isTop = bY % 2 === 0;
                                                    const vLen = (UNIT_HEIGHT * scale) / 2;
                                                    const halfGap = GAP / 2;

                                                    const nextRoundMatches = sectionRounds[rIndex + 1]?.matches || [];
                                                    const nextMatch = nextRoundMatches.find((m: any) => m._id === match.nextMatch || m.id === match.nextMatch);
                                                    const isStraightLine = nextMatch && nextMatch.bracketPosition?.y === bY && nextRoundMatches.length === round.matches.length;

                                                    const pairY = isTop ? bY + 1 : bY - 1;
                                                    const pairMatch = round.matches.find((m: any) => m.bracketPosition?.y === pairY);
                                                    const isPairBye = pairMatch?.status === 'bye' || !pairMatch;

                                                    if (isStraightLine) {
                                                        return (
                                                            <div
                                                                className="absolute bg-[#CBD5E1]"
                                                                style={{
                                                                    right: \`-\${halfGap}px\`,
                                                                    width: \`\${halfGap}px\`,
                                                                    height: '1px',
                                                                    top: '50%',
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <>
                                                            <div
                                                                className="absolute bg-[#CBD5E1]"
                                                                style={{
                                                                    right: \`-\${halfGap}px\`,
                                                                    width: \`\${halfGap}px\`,
                                                                    height: '1px',
                                                                    top: '50%',
                                                                }}
                                                            />
                                                            <div
                                                                className="absolute bg-[#CBD5E1]"
                                                                style={{
                                                                    right: \`-\${halfGap}px\`,
                                                                    width: '1px',
                                                                    height: \`\${vLen}px\`,
                                                                    ...(isTop
                                                                        ? { top: '50%' }
                                                                        : { bottom: '50%' }
                                                                    ),
                                                                }}
                                                            />
                                                            {(isTop || isPairBye) && (
                                                                <div
                                                                    className="absolute bg-[#CBD5E1]"
                                                                    style={{
                                                                        right: \`-\${GAP}px\`,
                                                                        width: \`\${halfGap}px\`,
                                                                        height: '1px',
                                                                        top: isTop ? \`calc(50% + \${vLen}px)\` : \`calc(50% - \${vLen}px)\`,
                                                                    }}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                })()}

                                                {/* Incoming line from previous round */}
                                                {rIndex > 0 && (
                                                    <div
                                                        className="absolute bg-[#CBD5E1]"
                                                        style={{
                                                            left: \`-\${GAP / 2}px\`,
                                                            width: \`\${GAP / 2}px\`,
                                                            height: '1px',
                                                            top: '50%',
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Spacer between rounds */}
                            <div style={{ width: \`\${GAP}px\` }} />
                        </div>
                    );
                })}
            </div>
        );
    };
\`;

// We need to inject renderFunc inside the component, and inject the replacement instead of the old bracket rendering.
content = content.replace(/const isDoubleElimination = brackets\?\.format === 'double_elimination';/, \`const isDoubleElimination = brackets?.format === 'double_elimination';\n\n    const wbRounds = bracketRounds.filter(r => r.name.startsWith('WB'));\n    const lbRounds = bracketRounds.filter(r => r.name.startsWith('LB'));\n    const gfRounds = bracketRounds.filter(r => r.name.startsWith('Chung kết tổng') || r.name === 'Grand Final');\n\n\` + renderFunc);

const oldBlockRegex = /<div className="bg-\[#FDFDFD\] rounded-2xl border p-8 overflow-auto min-h-\[500px\] relative shadow-inner"[\s\S]*?<\/div>(\s*)<\/div>(\s*)<\/div>(\s*)<\/div>(\s*)<\/div>/;

// wait, the old block is from \`<div className="bg-[#FDFDFD]...>\` to the end of that div.
// Let's just find \`<div className="bg-[#FDFDFD]...\` and replace everything until the Fullscreen toggle.
const startIndex = content.indexOf('<div className="bg-[#FDFDFD] rounded-2xl border p-8 overflow-auto min-h-[500px] relative shadow-inner"');
const endIndex = content.indexOf('{/* Fullscreen Bracket Overlay */}');

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(p, content);
    console.log("Patched successfully!");
} else {
    console.log("Could not find blocks to patch.");
}
