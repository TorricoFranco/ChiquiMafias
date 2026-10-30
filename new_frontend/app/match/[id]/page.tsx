'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MatchDetailView } from '@/features/matches/components/MatchDetailView';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LeagueSidebar } from '@/features/league/components/LigaProfesional/LeagueSidebar';
import { MobileMenuBar } from '@/features/league/components/sidebar/MobileMenuBar';
import { TournamentType, ZoneType } from '@/features/league/type';
import { LEAGUE_SLUG } from '@/features/competitions/constants';

export default function FullMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  // 1. Mismos estados que maneja LeagueView
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(LEAGUE_SLUG);
  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isBracketOpen, setIsBracketOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleScrollToSection = (sectionId: string) => {
    router.push('/');
  };

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

          <div className="flex-1 w-full flex flex-col min-h-0">
            <div className="flex-1 min-h-0 w-full md:pl-64 overflow-y-auto bg-[#131313] flex flex-col">
              <div className="p-4 md:p-6 lg:p-8 flex-1">
                <MatchDetailView
                  matchId={matchId}
                  onBack={() => router.push('/')}
                />
              </div>
              <Footer />
            </div>
            <MobileMenuBar onOpen={() => setIsMobileSidebarOpen(true)} />
          </div>

        </div>
      </div>
    </div>
  );
}