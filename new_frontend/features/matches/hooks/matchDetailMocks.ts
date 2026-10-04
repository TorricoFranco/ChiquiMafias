import {
    MatchDetails,
    PreMatchResponse,
    ChatMessage,
    MatchLineup,
    TeamStats,
    MatchEvent,
} from '../types';


export const MOCK_TEAMS = {
    river: {
        id: 'river',
        name: 'River Plate',
        short_code: 'RIV',
        logo: 'https://media.api-sports.io/football/teams/435.png',
    },
    boca: {
        id: 'boca',
        name: 'Boca Juniors',
        short_code: 'BOC',
        logo: 'https://media.api-sports.io/football/teams/451.png',
    },
    racing: {
        id: 'racing',
        name: 'Racing Club',
        short_code: 'RAC',
        logo: 'https://media.api-sports.io/football/teams/436.png',
    },
    independiente: {
        id: 'independiente',
        name: 'Independiente',
        short_code: 'IND',
        logo: 'https://media.api-sports.io/football/teams/453.png',
    },
};

// Shared Venue
export const MOCK_VENUE = {
    name: 'Estadio Monumental',
    city: 'Buenos Aires',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
};

// Shared Lineups (Full)
export const MOCK_LINEUPS: MatchLineup[] = [
    {
        teamId: 'river',
        teamName: 'River Plate',
        formation: '4-3-1-2',
        coach: 'Marcelo Gallardo',
        kitColors: {
            player: { primary: '#ffffff', number: '#d20000', border: '#d20000' },
            goalkeeper: { primary: '#1c1b1b', number: '#ffffff', border: '#d2f000' },
        },
        startXI: [
            { id: 'p1', name: 'Franco Armani', number: 1, pos: 'G', grid: '1:1' },
            { id: 'p2', name: 'Fabricio Bustos', number: 16, pos: 'D', grid: '2:1' },
            { id: 'p3', name: 'Germán Pezzella', number: 6, pos: 'D', grid: '2:2' },
            { id: 'p4', name: 'Paulo Díaz', number: 17, pos: 'D', grid: '2:3' },
            { id: 'p5', name: 'Marcos Acuña', number: 24, pos: 'D', grid: '2:4' },
            { id: 'p6', name: 'Santiago Simón', number: 31, pos: 'M', grid: '3:1' },
            { id: 'p7', name: 'Enzo Pérez', number: 24, pos: 'M', grid: '3:2' },
            { id: 'p8', name: 'Maxi Meza', number: 8, pos: 'M', grid: '3:3' },
            { id: 'p9', name: 'Claudio Echeverri', number: 19, pos: 'M', grid: '4:1' },
            { id: 'p10', name: 'Facundo Colidio', number: 11, pos: 'F', grid: '5:1' },
            { id: 'p11', name: 'Miguel Borja', number: 9, pos: 'F', grid: '5:2' },
        ],
        substitutes: [
            { id: 's1', name: 'Jeremías Ledesma', number: 25, pos: 'G' },
            { id: 's2', name: 'Federico Gattoni', number: 2, pos: 'D' },
            { id: 's3', name: 'Milton Casco', number: 20, pos: 'D' },
            { id: 's4', name: 'Ignacio Fernández', number: 26, pos: 'M' },
            { id: 's5', name: 'Manuel Lanzini', number: 10, pos: 'M' },
            { id: 's6', name: 'Pablo Solari', number: 36, pos: 'F' },
            { id: 's7', name: 'Adam Bareiro', number: 7, pos: 'F' },
        ],
    },
    {
        teamId: 'boca',
        teamName: 'Boca Juniors',
        formation: '4-4-2',
        coach: 'Fernando Gago',
        kitColors: {
            player: { primary: '#002b66', number: '#f7c300', border: '#f7c300' },
            goalkeeper: { primary: '#00a86b', number: '#ffffff', border: '#ffffff' },
        },
        startXI: [
            { id: 'bp1', name: 'Sergio Romero', number: 1, pos: 'G', grid: '1:1' },
            { id: 'bp2', name: 'Luis Advíncula', number: 17, pos: 'D', grid: '2:1' },
            { id: 'bp3', name: 'Cristian Lema', number: 2, pos: 'D', grid: '2:2' },
            { id: 'bp4', name: 'Marcos Rojo', number: 6, pos: 'D', grid: '2:3' },
            { id: 'bp5', name: 'Lautaro Blanco', number: 23, pos: 'D', grid: '2:4' },
            { id: 'bp6', name: 'Kevin Zenón', number: 22, pos: 'M', grid: '3:1' },
            { id: 'bp7', name: 'Ignacio Miramón', number: 21, pos: 'M', grid: '3:2' },
            { id: 'bp8', name: 'Tomás Belmonte', number: 30, pos: 'M', grid: '3:3' },
            { id: 'bp9', name: 'Agustín Martegani', number: 19, pos: 'M', grid: '3:4' },
            { id: 'bp10', name: 'Miguel Merentiel', number: 16, pos: 'F', grid: '4:1' },
            { id: 'bp11', name: 'Edinson Cavani', number: 10, pos: 'F', grid: '4:2' },
        ],
        substitutes: [
            { id: 'bs1', name: 'Leandro Brey', number: 12, pos: 'G' },
            { id: 'bs2', name: 'Nicolás Figal', number: 4, pos: 'D' },
            { id: 'bs3', name: 'Frank Fabra', number: 18, pos: 'D' },
            { id: 'bs4', name: 'Jabes Saralegui', number: 47, pos: 'M' },
            { id: 'bs5', name: 'Lucas Janson', number: 11, pos: 'F' },
            { id: 'bs6', name: 'Milton Giménez', number: 9, pos: 'F' },
            { id: 'bs7', name: 'Exequiel Zeballos', number: 7, pos: 'F' },
        ],
    },
];

