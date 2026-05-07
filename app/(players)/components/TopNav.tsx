"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, Bell } from "lucide-react";

export default function TopNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname?.startsWith(path);

    const navLinks = [
        { name: "Cầu thủ", path: "/players" },
        { name: "HLV", path: "/managers" },
        { name: "Đội hình", path: "/squad-builder" },
        { name: "So sánh", path: "/compare" },
    ];

    return (
        <nav className="bg-[#11131a]/95 backdrop-blur-md fixed top-0 w-full z-50 border-b border-white/5 shadow-2xl shadow-emerald-900/10">
            <div className="flex justify-between items-center h-16 px-6 max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-12">
                    <Link href="/" className="text-2xl font-black tracking-tighter text-white italic flex items-center gap-2">
                        <img src="https://vn.fifaaddict.com/images/favicon.png" className="w-6 h-6 grayscale brightness-200" alt="Logo" onError={(e) => e.currentTarget.style.display = 'none'} />
                        eFhub.vn
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link 
                                key={link.path} 
                                href={link.path} 
                                className={`font-medium text-sm uppercase tracking-widest transition-all duration-300 pb-1 mt-1 ${
                                    isActive(link.path) 
                                        ? "text-emerald-400 font-black border-b-2 border-emerald-500" 
                                        : "text-slate-400 hover:text-white border-b-2 border-transparent"
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <form action="/players" method="GET" className="hidden lg:flex items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 focus-within:border-emerald-500 transition-all">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input name="q" className="bg-transparent border-none outline-none text-sm w-48 text-slate-200 placeholder:text-slate-500 focus:ring-0 ml-2" placeholder="Tìm kiếm nhanh..." type="text"/>
                    </form>
                    <div className="flex gap-1 text-slate-300">
                        <button className="p-2 hover:bg-white/5 transition-all duration-300 rounded-lg hover:text-emerald-400">
                            <User className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-white/5 transition-all duration-300 rounded-lg hover:text-emerald-400 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950"></span>
                        </button>
                    </div>
                    <button className="bg-emerald-500 text-slate-950 px-5 py-2 font-black text-xs tracking-widest uppercase rounded-lg hover:bg-emerald-400 transition-transform shadow-lg shadow-emerald-500/20">
                        Tham gia
                    </button>
                </div>
            </div>
        </nav>
    );
}
