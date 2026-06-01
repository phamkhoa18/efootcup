// ============================================================
// eFootball VN API — Client Helper Functions
// All requests go through /api/efvn/* proxy (hides API key)
// ============================================================

import type {
  ApiResponse,
  PlayerSummary,
  PlayerDetail,
  ManagerSummary,
  ManagerDetail,
  PaginationMeta,
  PlayerFilterParams,
  ManagerFilterParams,
  PlayerStatsOverview,
  CountItem,
} from "./efvn-types";

const API_BASE = "/api/efvn";
export const EFVN_ASSETS_BASE = "https://player.efootball.vn";

/** Helper to get full image URL */
export function getPlayerImageUrl(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${EFVN_ASSETS_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Generic fetch wrapper with error handling */
async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ==================== PLAYERS ====================

/** Fetch paginated player list with filters */
export async function fetchPlayers(
  params: PlayerFilterParams = {}
): Promise<ApiResponse<PlayerSummary[]>> {
  const queryParams: Record<string, string | number | undefined> = {
    page: params.page || 1,
    limit: params.limit || 24,
    q: params.q,
    position: params.position,
    cardType: params.cardType,
    nationality: params.nationality,
    club: params.club,
    league: params.league,
    foot: params.foot,
    playstyle: params.playstyle,
    playingStyle: params.playingStyle,
    skill: params.skill,
    minOvr: params.minOvr,
    maxOvr: params.maxOvr,
    minHeight: params.minHeight,
    maxHeight: params.maxHeight,
    minWeight: params.minWeight,
    maxWeight: params.maxWeight,
    weakFootUsage: params.weakFootUsage,
    weakFootAccuracy: params.weakFootAccuracy,
    sortBy: params.sortBy || "overall.max",
    sortOrder: params.sortOrder || "desc",
  };

  return apiFetch<ApiResponse<PlayerSummary[]>>("/players", queryParams);
}

/** Fetch single player detail by efhubId or slug */
export async function fetchPlayerDetail(id: string): Promise<ApiResponse<PlayerDetail>> {
  return apiFetch<ApiResponse<PlayerDetail>>(`/players/${encodeURIComponent(id)}`);
}

/** Fetch similar players */
export async function fetchPlayerSimilar(
  id: string,
  limit: number = 10
): Promise<ApiResponse<PlayerSummary[]>> {
  return apiFetch<ApiResponse<PlayerSummary[]>>(
    `/players/${encodeURIComponent(id)}/similar`,
    { limit }
  );
}

/** Compare 2-4 players by IDs */
export async function comparePlayers(ids: string[]): Promise<ApiResponse<PlayerDetail[]>> {
  return apiFetch<ApiResponse<PlayerDetail[]>>("/players/compare", {
    ids: ids.join(","),
  });
}

/** Get random players */
export async function fetchRandomPlayers(count: number = 1): Promise<ApiResponse<PlayerSummary[]>> {
  return apiFetch<ApiResponse<PlayerSummary[]>>("/players/random", { count });
}

// ==================== PLAYER METADATA ====================

/** Fetch player stats overview */
export async function fetchPlayerStats(): Promise<ApiResponse<PlayerStatsOverview>> {
  return apiFetch<ApiResponse<PlayerStatsOverview>>("/players/stats");
}

/** Fetch all card types */
export async function fetchCardTypes(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>("/players/card-types");
}

/** Fetch all positions */
export async function fetchPositions(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>("/players/positions");
}

/** Fetch all clubs with counts */
export async function fetchClubs(): Promise<ApiResponse<CountItem[]>> {
  return apiFetch<ApiResponse<CountItem[]>>("/players/clubs");
}

/** Fetch all nationalities with counts */
export async function fetchNationalities(): Promise<ApiResponse<CountItem[]>> {
  return apiFetch<ApiResponse<CountItem[]>>("/players/nationalities");
}

/** Fetch all leagues with counts */
export async function fetchLeagues(): Promise<ApiResponse<CountItem[]>> {
  return apiFetch<ApiResponse<CountItem[]>>("/players/leagues");
}

/** Fetch all skills */
export async function fetchSkills(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>("/players/skills");
}

/** Fetch all playstyles */
export async function fetchPlaystyles(): Promise<ApiResponse<string[]>> {
  return apiFetch<ApiResponse<string[]>>("/players/playstyles");
}

// ==================== MANAGERS ====================

/** Fetch paginated manager list with filters */
export async function fetchManagers(
  params: ManagerFilterParams = {}
): Promise<ApiResponse<ManagerSummary[]>> {
  const queryParams: Record<string, string | number | undefined> = {
    page: params.page || 1,
    limit: params.limit || 20,
    q: params.q,
    formation: params.formation,
    playstyle: params.playstyle,
    nationality: params.nationality,
    team: params.team,
    sortBy: params.sortBy || "name",
    sortOrder: params.sortOrder || "asc",
  };

  return apiFetch<ApiResponse<ManagerSummary[]>>("/managers", queryParams);
}

/** Fetch single manager detail */
export async function fetchManagerDetail(id: string): Promise<ApiResponse<ManagerDetail>> {
  return apiFetch<ApiResponse<ManagerDetail>>(`/managers/${encodeURIComponent(id)}`);
}

/** Fetch all formations with counts */
export async function fetchFormations(): Promise<ApiResponse<CountItem[]>> {
  return apiFetch<ApiResponse<CountItem[]>>("/managers/formations");
}

/** Fetch manager stats overview */
export async function fetchManagerStats(): Promise<ApiResponse<{
  totalManagers: number;
  formations: CountItem[];
  playstyleAverages: Record<string, number>;
}>> {
  return apiFetch("/managers/stats");
}
