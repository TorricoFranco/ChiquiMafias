import React, { useState } from 'react';
import { LeagueSidebar } from './LigaProfesional/LeagueSidebar';
import { LigaProfesionalView } from './LigaProfesional/LigaProfesionalView';
import { UpcomingCompetitionView } from './UpcomingCompetitionView';
import { TournamentType, ZoneType } from '../type';
import { LEAGUE_SLUG } from '@/features/competitions/constants';
import { useCurrentSeason } from '@/features/competitions/hooks/useCompetitions';
import { usePendingFixtures } from '@/features/fixture/hooks/useFixture';

interface LeagueViewProps {
  onSwitchToSocial: () => void;
}

export const LeagueView: React.FC<LeagueViewProps> = ({ onSwitchToSocial }) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(LEAGUE_SLUG);

  const [activeTournament, setActiveTournament] = useState<TournamentType>('CLAUSURA');
  const [activeZone, setActiveZone] = useState<ZoneType>('A');
  const [isBracketOpen, setIsBracketOpen] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Las mismas consultas que la vista de la Liga (misma clave): no suman requests.
  const { season } = useCurrentSeason(LEAGUE_SLUG);
  const { data: pendingFixtures } = usePendingFixtures(season, activeTournament);
  // El simulador solo existe con fechas por jugar: los cruces de playoff no se simulan.
  const hasSimulator = pendingFixtures === undefined || pendingFixtures.some((group) => !group.is_playoff);

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full relative">

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
        hasSimulator={hasSimulator}
        onResetSimulations={() => console.log('Resetear simulaciones')}
      />

      <div className="flex-1 w-full md:pl-64 overflow-y-auto bg-[#131313]">
        <div className="p-4 md:p-6 lg:p-8 min-h-full">
          {selectedLeagueId === LEAGUE_SLUG ? (
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
              onBackToLPF={() => setSelectedLeagueId(LEAGUE_SLUG)}
            />
          )}
        </div>
      </div>

      {/* En mobile va en su franja debajo del contenido: flotando encima, el botón tapaba las filas de la tabla. */}
      <div className="md:hidden shrink-0 flex justify-end px-4 py-2 bg-[#131313] border-t border-[#353534]">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="bg-[#d2f000] text-[#191e00] px-4 py-3 rounded-full shadow-lg font-black uppercase text-xs tracking-wider"
        >
          Menú Ligas
        </button>
      </div>

    </div>
  );
};