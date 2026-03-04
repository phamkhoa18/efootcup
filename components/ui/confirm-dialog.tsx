"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    AlertTriangle, CheckCircle2, Info, XCircle, Trash2,
    AlertCircle, ShieldAlert, type LucideIcon,
} from "lucide-react";

// ───── Types ─────
type DialogVariant = "danger" | "warning" | "info" | "success";

interface ConfirmOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    icon?: LucideIcon;
}

interface AlertOptions {
    title: string;
    description: string;
    variant?: DialogVariant;
    icon?: LucideIcon;
    buttonText?: string;
}

interface ConfirmDialogContextValue {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: AlertOptions) => Promise<void>;
}

// ───── Variant config ─────
const variantConfig: Record<DialogVariant, {
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    confirmBg: string;
    confirmHover: string;
}> = {
    danger: {
        icon: Trash2,
        iconColor: "text-red-600",
        iconBg: "bg-red-50",
        confirmBg: "bg-red-600 hover:bg-red-700",
        confirmHover: "ring-red-200",
    },
    warning: {
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-50",
        confirmBg: "bg-amber-600 hover:bg-amber-700",
        confirmHover: "ring-amber-200",
    },
    info: {
        icon: Info,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-50",
        confirmBg: "bg-blue-600 hover:bg-blue-700",
        confirmHover: "ring-blue-200",
    },
    success: {
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-50",
        confirmBg: "bg-emerald-600 hover:bg-emerald-700",
        confirmHover: "ring-emerald-200",
    },
};

// ───── Context ─────
const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function useConfirmDialog() {
    const ctx = useContext(ConfirmDialogContext);
    if (!ctx) throw new Error("useConfirmDialog must be used within <ConfirmDialogProvider>");
    return ctx;
}

// ───── Provider ─────
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"confirm" | "alert">("confirm");
    const [options, setOptions] = useState<(ConfirmOptions & AlertOptions) | null>(null);
    const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((res) => {
            setOptions({ ...opts, buttonText: undefined });
            setMode("confirm");
            setResolve(() => res);
            setOpen(true);
        });
    }, []);

    const alert = useCallback((opts: AlertOptions): Promise<void> => {
        return new Promise<void>((res) => {
            setOptions({ ...opts, confirmText: undefined, cancelText: undefined });
            setMode("alert");
            setResolve(() => (val: boolean) => res());
            setOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        resolve?.(true);
        setOpen(false);
    };

    const handleCancel = () => {
        resolve?.(false);
        setOpen(false);
    };

    const variant = options?.variant || "info";
    const config = variantConfig[variant];
    const IconComp = options?.icon || config.icon;

    return (
        <ConfirmDialogContext.Provider value={{ confirm, alert }}>
            {children}

            <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
                <AlertDialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
                    {/* Header with icon */}
                    <div className="px-6 pt-6 pb-2">
                        <AlertDialogHeader className="flex-row items-start gap-4 space-y-0">
                            <div className={`w-11 h-11 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                                <IconComp className={`w-5 h-5 ${config.iconColor}`} />
                            </div>
                            <div className="flex-1 pt-0.5">
                                <AlertDialogTitle className="text-base font-bold text-gray-900 leading-tight">
                                    {options?.title || "Xác nhận"}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                    {options?.description || ""}
                                </AlertDialogDescription>
                            </div>
                        </AlertDialogHeader>
                    </div>

                    {/* Footer */}
                    <AlertDialogFooter className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex-row gap-2 sm:justify-end">
                        {mode === "confirm" ? (
                            <>
                                <AlertDialogCancel
                                    onClick={handleCancel}
                                    className="h-9 px-4 text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all rounded-lg mt-0"
                                >
                                    {options?.cancelText || "Hủy"}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirm}
                                    className={`h-9 px-4 text-sm font-semibold text-white transition-all rounded-lg focus:ring-2 ${config.confirmBg} ${config.confirmHover} mt-0`}
                                >
                                    {options?.confirmText || "Xác nhận"}
                                </AlertDialogAction>
                            </>
                        ) : (
                            <AlertDialogAction
                                onClick={handleConfirm}
                                className={`h-9 px-5 text-sm font-semibold text-white transition-all rounded-lg focus:ring-2 ${config.confirmBg} ${config.confirmHover} mt-0`}
                            >
                                {options?.buttonText || "Đã hiểu"}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmDialogContext.Provider>
    );
}
