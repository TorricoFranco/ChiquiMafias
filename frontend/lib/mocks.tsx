import { ChevronRight, User, Zap, TrendingUp, Users } from 'lucide-react';


// --- CONFIGURACIÓN DE MOCK DATA ---
export const MOCK_PARTIDOS = [
  { id: 1, local: 'Águilas', visitante: 'Leones', score: '2 - 1', estado: 'Primer tiempo', minuto: 34, isLive: true, events: ['⚽'] },
  { id: 2, local: 'Lobos', visitante: 'Tigres', score: '0 - 0', estado: 'No empezó', minuto: null, isLive: false, events: [] },
  { id: 3, local: 'Dragones', visitante: 'Fénix', score: '3 - 2', estado: 'Finalizado', minuto: null, isLive: false, events: ['⚽', '🟥'] },
  { id: 4, local: 'Osos', visitante: 'Pandas', score: '1 - 1', estado: 'Segundo tiempo', minuto: 78, isLive: true, events: ['⚽', '⚽'] },
  { id: 5, local: 'Falcons', visitante: 'Sharks', score: '0 - 0', estado: 'No empezó', minuto: null, isLive: false, events: [] },
  { id: 6, local: 'Rhinos', visitante: 'Vipers', score: '4 - 1', estado: 'Finalizado', minuto: null, isLive: false, events: ['⚽', '⚽', '⚽'] },
];

export const MOCK_CHAT = [
  { user: 'ElBicho7', time: '21:30', message: '¡Golazo de Águilas! La jugada fue épica.', avatar: '🦁' },
  { user: 'AdminCM', time: '21:31', message: 'Recuerden votar al JdF después del partido.', avatar: '👑' },
  { user: 'LiderAlfa', time: '21:32', message: 'No me convence la defensa de Leones hoy. Muy abiertos.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:35', message: '¡Tarjeta roja! Eso fue muy duro. El árbitro acertó.', avatar: '😡' },
  { user: 'Spectator', time: '21:37', message: '¡Qué jugadón del número 10!', avatar: '🔥' },
  { user: 'ChatBot', time: '21:39', message: 'Las Águilas han tenido 60% de posesión en el primer tiempo.', avatar: '🤖' },
  { user: 'ElBicho7', time: '21:40', message: 'Necesitan un cambio en la banda derecha.', avatar: '🦁' },
  { user: 'LiderAlfa', time: '21:42', message: 'Totalmente de acuerdo, la presión alta no funciona.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:45', message: 'Vamos Leones, a remontar en el segundo tiempo!', avatar: '💪' },
    { user: 'ElBicho7', time: '21:30', message: '¡Golazo de Águilas! La jugada fue épica.', avatar: '🦁' },
  { user: 'AdminCM', time: '21:31', message: 'Recuerden votar al JdF después del partido.', avatar: '👑' },
  { user: 'LiderAlfa', time: '21:32', message: 'No me convence la defensa de Leones hoy. Muy abiertos.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:35', message: '¡Tarjeta roja! Eso fue muy duro. El árbitro acertó.', avatar: '😡' },
  { user: 'Spectator', time: '21:37', message: '¡Qué jugadón del número 10!', avatar: '🔥' },
  { user: 'ChatBot', time: '21:39', message: 'Las Águilas han tenido 60% de posesión en el primer tiempo.', avatar: '🤖' },
  { user: 'ElBicho7', time: '21:40', message: 'Necesitan un cambio en la banda derecha.', avatar: '🦁' },
  { user: 'LiderAlfa', time: '21:42', message: 'Totalmente de acuerdo, la presión alta no funciona.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:45', message: 'Vamos Leones, a remontar en el segundo tiempo!', avatar: '💪' },
    { user: 'ElBicho7', time: '21:30', message: '¡Golazo de Águilas! La jugada fue épica.', avatar: '🦁' },
  { user: 'AdminCM', time: '21:31', message: 'Recuerden votar al JdF después del partido.', avatar: '👑' },
  { user: 'LiderAlfa', time: '21:32', message: 'No me convence la defensa de Leones hoy. Muy abiertos.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:35', message: '¡Tarjeta roja! Eso fue muy duro. El árbitro acertó.', avatar: '😡' },
  { user: 'Spectator', time: '21:37', message: '¡Qué jugadón del número 10!', avatar: '🔥' },
  { user: 'ChatBot', time: '21:39', message: 'Las Águilas han tenido 60% de posesión en el primer tiempo.', avatar: '🤖' },
  { user: 'ElBicho7', time: '21:40', message: 'Necesitan un cambio en la banda derecha.', avatar: '🦁' },
  { user: 'LiderAlfa', time: '21:42', message: 'Totalmente de acuerdo, la presión alta no funciona.', avatar: '🐺' },
  { user: 'Fanatico', time: '21:45', message: 'Vamos Leones, a remontar en el segundo tiempo!', avatar: '💪' },
];

