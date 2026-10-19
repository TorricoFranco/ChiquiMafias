import {
    FullStandings,
    StandingRow,
    AverageRow,
    LeagueMatch,
    BracketMatch,
    TeamInfo,
    SimulatedResult,
    AvailableStages,
} from '../type';

// 30 Teams of Liga Profesional Argentina 2026
export const ARGENTINA_TEAMS_2026: TeamInfo[] = [
    // ZONA A (15 equipos)
    { id: 'river', name: 'River Plate', shortCode: 'RIV', logo: 'https://media.api-sports.io/football/teams/435.png', zone: 'A' },
    { id: 'racing', name: 'Racing Club', shortCode: 'RAC', logo: 'https://media.api-sports.io/football/teams/436.png', zone: 'A' },
    { id: 'argentinos', name: 'Argentinos Juniors', shortCode: 'ARG', logo: 'https://media.api-sports.io/football/teams/442.png', zone: 'A' },
    { id: 'huracan', name: 'Huracán', shortCode: 'HUR', logo: 'https://media.api-sports.io/football/teams/440.png', zone: 'A' },
    { id: 'ind_rivadavia', name: 'Independiente Rivadavia', shortCode: 'IRV', logo: 'https://media.api-sports.io/football/teams/449.png', zone: 'A' },
    { id: 'instituto', name: 'Instituto (Cba)', shortCode: 'INS', logo: 'https://media.api-sports.io/football/teams/450.png', zone: 'A' },
    { id: 'barracas', name: 'Barracas Central', shortCode: 'BAR', logo: 'https://media.api-sports.io/football/teams/456.png', zone: 'A' },
    { id: 'talleres', name: 'Talleres (Cba)', shortCode: 'TAL', logo: 'https://media.api-sports.io/football/teams/455.png', zone: 'A' },
    { id: 'gimnasia', name: 'Gimnasia LP', shortCode: 'GLP', logo: 'https://media.api-sports.io/football/teams/434.png', zone: 'A' },
    { id: 'velez', name: 'Vélez Sarsfield', shortCode: 'VEL', logo: 'https://media.api-sports.io/football/teams/437.png', zone: 'A' },
    { id: 'banfield', name: 'Banfield', shortCode: 'BAN', logo: 'https://media.api-sports.io/football/teams/439.png', zone: 'A' },
    { id: 'central', name: 'Rosario Central', shortCode: 'CEN', logo: 'https://media.api-sports.io/football/teams/441.png', zone: 'A' },
    { id: 'riestra', name: 'Deportivo Riestra', shortCode: 'RIE', logo: 'https://media.api-sports.io/football/teams/464.png', zone: 'A' },
    { id: 'atletico_tuc', name: 'Atlético Tucumán', shortCode: 'ATU', logo: 'https://media.api-sports.io/football/teams/448.png', zone: 'A' },
    { id: 'sarmiento', name: 'Sarmiento (Junín)', shortCode: 'SAR', logo: 'https://media.api-sports.io/football/teams/451.png', zone: 'A' },

    // ZONA B (15 equipos)
    { id: 'boca', name: 'Boca Juniors', shortCode: 'BOC', logo: 'https://media.api-sports.io/football/teams/451.png', zone: 'B' },
    { id: 'san_lorenzo', name: 'San Lorenzo', shortCode: 'SLO', logo: 'https://media.api-sports.io/football/teams/458.png', zone: 'B' },
    { id: 'independiente', name: 'Independiente', shortCode: 'IND', logo: 'https://media.api-sports.io/football/teams/453.png', zone: 'B' },
    { id: 'estudiantes', name: 'Estudiantes LP', shortCode: 'EDL', logo: 'https://media.api-sports.io/football/teams/445.png', zone: 'B' },
    { id: 'lanus', name: 'Lanús', shortCode: 'LAN', logo: 'https://media.api-sports.io/football/teams/446.png', zone: 'B' },
    { id: 'godoy_cruz', name: 'Godoy Cruz', shortCode: 'GOD', logo: 'https://media.api-sports.io/football/teams/443.png', zone: 'B' },
    { id: 'defensa', name: 'Defensa y Justicia', shortCode: 'DYJ', logo: 'https://media.api-sports.io/football/teams/444.png', zone: 'B' },
    { id: 'newells', name: "Newell's Old Boys", shortCode: 'NOB', logo: 'https://media.api-sports.io/football/teams/454.png', zone: 'B' },
    { id: 'platense', name: 'Platense', shortCode: 'PLA', logo: 'https://media.api-sports.io/football/teams/457.png', zone: 'B' },
    { id: 'belgrano', name: 'Belgrano (Cba)', shortCode: 'BEL', logo: 'https://media.api-sports.io/football/teams/459.png', zone: 'B' },
    { id: 'union', name: 'Unión (Santa Fe)', shortCode: 'UNI', logo: 'https://media.api-sports.io/football/teams/460.png', zone: 'B' },
    { id: 'central_cordoba', name: 'Central Córdoba (SdE)', shortCode: 'CCO', logo: 'https://media.api-sports.io/football/teams/462.png', zone: 'B' },
    { id: 'tigre', name: 'Tigre', shortCode: 'TIG', logo: 'https://media.api-sports.io/football/teams/447.png', zone: 'B' },
    { id: 'aldosivi', name: 'Aldosivi', shortCode: 'ALD', logo: 'https://media.api-sports.io/football/teams/461.png', zone: 'B' },
    { id: 'san_martin_sj', name: 'San Martín (SJ)', shortCode: 'SMS', logo: 'https://media.api-sports.io/football/teams/463.png', zone: 'B' },
];

