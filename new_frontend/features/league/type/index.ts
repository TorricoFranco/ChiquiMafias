export type TournamentType = 'APERTURA' | 'CLAUSURA';
export type ZoneType = 'A' | 'B';

export type PlayoffStageKey = 'octavos' | 'cuartos' | 'semifinal' | 'final';

export type MatchStatus =
  | 'NS'   // Not Started
  | 'TBD'  // To be determined
  | '1H'   // First half
  | 'HT'   // Half time
  | '2H'   // Second half
  | 'ET'   // Extra time
  | 'BT'   // Break time
  | 'P'    // Penalties in progress
  | 'LIVE' // Live generic
  | 'FT'   // Full time
  | 'PEN'  // Finished after penalties
  | 'AET'; // Finished after extra time

export interface LiveMatchInfo {
  matchId: string;
  opponentName: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  status: MatchStatus;
  elapsed?: string;
  resultType: 'winning' | 'losing' | 'drawing';
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  points: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  description: string | null;
  live?: LiveMatchInfo;
}

export interface SeasonStats {
  pts: number;
  pj: number;
}

export interface AverageRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  description: string | null;
  stats2024: SeasonStats;
  stats2025: SeasonStats;
  stats2026: SeasonStats;
  totalPoints: number;
  totalPlayed: number;
  coefficient: number;
  live?: LiveMatchInfo;
}

export interface FullStandings {
  apertura: {
    tournament: 'APERTURA';
    groups: {
      A: StandingRow[];
      B: StandingRow[];
    };
  };
  clausura: {
    tournament: 'CLAUSURA';
    groups: {
      A: StandingRow[];
      B: StandingRow[];
    };
  };
  annual: StandingRow[];
  averages: AverageRow[];
  updated_at: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  shortCode: string;
  logo: string;
  zone: ZoneType;
}

export interface LeagueMatch {
  id: string;
  tournament: TournamentType;
  round: number | PlayoffStageKey;
  isPlayoff?: boolean;
  date: string;
  home_team: {
    id: string;
    name: string;
    short_code?: string;
    logo_url: string;
  };
  away_team: {
    id: string;
    name: string;
    short_code?: string;
    logo_url: string;
  };
  home_goals: number | null;
  away_goals: number | null;
  home_pen?: number | null;
  away_pen?: number | null;
  status_short: MatchStatus;
  minute?: string;
}

export interface BracketMatch {
  id: string;
  round: PlayoffStageKey;
  position: number;
  side: 'left' | 'right' | 'center';
  home_team: {
    id: string;
    name: string;
    logo_url: string;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string;
  };
  home_goals: number | null;
  away_goals: number | null;
  home_penalty_goals?: number | null;
  away_penalty_goals?: number | null;
  status_short: MatchStatus;
  winnerTeamId?: string;
}

export interface SimulatedResult {
  h: number | null;
  a: number | null;
  homeTeamId: string;
  awayTeamId: string;
  isSimulated: boolean;
}

export interface AvailableStages {
  regular: number[];
  playoffs: { key: PlayoffStageKey; labelShort: string; labelFull: string }[];
}
