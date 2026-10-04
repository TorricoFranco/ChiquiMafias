

export type MatchStatus =
  // No iniciados
  | 'TBD'
  | 'NS'
  | 'SCHEDULED'
  // En vivo
  | '1H'
  | 'HT'
  | '2H'
  | 'ET'
  | 'BT'
  | 'P'
  | 'LIVE'
  // Penales
  | 'PEN'
  // Finalizados
  | 'FT'
  | 'AET'
  // Interrumpidos / Especiales
  | 'SUSP'
  | 'PST'
  | 'CANC'
  | 'ABD';

export interface Venue {
  name: string;
  city: string | null;
  image: string | null;
}

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  short_code: string | null;
}

export interface GoalSummary {
  min: number;
  player: string;
  team: string;
}

export interface MatchScore {
  home: number;
  away: number;
  home_penalties: number | null;
  away_penalties: number | null;
  elapsed: number | null;
  summary: {
    goals: GoalSummary[];
    redCards: GoalSummary[];
    lastUpdate: string | null;
  };
}

export interface MatchMetadata {
  id: string;
  status: MatchStatus;
  status_long: string;
  date: string; // ISO date
  timestamp: number; // Unix timestamp
  referee: string | null;
  round: string;
  tournament: string;
  venue: Venue | null;
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: string | number;
  pos: string | null;
  grid?: string | null;
}

export interface KitColors {
  player: {
    border: string;
    number: string;
    primary: string;
  };
  goalkeeper: {
    border: string;
    number: string;
    primary: string;
  };
}

export interface MatchLineup {
  teamId: string;
  teamName: string;
  formation: string | null;
  coach: string | null;
  kitColors: KitColors | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchStatistics {
  fouls: number | null;
  offsides: number | null;
  'passes_%': string | null;
  red_cards: number | null;
  total_shots: number | null;
  corner_kicks: number | null;
  total_passes: number | null;
  yellow_cards: number | null;
  blocked_shots: number | null;
  shots_on_goal: number | null;
  expected_goals: string | null;
  shots_off_goal: number | null;
  ball_possession: string | null;
  goals_prevented: string | null;
  passes_accurate: number | null;
  shots_insidebox: number | null;
  goalkeeper_saves: number | null;
  shots_outsidebox: number | null;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  statistics: MatchStatistics;
}

export interface EventTeam {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface EventPlayer {
  id: string;
  name: string;
  photo: string | null;
}

export interface SubstitutionLog {
  playerIn: string;
  playerOut: string;
}

export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute: number | null;
  type: 'Goal' | 'Card' | 'subst' | 'Var' | string;
  detail: string;
  team: EventTeam | null;
  player: EventPlayer | null;
  assist: EventPlayer | null;
  substitutionLog: SubstitutionLog | null;
}

export interface MatchDetails {
  metadata: MatchMetadata;
  score: MatchScore;
  teams: {
    home: Team;
    away: Team;
  };
  lineups: MatchLineup[];
  events: MatchEvent[];
  stats: TeamStats[];
  isLive: boolean;
  chatActive: boolean;
}

// Pre-match Models
export interface MatchHistoryItem {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  tournament: string;
}

export interface TableEntry {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  points: number;
  goalDiff: number;
  coefficient?: number;
}

export interface PreMatchResponse {
  history: {
    homeWins: number;
    awayWins: number;
    draws: number;
    total: number;
    lastMatches: MatchHistoryItem[];
  };
  form: {
    home: string; // e.g. "V-V-E-D-V"
    away: string; // e.g. "D-E-V-V-D"
  };
  miniTable: {
    tournament: {
      home: TableEntry[];
      away: TableEntry[];
    };
    annual: {
      home: TableEntry[];
      away: TableEntry[];
    };
    averages: {
      home: TableEntry[];
      away: TableEntry[];
    };
  };
}

// Chat Models
export interface ChatMessage {
  messageId: string;
  matchId: string;
  userId: string;
  name: string;
  teamName: string | null;
  badgeUrl: string | null;
  message: string;
  timestamp: number;
  stickerId?: string | null;
  nameColor?: string | null;
  isMegaphone?: boolean;
}

// WebSocket Event Payloads
export interface StatsUpdatedPayload {
  matchId: string;
  stats: TeamStats[];
}

export interface TimelineUpdatedPayload {
  matchId: string;
  lastEvent: MatchEvent | null;
  totalEvents: number;
}

export interface MatchLiveUpdatePayload {
  matchId: string;
  type: 'SCORE_UPDATED' | 'MINUTE_TICK';
  h: number;
  a: number;
  status: string;
  elapsed: number | null;
}

// Helper Classification Constants
export const LIVE_STATUSES: string[] = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
export const NOT_STARTED_STATUSES: string[] = ['TBD', 'NS', 'SCHEDULED'];
export const FINISHED_STATUSES: string[] = ['FT', 'AET', 'PEN'];
export const INTERRUPTED_STATUSES: string[] = ['SUSP', 'PST', 'CANC', 'ABD'];

export function getDerivedMatchState(status: MatchStatus) {
  return {
    isLive: LIVE_STATUSES.includes(status),
    isNotStarted: NOT_STARTED_STATUSES.includes(status),
    isFinished: FINISHED_STATUSES.includes(status),
    isInterrupted: INTERRUPTED_STATUSES.includes(status),
  };
}



export interface MatchTeam {
  name: string;
  code: string;
  logoUrl?: string;
}

export interface MatchOdds {
  home: number;
  draw: number;
  away: number;
}

export interface MatchData {
  id: string;
  league: string;
  minute: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  scoreA: number;
  scoreB: number;
  odds: MatchOdds;
}

export interface UpcomingFixture {
  id: string;
  league: string;
  teamA: string;
  teamB: string;
  odds: MatchOdds;
}


// 