export const AVAILABLE_STAGES: AvailableStages = {
    regular: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    playoffs: [
        { key: 'octavos', labelShort: '8vos', labelFull: 'Octavos de Final' },
        { key: 'cuartos', labelShort: '4tos', labelFull: 'Cuartos de Final' },
        { key: 'semifinal', labelShort: 'Semi', labelFull: 'Semifinales' },
        { key: 'final', labelShort: 'Final', labelFull: 'Gran Final' },
    ],
};

// Base Standings Apertura 2026 (Zona A)
const BASE_APERTURA_A: StandingRow[] = [
    { position: 1, teamId: 'river', teamName: 'River Plate', teamLogo: 'https://media.api-sports.io/football/teams/435.png', points: 23, played: 10, won: 7, draw: 2, lost: 1, goalsFor: 21, goalsAgainst: 7, goalDiff: 14, description: 'Clasificado a Cuadro Final' },
    { position: 2, teamId: 'racing', teamName: 'Racing Club', teamLogo: 'https://media.api-sports.io/football/teams/436.png', points: 21, played: 10, won: 6, draw: 3, lost: 1, goalsFor: 18, goalsAgainst: 9, goalDiff: 9, description: 'Clasificado a Cuadro Final' },
    { position: 3, teamId: 'argentinos', teamName: 'Argentinos Juniors', teamLogo: 'https://media.api-sports.io/football/teams/442.png', points: 19, played: 10, won: 5, draw: 4, lost: 1, goalsFor: 15, goalsAgainst: 8, goalDiff: 7, description: 'Clasificado a Cuadro Final' },
    { position: 4, teamId: 'talleres', teamName: 'Talleres (Cba)', teamLogo: 'https://media.api-sports.io/football/teams/455.png', points: 18, played: 10, won: 5, draw: 3, lost: 2, goalsFor: 16, goalsAgainst: 11, goalDiff: 5, description: 'Clasificado a Cuadro Final' },
    { position: 5, teamId: 'huracan', teamName: 'Huracán', teamLogo: 'https://media.api-sports.io/football/teams/440.png', points: 17, played: 10, won: 5, draw: 2, lost: 3, goalsFor: 13, goalsAgainst: 10, goalDiff: 3, description: 'Clasificado a Cuadro Final' },
    { position: 6, teamId: 'instituto', teamName: 'Instituto (Cba)', teamLogo: 'https://media.api-sports.io/football/teams/450.png', points: 16, played: 10, won: 4, draw: 4, lost: 2, goalsFor: 14, goalsAgainst: 12, goalDiff: 2, description: 'Clasificado a Cuadro Final' },
    { position: 7, teamId: 'velez', teamName: 'Vélez Sarsfield', teamLogo: 'https://media.api-sports.io/football/teams/437.png', points: 15, played: 10, won: 4, draw: 3, lost: 3, goalsFor: 12, goalsAgainst: 11, goalDiff: 1, description: 'Clasificado a Cuadro Final' },
    { position: 8, teamId: 'barracas', teamName: 'Barracas Central', teamLogo: 'https://media.api-sports.io/football/teams/456.png', points: 14, played: 10, won: 4, draw: 2, lost: 4, goalsFor: 11, goalsAgainst: 12, goalDiff: -1, description: 'Clasificado a Cuadro Final' },
    { position: 9, teamId: 'ind_rivadavia', teamName: 'Independiente Rivadavia', teamLogo: 'https://media.api-sports.io/football/teams/449.png', points: 12, played: 10, won: 3, draw: 3, lost: 4, goalsFor: 10, goalsAgainst: 13, goalDiff: -3, description: null },
    { position: 10, teamId: 'gimnasia', teamName: 'Gimnasia LP', teamLogo: 'https://media.api-sports.io/football/teams/434.png', points: 11, played: 10, won: 3, draw: 2, lost: 5, goalsFor: 9, goalsAgainst: 14, goalDiff: -5, description: null },
    { position: 11, teamId: 'central', teamName: 'Rosario Central', teamLogo: 'https://media.api-sports.io/football/teams/441.png', points: 10, played: 10, won: 2, draw: 4, lost: 4, goalsFor: 11, goalsAgainst: 15, goalDiff: -4, description: null },
    { position: 12, teamId: 'banfield', teamName: 'Banfield', teamLogo: 'https://media.api-sports.io/football/teams/439.png', points: 9, played: 10, won: 2, draw: 3, lost: 5, goalsFor: 8, goalsAgainst: 13, goalDiff: -5, description: null },
    { position: 13, teamId: 'riestra', teamName: 'Deportivo Riestra', teamLogo: 'https://media.api-sports.io/football/teams/464.png', points: 8, played: 10, won: 2, draw: 2, lost: 6, goalsFor: 7, goalsAgainst: 14, goalDiff: -7, description: null },
    { position: 14, teamId: 'atletico_tuc', teamName: 'Atlético Tucumán', teamLogo: 'https://media.api-sports.io/football/teams/448.png', points: 7, played: 10, won: 1, draw: 4, lost: 5, goalsFor: 6, goalsAgainst: 14, goalDiff: -8, description: null },
    { position: 15, teamId: 'sarmiento', teamName: 'Sarmiento (Junín)', teamLogo: 'https://media.api-sports.io/football/teams/451.png', points: 6, played: 10, won: 1, draw: 3, lost: 6, goalsFor: 5, goalsAgainst: 14, goalDiff: -9, description: null },
];

