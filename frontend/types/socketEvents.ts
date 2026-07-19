// ============================================================================
// LEAGUE LIVE EVENTS
// ============================================================================

export interface LeagueLiveScore {
    h: number;
    a: number;
    hp: number;
    ap: number;
    homeTeamId: string;
    awayTeamId: string;
    status: string;
    elapsed: number;
    isLive: boolean;
    isPlayoff: boolean;
}

export type LeagueLiveUpdatePayload = Record<string, LeagueLiveScore>;

// ============================================================================
// MATCH LIVE EVENTS
// ============================================================================

export interface MatchLiveUpdatePayload {
    matchId: string;
    type: 'SCORE_UPDATED' | 'MINUTE_TICK';
    h: number;
    a: number;
    status: string;
    elapsed: number;
}

export interface StatisticData {
    fouls?: number;
    offsides?: number | null;
    "passes_%"?: string;
    red_cards?: number | null;
    total_shots?: number;
    corner_kicks?: number;
    total_passes?: number;
    yellow_cards?: number | null;
    blocked_shots?: number;
    shots_on_goal?: number;
    expected_goals?: string;
    shots_off_goal?: number;
    ball_possession?: string;
    goals_prevented?: string;
    passes_accurate?: number;
    shots_insidebox?: number;
    goalkeeper_saves?: number;
    shots_outsidebox?: number;
    [key: string]: any;
}

export interface TeamStats {
    teamId: string;
    teamName: string;
    teamLogo: string;
    statistics: StatisticData;
}

export interface StatsUpdatedPayload {
    matchId: string;
    stats: TeamStats[];
}

export interface TimelineEventDetail {
    id?: string;
    type: 'Goal' | 'Card' | 'subst' | 'Var';
    minute?: number;
    time?: { elapsed: number };
    team?: { id: string; name: string; logo_url?: string };
    player?: { id: string; name: string; photo?: string | null };
    detail?: string;
}

export interface TimelineUpdatedPayload {
    matchId: string;
    lastEvent: TimelineEventDetail | null;
    totalEvents: number;
}

export interface GoalScoredPayload {
    matchId: string;
    teamId?: string;
    player?: string;
    minute?: number;
}

export interface LineupsUpdatedPayload {
    matchId: string;
    lineups: any[];
}

export interface MatchMessagePayload {
    matchId: string;
    userId: string;
    name: string;
    teamName: string;
    message: string;
    timestamp: number;
}

// ============================================================================
// CHAT EVENTS
// ============================================================================

export interface ChatMessagePayload {
    userId: string;
    name: string;
    teamName: string;
    message: string;
    timestamp?: number;
}
