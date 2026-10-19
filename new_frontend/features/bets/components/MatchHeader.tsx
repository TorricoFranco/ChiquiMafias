import React from 'react';
import { MatchHeaderData, OptionEntry, OptionTeam } from '../utils/matchHeader';

interface MatchHeaderProps {
  header: MatchHeaderData;
}

/** Escudo de un club en la cabecera "VS", con el nombre de la opción debajo. */
const VersusTeam: React.FC<{ team: OptionTeam }> = ({ team }) => (
  <div className="flex flex-col items-center gap-1.5 w-24">
    <img
      src={`/escudos-api/${team.logoUrl}.webp`}
      alt={team.name}
      className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
      loading="lazy"
    />
    <span className="w-full text-[11px] md:text-xs font-bold text-[#e5e2e1] text-center leading-tight line-clamp-2 break-words">
      {team.name}
    </span>
  </div>
);

const SHIELD_SIZE = {
  lg: 'w-12 h-12',
  sm: 'w-9 h-9',
} as const;

/** Escudo de una opción, o un ícono neutro si no es un club (como "Empate"). */
const OptionShield: React.FC<{ entry: OptionEntry; size: keyof typeof SHIELD_SIZE }> = ({ entry, size }) =>
  entry.team ? (
    <img
      src={`/escudos-api/${entry.team.logoUrl}.webp`}
      alt={entry.team.name}
      className={`${SHIELD_SIZE[size]} flex-shrink-0 object-contain drop-shadow-md`}
      loading="lazy"
    />
  ) : (
    <span aria-hidden="true" className={`${SHIELD_SIZE[size]} flex-shrink-0 rounded-full bg-[#2a2a2a] flex items-center justify-center`}>
      <span className="material-symbols-outlined text-xl text-[#909378]">remove</span>
    </span>
  );

/** Hasta tres opciones: escudo arriba y nombre abajo, repartiendo el ancho de la card entre todas. */
const OptionTile: React.FC<{ entry: OptionEntry }> = ({ entry }) => (
  <div className="flex flex-1 min-w-0 flex-col items-center gap-1.5">
    <OptionShield entry={entry} size="lg" />
    <span className="w-full text-[11px] font-bold text-[#e5e2e1] text-center leading-tight line-clamp-2 break-words">
      {entry.option.name}
    </span>
  </div>
);

/** Cuatro o más opciones: escudo y nombre lado a lado, en una grilla de dos columnas, para que el nombre se lea entero. */
const OptionCell: React.FC<{ entry: OptionEntry }> = ({ entry }) => (
  <div className="flex min-w-0 items-center gap-2 px-2 py-2 rounded-lg bg-[#1c1b1b] border border-[#353534]/60">
    <OptionShield entry={entry} size="sm" />
    <span className="min-w-0 text-[11px] font-bold text-[#e5e2e1] leading-tight line-clamp-2 break-words">
      {entry.option.name}
    </span>
  </div>
);

/**
 * Cabecera de un mercado MATCH. Con dos clubes, el VS entre los escudos; con tres o más, un escudo
 * por opción (sin VS). Qué variante toca lo decide `getMatchHeader`.
 */
export const MatchHeader: React.FC<MatchHeaderProps> = ({ header }) => {
  if (header.kind === 'row') {
    if (header.entries.length > 3) {
      return (
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#131313] rounded-xl border border-[#353534]/60">
          {header.entries.map((entry) => (
            <OptionCell key={entry.option.id} entry={entry} />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 px-3 py-3 bg-[#131313] rounded-xl border border-[#353534]/60">
        {header.entries.map((entry) => (
          <OptionTile key={entry.option.id} entry={entry} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 py-3 bg-[#131313] rounded-xl border border-[#353534]/60">
      <VersusTeam team={header.home} />

      <span className="text-[10px] font-black tracking-widest text-[#909378]">
        VS
      </span>

      <VersusTeam team={header.away} />
    </div>
  );
};
