"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, GitCompareArrows, LayoutGrid, Shield } from "lucide-react";

const navLinks = [
    { name: "Cầu thủ", path: "/players", icon: Users },
    { name: "HLV", path: "/managers", icon: Shield },
    { name: "Đội hình", path: "/squad-builder", icon: LayoutGrid },
    { name: "So sánh", path: "/compare", icon: GitCompareArrows },
];

export default function TopNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname?.startsWith(path);

    return (
        <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-efb-border"
        >
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                <div className="flex items-center gap-1 h-12 overflow-x-auto no-scrollbar">
                    {navLinks.map((link) => {
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                href={link.path}
                                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                                    active
                                        ? "text-efb-blue"
                                        : "text-efb-text-secondary hover:text-efb-blue hover:bg-efb-blue/[0.04]"
                                }`}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.name}
                                {active && (
                                    <motion.div
                                        layoutId="topnav-indicator"
                                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-efb-blue rounded-full"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </motion.nav>
    );
}
