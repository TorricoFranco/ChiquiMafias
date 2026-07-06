interface Team {
  id: string;
  name: string;
  short_name: string;
  logo?: string;
}

interface Match {
  id: string;
  home_team: Team;
  away_team: Team;
  status_short: string; 
  status?: string;
  home_score?: number;
  away_score?: number;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  teamLogo: string;
  teamPhoto: string | null;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  description: string | null;
}

export interface AverageStats {
  teamId: string;
  teamName: string;
  teamLogo: string;
  pts24: number;
  pts25: number;
  pts26: number;
  totalPoints: number;
  totalPlayed: number;
  coefficient: number;
  description: string | null;
}

export interface TournamentPhase {
  tournament: "APERTURA" | "CLAUSURA";
  groups: {
    // Pueden venir con datos o como arrays vacíos []
    A: TeamStats[];
    B: TeamStats[];
  };
}

export interface ApiResponseStandings {
  apertura: TournamentPhase;
  clausura: TournamentPhase;
  annual: TeamStats[];
  averages: AverageStats[];
}

export interface Matchday {
  number: number;
  matches: Match[];
}
