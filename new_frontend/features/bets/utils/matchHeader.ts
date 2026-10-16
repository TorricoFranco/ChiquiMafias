import { getTeamsList } from '@/data/teamData';
import { Market, MarketMetadata, MarketOption } from '../types';

export interface OptionTeam {
  name: string;
  /** Id del escudo: se arma `/escudos-api/<logoUrl>.webp`, igual que en la metadata de los mercados. */
  logoUrl: string;
  /** Sigla del club. Si no viene de la metadata, son las tres primeras letras, como las arma el admin. */
  short: string;
}

export interface OptionEntry {
  option: MarketOption;
  /** Null si la opción no es un club (por ejemplo "Empate"). */
  team: OptionTeam | null;
}

export type MatchHeaderData =
  | { kind: 'row'; entries: OptionEntry[] }
  | { kind: 'versus'; home: OptionTeam; away: OptionTeam };

const normalizeName = (name: string) => name.trim().toLowerCase();

// Clubes del listado de escudos indexados por nombre. Se arma una sola vez.
const teamIdByName = new Map<string, string>(
  getTeamsList().map((team): [string, string] => [normalizeName(team.name), team.id])
);

/**
 * Escudo de una opción. Busca primero en la metadata (home/away, como la guardan el cron y el admin)
 * y después por nombre en el listado de clubes: las opciones de un mercado con más de dos equipos
 * solo guardan el nombre. Si la opción no es un club, devuelve null.
 */
const resolveOptionTeam = (option: MarketOption, metadata?: MarketMetadata | null): OptionTeam | null => {
  const key = normalizeName(option.name);

  const fromMetadata = [metadata?.homeTeam, metadata?.awayTeam].find(
    (team) => team && normalizeName(team.name) === key
  );
  if (fromMetadata) {
    return { name: option.name, logoUrl: fromMetadata.logoUrl, short: fromMetadata.short };
  }

  const logoUrl = teamIdByName.get(key);
  return logoUrl ? { name: option.name, logoUrl, short: option.name.substring(0, 3).toUpperCase() } : null;
};

/**
 * Qué dibuja la cabecera de un mercado MATCH, según cuántas opciones son clubes:
 * - tres o más: una fila con un escudo por opción, sin VS (equipos o "Empate" entre medio);
 * - dos (por ejemplo "Boca", "Empate", "River"): el VS entre esos dos escudos;
 * - menos de dos: el VS con home/away de la metadata, si la hay (opciones renombradas a mano).
 */
export const getMatchHeader = (market: Market): MatchHeaderData | null => {
  const entries: OptionEntry[] = (market.options ?? []).map((option) => ({
    option,
    team: resolveOptionTeam(option, market.metadata),
  }));
  const clubs = entries.flatMap((entry) => (entry.team ? [entry.team] : []));

  if (clubs.length >= 3) return { kind: 'row', entries };
  if (clubs.length === 2) return { kind: 'versus', home: clubs[0], away: clubs[1] };

  const homeTeam = market.metadata?.homeTeam;
  const awayTeam = market.metadata?.awayTeam;
  if (!homeTeam || !awayTeam) return null;

  return {
    kind: 'versus',
    home: { name: homeTeam.name, logoUrl: homeTeam.logoUrl, short: homeTeam.short },
    away: { name: awayTeam.name, logoUrl: awayTeam.logoUrl, short: awayTeam.short },
  };
};
