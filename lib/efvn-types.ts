// ============================================================
// eFootball VN API — TypeScript Interfaces
// Source: https://player.efootball.vn/api-docs
// ============================================================

/** Pagination metadata returned by list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Player images object */
export interface PlayerImages {
  card: string;
  miniCard?: string;
  portrait?: string;
  render?: string;
  thumbnail?: string;
}

/** Overall rating (base & max level) */
export interface OverallRating {
  base: number;
  max: number;
}

/** Player summary — returned in list endpoints */
export interface PlayerSummary {
  _id: string;
  efhubId: string;
  name: string;
  shortName?: string;
  nationality: string;
  club: string;
  league: string;
  positions: string[];
  cardType: string;
  overall: OverallRating;
  foot: string;
  height: number;
  weight: number;
  images: PlayerImages;
}

/** Player detail — full info returned by /players/:id */
export interface PlayerDetail extends PlayerSummary {
  playerId?: string;
  slug?: string;
  nameJa?: string;
  nationalityCode?: string;
  countryId?: number;
  teamId?: string;
  leagueId?: number;
  rarity?: string;
  playerType?: number;
  age?: number;
  weakFootUsage?: number;
  weakFootAccuracy?: number;
  levels: {
    current: number;
    max: number;
  };
  stats: {
    level1: Record<string, number>;
    maxLevel: Record<string, number>;
  };
  skills: string[];
  playstyles: string[];
  playingStyle?: string;
  condition: {
    form: string;
    injuryResistance: number;
  };
  managerAffinity?: {
    quickCounter?: number;
    possessionGame?: number;
    longBallCounter?: number;
    outWide?: number;
    longBall?: number;
  };
  metaImages?: {
    nationality?: string;
    club?: string;
    league?: string;
  };
  playerModel?: {
    armLength?: number;
    shoulderWidth?: number;
    neckLength?: number;
    chestMeasurement?: number;
    neckSize?: number;
    shoulderHeight?: number;
    legLength?: number;
    thighSize?: number;
    waistSize?: number;
    armSize?: number;
    calfSize?: number;
    legCoverageRadius?: number;
    armCoverageRadius?: number;
    jumpingHeight?: number;
    torsoCollision?: number;
    dribbleHeight?: number;
  };
  gpValue?: number;
  datapackId?: number;
  boostId?: number;
}

/** Manager summary — returned in list endpoints */
export interface ManagerSummary {
  _id: string;
  efhubId: string;
  name: string;
  shortName?: string;
  nationality: string;
  team: string;
  formation: string;
  playstyleProficiency: {
    quickCounter: number;
    possessionGame: number;
    longBallCounter: number;
    outWide: number;
    longBall: number;
  };
  imageUrl?: string;
}

/** Manager detail — full info */
export interface ManagerDetail extends ManagerSummary {
  affinity?: {
    attack: number;
    midfield: number;
    defense: number;
  };
  source?: {
    site: string;
    managerUrl: string;
    scrapedAt: string;
  };
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  count?: number;
  message?: string;
}

/** Count item from metadata endpoints (clubs, nationalities, leagues, formations) */
export interface CountItem {
  _id: string;
  count: number;
}

/** Player stats overview from /players/stats */
export interface PlayerStatsOverview {
  totalPlayers: number;
  cardTypes: CountItem[];
  positions: CountItem[];
  topNationalities: CountItem[];
  topLeagues: CountItem[];
  overallDistribution: CountItem[];
}

/** Filter params for fetching players */
export interface PlayerFilterParams {
  q?: string;
  page?: number;
  limit?: number;
  position?: string;
  cardType?: string;
  nationality?: string;
  club?: string;
  league?: string;
  foot?: string;
  playstyle?: string;
  playingStyle?: string;
  skill?: string;
  minOvr?: number;
  maxOvr?: number;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  weakFootUsage?: number;
  weakFootAccuracy?: number;
  sortBy?: 'overall.max' | 'overall.base' | 'name' | 'height' | 'weight' | 'age' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** Filter params for fetching managers */
export interface ManagerFilterParams {
  q?: string;
  page?: number;
  limit?: number;
  formation?: string;
  playstyle?: string;
  nationality?: string;
  team?: string;
  sortBy?: 'name' | 'formation' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
