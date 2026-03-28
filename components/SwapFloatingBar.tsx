"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, X, RotateCcw, Save, Loader2 } from "lucide-react";
import type { PendingSwap } from "@/hooks/useBracketSwap";

interface SwapFloatingBarProps {
    isSwapMode: boolean;
    selectedTeamId: string | null;
    pendingSwaps: PendingSwap[];
    isSaving: boolean;
    onUndo: () => void;
    onCancel: () => void;
    onSave: () => void;
}

export default function SwapFloatingBar({
    isSwapMode,
    selectedTeamId,
    pendingSwaps,
    isSaving,
    onUndo,
    onCancel,
    onSave,
}: SwapFloatingBarProps) {
    return (
        <AnimatePresence>
            {isSwapMode && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 sm:px-4 sm:pb-5 pointer-events-none"
                >
                    <div className="max-w-xl mx-auto pointer-events-auto">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-2xl shadow-black/10 p-3 sm:p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${pendingSwaps.length > 0 ? 'bg-amber-100 text-amber-600' : selectedTeamId ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                        <Shuffle className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900 truncate">
                                            {pendingSwaps.length > 0
                                                ? `${pendingSwaps.length} thay đổi chưa lưu`
                                                : selectedTeamId
                                                    ? '👆 Chọn đội thứ 2'
                                                    : '👆 Bấm vào đội Vòng 1'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate">
                                            {selectedTeamId ? 'Bấm đội khác để đổi · Bấm lại để bỏ chọn' : 'Bấm 2 đội để đổi vị trí · Lưu khi xong'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Swap pills */}
                            {pendingSwaps.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-[52px] overflow-y-auto custom-scrollbar">
                                    {pendingSwaps.map((swap) => (
                                        <span
                                            key={swap.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700"
                                        >
                                            <span className="truncate max-w-[56px]">{swap.team1Name}</span>
                                            <span className="text-amber-400">↔</span>
                                            <span className="truncate max-w-[56px]">{swap.team2Name}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onUndo}
                                    disabled={pendingSwaps.length === 0}
                                    className="flex-1 h-9 sm:h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold text-[11px] sm:text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Hoàn tác
                                </button>
                                <button
                                    onClick={onCancel}
                                    disabled={isSaving}
                                    className="flex-1 h-9 sm:h-10 rounded-xl bg-gray-100 text-red-500 hover:bg-red-50 font-semibold text-[11px] sm:text-xs transition-colors disabled:opacity-30 flex items-center justify-center gap-1"
                                >
                                    <X className="w-3.5 h-3.5" /> Huỷ
                                </button>
                                <button
                                    onClick={onSave}
                                    disabled={pendingSwaps.length === 0 || isSaving}
                                    className="flex-[1.5] h-9 sm:h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-blue-200"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
