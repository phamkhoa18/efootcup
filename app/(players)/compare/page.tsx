import Link from "next/link";
import Image from "next/image";
import Player from "@/models/players/Player";
import { connectPlayerDb } from "@/lib/player-db";
import { AlertCircle, ArrowLeft, ArrowLeftRight, ChevronDown, Activity, Dumbbell, ShieldHalf, Target } from "lucide-react";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>
}) {
    await connectPlayerDb();
    const resolvedParams = await Promise.resolve(searchParams);
    
    // Tìm lấy 2 cầu thủ theo p1, p2. Nếu không có lấy 2 cầu thủ rank cao nhất làm mẫu.
    let p1Id = resolvedParams?.p1 as string;
    let p2Id = resolvedParams?.p2 as string;

    const topPlayers = await Player.find().sort({ "overall.max": -1 }).limit(2).lean();
    
    let player1 = await Player.findOne({ $or: [{ efhubId: p1Id }, { _id: p1Id?.length === 24 ? p1Id : undefined }] }).lean() || topPlayers[0];
    let player2 = await Player.findOne({ $or: [{ efhubId: p2Id }, { _id: p2Id?.length === 24 ? p2Id : undefined }] }).lean() || topPlayers[1];

    if (!player1 || !player2) {
        return (
            <div className="flex-grow flex items-center justify-center min-h-[50vh]">
                <div className="text-center text-slate-500">
                     <AlertCircle className="w-12 h-12 mb-4 mx-auto block" />
                     <p>Cần ít nhất 2 cầu thủ trong Database để tải trang so sánh.</p>
                </div>
            </div>
        );
    }

    const p1Stats = player1.stats?.maxLevel || player1.stats?.level1 || {};
    const p2Stats = player2.stats?.maxLevel || player2.stats?.level1 || {};

    const p1Ovr = player1.overall?.max || player1.overall?.base || 0;
    const p2Ovr = player2.overall?.max || player2.overall?.base || 0;

    const statsCategories = [
        {
            title: "Tấn công & Kỹ thuật",
            icon: <Target className="w-5 h-5 text-emerald-500" />,
            stats: [
                { label: 'Dứt điểm (Finishing)', key: 'finishing' },
                { label: 'Rê bóng (Dribbling)', key: 'dribbling' },
                { label: 'Chuyền ngắn (Low Pass)', key: 'lowPass' },
                { label: 'Tốc độ (Speed)', key: 'speed' },
                { label: 'Nhận thức tấn công', key: 'offensiveAwareness' }
            ]
        },
        {
            title: "Thể lực & Thể hình",
            icon: <Dumbbell className="w-5 h-5 text-emerald-500" />,
            stats: [
                { label: 'Sức bền (Stamina)', key: 'stamina' },
                { label: 'Tì đè (Physical)', key: 'physicalContact' },
                { label: 'Tăng tốc (Acceleration)', key: 'acceleration' },
                { label: 'Lực sút (Kicking Power)', key: 'kickingPower' }
            ]
        },
        {
            title: "Phòng ngự",
            icon: <ShieldHalf className="w-5 h-5 text-emerald-500" />,
            stats: [
                { label: 'Vào bóng (Tackling)', key: 'tackling' },
                { label: 'Cắt bóng (Interception)', key: 'interception' },
                { label: 'Nhận thức phòng thủ', key: 'defensiveAwareness' },
                { label: 'Quyết liệt (Aggression)', key: 'aggression' }
            ]
        }
    ];

    const p1Img = player1.images?.portrait || player1.images?.card || player1.images?.thumbnail || '';
    const p2Img = player2.images?.portrait || player2.images?.card || player2.images?.thumbnail || '';

    const p1AvgStr = (Object.values(p1Stats).filter(v => typeof v === 'number').reduce((a: any,b: any)=>a+b,0) / Object.keys(p1Stats).length || 0).toFixed(1);
    const p2AvgStr = (Object.values(p2Stats).filter(v => typeof v === 'number').reduce((a: any,b: any)=>a+b,0) / Object.keys(p2Stats).length || 0).toFixed(1);

    return (
        <div className="flex-grow bg-[#11131a] text-slate-50 min-h-screen pb-24 w-full">
            <main className="pt-8 px-4 lg:px-12 xl:px-24 space-y-6 bg-[#11131a] pb-12 w-full h-full min-h-screen">
                
                {/* Page Title */}
                <section className="flex flex-col gap-1 max-w-screen-2xl mx-auto">
                    <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">
                        <Link href="/players" className="flex items-center gap-1 hover:text-white transition-colors w-fit">
                            <ArrowLeft className="w-4 h-4" />
                            Về danh sách
                        </Link>
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tighter text-white uppercase italic">So sánh Cầu thủ</h2>
                    <p className="text-slate-400 text-sm mt-1">D-ARENA Analytics System</p>
                </section>

                <div className="max-w-screen-2xl mx-auto space-y-6">
                    {/* Player Selection Cards */}
                    <div className="grid grid-cols-2 gap-3 lg:gap-8">
                        {/* Player 1 */}
                        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group border border-white/5 lg:p-8 shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                            <div className="relative z-10 w-20 h-20 lg:w-32 lg:h-32 rounded-full border-2 border-emerald-500 overflow-hidden mb-3 bg-slate-950 flex items-center justify-center">
                                {p1Img ? <img className="w-full h-full object-cover" src={p1Img} alt={player1.name}/> : <span className="text-xs text-slate-500">NO IMG</span>}
                            </div>
                            <h3 className="relative z-10 font-bold text-center leading-tight lg:text-xl text-white uppercase truncate w-full">{player1.name}</h3>
                            <span className="relative z-10 text-[10px] lg:text-xs text-slate-400 uppercase font-bold mt-1 truncate w-full text-center">{player1.club || player1.teamId || 'N/A'}</span>
                            <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-emerald-500 text-slate-950 px-2 lg:px-3 py-0.5 lg:py-1 rounded text-[10px] lg:text-sm font-black italic">{p1Ovr}</div>
                        </div>

                        {/* Player 2 */}
                        <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group border border-white/5 lg:p-8 shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent"></div>
                            <div className="relative z-10 w-20 h-20 lg:w-32 lg:h-32 rounded-full border-2 border-amber-500 overflow-hidden mb-3 bg-slate-950 flex items-center justify-center">
                                {p2Img ? <img className="w-full h-full object-cover" src={p2Img} alt={player2.name} /> : <span className="text-xs text-slate-500">NO IMG</span>}
                            </div>
                            <h3 className="relative z-10 font-bold text-center leading-tight lg:text-xl text-white uppercase truncate w-full">{player2.name}</h3>
                            <span className="relative z-10 text-[10px] lg:text-xs text-slate-400 uppercase font-bold mt-1 truncate w-full text-center">{player2.club || player2.teamId  || 'N/A'}</span>
                            <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-amber-500 text-slate-950 px-2 lg:px-3 py-0.5 lg:py-1 rounded text-[10px] lg:text-sm font-black italic">{p2Ovr}</div>
                            <Link href="/players" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold uppercase tracking-widest text-xs z-20 hover:text-emerald-400 cursor-pointer text-white border-none">
                                <ArrowLeftRight className="mr-2 w-4 h-4" /> Đổi
                            </Link>
                        </div>
                    </div>

                    {/* Comparison Stats Table */}
                    <div className="space-y-4">
                        {statsCategories.map((cat, i) => (
                             <StatCategory key={i} title={cat.title} icon={cat.icon} stats={cat.stats.map(s => ({
                                 label: s.label,
                                 p1: p1Stats[s.key] || p1Stats[s.key.charAt(0).toUpperCase() + s.key.slice(1)] || parseInt(p1Stats[s.key]) || 0,
                                 p2: p2Stats[s.key] || p2Stats[s.key.charAt(0).toUpperCase() + s.key.slice(1)] || parseInt(p2Stats[s.key]) || 0,
                             }))} />
                        ))}
                    </div>

                    {/* Comparison Summary Bento */}
                    <div className="grid grid-cols-2 gap-3 pb-8 lg:gap-8">
                        <div className="bg-slate-900 rounded-xl p-4 lg:p-8 flex flex-col justify-center gap-1 border border-white/5 shadow-inner">
                            <span className="text-[10px] lg:text-xs text-slate-400 uppercase font-black">Chỉ số TB (P1)</span>
                            <div className="text-2xl lg:text-4xl font-black text-emerald-500">{p1AvgStr}</div>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 lg:p-8 flex flex-col justify-center gap-1 border border-white/5 shadow-inner">
                            <span className="text-[10px] lg:text-xs text-slate-400 uppercase font-black">Chỉ số TB (P2)</span>
                            <div className="text-2xl lg:text-4xl font-black text-amber-500">{p2AvgStr}</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCategory({ title, icon, stats }: { title: string, icon: React.ReactNode, stats: Array<{label: string, p1: number, p2: number}> }) {
    return (
        <div className="bg-slate-900 overflow-hidden border border-white/5 rounded-xl shadow-lg">
            <div className="px-4 py-3 lg:px-6 lg:py-4 bg-slate-950/50 flex justify-between items-center border-b border-white/5">
                <h4 className="text-sm lg:text-base font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    {icon}
                    {title}
                </h4>
                <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
            <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
                {stats.map((stat, i) => {
                    const diff = stat.p1 - stat.p2;
                    const isP1Better = diff > 0;
                    const isP2Better = diff < 0;

                    return (
                        <div key={i} className="space-y-2 lg:space-y-3">
                            <div className="flex justify-between text-xs lg:text-sm font-bold uppercase text-slate-400 tracking-wider px-1">
                                <span className={isP1Better ? "text-emerald-400" : (isP2Better ? "text-slate-500" : "text-slate-400")}>{stat.p1}</span>
                                <span className="text-[10px] sm:text-xs text-white">{stat.label}</span>
                                <span className={isP2Better ? "text-amber-400" : (isP1Better ? "text-slate-500" : "text-slate-400")}>{stat.p2}</span>
                            </div>
                            <div className="grid grid-cols-[1fr_1fr] gap-4 h-1.5 lg:h-2">
                                <div className="bg-slate-950 rounded-full overflow-hidden flex justify-end">
                                    <div 
                                        className={`h-full rounded-full transition-all ${isP1Better ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} 
                                        style={{ width: `${Math.min(stat.p1, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all ${isP2Better ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}`} 
                                        style={{ width: `${Math.min(stat.p2, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
