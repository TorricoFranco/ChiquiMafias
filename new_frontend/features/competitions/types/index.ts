/** Formato de la temporada (`CompetitionFormat` del backend). */
export type CompetitionFormat = 'LIGA_DIVIDIDA' | 'LIGA' | 'ELIMINACION' | 'GRUPOS_Y_ELIMINACION';

/** `CompetitionResponseDto`: una competición con su temporada actual. */
export interface Competition {
  slug: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  country: string | null;
  format: CompetitionFormat;
  /** true en cancha neutral: no se muestra local ni visitante. */
  neutralVenue: boolean;
  /** Fases de la temporada (`APERTURA`, `CLAUSURA`); vacío si el formato todavía no tiene vista. */
  stages: string[];
  hasStandings: boolean;
  season: {
    /** Año de inicio: lo que piden las rutas con temporada. */
    year: number;
    /** Lo que se muestra: `2026` o `2026/27`. */
    label: string;
  };
}
