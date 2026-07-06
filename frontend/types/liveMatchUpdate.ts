export interface LiveMatchUpdate {
    h: number;
    a: number;
    hp: number;
    ap: number;
    homeTeamId: string;
    awayTeamId: string;
    status: string;
    isLive: boolean;
    isPlayoff: boolean;
    elapsed?: number;
}

export type LiveResultsMap = Record<string, LiveMatchUpdate>;