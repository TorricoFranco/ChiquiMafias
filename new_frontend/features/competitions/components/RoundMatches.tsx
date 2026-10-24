"use client";

import React from 'react';
import Link from 'next/link';
import type { LiveResult, MatchFixture } from '@/features/fixture/types';
import { useRoundMatches } from '../hooks/useCompetitions';
import { formatKickoff } from '../utils/bracket';

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD'];

const Team: React.FC<{ name: string; logo: string | null; align: 'start' | 'end' }> = ({
  name,
  logo,
  align,
}) => (
  <div
    className={`flex-1 min-w-0 flex items-center gap-2 ${align === 'end' ? 'justify-end text-right' : 'justify-start text-left'}`}
  >
    {align === 'start' && logo && (
      <img src={logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
    )}
    <span className="text-xs md:text-sm font-bold text-[#e5e2e1] line-clamp-2 break-words leading-tight">
      {name}
    </span>
    {align === 'end' && logo && (
      <img src={logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
    )}
  </div>
);

/**
 * Partido de una copa: los dos equipos sin "local" ni "visitante" (cancha
 * neutral), con el día (las rondas duran semanas) y los penales si los hubo.
 */
const KnockoutMatchCard: React.FC<{ match: MatchFixture; live?: LiveResult }> = ({
  match,
  live: socketLive,
}) => {
  // El último dato en vivo no pisa un partido que la API ya da por terminado.
  const live = FINISHED.includes(match.status_short) ? undefined : socketLive;
  const status = live?.status ?? match.status_short;
  const home = live ? live.h : match.home_goals;
  const away = live ? live.a : match.away_goals;
  const penalties = ['P', 'PEN'].includes(status);
  const homePens = live ? live.hp : match.home_penalty_goals;
  const awayPens = live ? live.ap : match.away_penalty_goals;
  const isLive = LIVE.includes(status);
  const isFinished = FINISHED.includes(status);
  const showPens = penalties && homePens !== null && awayPens !== null;

  // El nombre accesible reemplaza al contenido: tiene que decir el resultado.
  const summary = isLive
    ? `en vivo, ${home ?? 0} a ${away ?? 0}`
    : isFinished
      ? `final, ${home ?? 0} a ${away ?? 0}${showPens ? `, penales ${homePens} a ${awayPens}` : ''}`
      : formatKickoff(match.date);

  return (
    <Link
      href={`/match/${match.id}`}
      aria-label={`${match.home_team.name} vs ${match.away_team.name}, ${summary}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-[#201f1f] border border-[#353534] hover:border-[#d2f000]/50 transition-colors"
    >
      <Team name={match.home_team.name} logo={match.home_team.logo_url} align="end" />
      <div className="w-24 flex-shrink-0 flex flex-col items-center py-1 bg-[#181818] rounded-lg border border-[#30302f]">
        {isLive || isFinished ? (
          <>
            <span
              className={`text-[9px] font-black uppercase tracking-wider ${isLive ? 'text-[#ffb4ab]' : 'text-[#909378]'}`}
            >
              {isLive ? 'En vivo' : penalties ? 'Penales' : 'Final'}
            </span>
            <span className="text-sm font-black text-[#e5e2e1] tabular-nums">
              {home ?? 0} - {away ?? 0}
            </span>
            {showPens && (
              <span className="text-[10px] font-bold text-[#c6c9ab] tabular-nums">
                ({homePens} - {awayPens})
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-bold text-[#c6c9ab] whitespace-nowrap py-1">
            {formatKickoff(match.date)}
          </span>
        )}
      </div>
      <Team name={match.away_team.name} logo={match.away_team.logo_url} align="start" />
    </Link>
  );
};

/** Partidos de una ronda, con los marcadores en vivo que llegan por socket. */
export const RoundMatches: React.FC<{
  slug: string;
  round: string;
  live: Record<string, LiveResult>;
}> = ({ slug, round, live }) => {
  const { data, isLoading, isError, refetch } = useRoundMatches(slug, round);

  if (isLoading) {
    return (
      <p className="text-center text-xs text-[#c6c9ab] py-10 animate-pulse">Cargando partidos...</p>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-10 text-xs text-[#ffb4ab]">
        No se pudieron cargar los partidos.
        <button
          type="button"
          onClick={() => void refetch()}
          className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider px-4 py-2 rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!data?.matches.length) {
    return (
      <p className="text-center text-xs text-[#8e9285] py-10">
        Todavía no hay partidos de esta ronda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.matches.map((match) => (
        <li key={match.id}>
          <KnockoutMatchCard match={match} live={live[match.id]} />
        </li>
      ))}
    </ul>
  );
};
