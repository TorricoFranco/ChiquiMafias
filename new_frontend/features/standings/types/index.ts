export interface YearlyStats {
    pts: number;
    pj: number;
}

export interface AverageRow {
    teamId: string;
    teamName: string;
    teamLogo: string | null;
    description: string | null;
    stats2024: YearlyStats;
    stats2025: YearlyStats;
    stats2026: YearlyStats;
    totalPoints: number;
    totalPlayed: number;
    coefficient: number;
}

export interface StandingRow {
    position: number;
    teamId: string;
    teamName: string;
    teamLogo: string | null;
    teamPhoto?: string | null;
    points: number;
    played: number;
    won: number;
    draw: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    description: string | null;
}

export interface TournamentGroups {
    A: StandingRow[];
    B: StandingRow[];
}

export interface TournamentData {
    tournament: string;
    groups: TournamentGroups;
}

export interface FullStandingsResponse {
    apertura: TournamentData;
    clausura: TournamentData;
    annual: StandingRow[];
    averages: AverageRow[];
    updated_at: string;
}