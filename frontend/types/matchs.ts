// =========================================================
// Tipos base
// =========================================================

export interface Match {
  id: number;
  local: string;
  visitante: string;
  score: string;
  estado: string;
  minuto?: number | null;
  isLive: boolean;
  events?: string[];
}

export interface PageProps {
  
  params: Promise<{ id: string }>;
}

export interface MatchPageProps {
  matchId: string;
}

// =========================================================
// Equipos
// =========================================================

export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface Teams {
  home: Team;
  away: Team;
}

// =========================================================
// Lineups (DETALLADOS, como en tus mocks)
// =========================================================

export interface LineupPlayer {
  number: number;
  name: string;
  position: string;
}

export interface LineupDetail {
  formation: string;
  coach: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

// =========================================================
// Eventos en vivo
// =========================================================

export interface TimelineEvent {
  minute: number;
  type: string;
  team: "home" | "away" | "general";
  player?: string | null;
  detail?: string;
}

export interface LiveData {
  minute: number;
  score: { home: number; away: number };
  events: TimelineEvent[];
  stats: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnTarget: { home: number; away: number };
    fouls: { home: number; away: number };
    passes: { home: number; away: number };
    dangerousAttacks: { home: number; away: number };
    xG: { home: number; away: number };
  };
}

// =========================================================
// Datos finalizados
// =========================================================

export interface FinishedData {
  manOfTheMatch: string;
  summary: string;
}

// =========================================================
// Info del partido
// =========================================================

export interface MatchInfo {
  league: string;
  stadium: string;
  referee: string;
  date: string;
  previa?: string;
}

// =========================================================
// Estados del partido
// =========================================================

export type MatchStatus =
  | "not_started"
  | "lineups_available"
  | "live"
  | "finished";

// =========================================================
// MatchData — EL TIPO FINAL USADO EN MOCKS Y FETCH
// =========================================================

export interface MatchData {
  status: MatchStatus;
  lineups?: {
    home: LineupDetail;
    away: LineupDetail;
  };
  liveData?: LiveData;
  finishedData?: FinishedData;
  matchInfo: MatchInfo;
  teams: Teams;
}
