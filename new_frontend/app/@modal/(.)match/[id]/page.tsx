'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MatchDetailView } from '@/features/matches/components/MatchDetailView';
import { LeagueSidebar } from '@/features/league/components/LigaProfesional/LeagueSidebar';
import { MobileMenuBar } from '@/features/league/components/sidebar/MobileMenuBar';
import { TournamentType, ZoneType } from '@/features/league/type';
import { LEAGUE_SLUG } from '@/features/competitions/constants';

export default function InterceptedMatchModal() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(LEAGUE_SLUG);
  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isBracketOpen, setIsBracketOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  if (!matchId || matchId === 'null') return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col h-dvh w-screen overflow-hidden text-[#e5e2e1]">
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
              router.back();
            }}
            onOpenBracket={() => {
              router.back();
            }}
            onScrollToSection={() => {
              router.back();
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
              <div className="p-4 md:p-6 lg:p-8 flex-1 flex flex-col min-h-0">
                <MatchDetailView
                  matchId={matchId}
                  onBack={handleBack}
                />
              </div>
            </div>
            <MobileMenuBar onOpen={() => setIsMobileSidebarOpen(true)} />
          </div>
        </div>
      </div>
    </div>
  );
}