// Base Standings Apertura 2026 (Zona B)
const BASE_APERTURA_B: StandingRow[] = [
    { position: 1, teamId: 'boca', teamName: 'Boca Juniors', teamLogo: 'https://media.api-sports.io/football/teams/451.png', points: 22, played: 10, won: 6, draw: 4, lost: 0, goalsFor: 19, goalsAgainst: 6, goalDiff: 13, description: 'Clasificado a Cuadro Final' },
    { position: 2, teamId: 'estudiantes', teamName: 'Estudiantes LP', teamLogo: 'https://media.api-sports.io/football/teams/445.png', points: 20, played: 10, won: 6, draw: 2, lost: 2, goalsFor: 16, goalsAgainst: 8, goalDiff: 8, description: 'Clasificado a Cuadro Final' },
    { position: 3, teamId: 'godoy_cruz', teamName: 'Godoy Cruz', teamLogo: 'https://media.api-sports.io/football/teams/443.png', points: 19, played: 10, won: 5, draw: 4, lost: 1, goalsFor: 14, goalsAgainst: 7, goalDiff: 7, description: 'Clasificado a Cuadro Final' },
    { position: 4, teamId: 'independiente', teamName: 'Independiente', teamLogo: 'https://media.api-sports.io/football/teams/453.png', points: 18, played: 10, won: 5, draw: 3, lost: 2, goalsFor: 15, goalsAgainst: 10, goalDiff: 5, description: 'Clasificado a Cuadro Final' },
    { position: 5, teamId: 'san_lorenzo', teamName: 'San Lorenzo', teamLogo: 'https://media.api-sports.io/football/teams/458.png', points: 17, played: 10, won: 4, draw: 5, lost: 1, goalsFor: 12, goalsAgainst: 8, goalDiff: 4, description: 'Clasificado a Cuadro Final' },
    { position: 6, teamId: 'lanus', teamName: 'Lanús', teamLogo: 'https://media.api-sports.io/football/teams/446.png', points: 16, played: 10, won: 4, draw: 4, lost: 2, goalsFor: 13, goalsAgainst: 10, goalDiff: 3, description: 'Clasificado a Cuadro Final' },
    { position: 7, teamId: 'defensa', teamName: 'Defensa y Justicia', teamLogo: 'https://media.api-sports.io/football/teams/444.png', points: 15, played: 10, won: 4, draw: 3, lost: 3, goalsFor: 14, goalsAgainst: 12, goalDiff: 2, description: 'Clasificado a Cuadro Final' },
    { position: 8, teamId: 'newells', teamName: "Newell's Old Boys", teamLogo: 'https://media.api-sports.io/football/teams/454.png', points: 13, played: 10, won: 3, draw: 4, lost: 3, goalsFor: 11, goalsAgainst: 11, goalDiff: 0, description: 'Clasificado a Cuadro Final' },
    { position: 9, teamId: 'platense', teamName: 'Platense', teamLogo: 'https://media.api-sports.io/football/teams/457.png', points: 12, played: 10, won: 3, draw: 3, lost: 4, goalsFor: 9, goalsAgainst: 12, goalDiff: -3, description: null },
    { position: 10, teamId: 'belgrano', teamName: 'Belgrano (Cba)', teamLogo: 'https://media.api-sports.io/football/teams/459.png', points: 11, played: 10, won: 3, draw: 2, lost: 5, goalsFor: 10, goalsAgainst: 13, goalDiff: -3, description: null },
    { position: 11, teamId: 'union', teamName: 'Unión (Santa Fe)', teamLogo: 'https://media.api-sports.io/football/teams/460.png', points: 10, played: 10, won: 2, draw: 4, lost: 4, goalsFor: 8, goalsAgainst: 12, goalDiff: -4, description: null },
    { position: 12, teamId: 'central_cordoba', teamName: 'Central Córdoba (SdE)', teamLogo: 'https://media.api-sports.io/football/teams/462.png', points: 9, played: 10, won: 2, draw: 3, lost: 5, goalsFor: 7, goalsAgainst: 13, goalDiff: -6, description: null },
    { position: 13, teamId: 'tigre', teamName: 'Tigre', teamLogo: 'https://media.api-sports.io/football/teams/447.png', points: 8, played: 10, won: 2, draw: 2, lost: 6, goalsFor: 8, goalsAgainst: 15, goalDiff: -7, description: null },
    { position: 14, teamId: 'aldosivi', teamName: 'Aldosivi', teamLogo: 'https://media.api-sports.io/football/teams/461.png', points: 7, played: 10, won: 1, draw: 4, lost: 5, goalsFor: 6, goalsAgainst: 14, goalDiff: -8, description: null },
    { position: 15, teamId: 'san_martin_sj', teamName: 'San Martín (SJ)', teamLogo: 'https://media.api-sports.io/football/teams/463.png', points: 5, played: 10, won: 1, draw: 2, lost: 7, goalsFor: 5, goalsAgainst: 16, goalDiff: -11, description: null },
];

