const API_BASE = "/api";

interface FetchOptions extends RequestInit {
    token?: string | null;
}

async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<{
    success: boolean;
    message: string;
    data: T;
}> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    } else {
        // Try localStorage
        if (typeof window !== "undefined") {
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) {
                headers.Authorization = `Bearer ${savedToken}`;
            }
        }
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    const data = await res.json();
    return data;
}

// ====== Auth ======
export const authAPI = {
    login: (email: string, password: string) =>
        apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    register: (data: any) =>
        apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    logout: () => apiFetch("/auth/logout", { method: "POST" }),

    getProfile: () => apiFetch("/auth/me"),

    updateProfile: (data: any) =>
        apiFetch("/auth/me", {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    getParticipation: () => apiFetch("/auth/me/participation"),

    verifyEmail: (email: string, code: string) =>
        apiFetch("/auth/verify", {
            method: "POST",
            body: JSON.stringify({ email, code }),
        }),

    resendCode: (email: string) =>
        apiFetch("/auth/resend-code", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),
};

// ====== Tournaments ======
export const tournamentAPI = {
    getAll: (params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/tournaments?${searchParams.toString()}`);
    },

    getById: (id: string) => apiFetch(`/tournaments/${id}`),

    create: (data: any) =>
        apiFetch("/tournaments", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: any) =>
        apiFetch(`/tournaments/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiFetch(`/tournaments/${id}`, { method: "DELETE" }),

    // Teams
    getTeams: (tournamentId: string, params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/tournaments/${tournamentId}/teams?${searchParams.toString()}`);
    },

    addTeam: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/teams`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    // Matches
    getMatches: (tournamentId: string, params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/tournaments/${tournamentId}/matches?${searchParams.toString()}`);
    },

    updateMatch: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/matches`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    // Brackets
    generateBrackets: (tournamentId: string, data?: any) =>
        apiFetch(`/tournaments/${tournamentId}/brackets`, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined
        }),

    getBrackets: (tournamentId: string) =>
        apiFetch(`/tournaments/${tournamentId}/brackets`),

    generateWalkoverResults: (tournamentId: string, roundTarget: number | string) =>
        apiFetch(`/tournaments/${tournamentId}/brackets/walkover`, {
            method: "POST",
            body: JSON.stringify({ round: roundTarget }),
        }),

    swapBracketPositions: (tournamentId: string, team1Id: string, team2Id: string) =>
        apiFetch(`/tournaments/${tournamentId}/brackets/swap`, {
            method: "PUT",
            body: JSON.stringify({ team1Id, team2Id }),
        }),

    // Registrations
    getRegistrations: (tournamentId: string, params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/tournaments/${tournamentId}/registrations?${searchParams.toString()}`);
    },

    register: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/registrations`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    importRegistrations: (tournamentId: string, registrations: any[]) =>
        apiFetch(`/tournaments/${tournamentId}/registrations/import`, {
            method: "POST",
            body: JSON.stringify({ registrations }),
        }),

    handleRegistration: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/registrations`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    // Feedback
    getFeedback: (tournamentId: string, params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/tournaments/${tournamentId}/feedback?${searchParams.toString()}`);
    },

    submitFeedback: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/feedback`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    replyFeedback: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/feedback`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
};

// ====== Dashboard ======
export const dashboardAPI = {
    getStats: () => apiFetch("/dashboard"),
    getReports: () => apiFetch("/manager/reports"),
    getPlayers: () => apiFetch("/manager/players"),
};

// ====== Notifications ======
export const notificationsAPI = {
    getMine: () => apiFetch("/notifications"),
    markAllRead: () => apiFetch("/notifications", { method: "PUT" }),
};

export default apiFetch;
