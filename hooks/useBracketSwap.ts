"use client";

import { useState, useCallback } from "react";
import { tournamentAPI } from "@/lib/api";
import { toast } from "sonner";

export interface PendingSwap {
    id: string;
    team1Id: string;
    team2Id: string;
    team1Name: string;
    team2Name: string;
}

export function useBracketSwap(
    tournamentId: string,
    bracketRounds: { name: string; matches: any[] }[],
    onSaved: () => void
) {
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([]);
    const [localRounds, setLocalRounds] = useState<{ name: string; matches: any[] }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const swappedTeamIds = new Set(pendingSwaps.flatMap(s => [s.team1Id, s.team2Id]));

    const enterSwapMode = useCallback(() => {
        setIsSwapMode(true);
        setSelectedTeamId(null);
        setPendingSwaps([]);
        setLocalRounds(JSON.parse(JSON.stringify(bracketRounds)));
    }, [bracketRounds]);

    const exitSwapMode = useCallback(() => {
        setIsSwapMode(false);
        setSelectedTeamId(null);
        setPendingSwaps([]);
        setLocalRounds([]);
    }, []);

    const findTeamName = useCallback((rounds: any[], teamId: string): string => {
        for (const round of rounds) {
            for (const m of round.matches) {
                const hId = m.homeTeam?._id || m.homeTeam?.id;
                const aId = m.awayTeam?._id || m.awayTeam?.id;
                if (hId === teamId) return m.homeTeam?.player1 || m.homeTeam?.name || '?';
                if (aId === teamId) return m.awayTeam?.player1 || m.awayTeam?.name || '?';
            }
        }
        return '?';
    }, []);

    const applySwapLocally = useCallback((team1Id: string, team2Id: string) => {
        setLocalRounds(prev => {
            const next = JSON.parse(JSON.stringify(prev));

            // Step 1: Find and swap the two teams across ALL rounds
            let t1Match: any = null, t1Side = '';
            let t2Match: any = null, t2Side = '';

            for (const round of next) {
                for (const m of round.matches) {
                    const hId = m.homeTeam?._id || m.homeTeam?.id;
                    const aId = m.awayTeam?._id || m.awayTeam?.id;
                    if (hId === team1Id) { t1Match = m; t1Side = 'home'; }
                    if (aId === team1Id) { t1Match = m; t1Side = 'away'; }
                    if (hId === team2Id) { t2Match = m; t2Side = 'home'; }
                    if (aId === team2Id) { t2Match = m; t2Side = 'away'; }
                }
            }

            if (t1Match && t2Match) {
                const t1Data = t1Side === 'home' ? t1Match.homeTeam : t1Match.awayTeam;
                const t2Data = t2Side === 'home' ? t2Match.homeTeam : t2Match.awayTeam;
                if (t1Side === 'home') t1Match.homeTeam = t2Data; else t1Match.awayTeam = t2Data;
                if (t2Side === 'home') t2Match.homeTeam = t1Data; else t2Match.awayTeam = t1Data;
            }

            // Step 2: Re-evaluate all matches per round
            next.forEach((round: any, roundIndex: number) => {
                for (const m of round.matches) {
                    if (m.status === 'completed') continue;

                    const hasHome = !!(m.homeTeam);
                    const hasAway = !!(m.awayTeam);

                    if (roundIndex === 0) {
                        // Round 1: can be walkover
                        if (hasHome && hasAway) {
                            if (m.status === 'walkover' || m.status === 'bye') {
                                m.status = 'scheduled';
                                m.winner = null;
                            }
                        } else if (hasHome || hasAway) {
                            // Normalize: remaining team always in homeTeam
                            if (!hasHome && hasAway) {
                                m.homeTeam = m.awayTeam;
                                m.awayTeam = null;
                            }
                            m.status = 'walkover';
                            m.winner = m.homeTeam?._id || m.homeTeam?.id;
                        } else {
                            m.status = 'bye';
                            m.winner = null;
                        }
                    } else {
                        // Round 2+: NEVER walkover from swap — keep as scheduled
                        if (m.status === 'walkover' || m.status === 'bye') {
                            m.status = 'scheduled';
                            m.winner = null;
                        }
                    }
                }
            });

            return next;
        });
    }, []);

    const handleTeamSelect = useCallback((teamId: string, teamName: string) => {
        if (!selectedTeamId) {
            setSelectedTeamId(teamId);
            toast.info(`Đã chọn "${teamName}" — bấm đội thứ 2 để đổi`);
            return;
        }
        if (selectedTeamId === teamId) {
            setSelectedTeamId(null);
            return;
        }

        const team1Name = findTeamName(localRounds, selectedTeamId);
        applySwapLocally(selectedTeamId, teamId);
        setPendingSwaps(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            team1Id: selectedTeamId,
            team2Id: teamId,
            team1Name,
            team2Name: teamName,
        }]);
        setSelectedTeamId(null);
        toast.success(`Đã đổi "${team1Name}" ↔ "${teamName}" (chưa lưu)`);
    }, [selectedTeamId, localRounds, findTeamName, applySwapLocally]);

    const undoLastSwap = useCallback(() => {
        if (pendingSwaps.length === 0) return;
        const last = pendingSwaps[pendingSwaps.length - 1];
        applySwapLocally(last.team1Id, last.team2Id);
        setPendingSwaps(prev => prev.slice(0, -1));
        toast.info("Đã hoàn tác");
    }, [pendingSwaps, applySwapLocally]);

    const handleBatchSave = useCallback(async () => {
        if (pendingSwaps.length === 0) return;
        setIsSaving(true);
        try {
            for (const swap of pendingSwaps) {
                const res = await tournamentAPI.swapBracketPositions(tournamentId, swap.team1Id, swap.team2Id);
                if (!res.success) {
                    toast.error(`Lỗi swap: ${res.message}`);
                    setIsSaving(false);
                    return;
                }
            }
            toast.success(`✅ Đã lưu ${pendingSwaps.length} thay đổi!`);
            exitSwapMode();
            onSaved();
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra khi lưu");
        } finally {
            setIsSaving(false);
        }
    }, [pendingSwaps, tournamentId, exitSwapMode, onSaved]);

    const displayRounds = isSwapMode ? localRounds : bracketRounds;

    return {
        isSwapMode,
        selectedTeamId,
        pendingSwaps,
        swappedTeamIds,
        isSaving,
        displayRounds,
        enterSwapMode,
        exitSwapMode,
        handleTeamSelect,
        undoLastSwap,
        handleBatchSave,
    };
}
