import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getSiteSettings } from "@/lib/site-settings";
import { MaintenanceView } from "@/components/MaintenanceView";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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

    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
}
