"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
    _id: string;
    name: string;
    email: string;
    role: "manager" | "user";
    avatar?: string;
    phone?: string;
    bio?: string;
    gamerId?: string;
    stats?: {
        tournamentsCreated: number;
        tournamentsJoined: number;
        wins: number;
        losses: number;
        draws: number;
        goalsScored: number;
        goalsConceded: number;
    };
    isActive?: boolean;
    lastLogin?: string;
    createdAt?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isManager: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string; requiresVerification?: boolean; email?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; message: string; requiresVerification?: boolean; email?: string }>;
    verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
    resendCode: (email: string) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: "manager" | "user";
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Load user on mount - persist login from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem("efootcup_token");
        if (savedToken) {
            setToken(savedToken);
            fetchProfile(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchProfile = async (authToken: string) => {
        try {
            const res = await fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();

            if (data.success) {
                setUser(data.data);
                setToken(authToken);
            } else {
                // Token invalid — clear stored data
                localStorage.removeItem("efootcup_token");
                setToken(null);
                setUser(null);
            }
        } catch {
            localStorage.removeItem("efootcup_token");
            setToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.success) {
                // Save token to localStorage for persistence
                setUser(data.data.user);
                setToken(data.data.token);
                localStorage.setItem("efootcup_token", data.data.token);
                return { success: true, message: data.message };
            }

            // Check if account needs verification
            if (data.data?.requiresVerification) {
                return {
                    success: false,
                    message: data.message,
                    requiresVerification: true,
                    email: data.data.email,
                };
            }

            return { success: false, message: data.message };
        } catch {
            return { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" };
        }
    };

    const register = async (registerData: RegisterData) => {
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData),
            });

            const data = await res.json();

            if (data.success || data.data?.requiresVerification) {
                return {
                    success: true,
                    message: data.message,
                    requiresVerification: true,
                    email: data.data.email,
                };
            }

            return { success: false, message: data.message };
        } catch {
            return { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" };
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();

            if (data.success) {
                // Auto-login after verification
                setUser(data.data.user);
                setToken(data.data.token);
                localStorage.setItem("efootcup_token", data.data.token);
                return { success: true, message: data.message };
            }

            return { success: false, message: data.message };
        } catch {
            return { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" };
        }
    };

    const resendCode = async (email: string) => {
        try {
            const res = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            return { success: data.success, message: data.message };
        } catch {
            return { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" };
        }
    };

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch { }
        setUser(null);
        setToken(null);
        localStorage.removeItem("efootcup_token");
        router.push("/");
    };

    const updateProfile = async (updateData: Partial<User>) => {
        if (!token) return { success: false, message: "Chưa đăng nhập" };

        try {
            const res = await fetch("/api/auth/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            const data = await res.json();

            if (data.success) {
                setUser(data.data);
                return { success: true, message: data.message };
            }

            return { success: false, message: data.message };
        } catch {
            return { success: false, message: "Có lỗi xảy ra" };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                isManager: user?.role === "manager",
                login,
                register,
                verifyEmail,
                resendCode,
                logout,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