// Base Standings Clausura 2026 (Zona A & B: ready for second semester)
const BASE_CLAUSURA_A: StandingRow[] = BASE_APERTURA_A.map((row, idx) => ({
    ...row,
    position: idx + 1,
    points: Math.max(0, Math.floor(row.points * 0.45)),
    played: 5,
    won: Math.floor(row.won * 0.5),
    draw: 1,
    lost: Math.max(0, 5 - Math.floor(row.won * 0.5) - 1),
    goalsFor: Math.floor(row.goalsFor * 0.4),
    goalsAgainst: Math.floor(row.goalsAgainst * 0.4),
    goalDiff: Math.floor(row.goalsFor * 0.4) - Math.floor(row.goalsAgainst * 0.4),
}));

const BASE_CLAUSURA_B: StandingRow[] = BASE_APERTURA_B.map((row, idx) => ({
    ...row,
    position: idx + 1,
    points: Math.max(0, Math.floor(row.points * 0.45)),
    played: 5,
    won: Math.floor(row.won * 0.5),
    draw: 1,
    lost: Math.max(0, 5 - Math.floor(row.won * 0.5) - 1),
    goalsFor: Math.floor(row.goalsFor * 0.4),
    goalsAgainst: Math.floor(row.goalsAgainst * 0.4),
    goalDiff: Math.floor(row.goalsFor * 0.4) - Math.floor(row.goalsAgainst * 0.4),
}));

// Base Historical Season Stats for Promedios (2024, 2025, 2026)
export const BASE_HISTORICAL_AVERAGES: Record<
    string,
    { s24: { pts: number; pj: number }; s25: { pts: number; pj: number } }
> = {
    river: { s24: { pts: 70, pj: 41 }, s25: { pts: 74, pj: 41 } },
    racing: { s24: { pts: 64, pj: 41 }, s25: { pts: 67, pj: 41 } },
    boca: { s24: { pts: 65, pj: 41 }, s25: { pts: 68, pj: 41 } },
    estudiantes: { s24: { pts: 63, pj: 41 }, s25: { pts: 65, pj: 41 } },
    talleres: { s24: { pts: 61, pj: 41 }, s25: { pts: 63, pj: 41 } },
    godoy_cruz: { s24: { pts: 58, pj: 41 }, s25: { pts: 60, pj: 41 } },
    argentinos: { s24: { pts: 57, pj: 41 }, s25: { pts: 59, pj: 41 } },
    huracan: { s24: { pts: 54, pj: 41 }, s25: { pts: 58, pj: 41 } },
    san_lorenzo: { s24: { pts: 56, pj: 41 }, s25: { pts: 55, pj: 41 } },
    independiente: { s24: { pts: 53, pj: 41 }, s25: { pts: 56, pj: 41 } },
    lanus: { s24: { pts: 52, pj: 41 }, s25: { pts: 54, pj: 41 } },
    velez: { s24: { pts: 55, pj: 41 }, s25: { pts: 53, pj: 41 } },
    defensa: { s24: { pts: 50, pj: 41 }, s25: { pts: 51, pj: 41 } },
    instituto: { s24: { pts: 49, pj: 41 }, s25: { pts: 50, pj: 41 } },
    newells: { s24: { pts: 47, pj: 41 }, s25: { pts: 48, pj: 41 } },
    barracas: { s24: { pts: 46, pj: 41 }, s25: { pts: 47, pj: 41 } },
    platense: { s24: { pts: 45, pj: 41 }, s25: { pts: 46, pj: 41 } },
    belgrano: { s24: { pts: 44, pj: 41 }, s25: { pts: 45, pj: 41 } },
    gimnasia: { s24: { pts: 43, pj: 41 }, s25: { pts: 44, pj: 41 } },
    central: { s24: { pts: 45, pj: 41 }, s25: { pts: 43, pj: 41 } },
    union: { s24: { pts: 44, pj: 41 }, s25: { pts: 42, pj: 41 } },
    banfield: { s24: { pts: 41, pj: 41 }, s25: { pts: 41, pj: 41 } },
    ind_rivadavia: { s24: { pts: 38, pj: 41 }, s25: { pts: 42, pj: 41 } },
    riestra: { s24: { pts: 39, pj: 41 }, s25: { pts: 40, pj: 41 } },
    central_cordoba: { s24: { pts: 38, pj: 41 }, s25: { pts: 39, pj: 41 } },
    tigre: { s24: { pts: 37, pj: 41 }, s25: { pts: 38, pj: 41 } },
    atletico_tuc: { s24: { pts: 38, pj: 41 }, s25: { pts: 36, pj: 41 } },
    sarmiento: { s24: { pts: 35, pj: 41 }, s25: { pts: 34, pj: 41 } },
    aldosivi: { s24: { pts: 32, pj: 41 }, s25: { pts: 33, pj: 41 } }, // Promoted/struggling
    san_martin_sj: { s24: { pts: 30, pj: 41 }, s25: { pts: 31, pj: 41 } }, // Relegation spot
};

