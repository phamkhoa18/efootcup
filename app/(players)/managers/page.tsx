import Link from "next/link";
import { connectPlayerDb } from "@/lib/player-db";
import mongoose from "mongoose";
import { ArrowLeft, ArrowDownUp, LayoutGrid, ChevronRight, Users, Zap, Triangle, Shield, Expand, HelpCircle } from "lucide-react";

// Create or use the Manager model specifically for the player DB
const ManagerSchema = new mongoose.Schema({}, { strict: false });

export default async function ManagersPage() {
    // Wait for connection
    await connectPlayerDb();
    
    // Check if the model is already compiled to avoid OverwriteModelError
    const Manager = mongoose.connections.find(c => c.name === 'efootball_vn')!.models.Manager || 
                    mongoose.connections.find(c => c.name === 'efootball_vn')!.model('Manager', ManagerSchema, 'managers');

    // Fetch managers
    const managers = await Manager.find({}).lean();

    const getBestStyle = (styleLevel: any) => {
        if (!styleLevel) return { name: 'Unknown', val: 0, icon: <HelpCircle className="w-4 h-4" />, color: 'text-slate-400' };
        
        let best = { style: 'pos', val: styleLevel.pos || 0 };
        if ((styleLevel.qc || 0) > best.val) best = { style: 'qc', val: styleLevel.qc };
        if ((styleLevel.lbc || 0) > best.val) best = { style: 'lbc', val: styleLevel.lbc };
        if ((styleLevel.ow || 0) > best.val) best = { style: 'ow', val: styleLevel.ow };
        
        switch (best.style) {
            case 'qc': return { name: 'Quick Counter', val: best.val, icon: <Zap className="w-4 h-4" />, color: 'text-blue-400' };
            case 'pos': return { name: 'Possession', val: best.val, icon: <Triangle className="w-4 h-4" />, color: 'text-emerald-400' };
            case 'lbc': return { name: 'L. Ball Counter', val: best.val, icon: <Shield className="w-4 h-4" />, color: 'text-orange-400' };
            case 'ow': return { name: 'Out Wide', val: best.val, icon: <Expand className="w-4 h-4" />, color: 'text-purple-400' };
            default: return { name: 'Unknown', val: best.val, icon: <HelpCircle className="w-4 h-4" />, color: 'text-slate-400' };
        }
    };

    return (
        <section className="flex-1 w-full bg-[#11131a] min-h-screen text-slate-200 uppercase:selection:bg-emerald-500/30">
            <div className="p-6 md:p-10 max-w-screen-2xl mx-auto">
                {/* Hero Title */}
                <div className="mb-12">
                    <Link href="/players" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5 mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Trang cầu thủ</span>
                    </Link>
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-4 italic uppercase">Danh sách HLV</h1>
                    <p className="text-slate-400 font-medium tracking-tight text-base max-w-3xl leading-relaxed">
                        Khám phá cơ sở dữ liệu chiến thuật hàng đầu thế giới. Lọc theo đội hình ưa thích và phong cách chơi để tìm người dẫn dắt hoàn hảo cho đội bóng của bạn.
                    </p>
                </div>

                {/* Bento Filter Section */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                    <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-white/5 p-6 rounded-lg shadow-xl">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tên HLV</label>
                        <div className="relative group">
                            <input className="w-full bg-slate-950/50 border border-white/10 focus:border-emerald-500 focus:ring-0 rounded-lg p-4 text-white placeholder:text-slate-600 transition-all outline-none" placeholder="Tìm kiếm HLV..." type="text"/>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 p-6 rounded-lg shadow-xl">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Đội hình</label>
                        <select className="w-full bg-slate-950/50 border border-white/10 focus:border-emerald-500 focus:ring-0 rounded-lg p-4 text-white appearance-none cursor-pointer outline-none">
                            <option>Tất cả đội hình</option>
                            <option>4-3-3</option>
                            <option>4-2-3-1</option>
                            <option>4-4-2</option>
                            <option>3-2-2-3</option>
                        </select>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 p-6 rounded-lg shadow-xl">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Phong cách</label>
                        <select className="w-full bg-slate-950/50 border border-white/10 focus:border-emerald-500 focus:ring-0 rounded-lg p-4 text-white appearance-none cursor-pointer outline-none">
                            <option>Mọi phong cách</option>
                            <option>Quick Counter</option>
                            <option>Possession Game</option>
                            <option>Long Ball Counter</option>
                            <option>Out Wide</option>
                        </select>
                    </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between mb-8 px-4 border-l-4 border-emerald-500">
                    <h2 className="text-sm font-black text-emerald-400 tracking-[0.2em] uppercase">Thông tin HLV</h2>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="hidden md:inline">Xếp hạng theo: Rating cao nhất</span>
                        <ArrowDownUp className="w-4 h-4 cursor-pointer hover:text-emerald-400" />
                    </div>
                </div>

                {/* Tactical List View */}
                <div className="space-y-4">
                    {managers.length > 0 ? managers.map((manager: any, i) => {
                        const bestStyle = getBestStyle(manager.styleLevel);
                        return (
                            <div key={manager._id || i} className="group bg-slate-900/50 backdrop-blur-md hover:bg-slate-800/80 border border-white/5 transition-all duration-300 p-5 rounded-lg flex flex-col md:flex-row items-center gap-6 shadow-lg hover:shadow-emerald-500/10 cursor-pointer">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-950 border border-white/10">
                                        {manager.img ? (
                                            <img alt={manager.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src={manager.img} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold bg-slate-800">NO IMG</div>
                                        )}
                                    </div>
                                    {manager.rating && (
                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded shadow-lg">{manager.rating}</div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0 w-full text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                        <h3 className="text-2xl font-black text-white italic truncate tracking-tight uppercase">{manager.name || 'Unknown'}</h3>
                                        <span className="bg-slate-950 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase">{manager.club || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center gap-5 mt-4 md:mt-0">
                                        <div className="flex items-center gap-1.5 group/stat">
                                            <LayoutGrid className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium text-slate-300">{manager.formation || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 group/stat">
                                            <div className={`${bestStyle.color}`}>{bestStyle.icon}</div>
                                            <span className="text-sm font-medium text-slate-300">{bestStyle.name}: {bestStyle.val}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attribute Bars */}
                                {manager.styleLevel && (
                                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 justify-center">
                                        <StatBox label="POS" val={manager.styleLevel.pos} isBest={bestStyle.name === 'Possession'} />
                                        <StatBox label="QC" val={manager.styleLevel.qc} isBest={bestStyle.name === 'Quick Counter'} />
                                        <StatBox label="LBC" val={manager.styleLevel.lbc} isBest={bestStyle.name === 'L. Ball Counter'} />
                                        <StatBox label="OW" val={manager.styleLevel.ow} isBest={bestStyle.name === 'Out Wide'} />
                                    </div>
                                )}
                                
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors hidden md:block" />
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/30 border border-white/5 rounded-xl border-dashed">
                            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-slate-800/50 mb-6 shadow-inner">
                                <Users className="w-8 h-8 text-emerald-500/50" />
                            </div>
                            <h3 className="text-2xl font-black text-white italic mb-2 tracking-tight">CHƯA CÓ DỮ LIỆU HLV</h3>
                            <p className="text-slate-400 text-center max-w-md">Xin lỗi, hệ thống eFootball Database hiện đang được đồng bộ và các HLV chưa khả dụng. Hãy quay lại sau.</p>
                            <Link href="/players" className="mt-8 bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-lg hover:bg-emerald-400 transition-colors text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                Xem danh sách cầu thủ
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function StatBox({ label, val, isBest }: { label: string, val: number, isBest: boolean }) {
    if (isBest) {
        return (
            <div className="bg-slate-950 p-3 rounded-lg min-w-[85px] text-center border-b-2 border-emerald-500 shadow-inner">
                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider mb-1">{label}</div>
                <div className="text-lg font-black text-emerald-400">{val || 0}</div>
            </div>
        );
    }
    
    return (
        <div className="bg-slate-950 p-3 rounded-lg min-w-[85px] text-center border-b-2 border-white/10 shadow-inner">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</div>
            <div className="text-lg font-black text-white">{val || 0}</div>
        </div>
    );
}
