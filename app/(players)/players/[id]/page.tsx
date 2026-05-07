import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Zap, CheckCircle2, Star, ChevronRight } from "lucide-react";
import Player from "@/models/players/Player";
import { connectPlayerDb } from "@/lib/player-db";

export default async function PlayerDetailPage(props: {
    params: Promise<{ id: string }> | { id: string }
}) {
    const resolvedParams = await Promise.resolve(props.params);
    const { id } = resolvedParams;

    await connectPlayerDb();

    const query = id.length === 24 ? { _id: id } : { efhubId: id };
    const player = await Player.findOne(query).lean();

    if (!player) {
        notFound();
    }

    const ovr = player.overall?.max || player.overall?.base || 0;
    const cardType = player.cardType || 'Standard';
    const mainPosition = player.positions?.[0] || 'N/A';
    const imageUrl = player.images?.portrait || player.images?.card || player.images?.thumbnail || '';

    const stats = player.stats?.maxLevel || player.stats?.level1 || {};
    
    const getStatW = (val: number) => `${Math.min(100, Math.max(0, val || 0))}%`;

    const skills: string[] = player.skills || [];
    const playstyles: string[] = player.playstyles || (player.playingStyle ? [player.playingStyle] : []);
    const positionsArray: string[] = player.positions || [];
    
    const positionClass = (pos: string) => {
        if (pos === mainPosition) return "bg-efb-yellow text-efb-dark font-black shadow-lg shadow-yellow-400/30";
        if (positionsArray.includes(pos)) return "bg-efb-yellow/20 text-efb-yellow border border-efb-yellow/30 font-bold";
        return "bg-white/[0.03] text-white/20 border border-white/[0.05] opacity-50"; 
    };
    
    const condition = player.condition?.form || 'C';

    const statGroups = [
        {
            group: "Tấn công & Kỹ thuật",
            gradient: "from-blue-500 to-indigo-500",
            items: [
                { label: 'Offensive Awareness', val: stats.offensiveAwareness },
                { label: 'Ball Control', val: stats.ballControl },
                { label: 'Dribbling', val: stats.dribbling },
                { label: 'Tight Possession', val: stats.tightPossession },
                { label: 'Low Pass', val: stats.lowPass },
                { label: 'Lofted Pass', val: stats.loftedPass },
                { label: 'Finishing', val: stats.finishing },
                { label: 'Heading', val: stats.heading },
                { label: 'Set Piece Taking', val: stats.setPieceTaking },
                { label: 'Curl', val: stats.curl }
            ]
        },
        {
            group: "Phòng ngự & Thể chất",
            gradient: "from-violet-500 to-purple-500",
            items: [
                { label: 'Defensive Awareness', val: stats.defensiveAwareness },
                { label: 'Tackling', val: stats.ballWinning || stats.tackling },
                { label: 'Aggression', val: stats.aggression },
                { label: 'Speed', val: stats.speed },
                { label: 'Acceleration', val: stats.acceleration },
                { label: 'Kicking Power', val: stats.kickingPower },
                { label: 'Jump', val: stats.jump },
                { label: 'Physical Contact', val: stats.physicalContact || stats.physical },
                { label: 'Balance', val: stats.balance },
                { label: 'Stamina', val: stats.stamina }
            ]
        }
    ];

    const getStatColor = (val: number) => {
        if (val >= 95) return { text: "text-efb-yellow", bar: "bg-gradient-to-r from-yellow-400 to-amber-400 shadow-[0_0_8px_rgba(255,255,0,0.3)]" };
        if (val >= 90) return { text: "text-violet-400", bar: "bg-gradient-to-r from-violet-500 to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]" };
        if (val >= 80) return { text: "text-blue-400", bar: "bg-gradient-to-r from-blue-500 to-indigo-500" };
        return { text: "text-white/60", bar: "bg-white/30" };
    };

    return (
        <div className="pt-16 selection:bg-efb-yellow/20 selection:text-white">
            {/* Hero Section with Player */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D91] via-[#1E40AF]/80 to-[#4338CA]/60" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-yellow-300/15 via-orange-400/8 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-400/10 via-blue-500/5 to-transparent rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 pt-8 pb-0">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-white/40 mb-8">
                        <Link href="/players" className="inline-flex items-center gap-1.5 text-white/50 hover:text-efb-yellow transition-colors group">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            Cầu thủ
                        </Link>
                        <ChevronRight className="w-3 h-3 text-white/20" />
                        <span className="text-white/70 font-medium">{player.name}</span>
                    </div>

                    {/* Hero Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                        
                        {/* Player Image */}
                        <div className="lg:col-span-3 flex justify-center lg:justify-start">
                            <div className="relative w-full max-w-[260px] aspect-[3/4] flex items-center justify-center">
                                {/* OVR Badge */}
                                <div className="absolute top-0 left-0 z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-2xl ${ovr >= 95 ? 'bg-gradient-to-br from-yellow-300 to-amber-500' : ovr >= 90 ? 'bg-gradient-to-br from-violet-400 to-purple-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                        <span className={`text-xl font-black leading-none ${ovr >= 95 ? 'text-amber-900' : 'text-white'}`}>{ovr}</span>
                                        <span className={`text-[8px] font-bold uppercase ${ovr >= 95 ? 'text-amber-800' : 'text-white/70'}`}>{mainPosition}</span>
                                    </div>
                                </div>

                                {imageUrl ? (
                                    <img
                                        alt={player.name}
                                        className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                                        src={imageUrl}
                                    />
                                ) : (
                                    <div className="text-white/30 font-bold uppercase tracking-widest text-sm">NO IMAGE</div>
                                )}
                            </div>
                        </div>

                        {/* Player Info */}
                        <div className="lg:col-span-5 flex flex-col justify-center">
                            {/* Card type badge */}
                            {cardType !== 'Standard' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-efb-yellow/10 border border-efb-yellow/20 w-fit mb-4">
                                    <Star className="w-3 h-3 text-efb-yellow" />
                                    <span className="text-[11px] font-bold text-efb-yellow uppercase tracking-wider">{cardType}</span>
                                </div>
                            )}

                            <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-extralight leading-[1.1] tracking-tight text-white mb-2">
                                <span className="font-semibold">{player.name}</span>
                            </h1>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-6">
                                <div className="flex items-center gap-2">
                                    {player.metaImages?.club && <img src={player.metaImages.club} className="h-5 w-5 object-contain" alt="Club" />}
                                    <span>{player.club || player.teamId || 'Free Agent'}</span>
                                </div>
                                {player.league && (
                                    <>
                                        <span className="text-white/15">·</span>
                                        <div className="flex items-center gap-2">
                                            {player.metaImages?.league && <img src={player.metaImages.league} className="h-5 w-5 object-contain" alt="League" />}
                                            <span>{player.league}</span>
                                        </div>
                                    </>
                                )}
                                {player.nationality && (
                                    <>
                                        <span className="text-white/15">·</span>
                                        <div className="flex items-center gap-2">
                                            {player.metaImages?.nationality && <img src={player.metaImages.nationality} className="h-4 w-6 object-cover border border-white/10 rounded-sm" alt="Nationality" />}
                                            <span>{player.nationality}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: "Max Level", value: player.levels?.max || 1 },
                                    { label: "Speed", value: stats.speed || '-' },
                                    { label: "Dribbling", value: stats.dribbling || '-' },
                                    { label: "Finishing", value: stats.finishing || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-3 text-center border border-white/[0.08]">
                                        <div className="text-lg font-light text-white tracking-tight">{item.value}</div>
                                        <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold mt-0.5">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Position Map */}
                        <div className="lg:col-span-4 flex flex-col justify-center">
                            <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5">
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 block mb-4">Position Map</span>
                                
                                <div className="relative aspect-[4/3] w-full bg-[#0A3D91]/20 rounded-xl border border-white/[0.08] overflow-hidden">
                                    {/* Pitch markings */}
                                    <div className="absolute inset-4 border border-white/[0.08] rounded-sm pointer-events-none" />
                                    <div className="absolute top-1/2 left-4 right-4 h-px bg-white/[0.06] pointer-events-none" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/[0.06] rounded-full pointer-events-none" />

                                    <div className="grid grid-cols-3 grid-rows-4 h-full p-2 gap-1.5 text-[9px] uppercase text-center relative z-10 w-full mx-auto font-bold">
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('LWF')}`}>LWF</div>
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('CF')}`}>CF</div>
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('RWF')}`}>RWF</div>
                                        
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('LMF')}`}>LMF</div>
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('AMF')}`}>AMF</div>
                                        <div className={`rounded-lg flex items-center justify-center ${positionClass('RMF')}`}>RMF</div>
                                        
                                        <div className={`col-start-2 rounded-lg flex items-center justify-center ${positionClass('CMF')}`}>CMF</div>
                                        <div className={`col-start-2 rounded-lg flex items-center justify-center ${positionClass('DMF')}`}>DMF</div>
                                        
                                        <div className={`col-start-1 row-start-4 rounded-lg flex items-center justify-center ${positionClass('LB')}`}>LB</div>
                                        <div className={`col-start-2 row-start-4 rounded-lg flex items-center justify-center ${positionClass('CB')}`}>CB</div>
                                        <div className={`col-start-3 row-start-4 rounded-lg flex items-center justify-center ${positionClass('RB')}`}>RB</div>
                                    </div>
                                </div>

                                {/* Condition */}
                                <div className="mt-4">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 block mb-2">Condition</span>
                                    <div className="flex gap-1.5">
                                        {['A', 'B', 'C', 'D', 'E'].map(c => (
                                            <span key={c} className={`w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${condition.toUpperCase() === c ? 'bg-efb-yellow text-efb-dark shadow-lg shadow-yellow-400/20' : 'bg-white/[0.05] text-white/20 border border-white/[0.06]'}`}>{c}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave divider */}
                <div className="relative z-10 mt-8">
                    <svg viewBox="0 0 1440 50" fill="none" className="w-full block">
                        <path d="M0 50H1440V15C1440 15 1200 50 720 50C240 50 0 15 0 15V50Z" fill="#0A1628" />
                    </svg>
                </div>
            </section>

            {/* Stats Content */}
            <section className="relative -mt-1 pb-20">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        
                        {/* Stats Tables */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-5 bg-gradient-to-b from-efb-yellow to-efb-yellow/40 rounded-full" />
                                        <h3 className="text-base font-semibold text-white">Chỉ số chi tiết</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-efb-yellow animate-pulse" />
                                        <span className="text-[10px] text-efb-yellow font-bold uppercase tracking-widest">Max Level</span>
                                    </div>
                                </div>
                                
                                <div className="p-5 lg:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                    {statGroups.map((group, i) => (
                                        <div key={i} className="space-y-3.5">
                                            <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5">
                                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${group.gradient} flex items-center justify-center`}>
                                                    <Zap className="w-3 h-3 text-white" />
                                                </div>
                                                <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{group.group}</h4>
                                            </div>
                                            <div className="space-y-2.5">
                                                {group.items.map((stat, j) => {
                                                    const val = stat.val || 0;
                                                    const colors = getStatColor(val);
                                                    
                                                    return (
                                                        <div key={j}>
                                                            <div className="flex justify-between text-[11px] font-medium mb-1">
                                                                <span className="text-white/40">{stat.label}</span>
                                                                <span className={`font-bold ${colors.text}`}>{val || '-'}</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`} style={{ width: getStatW(val) }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Skills & Playstyles Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Playstyles */}
                            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Phong cách chơi</h3>
                                </div>
                                <div className="p-4 space-y-2">
                                    {playstyles.length > 0 ? playstyles.map((style, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-efb-yellow/30 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-semibold text-white capitalize">{style}</span>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-white/25 italic p-2">Không xác định</div>
                                    )}
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                                <div className="p-4 border-b border-white/[0.06] flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full" />
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Kỹ năng</h3>
                                    </div>
                                    <span className="bg-white/[0.06] text-white/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{skills.length}</span>
                                </div>
                                <div className="p-4">
                                    {skills.length > 0 ? (
                                        <ul className="grid grid-cols-1 gap-1.5">
                                            {skills.map((skill, i) => (
                                                <li key={i} className="flex items-center gap-2.5 text-sm text-white/60 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-efb-yellow/20 hover:bg-white/[0.04] transition-all">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-efb-yellow/60 shrink-0" />
                                                    <span className="font-medium capitalize">{skill}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-sm text-white/25 italic p-2">Chưa có kỹ năng đặc biệt.</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
