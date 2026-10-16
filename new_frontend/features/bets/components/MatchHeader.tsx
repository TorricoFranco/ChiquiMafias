import React from 'react';
import { MatchHeaderData, OptionEntry, OptionTeam } from '../utils/matchHeader';

interface MatchHeaderProps {
  header: MatchHeaderData;
}

/** Escudo y sigla de un club en la cabecera "VS". */
const VersusTeam: React.FC<{ team: OptionTeam }> = ({ team }) => (
  <div className="flex flex-col items-center gap-1.5 w-24">
    <img
      src={`/escudos-api/${team.logoUrl}.webp`}
      alt={team.name}
      className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
      loading="lazy"
    />
    <span className="text-[11px] md:text-xs font-bold text-[#e5e2e1] text-center leading-tight">
      {team.short}
    </span>
  </div>
);

/** Una opción en la fila de escudos. Si no es un club (como "Empate"), muestra un ícono neutro. */
const OptionTile: React.FC<{ entry: OptionEntry }> = ({ entry }) => (
  <div className="flex flex-col items-center gap-1.5 w-14">
    {entry.team ? (
      <img
        src={`/escudos-api/${entry.team.logoUrl}.webp`}
        alt={entry.team.name}
        className="w-12 h-12 object-contain drop-shadow-md"
        loading="lazy"
      />
    ) : (
      <span aria-hidden="true" className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
        <span className="material-symbols-outlined text-xl text-[#909378]">remove</span>
      </span>
    )}
    <span className="w-full text-[10px] md:text-[11px] font-bold text-[#e5e2e1] text-center leading-tight line-clamp-2 break-words">
      {entry.option.name}
    </span>
  </div>
);

/**
 * Cabecera de un mercado MATCH. Con dos clubes, el VS entre los escudos; con tres o más, un escudo
 * por opción en fila (sin VS). Qué variante toca lo decide `getMatchHeader`.
 */
export const MatchHeader: React.FC<MatchHeaderProps> = ({ header }) => {
  if (header.kind === 'row') {
    return (
      <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-3 py-3 bg-[#131313] rounded-xl border border-[#353534]/60">
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
