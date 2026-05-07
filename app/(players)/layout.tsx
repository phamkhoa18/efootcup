import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { getSiteSettings } from "@/lib/site-settings";
import { MaintenanceView } from "@/components/MaintenanceView";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function PlayersLayout({ children }: { children: ReactNode }) {
    const settings = await getSiteSettings();

    if (settings.maintenanceMode) {
        let canBypass = false;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                const user = verifyToken(token);
                if (user?.role === "admin" || user?.role === "manager") {
                    canBypass = true;
                }
            }
        } catch (e) {
            console.error("Lỗi parse cookies", e);
        }

        if (!canBypass) {
            return <MaintenanceView />;
        }
    }

    const logoSrc = settings.logo || "/assets/logo.svg";
    const hasCustomLogo = !!settings.logo;

    return (
        <>
            {/* Minimal Nav - Logo only */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A1628]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-8 flex items-center justify-center h-16">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className={hasCustomLogo ? "" : "bg-white/10 rounded-lg p-1.5"}>
                            <Image
                                src={logoSrc}
                                alt={settings.siteName || "EFV CUP VN"}
                                width={100}
                                height={24}
                                className={hasCustomLogo ? "h-8 w-auto object-contain brightness-0 invert" : "h-5 w-auto"}
                                priority
                            />
                        </div>
                        <span className="text-sm font-bold text-white/90">{settings.siteName || "EFV CUP"}</span>
                    </Link>
                </div>
            </header>

            <main className="min-h-screen bg-[#0A1628]">
                {children}
            </main>
            <Footer />
        </>
    );
}