export const MOCK_VOTACIONES = [
  { title: 'Jugador de la Fecha', subtitle: '65% Votaciones', icon: <User className="w-6 h-6 text-lime-400" /> },
  { title: 'Partido de la Jornada', subtitle: '40% Votaciones', icon: <Zap className="w-6 h-6 text-sky-400" /> },
  { title: 'Equipo Revelación', subtitle: '88% Votaciones', icon: <TrendingUp className="w-6 h-6 text-yellow-400" /> },
  { title: 'Mejor Dúo Táctico', subtitle: '22% Votaciones', icon: <Users className="w-6 h-6 text-red-400" /> },
  { title: 'Goleador de la Semana', subtitle: '75% Votaciones', icon: <Zap className="w-6 h-6 text-pink-400" /> },
  { title: 'Mejor Asistencia', subtitle: '50% Votaciones', icon: <ChevronRight className="w-6 h-6 text-orange-400" /> },
];




// ======================================================================
// 1. MOCK DATA COMPLETA (4 ESTADOS)
// ======================================================================

export const MOCK_LINEUPS_RIVER = {
  formation: "4-3-3",
  coach: "Martín Demichelis",
  startingXI: [
    { number: 1, name: "Armani", position: "GK" },
    { number: 4, name: "Gonzalez Pirez", position: "DF" },
    { number: 17, name: "P. Díaz", position: "DF" },
    { number: 20, name: "Boselli", position: "DF" },
    { number: 13, name: "E. Díaz", position: "DF" },
    { number: 5, name: "Kranevitter", position: "MF" },
    { number: 26, name: "I. Fernández", position: "MF" },
    { number: 21, name: "Aliendro", position: "MF" },
    { number: 11, name: "Colidio", position: "FW" },
    { number: 9, name: "Borja", position: "FW" },
    { number: 36, name: "Echeverri", position: "FW" },
  ],
  substitutes: [
    { number: 33, name: "Centurión", position: "GK" },
    { number: 2, name: "Rojas", position: "DF" },
    { number: 8, name: "Palavecino", position: "MF" },
    { number: 19, name: "Solari", position: "FW" },
    { number: 29, name: "Funes Mori", position: "DF" },
  ]
};

export const MOCK_LINEUPS_BOCA = {
  formation: "4-4-2",
  coach: "Diego Martínez",
  startingXI: [
    { number: 1, name: "Romero", position: "GK" },
    { number: 4, name: "Lema", position: "DF" },
    { number: 2, name: "Rojo", position: "DF" },
    { number: 17, name: "Advíncula", position: "DF" },
    { number: 18, name: "Fabra", position: "DF" },
    { number: 20, name: "E. Fernández", position: "MF" },
    { number: 8, name: "P. Fernández", position: "MF" },
    { number: 36, name: "Medina", position: "MF" },
    { number: 42, name: "Zenón", position: "MF" },
    { number: 9, name: "Benedetto", position: "FW" },
    { number: 10, name: "Cavani", position: "FW" },
  ],
  substitutes: [
    { number: 25, name: "Brey", position: "GK" },
    { number: 7, name: "Langoni", position: "FW" },
    { number: 16, name: "Izquierdoz", position: "DF" },
    { number: 21, name: "Pol Fernández", position: "MF" },
    { number: 38, name: "Valentini", position: "DF" },
  ]
};

// --- BASE DE DATOS DEL PARTIDO ---
export const BASE_MATCH_DATA = {
  id: 12,
  teams: {
    home: {
      id: 1,
      name: "River Plate",
      logo: "https://placehold.co/100x100/A00000/FFFFFF?text=RIVER",
      tablePosition: 2,
      points: 34,
      last5: ["W", "W", "L", "D", "W"],
    },
    away: {
      id: 2,
      name: "Boca Juniors",
      logo: "https://placehold.co/100x100/0000FF/FFDD00?text=BOCA",
      tablePosition: 5,
      points: 28,
      last5: ["D", "L", "W", "W", "L"],
    }
  },
  matchInfo: {
    league: "Liga Profesional Argentina",
    date: "2025-03-01T21:00:00Z",
    stadium: "Estadio Monumental",
    referee: "Facundo Tello",
    previa: "El Superclásico. River busca mantenerse en la cima mientras que Boca necesita los 3 puntos para entrar en zona de copas. Se espera un partido de alta intensidad y con muchas emociones."
  },
  finishedData: {
    manOfTheMatch: "Miguel Borja (River Plate)",
    summary: "Partido muy intenso, con una primera parte dominada por Boca y una reacción tardía de River. La efectividad de Cavani fue clave para la victoria visitante."
  }
};

