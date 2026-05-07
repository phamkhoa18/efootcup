"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Search, SearchX, Users, BarChart3, Trophy, User, Loader2 } from 'lucide-react';
import { fetchPlayersAction } from '../../actions/getPlayers';

const FORMATIONS: Record<string, { i: number; p: string; top: number; left: number }[]> = {
    '4-3-3': [
        { i: 0, p: 'LWF', top: 12, left: 20 },
        { i: 1, p: 'CF', top: 10, left: 50 },
        { i: 2, p: 'RWF', top: 12, left: 80 },
        { i: 3, p: 'CMF', top: 40, left: 25 },
        { i: 4, p: 'DMF', top: 45, left: 50 },
        { i: 5, p: 'CMF', top: 40, left: 75 },
        { i: 6, p: 'LB', top: 75, left: 15 },
        { i: 7, p: 'CB', top: 80, left: 38 },
        { i: 8, p: 'CB', top: 80, left: 62 },
        { i: 9, p: 'RB', top: 75, left: 85 },
        { i: 10, p: 'GK', top: 92, left: 50 }
    ],
    '4-2-1-3': [
        { i: 0, p: 'LWF', top: 12, left: 20 },
        { i: 1, p: 'CF', top: 10, left: 50 },
        { i: 2, p: 'RWF', top: 12, left: 80 },
        { i: 3, p: 'AMF', top: 32, left: 50 },
        { i: 4, p: 'DMF', top: 52, left: 35 },
        { i: 5, p: 'DMF', top: 52, left: 65 },
        { i: 6, p: 'LB', top: 75, left: 15 },
        { i: 7, p: 'CB', top: 80, left: 38 },
        { i: 8, p: 'CB', top: 80, left: 62 },
        { i: 9, p: 'RB', top: 75, left: 85 },
        { i: 10, p: 'GK', top: 92, left: 50 }
    ],
    '4-4-2': [
        { i: 0, p: 'CF', top: 12, left: 35 },
        { i: 1, p: 'CF', top: 12, left: 65 },
        { i: 2, p: 'LMF', top: 42, left: 15 },
        { i: 3, p: 'CMF', top: 45, left: 38 },
        { i: 4, p: 'CMF', top: 45, left: 62 },
        { i: 5, p: 'RMF', top: 42, left: 85 },
        { i: 6, p: 'LB', top: 75, left: 15 },
        { i: 7, p: 'CB', top: 80, left: 38 },
        { i: 8, p: 'CB', top: 80, left: 62 },
        { i: 9, p: 'RB', top: 75, left: 85 },
        { i: 10, p: 'GK', top: 92, left: 50 }
    ],
    '3-4-3': [
        { i: 0, p: 'LWF', top: 12, left: 20 },
        { i: 1, p: 'CF', top: 10, left: 50 },
        { i: 2, p: 'RWF', top: 12, left: 80 },
        { i: 3, p: 'LMF', top: 42, left: 15 },
        { i: 4, p: 'CMF', top: 45, left: 38 },
        { i: 5, p: 'CMF', top: 45, left: 62 },
        { i: 6, p: 'RMF', top: 42, left: 85 },
        { i: 7, p: 'CB', top: 80, left: 25 },
        { i: 8, p: 'CB', top: 82, left: 50 },
        { i: 9, p: 'CB', top: 80, left: 75 },
        { i: 10, p: 'GK', top: 92, left: 50 }
    ]
};

