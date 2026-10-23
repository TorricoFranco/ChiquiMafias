import { getTeamsList } from '@/data/teamData';
import { Market, MarketMetadata, MarketOption } from '../types';

export interface OptionTeam {
  name: string;
  /**
   * Escudo: un id de API-Football (`/escudos-api/<id>.webp`) o, para los equipos
   * sin ese id, la URL de Cloudinary. Usar `badgeSrc` para armar el `src`.
   */
  logoUrl: string;
}

/** `src` del escudo de una opción: la URL directa si viene de Cloudinary, o el asset local. */
export const badgeSrc = (logoUrl: string) =>
  logoUrl.startsWith('https://') ? logoUrl : `/escudos-api/${logoUrl}.webp`;

// Mercados viejos guardaron el id como texto aunque faltara.
const hasBadge = (logoUrl: string | null | undefined): logoUrl is string =>
  !!logoUrl && logoUrl !== 'null' && logoUrl !== 'undefined';

export interface OptionEntry {
  option: MarketOption;
  /** Null si la opción no tiene escudo (por ejemplo "Empate" o un jugador). */
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
 * Escudo de una opción. Primero el que guardó el admin en la opción. Si no tiene, busca un club cuyo
 * nombre coincida: con la metadata home/away en los mercados automáticos (los del cron, que la arman
 * con los nombres reales) y con el listado de clubes en el resto. Los manuales no usan la metadata:
 * el admin la armaba por posición y podía dejar un escudo pegado a un jugador.
 */
const resolveOptionTeam = (option: MarketOption, market: Market): OptionTeam | null => {
  if (hasBadge(option.logoUrl)) return { name: option.name, logoUrl: option.logoUrl };

  const key = normalizeName(option.name);
  if (!market.isManual) {
    const fromMetadata = [market.metadata?.homeTeam, market.metadata?.awayTeam].find(
      (team): team is NonNullable<MarketMetadata['homeTeam']> => !!team && normalizeName(team.name) === key
    );
    if (fromMetadata && hasBadge(fromMetadata.logoUrl)) return { name: option.name, logoUrl: fromMetadata.logoUrl };
  }

  const logoUrl = teamIdByName.get(key);
  return logoUrl ? { name: option.name, logoUrl } : null;
};

/**
 * Qué dibuja la cabecera de un mercado MATCH, según cuántas opciones tienen escudo:
 * - tres o más: una fila con un escudo por opción, sin VS (las opciones sin escudo muestran un ícono);
 * - dos: el VS entre esos dos escudos, con el nombre de cada opción debajo;
 * - menos de dos: no hay cabecera.
 */
export const getMatchHeader = (market: Market): MatchHeaderData | null => {
  const entries: OptionEntry[] = (market.options ?? []).map((option) => ({
    option,
    team: resolveOptionTeam(option, market),
  }));
  const withTeam = entries.flatMap((entry) => (entry.team ? [entry.team] : []));

  if (withTeam.length >= 3) return { kind: 'row', entries };
  if (withTeam.length === 2) return { kind: 'versus', home: withTeam[0], away: withTeam[1] };
  return null;
};
