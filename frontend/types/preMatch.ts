export interface PreMatchResponse {
    history: {
        homeWins: number;
        awayWins: number;
        draws: number;
        total: number;
        lastMatches: HistoricMatch[];
    };
    form: {
        home: string; // Ej: "EPGGP"
        away: string;
    };
    miniTable: {
        tournament: MiniTableSection;
        annual: MiniTableSection;
        averages: MiniTableSection;
    };
}

interface HistoricMatch {
    fixture: {
        id: number;
        date: string;
        venue: { name: string; city: string };
        status: { short: string };
    };
    teams: {
        home: HistoricTeam;
        away: HistoricTeam;
    };
    goals: { home: number; away: number };
}

interface HistoricTeam {
    id: number;
    name: string;
    logo: string;
}

interface MiniTableSection {
    home: TableRow[];
    away: TableRow[];
}

interface TableRow {
    rank: number;
    teamId: number;
    name: string;
    logo: string;
    points: number;
    played: number;
    goalsDiff: number;
    isTarget: boolean;
}