// Shared Complete Stats
export const MOCK_STATS_COMPLETE: TeamStats[] = [
    {
        teamId: 'river',
        teamName: 'River Plate',
        teamLogo: 'https://media.api-sports.io/football/teams/435.png',
        statistics: {
            fouls: 11,
            offsides: 2,
            'passes_%': '86%',
            red_cards: 0,
            total_shots: 14,
            corner_kicks: 6,
            total_passes: 482,
            yellow_cards: 2,
            blocked_shots: 3,
            shots_on_goal: 7,
            expected_goals: '1.82',
            shots_off_goal: 4,
            ball_possession: '58%',
            goals_prevented: '0.45',
            passes_accurate: 415,
            shots_insidebox: 9,
            goalkeeper_saves: 3,
            shots_outsidebox: 5,
        },
    },
    {
        teamId: 'boca',
        teamName: 'Boca Juniors',
        teamLogo: 'https://media.api-sports.io/football/teams/451.png',
        statistics: {
            fouls: 14,
            offsides: 1,
            'passes_%': '79%',
            red_cards: 1,
            total_shots: 8,
            corner_kicks: 3,
            total_passes: 345,
            yellow_cards: 4,
            blocked_shots: 1,
            shots_on_goal: 4,
            expected_goals: '0.94',
            shots_off_goal: 3,
            ball_possession: '42%',
            goals_prevented: '1.20',
            passes_accurate: 272,
            shots_insidebox: 5,
            goalkeeper_saves: 5,
            shots_outsidebox: 3,
        },
    },
];

// Shared Incomplete Stats (Nulls tested)
export const MOCK_STATS_INCOMPLETE: TeamStats[] = [
    {
        teamId: 'river',
        teamName: 'River Plate',
        teamLogo: 'https://media.api-sports.io/football/teams/435.png',
        statistics: {
            fouls: 3,
            offsides: null,
            'passes_%': null,
            red_cards: 0,
            total_shots: 2,
            corner_kicks: 1,
            total_passes: null,
            yellow_cards: 1,
            blocked_shots: null,
            shots_on_goal: 1,
            expected_goals: null,
            shots_off_goal: 1,
            ball_possession: '52%',
            goals_prevented: null,
            passes_accurate: null,
            shots_insidebox: null,
            goalkeeper_saves: null,
            shots_outsidebox: null,
        },
    },
    {
        teamId: 'boca',
        teamName: 'Boca Juniors',
        teamLogo: 'https://media.api-sports.io/football/teams/451.png',
        statistics: {
            fouls: 4,
            offsides: null,
            'passes_%': null,
            red_cards: 0,
            total_shots: 1,
            corner_kicks: 0,
            total_passes: null,
            yellow_cards: 0,
            blocked_shots: null,
            shots_on_goal: 0,
            expected_goals: null,
            shots_off_goal: 1,
            ball_possession: '48%',
            goals_prevented: null,
            passes_accurate: null,
            shots_insidebox: null,
            goalkeeper_saves: null,
            shots_outsidebox: null,
        },
    },
];

