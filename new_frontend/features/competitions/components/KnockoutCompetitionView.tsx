"use client";

import React, { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLeagueLive } from '@/features/fixture/socket/useFixtureSocket';
import { useCompetitionBracket } from '../hooks/useCompetitions';
import type { Competition } from '../types';
import { defaultRound, isRoundAvailable, withLiveResults } from '../utils/bracket';
import { BracketView } from './BracketView';
import { RoundMatches } from './RoundMatches';

type Tab = 'partidos' | 'cuadro';

/**
 * Competición de eliminación directa (Copa Argentina): pestañas Partidos (por
 * ronda) y Cuadro (ERS RF-B09). Siempre en cancha neutral: no se habla de
 * local ni de visitante (D-12).
 */
export const KnockoutCompetitionView: React.FC<{ competition: Competition }> = ({ competition }) => {
  const [tab, setTab] = useState<Tab>('partidos');
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const { data: bracket, isLoading, isError, refetch } = useCompetitionBracket(competition.slug);
  const { liveResults } = useLeagueLive(competition.slug);

  const liveBracket = useMemo(
    () => (bracket ? withLiveResults(bracket, liveResults) : null),
    [bracket, liveResults],
  );
  const rounds = liveBracket?.rounds ?? [];

  // La ronda por defecto se elige una sola vez, al llegar el cuadro: un aviso
  // del socket no puede cambiarle al usuario la lista que está leyendo.
  if (selectedRound === null && bracket) {
    const initial = defaultRound(withLiveResults(bracket, liveResults).rounds);
    if (initial) setSelectedRound(initial.name);
  }
  const round = selectedRound;

  const tabClass = (value: Tab) =>
    `px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
      tab === value ? 'bg-[#d2f000] text-[#191e00]' : 'bg-[#201f1f] text-[#c6c9ab] hover:text-[#e5e2e1]'
    }`;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* div y no header: la página ya tiene el banner de la app. */}
      <div className="flex items-start gap-3.5 bg-[#1c1b1b] border border-[#353534] rounded-2xl p-4 sm:p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#d2f000]/10 border border-[#d2f000]/30 flex items-center justify-center flex-shrink-0 text-[#d2f000]">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-black text-[#e5e2e1] uppercase tracking-tight">
            {competition.name} {competition.season.label}
          </h1>
          <p className="text-xs text-[#c6c9ab] mt-1">
            Eliminación directa a partido único
            {competition.neutralVenue && ' · Cancha neutral'}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label={`Secciones de ${competition.name}`} className="flex gap-2">
        <button
          type="button"
          role="tab"
          id="tab-partidos"
          aria-selected={tab === 'partidos'}
          aria-controls="panel-partidos"
          onClick={() => setTab('partidos')}
          className={tabClass('partidos')}
        >
          Partidos
        </button>
        <button
          type="button"
          role="tab"
          id="tab-cuadro"
          aria-selected={tab === 'cuadro'}
          aria-controls="panel-cuadro"
          onClick={() => setTab('cuadro')}
          className={tabClass('cuadro')}
        >
          Cuadro
        </button>
      </div>

      {isLoading && (
        <p className="text-center text-xs text-[#c6c9ab] py-10 animate-pulse">Cargando el cuadro...</p>
      )}
      {/* Un refresco fallido en segundo plano no tapa el cuadro que ya se ve. */}
      {isError && !bracket && (
        <div role="alert" className="flex flex-col items-center gap-3 py-10 text-xs text-[#ffb4ab]">
          No se pudo cargar la copa.
          <button
            type="button"
            onClick={() => void refetch()}
            className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider px-4 py-2 rounded-lg"
          >
            Reintentar
          </button>
        </div>
      )}

      {liveBracket && tab === 'partidos' && (
        <div role="tabpanel" id="panel-partidos" aria-labelledby="tab-partidos" className="flex flex-col gap-4">
          <div role="group" aria-label="Rondas" className="flex flex-wrap gap-2">
            {rounds.map((r) => {
              const available = isRoundAvailable(r);
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={r.name === round}
                  disabled={!available}
                  onClick={() => setSelectedRound(r.name)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    r.name === round
                      ? 'bg-[#d2f000] text-[#191e00]'
                      : 'bg-[#2a2a2a] text-[#c6c9ab] hover:text-[#e5e2e1]'
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
          {round && <RoundMatches slug={competition.slug} round={round} live={liveResults} />}
        </div>
      )}

      {liveBracket && tab === 'cuadro' && (
        <div role="tabpanel" id="panel-cuadro" aria-labelledby="tab-cuadro">
          <BracketView bracket={liveBracket} />
        </div>
      )}
    </div>
  );
};
