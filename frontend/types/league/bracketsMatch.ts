interface Team {
    name: string;
    logo_url: string | null;
}

export interface Match {
    id: string;
    position: number;
    side: 'left' | 'right' | 'center';
    home_team: Team;
    away_team: Team;
    home_goals?: number | null;
    away_goals?: number | null;
    home_pen?: number | null;
    away_pen?: number | null;
    status_short: string;
}
