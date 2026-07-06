// Available Stages Response
export interface AvailableStagesResponse {
    regular: number[];
    playoffs: string[];
}

// Fixture/Calendar Types
export interface TeamInfo {
    name: string;
    logo_url: string;
}

export interface CalendarMatch {
    id: string;
    date: string;
    home_goals: number | null;
    away_goals: number | null;
    home_penalties: number | null;
    away_penalties: number | null;
    status_short: string;
    elapsed: number | null;
    is_live: boolean;
    is_playoff: boolean;
    round: string;
    home_team: TeamInfo;
    away_team: TeamInfo;
    home_team_id: string;
    away_team_id: string;
}

export interface FixtureResponse {
    tournament: string;
    season: string;
    current_matchday: string | number;
    matches: CalendarMatch[];
}

// Brackets Types
export interface BracketMatch {
    id: string;
    side: 'left' | 'right' | 'center';
    position: number;
    home_team: { name: string; logo_url: string | null };
    away_team: { name: string; logo_url: string | null };
    status_short: string;
    date?: string;
    home_goals?: number;
    away_goals?: number;
    [key: string]: any;
}

export interface BracketsResponse {
    tournament: string;
    season: string;
    rounds: Record<string, BracketMatch[]>;
}

// Live Scores Types
export interface LiveScore {
    matchId: string;
    h: number;
    a: number;
    hp: number | null;
    ap: number | null;
    homeTeamId: string;
    awayTeamId: string;
    status: string;
    isLive: boolean;
    isPlayoff: boolean;
}
