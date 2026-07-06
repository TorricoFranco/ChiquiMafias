// --- Sub-tipos de utilidad ---
export interface TeamBase {
  id: string;
  name: string;
  logo: string;
  short_code: string;
}

export interface PlayerBase {
  id: string;
  name: string;
  photo: string | null;
}

// --- Interfaz Principal ---
export interface MatchDetailsResponse {
  metadata: {
    id: string;
    status: 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'TBD' | 'SUSP' | 'CANC'; // Estados de la API
    status_long: string;
    date: string;
    timestamp: number;
    referee: string;
    round: string;
    tournament: string;
    venue: {
      name: string;
      city: string;
      image: string;
    };
  };
  score: {
    home: number;
    away: number;
    home_penalties?: number | null;
    away_penalties?: number | null;
    elapsed: number;
    summary: {
      goals: Array<{
        min: number;
        player: string;
        team: string;
      }>;
      redCards: any[]; // Tipar según estructura si aparece
      lastUpdate: string;
    };
  };
  teams: {
    home: TeamBase;
    away: TeamBase;
  };
  lineups: MatchLineup[];
  events: MatchEvent[];
  stats: MatchStats[];
  isLive: boolean;
  chatActive: boolean;
}

// --- Detalles de Formación ---
export interface MatchLineup {
  teamId: string;
  teamName: string;
  formation: string;
  coach: string;
  kitColors: {
    player: KitColor;
    goalkeeper: KitColor;
  };
  startXI: Array<{
    id: string;
    name: string;
    number: string;
    pos: 'G' | 'D' | 'M' | 'F';
    grid: string | null;
  }>;
  substitutes: Array<{
    id: string;
    name: string;
    number: string;
    pos: string | null;
  }>;
}

interface KitColor {
  border: string;
  number: string;
  primary: string;
}

// --- Eventos y Estadísticas ---
export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute: number | null;
  type: 'Goal' | 'Card' | 'subst' | 'Var';
  detail: string;
  team: {
    id: string;
    name: string;
    logo_url: string;
  };
  player: PlayerBase;
  assist: PlayerBase | null;
  substitutionLog?: {
    playerIn: string;
    playerOut: string;
  } | null;
}

export interface MatchStats {
  teamId: string;
  teamName: string;
  teamLogo: string;
  statistics: {
    fouls: number;
    offsides: number;
    'passes_%': string;
    total_shots: number;
    corner_kicks: number;
    ball_possession: string;
    shots_on_goal: number;
    // ... agregar los demás según el JSON
  };
}