// Fixture matches for Apertura (Fechas 1 to 14)
export const FIXTURES_APERTURA_2026: LeagueMatch[] = [
    // FECHA 10 (Current Matchday with live & upcoming)
    {
        id: 'match-10-1',
        tournament: 'APERTURA',
        round: 10,
        date: 'Hoy 17:30',
        home_team: { id: 'river', name: 'River Plate', short_code: 'RIV', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'racing', name: 'Racing Club', short_code: 'RAC', logo_url: 'https://media.api-sports.io/football/teams/436.png' },
        home_goals: 2,
        away_goals: 1,
        status_short: '2H',
        minute: "68'",
    },
    {
        id: 'match-10-2',
        tournament: 'APERTURA',
        round: 10,
        date: 'Hoy 20:00',
        home_team: { id: 'boca', name: 'Boca Juniors', short_code: 'BOC', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'san_lorenzo', name: 'San Lorenzo', short_code: 'SLO', logo_url: 'https://media.api-sports.io/football/teams/458.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-10-3',
        tournament: 'APERTURA',
        round: 10,
        date: 'Mañana 16:00',
        home_team: { id: 'talleres', name: 'Talleres (Cba)', short_code: 'TAL', logo_url: 'https://media.api-sports.io/football/teams/455.png' },
        away_team: { id: 'huracan', name: 'Huracán', short_code: 'HUR', logo_url: 'https://media.api-sports.io/football/teams/440.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-10-4',
        tournament: 'APERTURA',
        round: 10,
        date: 'Mañana 18:30',
        home_team: { id: 'independiente', name: 'Independiente', short_code: 'IND', logo_url: 'https://media.api-sports.io/football/teams/453.png' },
        away_team: { id: 'estudiantes', name: 'Estudiantes LP', short_code: 'EDL', logo_url: 'https://media.api-sports.io/football/teams/445.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-10-5',
        tournament: 'APERTURA',
        round: 10,
        date: 'Ayer',
        home_team: { id: 'argentinos', name: 'Argentinos Jrs', short_code: 'ARG', logo_url: 'https://media.api-sports.io/football/teams/442.png' },
        away_team: { id: 'velez', name: 'Vélez Sarsfield', short_code: 'VEL', logo_url: 'https://media.api-sports.io/football/teams/437.png' },
        home_goals: 1,
        away_goals: 1,
        status_short: 'FT',
    },
    {
        id: 'match-10-6',
        tournament: 'APERTURA',
        round: 10,
        date: 'Ayer',
        home_team: { id: 'godoy_cruz', name: 'Godoy Cruz', short_code: 'GOD', logo_url: 'https://media.api-sports.io/football/teams/443.png' },
        away_team: { id: 'lanus', name: 'Lanús', short_code: 'LAN', logo_url: 'https://media.api-sports.io/football/teams/446.png' },
        home_goals: 2,
        away_goals: 0,
        status_short: 'FT',
    },

    // FECHA 11
    {
        id: 'match-11-1',
        tournament: 'APERTURA',
        round: 11,
        date: '12/09 16:30',
        home_team: { id: 'racing', name: 'Racing Club', short_code: 'RAC', logo_url: 'https://media.api-sports.io/football/teams/436.png' },
        away_team: { id: 'talleres', name: 'Talleres (Cba)', short_code: 'TAL', logo_url: 'https://media.api-sports.io/football/teams/455.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-11-2',
        tournament: 'APERTURA',
        round: 11,
        date: '12/09 19:00',
        home_team: { id: 'san_lorenzo', name: 'San Lorenzo', short_code: 'SLO', logo_url: 'https://media.api-sports.io/football/teams/458.png' },
        away_team: { id: 'independiente', name: 'Independiente', short_code: 'IND', logo_url: 'https://media.api-sports.io/football/teams/453.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-11-3',
        tournament: 'APERTURA',
        round: 11,
        date: '13/09 21:00',
        home_team: { id: 'velez', name: 'Vélez Sarsfield', short_code: 'VEL', logo_url: 'https://media.api-sports.io/football/teams/437.png' },
        away_team: { id: 'river', name: 'River Plate', short_code: 'RIV', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },

    // FECHA 12
    {
        id: 'match-12-1',
        tournament: 'APERTURA',
        round: 12,
        date: '19/09 18:00',
        home_team: { id: 'river', name: 'River Plate', short_code: 'RIV', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'argentinos', name: 'Argentinos Jrs', short_code: 'ARG', logo_url: 'https://media.api-sports.io/football/teams/442.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },
    {
        id: 'match-12-2',
        tournament: 'APERTURA',
        round: 12,
        date: '20/09 20:30',
        home_team: { id: 'boca', name: 'Boca Juniors', short_code: 'BOC', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'estudiantes', name: 'Estudiantes LP', short_code: 'EDL', logo_url: 'https://media.api-sports.io/football/teams/445.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },

    // Sample match for earlier fechas
    {
        id: 'match-9-1',
        tournament: 'APERTURA',
        round: 9,
        date: '28/08',
        home_team: { id: 'river', name: 'River Plate', short_code: 'RIV', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'huracan', name: 'Huracán', short_code: 'HUR', logo_url: 'https://media.api-sports.io/football/teams/440.png' },
        home_goals: 3,
        away_goals: 0,
        status_short: 'FT',
    },
    {
        id: 'match-9-2',
        tournament: 'APERTURA',
        round: 9,
        date: '28/08',
        home_team: { id: 'boca', name: 'Boca Juniors', short_code: 'BOC', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'lanus', name: 'Lanús', short_code: 'LAN', logo_url: 'https://media.api-sports.io/football/teams/446.png' },
        home_goals: 2,
        away_goals: 1,
        status_short: 'FT',
    },
];

// Bracket Matches for Playoffs (Octavos -> Cuartos -> Semis -> Final)
export const PLAYOFF_BRACKETS_APERTURA: BracketMatch[] = [
    // OCTAVOS (8 partidos: 4 left side, 4 right side)
    // Left side Octavos
    {
        id: 'oct-1',
        round: 'octavos',
        position: 1,
        side: 'left',
        home_team: { id: 'river', name: 'River Plate (1°A)', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'newells', name: "Newell's (8°B)", logo_url: 'https://media.api-sports.io/football/teams/454.png' },
        home_goals: 2,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'river',
    },
    {
        id: 'oct-2',
        round: 'octavos',
        position: 2,
        side: 'left',
        home_team: { id: 'godoy_cruz', name: 'Godoy Cruz (3°B)', logo_url: 'https://media.api-sports.io/football/teams/443.png' },
        away_team: { id: 'instituto', name: 'Instituto (6°A)', logo_url: 'https://media.api-sports.io/football/teams/450.png' },
        home_goals: 1,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'godoy_cruz',
    },
    {
        id: 'oct-3',
        round: 'octavos',
        position: 3,
        side: 'left',
        home_team: { id: 'racing', name: 'Racing Club (2°A)', logo_url: 'https://media.api-sports.io/football/teams/436.png' },
        away_team: { id: 'defensa', name: 'Defensa y Just. (7°B)', logo_url: 'https://media.api-sports.io/football/teams/444.png' },
        home_goals: 3,
        away_goals: 1,
        status_short: 'FT',
        winnerTeamId: 'racing',
    },
    {
        id: 'oct-4',
        round: 'octavos',
        position: 4,
        side: 'left',
        home_team: { id: 'independiente', name: 'Independiente (4°B)', logo_url: 'https://media.api-sports.io/football/teams/453.png' },
        away_team: { id: 'huracan', name: 'Huracán (5°A)', logo_url: 'https://media.api-sports.io/football/teams/440.png' },
        home_goals: 2,
        away_goals: 2,
        home_penalty_goals: 4,
        away_penalty_goals: 2,
        status_short: 'PEN',
        winnerTeamId: 'independiente',
    },

    // Right side Octavos
    {
        id: 'oct-5',
        round: 'octavos',
        position: 5,
        side: 'right',
        home_team: { id: 'boca', name: 'Boca Juniors (1°B)', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'barracas', name: 'Barracas C. (8°A)', logo_url: 'https://media.api-sports.io/football/teams/456.png' },
        home_goals: 2,
        away_goals: 1,
        status_short: 'FT',
        winnerTeamId: 'boca',
    },
    {
        id: 'oct-6',
        round: 'octavos',
        position: 6,
        side: 'right',
        home_team: { id: 'argentinos', name: 'Argentinos Jrs (3°A)', logo_url: 'https://media.api-sports.io/football/teams/442.png' },
        away_team: { id: 'lanus', name: 'Lanús (6°B)', logo_url: 'https://media.api-sports.io/football/teams/446.png' },
        home_goals: 1,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'argentinos',
    },
    {
        id: 'oct-7',
        round: 'octavos',
        position: 7,
        side: 'right',
        home_team: { id: 'estudiantes', name: 'Estudiantes LP (2°B)', logo_url: 'https://media.api-sports.io/football/teams/445.png' },
        away_team: { id: 'velez', name: 'Vélez Sarsfield (7°A)', logo_url: 'https://media.api-sports.io/football/teams/437.png' },
        home_goals: 2,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'estudiantes',
    },
    {
        id: 'oct-8',
        round: 'octavos',
        position: 8,
        side: 'right',
        home_team: { id: 'talleres', name: 'Talleres (Cba) (4°A)', logo_url: 'https://media.api-sports.io/football/teams/455.png' },
        away_team: { id: 'san_lorenzo', name: 'San Lorenzo (5°B)', logo_url: 'https://media.api-sports.io/football/teams/458.png' },
        home_goals: 1,
        away_goals: 2,
        status_short: 'FT',
        winnerTeamId: 'san_lorenzo',
    },

    // CUARTOS DE FINAL (4 partidos: 2 left, 2 right)
    {
        id: 'cuart-1',
        round: 'cuartos',
        position: 1,
        side: 'left',
        home_team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'godoy_cruz', name: 'Godoy Cruz', logo_url: 'https://media.api-sports.io/football/teams/443.png' },
        home_goals: 2,
        away_goals: 1,
        status_short: 'FT',
        winnerTeamId: 'river',
    },
    {
        id: 'cuart-2',
        round: 'cuartos',
        position: 2,
        side: 'left',
        home_team: { id: 'racing', name: 'Racing Club', logo_url: 'https://media.api-sports.io/football/teams/436.png' },
        away_team: { id: 'independiente', name: 'Independiente', logo_url: 'https://media.api-sports.io/football/teams/453.png' },
        home_goals: 1,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'racing',
    },
    {
        id: 'cuart-3',
        round: 'cuartos',
        position: 3,
        side: 'right',
        home_team: { id: 'boca', name: 'Boca Juniors', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'argentinos', name: 'Argentinos Jrs', logo_url: 'https://media.api-sports.io/football/teams/442.png' },
        home_goals: 1,
        away_goals: 0,
        status_short: 'FT',
        winnerTeamId: 'boca',
    },
    {
        id: 'cuart-4',
        round: 'cuartos',
        position: 4,
        side: 'right',
        home_team: { id: 'estudiantes', name: 'Estudiantes LP', logo_url: 'https://media.api-sports.io/football/teams/445.png' },
        away_team: { id: 'san_lorenzo', name: 'San Lorenzo', logo_url: 'https://media.api-sports.io/football/teams/458.png' },
        home_goals: 3,
        away_goals: 2,
        status_short: 'FT',
        winnerTeamId: 'estudiantes',
    },

    // SEMIFINALES (2 partidos: 1 left, 1 right)
    {
        id: 'semi-1',
        round: 'semifinal',
        position: 1,
        side: 'left',
        home_team: { id: 'river', name: 'River Plate', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'racing', name: 'Racing Club', logo_url: 'https://media.api-sports.io/football/teams/436.png' },
        home_goals: 2,
        away_goals: 1,
        status_short: 'LIVE',
        winnerTeamId: undefined,
    },
    {
        id: 'semi-2',
        round: 'semifinal',
        position: 2,
        side: 'right',
        home_team: { id: 'boca', name: 'Boca Juniors', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        away_team: { id: 'estudiantes', name: 'Estudiantes LP', logo_url: 'https://media.api-sports.io/football/teams/445.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'NS',
    },

    // FINAL (1 partido: center)
    {
        id: 'final-1',
        round: 'final',
        position: 1,
        side: 'center',
        home_team: { id: 'tbd-1', name: 'Por Definir (Llave Izquierda)', logo_url: 'https://media.api-sports.io/football/teams/435.png' },
        away_team: { id: 'tbd-2', name: 'Por Definir (Llave Derecha)', logo_url: 'https://media.api-sports.io/football/teams/451.png' },
        home_goals: null,
        away_goals: null,
        status_short: 'TBD',
    },
];

// Helper: Generates unified Annual Table from Apertura + Clausura standings
export function buildAnnualTable(
    apertureRows: StandingRow[],
    clausuraRows: StandingRow[]
): StandingRow[] {
    const map = new Map<string, StandingRow>();

    // Helper to add
    const merge = (row: StandingRow) => {
        const existing = map.get(row.teamId);
        if (!existing) {
            map.set(row.teamId, { ...row, description: null });
        } else {
            existing.played += row.played;
            existing.won += row.won;
            existing.draw += row.draw;
            existing.lost += row.lost;
            existing.goalsFor += row.goalsFor;
            existing.goalsAgainst += row.goalsAgainst;
            existing.points += row.points;
            existing.goalDiff = existing.goalsFor - existing.goalsAgainst;
        }
    };

    apertureRows.forEach(merge);
    clausuraRows.forEach(merge);

    const sorted = Array.from(map.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
    });

    // Assign positions and descriptions according to spec:
    // 1° puesto: Copa Libertadores (fase de grupos) -> LIB
    // 2°-4° puestos: Copa Libertadores (fase previa) -> LIB (P)
    // 5°-10° puestos: Copa Sudamericana -> SUD
    // Último puesto (30°): Zona de descenso -> DESC
    return sorted.map((row, idx) => {
        const pos = idx + 1;
        let description: string | null = null;
        if (pos === 1) {
            description = 'Copa Libertadores (Fase de Grupos)';
        } else if (pos >= 2 && pos <= 4) {
            description = 'Copa Libertadores (Fase Previa)';
        } else if (pos >= 5 && pos <= 10) {
            description = 'Copa Sudamericana';
        } else if (pos === sorted.length) {
            description = 'Zona de Descenso';
        }
        return {
            ...row,
            position: pos,
            description,
        };
    });
}

// Helper: Generates Averages Table
export function buildAveragesTable(annualTable: StandingRow[]): AverageRow[] {
    const rows: AverageRow[] = annualTable.map((team) => {
        const hist = BASE_HISTORICAL_AVERAGES[team.teamId] || {
            s24: { pts: 40, pj: 41 },
            s25: { pts: 40, pj: 41 },
        };

        const pts26 = team.points;
        const pj26 = team.played;

        const totalPoints = hist.s24.pts + hist.s25.pts + pts26;
        const totalPlayed = hist.s24.pj + hist.s25.pj + pj26;
        const coefficient = totalPlayed > 0 ? totalPoints / totalPlayed : 0;

        return {
            position: 1,
            teamId: team.teamId,
            teamName: team.teamName,
            teamLogo: team.teamLogo,
            description: null,
            stats2024: hist.s24,
            stats2025: hist.s25,
            stats2026: { pts: pts26, pj: pj26 },
            totalPoints,
            totalPlayed,
            coefficient: Number(coefficient.toFixed(3)),
        };
    });

    // Sort descending by coefficient
    rows.sort((a, b) => b.coefficient - a.coefficient);

    return rows.map((r, idx) => ({
        ...r,
        position: idx + 1,
        description: idx === rows.length - 1 ? 'Descenso Directo' : null,
    }));
}

// Initial full state
export function getInitialFullStandings(): FullStandings {
    const allApertura = [...BASE_APERTURA_A, ...BASE_APERTURA_B];
    const allClausura = [...BASE_CLAUSURA_A, ...BASE_CLAUSURA_B];
    const annual = buildAnnualTable(allApertura, allClausura);
    const averages = buildAveragesTable(annual);

    return {
        apertura: {
            tournament: 'APERTURA',
            groups: {
                A: BASE_APERTURA_A,
                B: BASE_APERTURA_B,
            },
        },
        clausura: {
            tournament: 'CLAUSURA',
            groups: {
                A: BASE_CLAUSURA_A,
                B: BASE_CLAUSURA_B,
            },
        },
        annual,
        averages,
        updated_at: new Date().toISOString(),
    };
}

// TableProcessor: recalculates standing tables based on simulated and live inputs
export function processStandingsWithSimulations(
    baseStandings: FullStandings,
    simulations: Record<string, SimulatedResult>
): FullStandings {
    const simList = Object.values(simulations);
    if (simList.length === 0) {
        return baseStandings;
    }

    // Clone groups
    const apA: StandingRow[] = baseStandings.apertura.groups.A.map((r) => ({ ...r }));
    const apB: StandingRow[] = baseStandings.apertura.groups.B.map((r) => ({ ...r }));
    const clA: StandingRow[] = baseStandings.clausura.groups.A.map((r) => ({ ...r }));
    const clB: StandingRow[] = baseStandings.clausura.groups.B.map((r) => ({ ...r }));

    // Apply simulated scores
    for (const sim of simList) {
        const { h, a, homeTeamId, awayTeamId } = sim;
        // Un resultado simulado a medio cargar todavía no cuenta como partido jugado.
        if (h === null || a === null) continue;
        const allGroups = [apA, apB, clA, clB];

        for (const group of allGroups) {
            const home = group.find((t) => t.teamId === homeTeamId);
            const away = group.find((t) => t.teamId === awayTeamId);

            if (home && away) {
                home.played += 1;
                away.played += 1;
                home.goalsFor += h;
                home.goalsAgainst += a;
                away.goalsFor += a;
                away.goalsAgainst += h;
                home.goalDiff = home.goalsFor - home.goalsAgainst;
                away.goalDiff = away.goalsFor - away.goalsAgainst;

                if (h > a) {
                    home.won += 1;
                    home.points += 3;
                    away.lost += 1;
                } else if (h < a) {
                    away.won += 1;
                    away.points += 3;
                    home.lost += 1;
                } else {
                    home.draw += 1;
                    home.points += 1;
                    away.draw += 1;
                    away.points += 1;
                }
            }
        }
    }

    // Re-sort and re-number zones
    const sortGroup = (grp: StandingRow[]) => {
        grp.sort((x, y) => {
            if (y.points !== x.points) return y.points - x.points;
            if (y.goalDiff !== x.goalDiff) return y.goalDiff - x.goalDiff;
            return y.goalsFor - x.goalsFor;
        });
        return grp.map((r, i) => ({
            ...r,
            position: i + 1,
            description: i < 8 ? 'Clasificado a Cuadro Final' : null,
        }));
    };

    const finalApA = sortGroup(apA);
    const finalApB = sortGroup(apB);
    const finalClA = sortGroup(clA);
    const finalClB = sortGroup(clB);

    const annual = buildAnnualTable([...finalApA, ...finalApB], [...finalClA, ...finalClB]);
    const averages = buildAveragesTable(annual);

    return {
        apertura: {
            tournament: 'APERTURA',
            groups: {
                A: finalApA,
                B: finalApB,
            },
        },
        clausura: {
            tournament: 'CLAUSURA',
            groups: {
                A: finalClA,
                B: finalClB,
            },
        },
        annual,
        averages,
        updated_at: new Date().toISOString(),
    };
}
