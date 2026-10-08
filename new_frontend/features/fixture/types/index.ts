
export interface TeamFixtureDetail {
    name: string;
    logo_url: string;
}

export interface MatchFixture {
    id: string;
    date: string;
    home_goals: number | null;
    away_goals: number | null;
    home_penalty_goals: number | null;
    away_penalty_goals: number | null;
    status_short: string;
    elapsed: number;
    is_live: boolean;
    is_playoff: boolean;
    round: string;
    home_team: TeamFixtureDetail;
    away_team: TeamFixtureDetail;
    home_team_id: string;
    away_team_id: string;
}

export interface GetYearlyCalendarResponseDto {
    season: string;
    availableDays: string[];
    calendar: Record<string, MatchFixture[]>;
}


export interface GetFixtureMatchdayResponse {
    tournament: string;
    season: string;
    current_matchday: string;
    matches: MatchFixture[];
}

export interface GetYearlyCalendarResponse {
    season: string;
    availableDays: string[];
    calendar: Record<string, MatchFixture[]>;
}

export interface PendingTeam {
    id: string;
    name: string;
    short_code: string | null;
    logo_url: string;
}

export interface PendingMatch {
    id: string;
    date: string;
    status_short: string;
    tournament: string;
    is_playoff: boolean;
    home_team: PendingTeam;
    away_team: PendingTeam;
}

export interface GetPendingFixturesResponse {
    matchday: string;
    is_playoff: boolean;
    matches: PendingMatch[];
}

export interface GetLiveScoresResponse {
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

export interface GetActiveMatchdayResponse {
    active_matchday: string;
}

export interface AvailableStagesResponse {
    regular: number[];
    playoffs: string[];
}

export interface TournamentBracketsResponse {
    [key: string]: any; 
}