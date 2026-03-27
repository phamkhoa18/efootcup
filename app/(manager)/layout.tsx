import { getSiteSettings } from "@/lib/site-settings";
import { MaintenanceView } from "@/components/MaintenanceView";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function ManagerRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getSiteSettings();

    if (settings.maintenanceMode) {
        let isAdmin = false;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                const user = verifyToken(token);
                if (user?.role === "admin") {
                    isAdmin = true;
                }
            }
        } catch (e) {
            console.error("Lỗi parse cookies", e);
        }

        if (!isAdmin) {
            return <MaintenanceView />;
        }
    }

    return <>{children}</>;
}