// --- ESTADOS SIMULADOS ---

import { MatchData } from '@/types/matchs';

// 1. not_started
export const MOCK_NOT_STARTED: MatchData = {
  ...BASE_MATCH_DATA,
  status: "not_started",
};

// 2. lineups_available
export const MOCK_LINEUPS_AVAILABLE: MatchData = {
  ...BASE_MATCH_DATA,
  status: "lineups_available",
  lineups: {
    home: MOCK_LINEUPS_RIVER,
    away: MOCK_LINEUPS_BOCA,
  },
};

// 3. live (Minuto 67, 1-2)
export const MOCK_LIVE: MatchData = {
  ...BASE_MATCH_DATA,
  status: "live",
  lineups: {
    home: MOCK_LINEUPS_RIVER,
    away: MOCK_LINEUPS_BOCA,
  },
  liveData: {
    minute: 67,
    score: { home: 1, away: 2 },
    events: [
      { minute: 12, team: "home", type: "yellow_card", player: "P. Díaz", detail: "Falta táctica" },
      { minute: 27, team: "away", type: "goal", player: "Cavani", detail: "Asistencia de Zenón" },
      { minute: 46, team: "home", type: "goal", player: "Solari", detail: "Gran remate de media distancia" },
      { minute: 55, team: "away", type: "goal", player: "Cavani", detail: "Doblete, de cabeza" },
      { minute: 60, team: "home", type: "substitution", playerOut: "Kranevitter", playerIn: "Palavecino" },
      { minute: 67, team: "away", type: "var_check", player: null, detail: "Posible penal" }
    ],
    stats: {
      possession: { home: 55, away: 45 },
      shots: { home: 8, away: 6 },
      shotsOnTarget: { home: 3, away: 4 },
      fouls: { home: 9, away: 12 },
      passes: { home: 415, away: 385 },
      dangerousAttacks: { home: 32, away: 21 },
      xG: { home: 0.98, away: 1.45 }
    }
  },
};

// 4. finished (Resultado final 1-2)
export const MOCK_FINISHED: MatchData = {
  ...BASE_MATCH_DATA,
  status: "finished",
  lineups: {
    home: MOCK_LINEUPS_RIVER,
    away: MOCK_LINEUPS_BOCA,
  },
  liveData: {
    minute: 90,
    score: { home: 1, away: 2 },
    events: [
      ...(MOCK_LIVE.liveData?.events ?? []),
      { minute: 90, team: "general", type: "full_time", player: null, detail: "Fin del partido" }
    ],
    stats: {
      possession: { home: 58, away: 42 },
      shots: { home: 12, away: 8 },
      shotsOnTarget: { home: 5, away: 6 },
      fouls: { home: 15, away: 18 },
      passes: { home: 601, away: 495 },
      dangerousAttacks: { home: 50, away: 35 },
      xG: { home: 1.25, away: 1.89 }
    }
  },
};


// TYPE SCRIPT PARA MOCK DATA

export type MatchStateKey =
  | "default"
  | "not_started"
  | "lineups_available"
  | "live"
  | "finished";


export const MOCK_DATA: Record<string, MatchData> = {
  "1": MOCK_FINISHED,
  "2": MOCK_LIVE,
  "3": MOCK_NOT_STARTED,
  default: MOCK_FINISHED
};





// =================================================================
// 1. TIPOS Y MOCK DATA (ACTUALIZADO PARA SINCRONIZACIÓN Y FIXTURES)
// LEAGUE STANDINGS - APERTURA 2025
// =================================================================

/** Tipos de datos simulados para el frontend */
export type TeamRow = {
    teamId: string;
    teamName: string;
    pos: number;
    played: number; // Pj
    wins: number; // G
    draws: number; // E
    losses: number; // P
    gf: number; // Goles a Favor
    ga: number; // Goles en Contra
    gd: number; // Diferencia de Goles (DG)
    pts: number; // Puntos
    isPartial?: boolean;
};

