'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MatchDetailView } from '@/features/matches/components/MatchDetailView';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LeagueSidebar } from '@/features/league/components/LigaProfesional/LeagueSidebar';
import { TournamentType, ZoneType } from '@/features/league/type';

export default function FullMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  // 1. Mismos estados que maneja LeagueView
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('lpf-2026');
  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isBracketOpen, setIsBracketOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleScrollToSection = (sectionId: string) => {
    router.push('/');
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-[#e5e2e1]">
      <Header activeTab="ligas" setActiveTab={() => router.push('/')} />

      <div className="flex-1 flex flex-col pt-16 overflow-hidden">
        <div className="flex h-full w-full relative">

          <LeagueSidebar
            activeTournament={activeTournament}
            onChangeTournament={setActiveTournament}
            activeZone={activeZone}
            onChangeZone={setActiveZone}
            selectedLeagueId={selectedLeagueId}
            onSelectLeague={(id) => {
              router.push('/?tab=ligas');
            }}
            onOpenBracket={() => {
              router.push('/?tab=ligas');
            }}
            onScrollToSection={(sectionId) => {
              router.push('/?tab=ligas');
            }}
            onSwitchToSocial={() => {
              router.push('/?tab=social');
            }}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            simulatedCount={0}
            onResetSimulations={() => console.log('Resetear simulaciones')}
          />

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden fixed bottom-24 right-4 z-30 bg-[#d2f000] text-[#191e00] px-4 py-3 rounded-full shadow-lg font-black uppercase text-xs tracking-wider"
          >
            Menú Ligas
          </button>

          <div className="flex-1 w-full md:pl-64 overflow-y-auto bg-[#131313] flex flex-col">
            <div className="p-4 md:p-6 lg:p-8 flex-1">
              <MatchDetailView
                matchId={matchId}
                leagueId={selectedLeagueId === 'lpf-2026' ? "6a2a03c5-1054-49e4-96c3-afd2bca9ebd7" : selectedLeagueId}
                season="2026"
                onBack={() => router.push('/')}
              />
            </div>
            <Footer />
          </div>

        </div>
      </div>
    </div>
  );
}