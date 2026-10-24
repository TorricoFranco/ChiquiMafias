'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LeagueSidebar } from '@/features/league/components/LigaProfesional/LeagueSidebar';
import { TournamentType, ZoneType } from '@/features/league/type';
import { KnockoutCompetitionView } from '@/features/competitions/components/KnockoutCompetitionView';
import { useCompetition } from '@/features/competitions/hooks/useCompetitions';

/** Página de una competición con vista propia, como la Copa Argentina (ERS RF-B09). */
export default function CompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: competition, isLoading, isError, isSuccess, refetch } = useCompetition(slug);
  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const goToLeagues = () => router.push('/?tab=ligas');

  return (
    <div className="h-dvh w-screen flex flex-col overflow-hidden bg-[#050505] text-[#e5e2e1]">
      <Header activeTab="ligas" setActiveTab={() => router.push('/')} />

      <div className="flex-1 flex flex-col md:pt-16 overflow-hidden">
        <div className="flex h-full w-full relative">
          <LeagueSidebar
            activeTournament={activeTournament}
            onChangeTournament={setActiveTournament}
            activeZone={activeZone}
            onChangeZone={setActiveZone}
            selectedLeagueId={slug}
            onSelectLeague={goToLeagues}
            onOpenBracket={goToLeagues}
            onScrollToSection={goToLeagues}
            onSwitchToSocial={() => router.push('/?tab=social')}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden fixed bottom-24 right-4 z-30 bg-[#d2f000] text-[#191e00] px-4 py-3 rounded-full shadow-lg font-black uppercase text-xs tracking-wider"
          >
            Menú Ligas
          </button>

          <div className="flex-1 w-full md:pl-64 overflow-y-auto bg-[#131313] flex flex-col">
            <div className="p-4 md:p-6 lg:p-8 flex-1">
              {isLoading && (
                <p className="text-center text-xs text-[#c6c9ab] py-10 animate-pulse">Cargando...</p>
              )}
              {isError && !competition && (
                <div role="alert" className="flex flex-col items-center gap-3 py-10 text-xs text-[#ffb4ab]">
                  No se pudo cargar la competición.
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider px-4 py-2 rounded-lg"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {competition?.hasBracket && (
                <KnockoutCompetitionView competition={competition} />
              )}
              {isSuccess && !competition?.hasBracket && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <h1 className="text-lg font-black text-[#e5e2e1] uppercase">
                    Competición no disponible
                  </h1>
                  <p className="text-xs text-[#c6c9ab]">
                    Esta competición todavía no tiene su página.
                  </p>
                  <button
                    type="button"
                    onClick={goToLeagues}
                    className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider text-xs px-4 py-2 rounded-lg"
                  >
                    Volver a Ligas
                  </button>
                </div>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