export type ZoneStandings = {
    tournament: "apertura" | "clausura";
    zone: "A" | "B";
    status: "not_started" | "in_progress" | "finished";
    phaseDetail?: string;
    updatedAt: string;
    rows: TeamRow[];
};

export type AnnualRow = {
    teamId: string;
    teamName: string;
    pos: number;
    played_total: number;
    wins_total: number;
    draws_total: number;
    losses_total: number;
    gf_total: number;
    ga_total: number;
    gd_total: number;
    pts_total: number;
  qualification?: "libertadores_group" | "libertadores_qualifier" | "sudamericana" | null;
  relegation_flag?: "descenso_directo" | null;
};

export type PromedioRow = {
    teamId: string;
    teamName: string;
    seasons_counted: number;
    points_sum: number;
    matches_sum: number;
    promedio: number;
    relegation_flag?: "descenso_directo" | "promocion" | null;
};

export type Match = {
  homeTeam: string
  awayTeam: string
  result: string
  status: 'played' | 'pending' | 'live'
  zone: 'A' | 'B'
  date: string
}

export type Matchday = {
    matchday: number;
    matches: Match[]; 
};


// --- START MOCK DATA --- 
const TEAM_NAMES = [
    "Rosario Central", "Central Córdoba", "Estudiantes (LP)", "River Plate", "Boca Juniors",
    "Racing", "Independiente", "San Lorenzo", "Argentinos Jrs.", "Vélez",
    "Newell's", "Talleres (C)", "Gimnasia (LP)", "Huracán", "Lanús",
    "Godoy Cruz", "Unión", "Defensa y Justicia", "Atlético Tucumán", "Platense",
    "Sarmiento", "Arsenal", "Barracas Central", "Tigre", "Banfield",
    "Instituto", "Belgrano", "San Martín (SJ)", "Deportivo Riestra", "Quilmes"
];

const generateMockRows = (start: number, end: number, played: number, winsBase: number, status: "in_progress"): TeamRow[] => {
    return TEAM_NAMES.slice(start, end).map((name, index) => {
        const teamId = "t" + String(start + index + 1).padStart(3, "0"); // => "t001", "t016", etc.
        const wins = winsBase - index % 5;
        const draws = Math.floor(played / 3) + index % 2;
        const losses = played - wins - draws;
        const pts = wins * 3 + draws;
        const gf = 12 + index - start;
        const ga = 8 + index - start;
        const gd = gf - ga;

        return {
            teamId,
            teamName: name,
            pos: index + 1,
            played,
            wins,
            draws,
            losses: losses > 0 ? losses : 0,
            gf,
            ga,
            gd,
            pts,
            isPartial: (status === "in_progress" && played < 14) ? true : undefined,
        } as TeamRow;
    }).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    }).map((row, index) => ({
        ...row,
        pos: index + 1,
    }));
};

// --- SINCRONIZACIÓN DE TORNEOS: Apertura en curso (Jornada 8 de 14) ---

const MOCK_APERTURA_ZONE_A: ZoneStandings = {
    tournament: "apertura",
    zone: "A",
    status: "in_progress", 
    phaseDetail: "Fase de Grupos - Jornada 8 de 14",
    updatedAt: "2025-09-01T15:00:00Z",
    rows: generateMockRows(0, 15, 8, 5, "in_progress"),
};

const MOCK_APERTURA_ZONE_B: ZoneStandings = {
    tournament: "apertura",
    zone: "B",
    status: "in_progress", // Sincronizado
    phaseDetail: "Fase de Grupos - Jornada 8 de 14",
    updatedAt: "2025-09-01T15:00:00Z",
    rows: generateMockRows(15, 30, 8, 6, "in_progress"),
};

const MOCK_CLAUSURA_NOT_STARTED_DATA: ZoneStandings = {
    tournament: "clausura",
    zone: "A", // Usado como plantilla
    status: "not_started",
    phaseDetail: "El Torneo Clausura iniciará cuando finalice el Apertura. Inicio estimado: Enero 2026.",
    updatedAt: "2025-09-01T00:00:00Z",
    rows: [],
};

