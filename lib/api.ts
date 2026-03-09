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

    updateTeamSeed: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/teams`, {
            method: "PUT",
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

    cancelRegistration: (tournamentId: string) =>
        apiFetch(`/tournaments/${tournamentId}/registrations`, {
            method: "DELETE",
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

    // Expenses
    getExpenses: (tournamentId: string) =>
        apiFetch(`/tournaments/${tournamentId}/expenses`),

    addExpense: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/expenses`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    updateExpense: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/expenses`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    deleteExpense: (tournamentId: string, expenseId: string) =>
        apiFetch(`/tournaments/${tournamentId}/expenses`, {
            method: "DELETE",
            body: JSON.stringify({ expenseId }),
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

// ====== Admin ======
export const adminAPI = {
    // Users
    getUsers: (params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/admin/users?${searchParams.toString()}`);
    },
    updateUser: (userId: string, data: any) =>
        apiFetch(`/admin/users`, {
            method: "PUT",
            body: JSON.stringify({ userId, ...data }),
        }),
    deleteUser: (userId: string) =>
        apiFetch(`/admin/users`, {
            method: "DELETE",
            body: JSON.stringify({ userId }),
        }),

    // Stats
    getStats: () => apiFetch("/admin/stats"),

    // Tournaments (admin can manage all)
    getAllTournaments: (params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/admin/tournaments?${searchParams.toString()}`);
    },
    updateTournament: (id: string, data: any) =>
        apiFetch(`/admin/tournaments`, {
            method: "PUT",
            body: JSON.stringify({ tournamentId: id, ...data }),
        }),
    deleteTournament: (id: string) =>
        apiFetch(`/admin/tournaments`, {
            method: "DELETE",
            body: JSON.stringify({ tournamentId: id }),
        }),

    // Content/Posts
    getPosts: (params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/admin/content?${searchParams.toString()}`);
    },
    getPost: (id: string) => apiFetch(`/admin/content/${id}`),
    createPost: (data: any) =>
        apiFetch("/admin/content", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    updatePost: (postId: string, data: any) =>
        apiFetch(`/admin/content/${postId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    deletePost: (postId: string) =>
        apiFetch(`/admin/content/${postId}`, {
            method: "DELETE",
        }),
    uploadContentImage: async (file: File, type: string = "content") => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const headers: Record<string, string> = {};
        if (typeof window !== "undefined") {
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
        }

        const res = await fetch("/api/admin/content/upload", {
            method: "POST",
            headers,
            body: formData,
        });
        return res.json();
    },

    // Menu management
    getMenus: () => apiFetch("/admin/menus"),
    updateMenu: (location: string, items: any[]) =>
        apiFetch("/admin/menus", {
            method: "PUT",
            body: JSON.stringify({ location, items }),
        }),

    // Categories
    getCategories: () => apiFetch("/admin/categories"),
    createCategory: (data: any) =>
        apiFetch("/admin/categories", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    updateCategory: (categoryId: string, data: any) =>
        apiFetch("/admin/categories", {
            method: "PUT",
            body: JSON.stringify({ categoryId, ...data }),
        }),
    deleteCategory: (categoryId: string) =>
        apiFetch("/admin/categories", {
            method: "DELETE",
            body: JSON.stringify({ categoryId }),
        }),

    // Site Settings
    getSettings: () => apiFetch("/admin/settings"),
    updateSettings: (data: any) =>
        apiFetch("/admin/settings", {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    uploadSettingsImage: async (file: File, type: string) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const headers: Record<string, string> = {};
        if (typeof window !== "undefined") {
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
        }

        const res = await fetch("/api/admin/settings/upload", {
            method: "POST",
            headers,
            body: formData,
        });
        return res.json();
    },
};

// Public posts API
export const postsAPI = {
    getAll: (params?: Record<string, string>) => {
        const searchParams = new URLSearchParams(params || {});
        return apiFetch(`/posts?${searchParams.toString()}`);
    },
    getBySlug: (slug: string) => apiFetch(`/posts/${slug}`),
};

// Public categories API
export const categoriesAPI = {
    getAll: () => apiFetch("/categories"),
};

// ====== Payment Config ======
export const paymentConfigAPI = {
    // Admin endpoints
    getConfig: () => apiFetch("/admin/payment-config"),
    updateConfig: (data: any) =>
        apiFetch("/admin/payment-config", {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    // Public endpoint (only enabled methods)
    getPublicConfig: () => apiFetch("/payment-config"),

    // Upload QR image for payment method
    uploadQR: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "payment_qr");

        const headers: Record<string, string> = {};
        if (typeof window !== "undefined") {
            const savedToken = localStorage.getItem("efootcup_token");
            if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
        }

        const res = await fetch("/api/admin/settings/upload", {
            method: "POST",
            headers,
            body: formData,
        });
        return res.json();
    },
};

// ====== Tournament Payment ======
export const tournamentPaymentAPI = {
    // Create payment (auto or manual) — returns payUrl for MoMo or manual info
    createPayment: (tournamentId: string, methodId: string) =>
        apiFetch(`/tournaments/${tournamentId}/pay`, {
            method: "POST",
            body: JSON.stringify({ methodId }),
        }),

    // User submits payment proof (manual mode)
    submitProof: (tournamentId: string, data: any) =>
        apiFetch(`/tournaments/${tournamentId}/registrations/payment`, {
            method: "PUT",
            body: JSON.stringify({ action: "submit_proof", ...data }),
        }),

    // Manager confirms payment
    confirmPayment: (tournamentId: string, registrationId: string, paymentAmount?: number) =>
        apiFetch(`/tournaments/${tournamentId}/registrations/payment`, {
            method: "PUT",
            body: JSON.stringify({ action: "confirm_payment", registrationId, paymentAmount }),
        }),

    // Manager rejects payment
    rejectPayment: (tournamentId: string, registrationId: string) =>
        apiFetch(`/tournaments/${tournamentId}/registrations/payment`, {
            method: "PUT",
            body: JSON.stringify({ action: "reject_payment", registrationId }),
        }),
};

export default apiFetch;

