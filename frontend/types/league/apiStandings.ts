export interface Team {
  id: string;
  name: string;
  logo?: string;
}

export interface TeamStats {
  team_id: string;
  group_name: string;
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  position: number;
  team: Team; // Viene del include en el backend
}

export interface AverageRow {
  teamId: string;
  teamName: string;
  pts24: number; pj24: number;
  pts25: number; pj25: number;
  pts26: number; pj26: number;
  totalPoints: number;
  totalPlayed: number;
  coefficient: number;
}

export interface ApiResponse {
  tournament: string;
  groups: { A: TeamStats[]; B: TeamStats[] };
  annual: any[]; // Estructura similar a la anual que ya tenías
  averages: AverageRow[];
}