export default function SquadBuilderClient({ initialPlayers }: { initialPlayers: any[] }) {
    const [formation, setFormation] = useState<string>('4-2-1-3');
    const [squad, setSquad] = useState<Record<number, any>>({});
    const [selectedSlot, setSelectedSlot] = useState<{ id: number, targetPos: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Server Action Infinite Scroll State
    const [players, setPlayers] = useState<any[]>(initialPlayers);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const layout = FORMATIONS[formation];
    const observer = useRef<IntersectionObserver | null>(null);

    const currentPts = useMemo(() => {
        let total = 0;
        for (let i = 0; i < 11; i++) {
            const p = squad[i];
            if (p) total += (p.overall?.max || p.overall?.base || 0);
        }
        return total;
    }, [squad]);

    const activePlayersCount = useMemo(() => {
        let count = 0;
        for (let i = 0; i < 11; i++) if (squad[i]) count++;
        return count;
    }, [squad]);

    const teamRating = activePlayersCount > 0 ? Math.round(currentPts / activePlayersCount) : 0;

    // Reset list when searching
    useEffect(() => {
        if (selectedSlot !== null) {
            setPage(1);
            setHasMore(true);
            setLoading(true);
            const debounce = setTimeout(() => {
                fetchPlayersAction(searchTerm, 1).then(res => {
                    setPlayers(res);
                    setLoading(false);
                    if (res.length < 30) setHasMore(false);
                });
            }, 300);
            return () => clearTimeout(debounce);
        }
    }, [searchTerm, selectedSlot]);

    // Infinite scroll observer callback
    const lastPlayerElementRef = useCallback((node: any) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Load more when page increments
    useEffect(() => {
        if (page > 1) {
            setLoading(true);
            fetchPlayersAction(searchTerm, page).then(res => {
                setPlayers(prev => [...prev, ...res]);
                setLoading(false);
                if (res.length < 30) setHasMore(false);
            });
        }
    }, [page]);

    const handleSlotClick = (slotId: number, pos: string) => {
        setSelectedSlot({ id: slotId, targetPos: pos });
        setSearchTerm(''); // This triggers the modal to load default page 1
    };

    const handlePlayerSelect = (player: any) => {
        if (selectedSlot !== null) {
            setSquad(prev => ({ ...prev, [selectedSlot.id]: player }));
            setSelectedSlot(null);
        }
    };

    const handleRemovePlayer = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setSquad(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const handleClearSquad = () => {
        if (confirm("Bạn có chắc chắn muốn xóa toàn bộ đội hình?")) {
            setSquad({});
        }
    };

    return (
        <div className="flex-grow flex flex-col w-full min-h-screen text-slate-50 bg-[#11131a] pb-12 font-sans relative">
            
            {/* Minimal Modern Header */}
            <header className="px-4 md:px-6 py-4 md:py-6 border-b border-white/5 bg-[#11131a]/80 backdrop-blur-xl z-30">
                <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Trophy className="w-6 h-6 text-slate-950" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white italic leading-tight uppercase tracking-tight">Dream Squad</h1>
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">eFootball Tactical Board</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-white/5 shrink-0 flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">OVR</span>
                            <span className="text-xl md:text-2xl font-black text-emerald-400">{teamRating}</span>
                        </div>
                        <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-white/5 shrink-0 flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Team PTS</span>
                            <span className="text-xl md:text-2xl font-black text-white">{currentPts}</span>
                        </div>
                        <div className="bg-slate-900/80 px-2 py-2 rounded-lg border border-white/5 shrink-0">
                            <select 
                                value={formation}
                                onChange={(e) => setFormation(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 outline-none cursor-pointer pr-4"
                            >
                                {Object.keys(FORMATIONS).map(f => <option key={f} value={f} className="bg-slate-900 drop-shadow">{f}</option>)}
                            </select>
                        </div>
                        <button onClick={handleClearSquad} className="bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors px-3 py-2.5 rounded-lg border border-white/5 shrink-0">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-grow max-w-[1400px] mx-auto w-full flex flex-col xl:flex-row gap-6 p-4 md:p-6 lg:p-8 relative">
                
                {/* Tactical Pitch Area */}
                <div className="flex-grow xl:w-2/3 flex justify-center relative">
                    <div className="relative w-full max-w-[800px] aspect-[4/5] sm:aspect-[4/5] md:aspect-[3/4] lg:aspect-[16/11] xl:aspect-[3/4] max-h-[85vh] bg-[#0c1c14] rounded-xl overflow-hidden shadow-2xl border border-emerald-900/30">
                        {/* Beautiful Field Pattern */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <div className="absolute inset-0 flex flex-col">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-emerald-900/10' : 'bg-transparent'}`}></div>
                            ))}
                        </div>
                        
                        {/* Pitch Lines (Glowing White/Emerald) */}
                        <div className="absolute inset-4 border max-w-full max-h-full border-white/20 rounded pointer-events-none"></div>
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20 pointer-events-none -translate-x-1/2"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] aspect-square border border-white/20 rounded-full pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1%] aspect-square bg-white border border-white rounded-full pointer-events-none"></div>
                        
                        {/* Penalty Boxes */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[45%] h-[15%] border border-white/20 border-t-0 pointer-events-none flex justify-center">
                            <div className="absolute bottom-0 translate-y-1/2 w-[35%] aspect-[2/1] border border-white/20 rounded-b-full border-t-0 opacity-80"></div>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[45%] h-[15%] border border-white/20 border-b-0 pointer-events-none flex justify-center">
                            <div className="absolute top-0 -translate-y-1/2 w-[35%] aspect-[2/1] border border-white/20 rounded-t-full border-b-0 opacity-80"></div>
                        </div>

                        {/* Rendering Cards with Framer Motion layout animations */}
                        <div className="absolute inset-0 sm:p-4 z-10 hidden sm:block">
                            {/* Render desktop positions */}
                            {layout.map((slot) => (
                                <PlayerNode 
                                    key={`desktop-${slot.i}`}
                                    slot={slot} 
                                    player={squad[slot.i]} 
                                    onClick={() => handleSlotClick(slot.i, slot.p)}
                                    onRemove={(e) => handleRemovePlayer(e, slot.i)}
                                />
                            ))}
                        </div>

                        {/* Mobile Override: We rely on absolute but smaller sizes. The same map works due to percentages. */}
                        <div className="absolute inset-0 z-10 sm:hidden">
                            {layout.map((slot) => (
                                <PlayerNode 
                                    key={`mobile-${slot.i}`}
                                    slot={slot} 
                                    player={squad[slot.i]} 
                                    onClick={() => handleSlotClick(slot.i, slot.p)}
                                    onRemove={(e) => handleRemovePlayer(e, slot.i)}
                                    isMobile
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sub & Overview Panel */}
                <aside className="w-full xl:w-80 flex flex-col gap-6 shrink-0 z-20">
                    <div className="bg-slate-900/60 rounded-xl border border-white/5 p-5 backdrop-blur-md">
                        <h3 className="font-black text-white uppercase tracking-widest text-sm mb-4 border-b border-white/10 pb-3 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" />
                            Dự Bị (Substitutes)
                        </h3>
                        {/* Sub Slots 11 - 17 */}
                        <div className="grid grid-cols-4 xl:grid-cols-2 gap-3">
                            {Array.from({ length: 7 }).map((_, idx) => {
                                const slotId = 11 + idx;
                                const p = squad[slotId];
                                return (
                                    <div key={slotId} onClick={() => handleSlotClick(slotId, 'SUB')} className="aspect-[3/4] bg-slate-950 border border-white/10 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors flex flex-col items-center justify-center relative group overflow-hidden">
                                        {p ? (
                                            <>
                                                <img src={p.images?.portrait || p.images?.card} className="w-[80%] h-[70%] object-contain mt-2" alt={p.name} />
                                                <div className="absolute top-1 left-1 bg-emerald-500 text-slate-950 text-[8px] font-black px-1 rounded-sm">{p.overall?.max || p.overall?.base}</div>
                                                <div className="w-full text-center bg-black/80 mt-auto py-1 text-[8px] font-bold text-white truncate px-1">{p.name}</div>
                                                <button onClick={(e) => handleRemovePlayer(e, slotId)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <Plus className="w-6 h-6 text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Insights Block */}
                    <div className="bg-gradient-to-br from-slate-900 to-[#11131a] rounded-xl border border-white/5 p-5 shadow-2xl relative overflow-hidden flex-1">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <BarChart3 className="w-32 h-32" />
                        </div>
                        <h3 className="font-black text-white uppercase tracking-widest text-sm mb-4 border-b border-white/10 pb-3">Phân tích</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-wide">Cầu thủ</span>
                                <span className="text-white font-mono">{activePlayersCount}/18</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-wide">Giá trị đội (GPS)</span>
                                <span className="text-emerald-400 font-mono font-bold">2.4M</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Smart Search Modal (Framer Motion) */}
            <AnimatePresence>
                {selectedSlot !== null && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#1a1d27] border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-white/5 bg-[#11131a] flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-black text-sm border border-emerald-500/30">
                                        {selectedSlot.targetPos}
                                    </div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Từ điển cầu thủ</h2>
                                </div>
                                <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Search */}
                            <div className="p-4 sm:p-6 bg-[#1a1d27] shrink-0 border-b border-white/5">
                                <div className="relative">
                                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        autoFocus
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-[#11131a] border border-white/10 focus:border-emerald-500 rounded-xl pl-12 pr-4 text-base focus:ring-1 focus:ring-emerald-500 text-white py-4 outline-none transition-all shadow-inner" 
                                        placeholder="Nhập tên cầu thủ để tìm kiếm (Vd: Messi, Mbappe...)" 
                                        type="text" 
                                    />
                                </div>
                            </div>

                            {/* Modal List with Infinite Scroll */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#11131a]/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {players.map((p, i) => {
                                        const imgUrl = p.images?.portrait || p.images?.card || p.images?.thumbnail || '';
                                        const ovr = p.overall?.max || p.overall?.base || 0;
                                        
                                        // Ref attached to the last element
                                        const isLast = i === players.length - 1;

                                        return (
                                            <div 
                                                ref={isLast ? lastPlayerElementRef : null}
                                                key={`${p._id}-${i}`}
                                                onClick={() => handlePlayerSelect(p)}
                                                className="flex items-center gap-3 bg-[#1a1d27] border border-white/5 hover:border-emerald-500/50 hover:bg-slate-800 p-3 rounded-xl cursor-pointer group transition-all relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                
                                                {/* Meta Pic */}
                                                <div className="w-12 h-12 bg-slate-950/50 rounded-lg overflow-hidden border border-white/5 shrink-0 relative flex items-center justify-center">
                                                    {imgUrl ? (
                                                        <img src={imgUrl} className="w-[90%] h-[90%] object-contain scale-100 group-hover:scale-110 transition-transform duration-300" alt="Player"/>
                                                    ) : (
                                                        <User className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0 z-10">
                                                    <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 truncate">{p.positions?.[0] || 'N/A'} • {p.club || p.teamId || 'N/A'}</div>
                                                </div>
                                                {/* Rating */}
                                                <div className="shrink-0 flex flex-col items-end gap-1 pl-2 z-10">
                                                    <span className={`text-base font-black italic leading-none ${ovr >= 95 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-slate-300'}`}>{ovr}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {loading && (
                                    <div className="flex justify-center items-center py-8">
                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                    </div>
                                )}
                                
                                {!loading && players.length === 0 && (
                                    <div className="py-16 text-center text-slate-500 font-bold uppercase tracking-widest text-sm flex flex-col items-center gap-3">
                                        <SearchX className="w-10 h-10 text-slate-700" />
                                        Không tìm thấy cầu thủ "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Small Component for the Card on the pitch
function PlayerNode({ slot, player, onClick, onRemove, isMobile = false }: { slot: any, player: any, onClick: () => void, onRemove: (e: any) => void, isMobile?: boolean }) {
    
    // Dynamic styles to position the card absolutely based on standard Top / Left.
    const transformStyles = {
        top: `${slot.top}%`,
        left: `${slot.left}%`,
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute -translate-x-1/2 -translate-y-[60%] flex flex-col items-center group z-10"
            style={transformStyles}
        >
            {player ? (
                 <div 
                    onClick={onClick}
                    className="relative cursor-pointer hover:scale-110 transition-transform z-10 shadow-2xl"
                >
                    <div className={`
                         bg-gradient-to-b from-slate-800 to-[#11131a] border border-white/20 rounded-md overflow-hidden relative flex items-center justify-center
                         ${isMobile ? 'w-12 h-16' : 'w-[4.5rem] h-[6rem] sm:w-[5.5rem] sm:h-[7.5rem]'}
                    `}>
                        <div className={`absolute top-0.5 left-0.5 z-10 px-1 rounded-sm font-black italic shadow-black drop-shadow-md leading-none ${isMobile ? 'text-[9px]' : 'text-[11px] sm:text-xs'} ${player.overall?.max >= 95 ? 'bg-emerald-500 text-slate-950' : 'bg-[#11131a] text-white'}`}>
                            {player.overall?.max || player.overall?.base || 0}
                        </div>
                        
                        {(player.images?.portrait || player.images?.card) ? (
                            <img src={player.images?.portrait || player.images?.card} className="w-[85%] h-[85%] object-contain filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]" alt={player.name} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                <User className="w-4 h-4 sm:w-6 sm:h-6" />
                            </div>
                        )}
                        
                        {/* Name Bar */}
                        <div className="absolute bottom-0 left-0 w-full bg-black/80 py-0.5 px-0.5 text-center shrink-0">
                            <div className={`font-bold text-white uppercase truncate ${isMobile ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'}`}>
                                {player.name}
                            </div>
                        </div>
                    </div>
                    
                    {/* Position Label attached to the card */}
                    <div className={`absolute -bottom-2 -translate-x-1/2 left-1/2 bg-emerald-500 text-slate-950 rounded-sm font-black uppercase shadow-md border border-[#11131a] z-20 ${isMobile ? 'text-[7px] px-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                        {slot.p}
                    </div>

                    <button 
                        onClick={onRemove} 
                         className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg border border-[#11131a] z-30 hover:bg-red-400 w-4 h-4 sm:w-5 sm:h-5 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div 
                    onClick={onClick}
                    className={`
                        border-2 border-dashed border-white/20 hover:border-emerald-500/60 bg-black/30 hover:bg-emerald-500/10 backdrop-blur-sm rounded-md flex items-center justify-center cursor-pointer transition-colors shadow-inner relative
                        ${isMobile ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16'}
                    `}
                >
                    <Plus className="w-5 h-5 sm:w-8 sm:h-8 text-white/50 group-hover:text-emerald-400 transition-colors" />
                    <div className={`absolute -bottom-2 -translate-x-1/2 left-1/2 bg-slate-800 text-slate-300 rounded-sm font-black uppercase shadow-md border border-[#11131a] ${isMobile ? 'text-[7px] px-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                        {slot.p}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
