import React, { useState } from 'react';
import { LeagueSidebar } from './LigaProfesional/LeagueSidebar';
import { LigaProfesionalView } from './LigaProfesional/LigaProfesionalView';
import { UpcomingCompetitionView } from './UpcomingCompetitionView';
import { TournamentType, ZoneType } from '../type';

interface LeagueViewProps {
  onSwitchToSocial: () => void;
}

export const LeagueView: React.FC<LeagueViewProps> = ({ onSwitchToSocial }) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('lpf-2026');

  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isBracketOpen, setIsBracketOpen] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-full w-full relative">

      <LeagueSidebar
        activeTournament={activeTournament}
        onChangeTournament={setActiveTournament}
        activeZone={activeZone}
        onChangeZone={setActiveZone}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={setSelectedLeagueId}
        onOpenBracket={() => setIsBracketOpen(true)}
        onScrollToSection={handleScrollToSection}
        onSwitchToSocial={onSwitchToSocial}
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
      <div className="flex-1 w-full md:pl-64 overflow-y-auto bg-[#131313]">
        <div className="p-4 md:p-6 lg:p-8 min-h-full">
          {selectedLeagueId === 'lpf-2026' ? (
            <LigaProfesionalView
              externalTournament={activeTournament}
              onChangeTournament={setActiveTournament}
              externalZone={activeZone}
              onChangeZone={setActiveZone}
              isBracketOpen={isBracketOpen}
              onToggleBracket={setIsBracketOpen}
              onShowToast={(msg) => console.log('Toast:', msg)}
            />
          ) : (
            <UpcomingCompetitionView
              competitionId={selectedLeagueId}
              onBackToLPF={() => setSelectedLeagueId('lpf-2026')}
            />
          )}
        </div>
      </div>

    </div>
  );
};