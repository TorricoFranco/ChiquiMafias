"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import type { BracketResponse, BracketSlot, BracketTeam } from '../types';
import { formatKickoff, teamBadgeSrc } from '../utils/bracket';

// Alto de una llave: las rondas siguientes se centran entre sus dos llaves de origen.
const SLOT_HEIGHT = 96;
// Por defecto se ve desde octavos: 32avos y 16avos quedan a un toque.
const DEFAULT_VISIBLE_ROUNDS = 4;

const TeamRow: React.FC<{
  team: BracketTeam | null;
  goals: number | null;
  penalties: number | null;
  isWinner: boolean;
  decided: boolean;
}> = ({ team, goals, penalties, isWinner, decided }) => {
  if (!team) {
    return (
      <div className="flex items-center gap-2 h-7 px-2 text-[11px] text-[#8e9285] italic">
        Por definir
      </div>
    );
  }
  const badge = teamBadgeSrc(team);
  const tone = isWinner
    ? 'text-[#d2f000] font-black'
    : decided
      ? 'text-[#8e9285] font-semibold'
      : 'text-[#e5e2e1] font-bold';
  return (
    <div className={`flex items-center gap-2 h-7 px-2 text-xs ${tone}`}>
      {badge ? (
        <img src={badge} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
      ) : (
        <span aria-hidden="true" className="w-5 h-5 rounded-full bg-[#2a2a2a] flex-shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate">{team.name}</span>
      {goals !== null && (
        <span className="font-mono tabular-nums">
          {goals}
          {penalties !== null && <span className="text-[10px] ml-0.5">({penalties})</span>}
        </span>
      )}
    </div>
  );
};

const SlotCard: React.FC<{ slot: BracketSlot }> = ({ slot }) => {
  const decided = slot.winnerTeamId !== null;
  const teams =
    slot.home && slot.away ? `${slot.home.name} vs ${slot.away.name}` : 'Llave por definir';
  const winner = [slot.home, slot.away].find((t) => t && t.id === slot.winnerTeamId);
  const details = [
    slot.isLive ? 'en vivo' : null,
    slot.homeGoals !== null && slot.awayGoals !== null
      ? `${slot.homeGoals} a ${slot.awayGoals}`
      : null,
    slot.homePenalties !== null && slot.awayPenalties !== null
      ? `penales ${slot.homePenalties} a ${slot.awayPenalties}`
      : null,
    winner ? `gana ${winner.name}` : null,
    !slot.isLive && !decided && slot.date ? formatKickoff(slot.date) : null,
  ].filter(Boolean);
  // El nombre accesible reemplaza al contenido: tiene que decir el resultado.
  const label = [teams, ...details].join(', ');

  const content = (
    <div
      className={`w-full rounded-xl border bg-[#201f1f] overflow-hidden transition-colors ${
        slot.isLive ? 'border-[#ffb4ab]/60' : 'border-[#353534]'
      } ${slot.matchId ? 'hover:border-[#d2f000]/50' : ''}`}
    >
      <TeamRow
        team={slot.home}
        goals={slot.homeGoals}
        penalties={slot.homePenalties}
        isWinner={decided && slot.winnerTeamId === slot.home?.id}
        decided={decided}
      />
      <div className="h-px bg-[#353534]" />
      <TeamRow
        team={slot.away}
        goals={slot.awayGoals}
        penalties={slot.awayPenalties}
        isWinner={decided && slot.winnerTeamId === slot.away?.id}
        decided={decided}
      />
      {(slot.isLive || (slot.date && !decided)) && (
        <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#181818]">
          {slot.isLive ? (
            <span className="text-[#ffb4ab] flex items-center gap-1">
              <span aria-hidden="true" className="w-1.5 h-1.5 bg-[#d30017] rounded-full live-pulse" />
              En vivo
            </span>
          ) : (
            <span className="text-[#909378]">{formatKickoff(slot.date!)}</span>
          )}
        </div>
      )}
    </div>
  );

  return slot.matchId ? (
    <Link href={`/match/${slot.matchId}`} aria-label={label} className="block">
      {content}
    </Link>
  ) : (
    <div role="group" aria-label={label}>
      {content}
    </div>
  );
};

/**
 * Cuadro de eliminación directa: una columna por ronda, con cada llave centrada
 * entre las dos de las que sale. Se ve desde octavos; las rondas anteriores se
 * abren con los botones de arriba.
 */
export const BracketView: React.FC<{ bracket: BracketResponse }> = ({ bracket }) => {
  const rounds = bracket.rounds;
  const [startIndex, setStartIndex] = useState(() =>
    Math.max(0, rounds.length - DEFAULT_VISIBLE_ROUNDS),
  );
  const visible = rounds.slice(startIndex);
  const height = (visible[0]?.slots.length ?? 1) * SLOT_HEIGHT;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Ver el cuadro desde" className="flex flex-wrap gap-2">
        {rounds.slice(0, -1).map((round, i) => (
          <button
            key={round.key}
            type="button"
            aria-pressed={i === startIndex}
            onClick={() => setStartIndex(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
              i === startIndex
                ? 'bg-[#d2f000] text-[#191e00]'
                : 'bg-[#2a2a2a] text-[#c6c9ab] hover:text-[#e5e2e1]'
            }`}
          >
            Desde {round.name}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {visible.map((round) => (
            <section key={round.key} aria-label={round.name} className="w-56 flex-shrink-0 flex flex-col">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#c6c9ab] mb-2 px-1">
                {round.name}
              </h3>
              <div className="flex flex-col justify-around" style={{ height }}>
                {round.slots.map((slot) => (
                  <SlotCard key={slot.position} slot={slot} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
