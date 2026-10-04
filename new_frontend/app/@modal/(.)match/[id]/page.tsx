'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MatchDetailView } from '@/features/matches/components/MatchDetailView';
import { LeagueSidebar } from '@/features/league/components/LigaProfesional/LeagueSidebar';
import { TournamentType, ZoneType } from '@/features/league/type';

export default function InterceptedMatchModal() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('lpf-2026');
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
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col h-screen w-screen overflow-hidden text-[#e5e2e1]">
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

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden fixed bottom-24 right-4 z-30 bg-[#d2f000] text-[#191e00] px-4 py-3 rounded-full shadow-lg font-black uppercase text-xs tracking-wider"
          >
            Menú Ligas
          </button>

          <div className="flex-1 w-full md:pl-64 overflow-y-auto bg-[#131313] flex flex-col h-full">
            <div className="p-4 md:p-6 lg:p-8 flex-1 flex flex-col min-h-0">
              <MatchDetailView
                matchId={matchId}
                leagueId={selectedLeagueId === 'lpf-2026' ? "6a2a03c5-1054-49e4-96c3-afd2bca9ebd7" : selectedLeagueId}
                season="2026"
                onBack={handleBack}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}