// Shared Events (Chronological)
export const MOCK_EVENTS: MatchEvent[] = [
    {
        id: 'ev-1',
        minute: 18,
        extraMinute: null,
        type: 'Card',
        detail: 'Tarjeta Amarilla - Falta táctica',
        team: { id: 'boca', name: 'Boca Juniors', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        player: { id: 'bp4', name: 'Marcos Rojo', photo: null },
        assist: null,
        substitutionLog: null,
    },
    {
        id: 'ev-2',
        minute: 27,
        extraMinute: null,
        type: 'Goal',
        detail: 'Gol de Jugada (Remate cruzado al ángulo)',
        team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        player: { id: 'p11', name: 'Miguel Borja', photo: null },
        assist: { id: 'p9', name: 'Claudio Echeverri', photo: null },
        substitutionLog: null,
    },
    {
        id: 'ev-3',
        minute: 44,
        extraMinute: 2,
        type: 'Card',
        detail: 'Tarjeta Amarilla - Reclamos excesivos',
        team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        player: { id: 'p7', name: 'Enzo Pérez', photo: null },
        assist: null,
        substitutionLog: null,
    },
    {
        id: 'ev-4',
        minute: 54,
        extraMinute: null,
        type: 'Goal',
        detail: 'Gol de Cabeza tras tiro libre lateral',
        team: { id: 'boca', name: 'Boca Juniors', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        player: { id: 'bp11', name: 'Edinson Cavani', photo: null },
        assist: { id: 'bp6', name: 'Kevin Zenón', photo: null },
        substitutionLog: null,
    },
    {
        id: 'ev-5',
        minute: 63,
        extraMinute: null,
        type: 'subst',
        detail: 'Sustitución táctica doble',
        team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        player: null,
        assist: null,
        substitutionLog: { playerIn: 'Manuel Lanzini', playerOut: 'Claudio Echeverri' },
    },
    {
        id: 'ev-6',
        minute: 71,
        extraMinute: null,
        type: 'Var',
        detail: 'Revisión VAR: Posible penal desestimado por offside previo',
        team: null,
        player: null,
        assist: null,
        substitutionLog: null,
    },
    {
        id: 'ev-7',
        minute: 78,
        extraMinute: null,
        type: 'Goal',
        detail: 'Golazo de zurda al ángulo superior derecho',
        team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        player: { id: 'p10', name: 'Facundo Colidio', photo: null },
        assist: { id: 'p5', name: 'Marcos Acuña', photo: null },
        substitutionLog: null,
    },
    {
        id: 'ev-8',
        minute: 85,
        extraMinute: null,
        type: 'Card',
        detail: 'Tarjeta Roja Directa - Entrada temeraria como último hombre',
        team: { id: 'boca', name: 'Boca Juniors', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        player: { id: 'bp3', name: 'Cristian Lema', photo: null },
        assist: null,
        substitutionLog: null,
    },
];

// Pre-Match Complete Mock
export const MOCK_PRE_MATCH: PreMatchResponse = {
    history: {
        homeWins: 86,
        awayWins: 91,
        draws: 84,
        total: 261,
        lastMatches: [
            { id: 'h1', date: '21/04/2024', homeTeam: 'River Plate', awayTeam: 'Boca Juniors', homeScore: 2, awayScore: 3, tournament: 'Copa de la Liga' },
            { id: 'h2', date: '25/02/2024', homeTeam: 'River Plate', awayTeam: 'Boca Juniors', homeScore: 1, awayScore: 1, tournament: 'Copa de la Liga' },
            { id: 'h3', date: '01/10/2023', homeTeam: 'Boca Juniors', awayTeam: 'River Plate', homeScore: 0, awayScore: 2, tournament: 'Copa de la Liga' },
            { id: 'h4', date: '07/05/2023', homeTeam: 'River Plate', awayTeam: 'Boca Juniors', homeScore: 1, awayScore: 0, tournament: 'Liga Profesional' },
            { id: 'h5', date: '11/09/2022', homeTeam: 'Boca Juniors', awayTeam: 'River Plate', homeScore: 1, awayScore: 0, tournament: 'Liga Profesional' },
        ],
    },
    form: {
        home: 'V-V-E-V-D',
        away: 'D-V-E-V-V',
    },
    miniTable: {
        tournament: {
            home: [
                { position: 1, teamId: 'river', teamName: 'River Plate', played: 9, points: 21, goalDiff: 9 },
                { position: 2, teamId: 'racing', teamName: 'Racing Club', played: 9, points: 19, goalDiff: 6 },
                { position: 3, teamId: 'argentinos', teamName: 'Argentinos Jrs', played: 9, points: 18, goalDiff: 4 },
            ],
            away: [
                { position: 2, teamId: 'estudiantes', teamName: 'Estudiantes LP', played: 9, points: 20, goalDiff: 7 },
                { position: 3, teamId: 'boca', teamName: 'Boca Juniors', played: 9, points: 18, goalDiff: 5 },
                { position: 4, teamId: 'independiente', teamName: 'Independiente', played: 9, points: 16, goalDiff: 3 },
            ],
        },
        annual: {
            home: [
                { position: 1, teamId: 'river', teamName: 'River Plate', played: 9, points: 21, goalDiff: 9 },
            ],
            away: [
                { position: 3, teamId: 'boca', teamName: 'Boca Juniors', played: 9, points: 18, goalDiff: 5 },
            ],
        },
        averages: {
            home: [
                { position: 1, teamId: 'river', teamName: 'River Plate', played: 91, points: 165, goalDiff: 45, coefficient: 1.813 },
            ],
            away: [
                { position: 2, teamId: 'boca', teamName: 'Boca Juniors', played: 91, points: 151, goalDiff: 32, coefficient: 1.659 },
            ],
        },
    },
};

// Initial Chat Mock
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
    {
        messageId: 'msg-1',
        matchId: 'match-10-1',
        userId: 'u-1',
        name: 'MilloDeCorazon',
        teamName: 'River Plate',
        badgeUrl: null,
        message: '¡Vamos Millonario hoy que tenemos que quedar punteros solos!',
        timestamp: Date.now() - 1200000,
    },
    {
        messageId: 'msg-2',
        matchId: 'match-10-1',
        userId: 'u-2',
        name: 'BosteroDeLaBoca',
        teamName: 'Boca Juniors',
        badgeUrl: null,
        message: 'Tranquilos que con Cavani enchufado se los damos vuelta.',
        timestamp: Date.now() - 900000,
    },
    {
        messageId: 'msg-3',
        matchId: 'match-10-1',
        userId: 'u-3',
        name: 'TribuneroVIP',
        teamName: 'River Plate',
        badgeUrl: null,
        message: '📢 ¡EXPLOTA EL MONUMENTAL CON 85.000 HINCHAS! 📢',
        timestamp: Date.now() - 300000,
        isMegaphone: true,
    },
];

// ==========================================
// SCENARIO FACTORY (All 23+ Scenarios from Spec)
// ==========================================

export interface ScenarioDefinition {
    id: number;
    slug: string;
    name: string;
    category: 'PRE_MATCH' | 'LIVE' | 'FINISHED' | 'SPECIAL' | 'ERRORS_WS' | 'CHAT';
    description: string;
    details: MatchDetails | null;
    preMatch: PreMatchResponse | null;
    chatMessages: ChatMessage[];
    hasMainError?: boolean;
    hasPreMatchError?: boolean;
    wsConnected?: boolean;
}

export function buildScenario(id: number): ScenarioDefinition {
    switch (id) {
        // 1. Partido no iniciado sin formaciones
        case 1:
            return {
                id: 1,
                slug: 'ns-no-lineups',
                name: '1. No iniciado (Sin formaciones)',
                category: 'PRE_MATCH',
                description: 'Estado NS. Formaciones aún no confirmadas. Pre-match disponible.',
                details: {
                    metadata: {
                        id: 'match-ns-1',
                        status: 'NS',
                        status_long: 'No Comenzado',
                        date: new Date(Date.now() + 7200000).toISOString(),
                        timestamp: Math.floor((Date.now() + 7200000) / 1000),
                        referee: 'Facundo Tello',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: null,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: [], // Sin formaciones
                    events: [],
                    stats: [],
                    isLive: false,
                    chatActive: false,
                },
                preMatch: MOCK_PRE_MATCH,
                chatMessages: [],
                wsConnected: true,
            };

        // 2. Partido no iniciado con formaciones y pre-match completo
        case 2:
            return {
                id: 2,
                slug: 'ns-with-lineups',
                name: '2. No iniciado (Con formaciones & Pre-Match)',
                category: 'PRE_MATCH',
                description: 'Estado SCHEDULED. Ambas formaciones ya fueron publicadas por los DTs.',
                details: {
                    metadata: {
                        id: 'match-ns-2',
                        status: 'SCHEDULED',
                        status_long: 'Programado (Formaciones Confirmadas)',
                        date: new Date(Date.now() + 1800000).toISOString(),
                        timestamp: Math.floor((Date.now() + 1800000) / 1000),
                        referee: 'Yael Falcón Pérez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: null,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [],
                    stats: [],
                    isLive: false,
                    chatActive: true, // Chat habilitado en la previa
                },
                preMatch: MOCK_PRE_MATCH,
                chatMessages: MOCK_CHAT_MESSAGES.slice(0, 2),
                wsConnected: true,
            };

        // 3. Partido en vivo en primer tiempo (1H)
        case 3:
            return {
                id: 3,
                slug: 'live-1h',
                name: '3. En vivo: Primer Tiempo (1H)',
                category: 'LIVE',
                description: 'Minuto 34 del 1T. River 1 - Boca 0. Estadísticas vivas y chat activo.',
                details: {
                    metadata: {
                        id: 'match-live-1',
                        status: '1H',
                        status_long: 'Primer Tiempo en Curso',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 34,
                        summary: {
                            goals: [{ min: 27, player: 'Miguel Borja', team: 'River Plate' }],
                            redCards: [],
                            lastUpdate: 'Minuto 34',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 2),
                    stats: [
                        {
                            ...MOCK_STATS_COMPLETE[0],
                            statistics: { ...MOCK_STATS_COMPLETE[0].statistics, total_shots: 6, shots_on_goal: 3, ball_possession: '61%' },
                        },
                        {
                            ...MOCK_STATS_COMPLETE[1],
                            statistics: { ...MOCK_STATS_COMPLETE[1].statistics, total_shots: 2, shots_on_goal: 1, ball_possession: '39%' },
                        },
                    ],
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null, // No solicitado en vivo
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 4. Partido en descanso (HT)
        case 4:
            return {
                id: 4,
                slug: 'live-ht',
                name: '4. Entretiempo (HT)',
                category: 'LIVE',
                description: 'Descanso tras los primeros 45 minutos reglamentarios.',
                details: {
                    metadata: {
                        id: 'match-ht',
                        status: 'HT',
                        status_long: 'Entretiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 45,
                        summary: {
                            goals: [{ min: 27, player: 'Miguel Borja', team: 'River Plate' }],
                            redCards: [],
                            lastUpdate: 'Entretiempo',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 3),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 5. Partido en vivo con goles, tarjetas y sustituciones (2H)
        case 5:
            return {
                id: 5,
                slug: 'live-full-events',
                name: '5. En vivo: 2H (Goles, Rojas, Cambios & VAR)',
                category: 'LIVE',
                description: 'Minuto 88 en curso. River 2 - Boca 1. 8 eventos cronológicos completos.',
                details: {
                    metadata: {
                        id: 'match-live-full',
                        status: '2H',
                        status_long: 'Segundo Tiempo en Curso',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 2,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 88,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                                { min: 78, player: 'Facundo Colidio', team: 'River Plate' },
                            ],
                            redCards: [{ min: 85, player: 'Cristian Lema', team: 'Boca Juniors' }],
                            lastUpdate: 'Minuto 88',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS,
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 6. Partido con estadísticas incompletas (nulls)
        case 6:
            return {
                id: 6,
                slug: 'incomplete-stats',
                name: '6. Datos Estadísticos Incompletos (Nulls)',
                category: 'SPECIAL',
                description: 'Campos estadísticos con valores null representados como no disponible.',
                details: {
                    metadata: {
                        id: 'match-incomplete-stats',
                        status: '1H',
                        status_long: 'Primer Tiempo (Minuto 8)',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Fernando Espinoza',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 8,
                        summary: { goals: [], redCards: [], lastUpdate: 'Minuto 8' },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [],
                    stats: MOCK_STATS_INCOMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: [],
                wsConnected: true,
            };

        // 7. Partido finalizado (FT)
        case 7:
            return {
                id: 7,
                slug: 'finished-ft',
                name: '7. Finalizado Reglamentario (FT)',
                category: 'FINISHED',
                description: 'Resultado final 2-1. Actualizaciones en vivo detenidas.',
                details: {
                    metadata: {
                        id: 'match-ft',
                        status: 'FT',
                        status_long: 'Final del Partido',
                        date: new Date(Date.now() - 7200000).toISOString(),
                        timestamp: Math.floor((Date.now() - 7200000) / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 2,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 90,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                                { min: 78, player: 'Facundo Colidio', team: 'River Plate' },
                            ],
                            redCards: [{ min: 85, player: 'Cristian Lema', team: 'Boca Juniors' }],
                            lastUpdate: 'Finalizado',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS,
                    stats: MOCK_STATS_COMPLETE,
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 8. Partido finalizado tras tiempo extra (AET)
        case 8:
            return {
                id: 8,
                slug: 'finished-aet',
                name: '8. Finalizado Tiempo Extra (AET)',
                category: 'FINISHED',
                description: 'Definición en 120 minutos de prórroga en Fase de Playoffs.',
                details: {
                    metadata: {
                        id: 'match-aet',
                        status: 'AET',
                        status_long: 'Final tras Tiempo Suplementario',
                        date: new Date(Date.now() - 10800000).toISOString(),
                        timestamp: Math.floor((Date.now() - 10800000) / 1000),
                        referee: 'Wilmar Roldán',
                        round: 'Cuartos de Final',
                        tournament: 'Copa Libertadores 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 3,
                        away: 2,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 120,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                                { min: 78, player: 'Facundo Colidio', team: 'River Plate' },
                                { min: 89, player: 'Miguel Merentiel', team: 'Boca Juniors' },
                                { min: 112, player: 'Adam Bareiro', team: 'River Plate' },
                            ],
                            redCards: [],
                            lastUpdate: 'Finalizado 120 min',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS,
                    stats: MOCK_STATS_COMPLETE,
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 9. Partido en penales (PEN)
        case 9:
            return {
                id: 9,
                slug: 'penalties-pen',
                name: '9. Definición por Penales (PEN)',
                category: 'FINISHED',
                description: 'Empate 1-1 en los 90/120 min. Tanda de penales: River 4 - Boca 2.',
                details: {
                    metadata: {
                        id: 'match-pen',
                        status: 'PEN',
                        status_long: 'Finalizado por Penales',
                        date: new Date(Date.now() - 7200000).toISOString(),
                        timestamp: Math.floor((Date.now() - 7200000) / 1000),
                        referee: 'Facundo Tello',
                        round: 'Semifinal Playoff',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 1,
                        home_penalties: 4,
                        away_penalties: 2,
                        elapsed: 120,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                            ],
                            redCards: [],
                            lastUpdate: 'Penales: (4) - (2)',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 4),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 10. Partido suspendido (SUSP)
        case 10:
            return {
                id: 10,
                slug: 'suspended-susp',
                name: '10. Partido Suspendido (SUSP)',
                category: 'SPECIAL',
                description: 'Partido interrumpido a los 23 minutos por condiciones climáticas.',
                details: {
                    metadata: {
                        id: 'match-susp',
                        status: 'SUSP',
                        status_long: 'Suspendido por Tormenta Eléctrica',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Leandro Rey Hilfer',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 23,
                        summary: { goals: [], redCards: [], lastUpdate: 'Suspendido a los 23 min' },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [MOCK_EVENTS[0]],
                    stats: MOCK_STATS_INCOMPLETE,
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES.slice(0, 1),
                wsConnected: true,
            };

        // 11. Partido cancelado (CANC)
        case 11:
            return {
                id: 11,
                slug: 'cancelled-canc',
                name: '11. Partido Cancelado (CANC)',
                category: 'SPECIAL',
                description: 'Cancelado por fuerza mayor antes del pitazo inicial.',
                details: {
                    metadata: {
                        id: 'match-canc',
                        status: 'CANC',
                        status_long: 'Cancelado',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: null,
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: null,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: [],
                    events: [],
                    stats: [],
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: [],
                wsConnected: true,
            };

        // 12. Partido sin eventos
        case 12:
            return {
                id: 12,
                slug: 'no-events',
                name: '12. Sin Eventos Registrados',
                category: 'SPECIAL',
                description: 'Partido en curso (min 15) donde todavía no ocurrieron goles ni tarjetas.',
                details: {
                    metadata: {
                        id: 'match-no-events',
                        status: '1H',
                        status_long: 'Primer Tiempo en Curso',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 15,
                        summary: { goals: [], redCards: [], lastUpdate: 'Minuto 15' },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [], // Array vacío
                    stats: MOCK_STATS_INCOMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES.slice(0, 1),
                wsConnected: true,
            };

        // 13. Error del detalle principal
        case 13:
            return {
                id: 13,
                slug: 'main-error',
                name: '13. Error Fatal del Detalle Principal',
                category: 'ERRORS_WS',
                description: 'Fallo HTTP 500 al consultar el partido. Pantalla de error con reintento.',
                details: null,
                hasMainError: true,
                preMatch: null,
                chatMessages: [],
                wsConnected: false,
            };

        // 14. Error únicamente del pre-match
        case 14:
            return {
                id: 14,
                slug: 'pre-match-error',
                name: '14. Error Exclusivo de Pre-Match',
                category: 'ERRORS_WS',
                description: 'Detalle principal cargado OK, pero falla el endpoint de historial y tablas.',
                details: {
                    metadata: {
                        id: 'match-pre-error',
                        status: 'NS',
                        status_long: 'No Comenzado',
                        date: new Date(Date.now() + 3600000).toISOString(),
                        timestamp: Math.floor((Date.now() + 3600000) / 1000),
                        referee: 'Yael Falcón Pérez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: null,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [],
                    stats: [],
                    isLive: false,
                    chatActive: false,
                },
                hasPreMatchError: true,
                preMatch: null,
                chatMessages: [],
                wsConnected: true,
            };

        // 15. WebSocket desconectado
        case 15:
            return {
                id: 15,
                slug: 'ws-disconnected',
                name: '15. WebSocket Desconectado',
                category: 'ERRORS_WS',
                description: 'Conexión en tiempo real caída. Conserva datos previos con badge de reconexión.',
                details: {
                    metadata: {
                        id: 'match-ws-down',
                        status: '2H',
                        status_long: 'Segundo Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 2,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 67,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                            ],
                            redCards: [],
                            lastUpdate: 'Minuto 67',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 5),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: false, // Desconectado
            };

        // 16. Evento duplicado en timeline
        case 16:
            return {
                id: 16,
                slug: 'duplicate-event-test',
                name: '16. Test: Recepción de Evento Duplicado',
                category: 'SPECIAL',
                description: 'Simula el envío de un evento repetido para certificar que no se duplica.',
                details: {
                    metadata: {
                        id: 'match-dup-test',
                        status: '1H',
                        status_long: 'Primer Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 30,
                        summary: { goals: [{ min: 27, player: 'Miguel Borja', team: 'River Plate' }], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [MOCK_EVENTS[0], MOCK_EVENTS[1]],
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 17. Actualización de estadísticas en vivo
        case 17:
            return {
                id: 17,
                slug: 'stats-update-live',
                name: '17. Test: Actualización Live de Estadísticas',
                category: 'LIVE',
                description: 'Payload stats_updated actualiza métricas sin alterar score ni eventos.',
                details: {
                    metadata: {
                        id: 'match-stats-live',
                        status: '2H',
                        status_long: 'Segundo Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 60,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                            ],
                            redCards: [],
                            lastUpdate: 'Minuto 60',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 4),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 18. Cambio de estado de NS a 1H (Pitazo inicial)
        case 18:
            return {
                id: 18,
                slug: 'transition-ns-to-1h',
                name: '18. Transición: Inicio de Partido (NS ➔ 1H)',
                category: 'LIVE',
                description: 'Transición reactiva: desactiva sección pre-match y abre interfaz en vivo.',
                details: {
                    metadata: {
                        id: 'match-trans-1',
                        status: '1H',
                        status_long: 'Arrancó el Partido (Minuto 1)',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 1,
                        summary: { goals: [], redCards: [], lastUpdate: 'Minuto 1' },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [],
                    stats: MOCK_STATS_INCOMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES.slice(0, 2),
                wsConnected: true,
            };

        // 19. Cambio de estado de 2H a FT (Pitazo final)
        case 19:
            return {
                id: 19,
                slug: 'transition-2h-to-ft',
                name: '19. Transición: Fin de Partido (2H ➔ FT)',
                category: 'FINISHED',
                description: 'Transición reactiva: fija el score final y desactiva actualizaciones periódicas.',
                details: {
                    metadata: {
                        id: 'match-trans-2',
                        status: 'FT',
                        status_long: 'Partido Finalizado',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 2,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 90,
                        summary: {
                            goals: [
                                { min: 27, player: 'Miguel Borja', team: 'River Plate' },
                                { min: 54, player: 'Edinson Cavani', team: 'Boca Juniors' },
                                { min: 78, player: 'Facundo Colidio', team: 'River Plate' },
                            ],
                            redCards: [{ min: 85, player: 'Cristian Lema', team: 'Boca Juniors' }],
                            lastUpdate: 'Finalizado',
                        },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS,
                    stats: MOCK_STATS_COMPLETE,
                    isLive: false,
                    chatActive: false,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 20. Chat Activo
        case 20:
            return {
                id: 20,
                slug: 'chat-active',
                name: '20. Chat en Vivo Activo',
                category: 'CHAT',
                description: 'chatActive = true. Los hinchas pueden enviar mensajes y stickers.',
                details: {
                    metadata: {
                        id: 'match-chat-on',
                        status: '2H',
                        status_long: 'Segundo Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Facundo Tello',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 65,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 4),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 21. Chat Inactivo
        case 21:
            return {
                id: 21,
                slug: 'chat-inactive',
                name: '21. Chat Deshabilitado (Solo Lectura)',
                category: 'CHAT',
                description: 'chatActive = false. Muestra aviso de chat deshabilitado por el administrador.',
                details: {
                    metadata: {
                        id: 'match-chat-off',
                        status: '2H',
                        status_long: 'Segundo Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Facundo Tello',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 1,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 65,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 4),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: false, // Chat apagado
                },
                preMatch: null,
                chatMessages: MOCK_CHAT_MESSAGES,
                wsConnected: true,
            };

        // 22. Historial de chat vacío
        case 22:
            return {
                id: 22,
                slug: 'chat-empty',
                name: '22. Chat con Historial Vacío',
                category: 'CHAT',
                description: 'Sala de chat sin mensajes previos. Muestra invitación a iniciar conversación.',
                details: {
                    metadata: {
                        id: 'match-chat-empty',
                        status: '1H',
                        status_long: 'Primer Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 0,
                        away: 0,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 5,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: [],
                    stats: MOCK_STATS_INCOMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: [], // Vacío
                wsConnected: true,
            };

        // 23. Eliminación de mensaje de chat
        case 23:
            return {
                id: 23,
                slug: 'chat-message-deleted',
                name: '23. Test: Eliminación de Mensaje (Mod)',
                category: 'CHAT',
                description: 'Simula la llegada de on_message_deleted y remoción instantánea en UI.',
                details: {
                    metadata: {
                        id: 'match-msg-del',
                        status: '2H',
                        status_long: 'Segundo Tiempo',
                        date: new Date().toISOString(),
                        timestamp: Math.floor(Date.now() / 1000),
                        referee: 'Nicolás Ramírez',
                        round: 'Fecha 10',
                        tournament: 'Torneo Apertura 2026',
                        venue: MOCK_VENUE,
                    },
                    score: {
                        home: 2,
                        away: 1,
                        home_penalties: null,
                        away_penalties: null,
                        elapsed: 80,
                        summary: { goals: [], redCards: [], lastUpdate: null },
                    },
                    teams: { home: MOCK_TEAMS.river, away: MOCK_TEAMS.boca },
                    lineups: MOCK_LINEUPS,
                    events: MOCK_EVENTS.slice(0, 6),
                    stats: MOCK_STATS_COMPLETE,
                    isLive: true,
                    chatActive: true,
                },
                preMatch: null,
                chatMessages: [
                    ...MOCK_CHAT_MESSAGES,
                    {
                        messageId: 'spam-msg-99',
                        matchId: 'match-msg-del',
                        userId: 'bot-1',
                        name: 'SpamUser',
                        teamName: null,
                        badgeUrl: null,
                        message: 'Mensaje indebido que será eliminado por moderación...',
                        timestamp: Date.now() - 5000,
                    },
                ],
                wsConnected: true,
            };

        default:
            return buildScenario(3); // Default live
    }
}

export const ALL_SCENARIOS: ScenarioDefinition[] = Array.from({ length: 23 }, (_, i) =>
    buildScenario(i + 1)
);
