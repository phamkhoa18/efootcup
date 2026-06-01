// Unified Bracket Rendering
const maxCols = Math.max(wbRounds.length, lbRounds.length);
const columns = [];
for (let i = 0; i < maxCols; i++) {
    columns.push({
        wbRound: wbRounds[i] || null,
        lbRound: lbRounds[i] || null,
    });
}

const wbFirstRoundMatchCount = wbRounds[0]?.matches?.length || 1;
const lbFirstRoundMatchCount = lbRounds[0]?.matches?.length || 1;
const wbMaxHeight = wbFirstRoundMatchCount * UNIT_HEIGHT;
const lbMaxHeight = lbFirstRoundMatchCount * UNIT_HEIGHT;
const GAP = 128;

const renderUnifiedRound = (round: any, rIndex: number, sectionRounds: any[], firstRoundMatchCount: number) => {
    const isLastRound = rIndex === sectionRounds.length - 1;
    const currentMatchCount = round.matches?.length || 1;
    const scale = Math.max(1, firstRoundMatchCount / currentMatchCount);
    
    return (
        <div className="flex flex-col w-[200px] absolute inset-0">
            <div className="h-10 flex items-center justify-center mb-12 relative z-20">
                <div className="w-[140px] py-1.5 rounded-sm bg-[#FEEBDB] flex items-center justify-center">
                    <span className="text-[12px] font-bold text-gray-800">{round.name}</span>
                </div>
            </div>
            <div className="relative flex-1">
                {round.matches.map((match: any) => {
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
                        <div key={match._id || match.id} className={`absolute left-0 flex items-center transition-opacity ${matchesSearch ? 'opacity-100' : 'opacity-30'}`} style={{ top: `${yOffset}px`, height: `${UNIT_HEIGHT}px`, width: '100%' }}>
                            <MatchCard match={match} onClick={() => setSelectedMatch(match)} />

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
                                    return <div className="absolute bg-[#CBD5E1]" style={{ right: `-${halfGap}px`, width: `${halfGap}px`, height: '1px', top: '50%' }} />;
                                }

                                return (
                                    <>
                                        <div className="absolute bg-[#CBD5E1]" style={{ right: `-${halfGap}px`, width: `${halfGap}px`, height: '1px', top: '50%' }} />
                                        <div className="absolute bg-[#CBD5E1]" style={{ right: `-${halfGap}px`, width: '1px', height: `${vLen}px`, ...(isTop ? { top: '50%' } : { bottom: '50%' }) }} />
                                        {(isTop || isPairBye) && (
                                            <div className="absolute bg-[#CBD5E1]" style={{ right: `-${GAP}px`, width: `${halfGap}px`, height: '1px', top: isTop ? `calc(50% + ${vLen}px)` : `calc(50% - ${vLen}px)` }} />
                                        )}
                                    </>
                                );
                            })()}

                            {rIndex > 0 && (
                                <div className="absolute bg-[#CBD5E1]" style={{ left: `-${GAP / 2}px`, width: `${GAP / 2}px`, height: '1px', top: '50%' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

return (
    <div className="inline-flex gap-[128px] p-12 min-w-max relative z-10">
        {columns.map((col, colIdx) => (
            <div key={`col-${colIdx}`} className="flex flex-col gap-24 w-[200px]">
                {/* WB Cell */}
                <div className="relative" style={{ height: `${wbMaxHeight}px` }}>
                    {col.wbRound ? renderUnifiedRound(col.wbRound, colIdx, wbRounds, wbFirstRoundMatchCount) : null}
                </div>
                
                {/* LB Cell */}
                <div className="relative" style={{ height: `${lbMaxHeight}px` }}>
                    {col.lbRound ? renderUnifiedRound(col.lbRound, colIdx, lbRounds, lbFirstRoundMatchCount) : null}
                </div>
            </div>
        ))}

        {/* GF Cell */}
        {gfRounds.length > 0 && (
            <div className="flex flex-col gap-12 w-[200px] justify-center ml-[128px]">
                {gfRounds.map((gfRound, gfIdx) => (
                    <div key={`gf-${gfIdx}`} className="relative">
                        {renderUnifiedRound(gfRound, gfIdx, gfRounds, 1)}
                    </div>
                ))}
            </div>
        )}
    </div>
);
