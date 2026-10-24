import type { MatchFixture } from '@/features/fixture/types';

/** Formato de la temporada (`CompetitionFormat` del backend). */
export type CompetitionFormat = 'LIGA_DIVIDIDA' | 'LIGA' | 'ELIMINACION' | 'GRUPOS_Y_ELIMINACION';

/** `CompetitionResponseDto`: una competición con su temporada actual. */
export interface Competition {
  slug: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  country: string | null;
  format: CompetitionFormat;
  /** true en cancha neutral: no se muestra local ni visitante. */
  neutralVenue: boolean;
  /** Fases de la temporada (`APERTURA`, `CLAUSURA`); vacío si el formato todavía no tiene vista. */
  stages: string[];
  hasStandings: boolean;
  /** true en eliminación directa: tiene cuadro (`GET /competitions/:slug/bracket`). */
  hasBracket: boolean;
  season: {
    /** Año de inicio: lo que piden las rutas con temporada. */
    year: number;
    /** Lo que se muestra: `2026` o `2026/27`. */
    label: string;
  };
}

/** Equipo de una llave (`BracketTeamDto`). */
export interface BracketTeam {
  id: string;
  name: string;
  /** Escudo en Cloudinary, para equipos sin ID de API-Football. */
  logoUrl: string | null;
  /** Con ID se usa el escudo local `/escudos-api/<id>.webp`. */
  apiTeamId: number | null;
}

/** Una llave del cuadro (`BracketSlotDto`). */
export interface BracketSlot {
  /** Lugar en la ronda, de arriba hacia abajo, desde 1. */
  position: number;
  matchId: string | null;
  date: string | null;
  status: string | null;
  isLive: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  /** Null mientras el lugar está por definir. */
  home: BracketTeam | null;
  away: BracketTeam | null;
  winnerTeamId: string | null;
}

export interface BracketRound {
  /** 1 = primera ronda … final. */
  order: number;
  key: string;
  /** Como lo guardan los partidos: `32avos de final`, `Final`. */
  name: string;
  slots: BracketSlot[];
}

export interface BracketResponse {
  rounds: BracketRound[];
}

/** `GET /competitions/:slug/matches`. */
export interface CompetitionMatchesResponse {
  page: number;
  pageSize: number;
  total: number;
  matches: MatchFixture[];
}
