import { STANDINGS_MOCKS } from "@/lib/mocks";

/**
 * Tipo para un partido pendiente de simulación
 */
export type PendingMatch = {
  matchId: string;
  tournament: "apertura" | "clausura";
  zone: "A" | "B";
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
};

/**
 * Obtiene los nombres de equipos según el índice
 */
const getTeamNameById = (teamId: string): string => {
  const TEAM_NAMES = [
    "Rosario Central",
    "Central Córdoba",
    "Estudiantes (LP)",
    "River Plate",
    "Boca Juniors",
    "Racing",
    "Independiente",
    "San Lorenzo",
    "Argentinos Jrs.",
    "Vélez",
    "Newell's",
    "Talleres (C)",
    "Gimnasia (LP)",
    "Huracán",
    "Lanús",
    "Godoy Cruz",
    "Unión",
    "Defensa y Justicia",
    "Atlético Tucumán",
    "Platense",
    "Sarmiento",
    "Arsenal",
    "Barracas Central",
    "Tigre",
    "Banfield",
    "Instituto",
    "Belgrano",
    "San Martín (SJ)",
    "Deportivo Riestra",
    "Quilmes",
  ];

  const index = parseInt(teamId.replace(/\D/g, "")) - 1;
  return TEAM_NAMES[index] || "Equipo Desconocido";
};

/**
 * Mock de partidos pendientes para simular
 * Incluye Apertura Zona A (jornadas 9-14), Apertura Zona B
 */
export const MOCK_PENDING_MATCHES: PendingMatch[] = [
  // ===== APERTURA ZONA A - Jornada 9 =====
  {
    matchId: "apa9-001",
    tournament: "apertura",
    zone: "A",
    round: 9,
    homeTeamId: "t001",
    awayTeamId: "t003",
    played: false,
  },
  {
    matchId: "apa9-002",
    tournament: "apertura",
    zone: "A",
    round: 9,
    homeTeamId: "t004",
    awayTeamId: "t002",
    played: false,
  },
  {
    matchId: "apa9-003",
    tournament: "apertura",
    zone: "A",
    round: 9,
    homeTeamId: "t005",
    awayTeamId: "t006",
    played: false,
  },

  // ===== APERTURA ZONA A - Jornada 10 =====
  {
    matchId: "apa10-001",
    tournament: "apertura",
    zone: "A",
    round: 10,
    homeTeamId: "t007",
    awayTeamId: "t001",
    played: false,
  },
  {
    matchId: "apa10-002",
    tournament: "apertura",
    zone: "A",
    round: 10,
    homeTeamId: "t008",
    awayTeamId: "t004",
    played: false,
  },
  {
    matchId: "apa10-003",
    tournament: "apertura",
    zone: "A",
    round: 10,
    homeTeamId: "t009",
    awayTeamId: "t005",
    played: false,
  },

  // ===== APERTURA ZONA A - Jornada 11 =====
  {
    matchId: "apa11-001",
    tournament: "apertura",
    zone: "A",
    round: 11,
    homeTeamId: "t010",
    awayTeamId: "t002",
    played: false,
  },
  {
    matchId: "apa11-002",
    tournament: "apertura",
    zone: "A",
    round: 11,
    homeTeamId: "t003",
    awayTeamId: "t007",
    played: false,
  },
  {
    matchId: "apa11-003",
    tournament: "apertura",
    zone: "A",
    round: 11,
    homeTeamId: "t006",
    awayTeamId: "t008",
    played: false,
  },

  // ===== APERTURA ZONA B - Jornada 9 =====
  {
    matchId: "apb9-001",
    tournament: "apertura",
    zone: "B",
    round: 9,
    homeTeamId: "t016",
    awayTeamId: "t017",
    played: false,
  },
  {
    matchId: "apb9-002",
    tournament: "apertura",
    zone: "B",
    round: 9,
    homeTeamId: "t018",
    awayTeamId: "t019",
    played: false,
  },
  {
    matchId: "apb9-003",
    tournament: "apertura",
    zone: "B",
    round: 9,
    homeTeamId: "t020",
    awayTeamId: "t021",
    played: false,
  },

  // ===== APERTURA ZONA B - Jornada 10 =====
  {
    matchId: "apb10-001",
    tournament: "apertura",
    zone: "B",
    round: 10,
    homeTeamId: "t022",
    awayTeamId: "t016",
    played: false,
  },
  {
    matchId: "apb10-002",
    tournament: "apertura",
    zone: "B",
    round: 10,
    homeTeamId: "t023",
    awayTeamId: "t018",
    played: false,
  },
  {
    matchId: "apb10-003",
    tournament: "apertura",
    zone: "B",
    round: 10,
    homeTeamId: "t024",
    awayTeamId: "t020",
    played: false,
  },

  // ===== APERTURA ZONA B - Jornada 11 =====
  {
    matchId: "apb11-001",
    tournament: "apertura",
    zone: "B",
    round: 11,
    homeTeamId: "t025",
    awayTeamId: "t017",
    played: false,
  },
  {
    matchId: "apb11-002",
    tournament: "apertura",
    zone: "B",
    round: 11,
    homeTeamId: "t019",
    awayTeamId: "t022",
    played: false,
  },
  {
    matchId: "apb11-003",
    tournament: "apertura",
    zone: "B",
    round: 11,
    homeTeamId: "t021",
    awayTeamId: "t023",
    played: false,
  },
];

/**
 * Obtiene los datos formateados de un partido
 */
export const getMatchData = (match: PendingMatch) => ({
  ...match,
  homeTeamName: getTeamNameById(match.homeTeamId),
  awayTeamName: getTeamNameById(match.awayTeamId),
});