const MOCK_ANNUAL: AnnualRow[] = TEAM_NAMES.map((name, index) => {
  const teamId = "t" + String(index + 1).padStart(3, "0");
  // Puntos basados en 8 fechas del Apertura (ya que Clausura no ha comenzado)
  const pts_total = (index < 15 ? MOCK_APERTURA_ZONE_A.rows : MOCK_APERTURA_ZONE_B.rows).find(r => r.teamName === name)?.pts || 0;
  const played_total = 8; 

  let qualification: AnnualRow['qualification'] = null;
  // Top 4 -> Libertadores (fase de grupos)
  if (index >= 0 && index <= 3) qualification = "libertadores_group";
  // 5th place -> Pre Libertadores (repechaje)
  else if (index === 4) qualification = "libertadores_qualifier";
  // next 6 places (6th-11th) -> Sudamericana
  else if (index >= 5 && index <= 10) qualification = "sudamericana";
    
  // Relegation flag only for the last position in this mock (backend decides in real app)
  const relegation_flag = index === (TEAM_NAMES.length - 1) ? "descenso_directo" : null;
    
  return {
    teamId, teamName: name, pos: index + 1, played_total,
    wins_total: Math.round(played_total * 0.5), draws_total: Math.round(played_total * 0.25), losses_total: Math.round(played_total * 0.25),
    gf_total: pts_total + 10, ga_total: pts_total - 5, gd_total: 15, pts_total,
    qualification,
    relegation_flag,
  };
}).sort((a, b) => b.pts_total - a.pts_total)
.map((row, index) => ({
  ...row,
  pos: index + 1,
}));


const MOCK_PROMEDIOS: PromedioRow[] = TEAM_NAMES.map((name, index) => {
    const teamId = "t" + String(index + 1).padStart(3, "0");
    const seasons_counted = 3;
    const basePromedio = 1.6 - (index / 30) * 0.8;
    const matches_sum = seasons_counted * 28; // 2 torneos de 14 partidos por año * 3 años

    const points_sum = Math.round(basePromedio * matches_sum);
    const promedio = points_sum / matches_sum;

    let relegation_flag: PromedioRow['relegation_flag'] = null;
      if (index === TEAM_NAMES.length - 1) relegation_flag = "descenso_directo";
    
    return {
        teamId, teamName: name, seasons_counted, points_sum, matches_sum,
        promedio: parseFloat(promedio.toFixed(3)),
        relegation_flag,
    };
}).sort((a, b) => a.promedio - b.promedio);

// --- MOCK DE FIXTURES (15 FECHAS PARA EL APERTURA) ---
const ALL_TEAMS = TEAM_NAMES;

const generateMatchday = (matchday: number): Matchday => {
    // Para simplificar, usamos un algoritmo de Round-robin simple
    const teams = [...ALL_TEAMS];
    const matches: Match[] = [];
    
    // Generación de 15 partidos (30 equipos)
    for (let i = 0; i < 15; i++) {
        // Rotación simple para generar diferentes cruces
        const indexA = (i + matchday - 1) % 30;
        const indexB = (29 - i + matchday - 1) % 30;
        
        const homeTeam = teams[indexA];
        const awayTeam = teams[indexB];
        
        // Simulación: Partidos hasta la jornada 8 ya se jugaron
        const isPlayed = matchday <= 8;
        
        let result = "vs";
        let status: Match['status'] = 'pending';

        if (isPlayed) {
            const homeScore = Math.floor(Math.random() * 4);
            const awayScore = Math.floor(Math.random() * 4);
            result = `${homeScore} - ${awayScore}`;
            status = 'played';
        }

        matches.push({ 
            homeTeam, 
            awayTeam, 
            result, 
            status, 
            zone: (indexA < 15 && indexB >= 15) ? 'INTERZONAL' : (indexA < 15 ? 'A' : 'B') // Simple distinción
        });
    }

    // Se mezclan ligeramente para que no sea tan obvio el orden A/B
    const shuffledMatches = matches.sort(() => Math.random() - 0.5);

    return { matchday, matches: shuffledMatches };
};

const MOCK_APERTURA_FIXTURES: Matchday[] = Array.from({ length: 15 }, (_, i) => generateMatchday(i + 1));


export const STANDINGS_MOCKS = {
    apertura: { A: MOCK_APERTURA_ZONE_A, B: MOCK_APERTURA_ZONE_B },
    clausura: { A: { ...MOCK_CLAUSURA_NOT_STARTED_DATA, zone: 'A' }, B: { ...MOCK_CLAUSURA_NOT_STARTED_DATA, zone: 'B' } },
    annual: MOCK_ANNUAL,
    promedios: MOCK_PROMEDIOS,
    fixtures: {
        apertura: MOCK_APERTURA_FIXTURES,
        clausura: [], // Todavía no se jugaron
    }
};
