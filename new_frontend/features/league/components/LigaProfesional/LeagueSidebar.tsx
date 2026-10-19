'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TournamentType, ZoneType } from '../../type';
import { SidebarHeader } from '../sidebar/SidebarHeader';
import { TournamentFilters } from '../sidebar/TournamentFilters';
import { BracketButton } from '../sidebar/BracketButton';
import { SidebarNavigation } from '../sidebar/SidebarNavigation';
import { SimulationBadge } from '../sidebar/SimulationBadge';
import { ComingSoonState } from '../sidebar/ComingSoonState';
import { SidebarFooter } from '../sidebar/SidebarFooter';

interface LeagueSidebarProps {
  activeTournament: TournamentType;
  onChangeTournament: (tournament: TournamentType) => void;
  activeZone: ZoneType;
  onChangeZone: (zone: ZoneType) => void;
  selectedLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
  onOpenBracket: () => void;
  onScrollToSection: (sectionId: string) => void;
  onSwitchToSocial: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  simulatedCount?: number;
  onResetSimulations?: () => void;
  onShowNotice?: (message: string) => void;
}

export const LeagueSidebar: React.FC<LeagueSidebarProps> = ({ ...props }) => {
  const isLPF = props.selectedLeagueId === 'lpf-2026';

  const [isLpfExpanded, setIsLpfExpanded] = useState(isLPF);

  const handleLeagueClick = (leagueId: string) => {
    props.onSelectLeague(leagueId);

    if (leagueId === 'lpf-2026') {
      setIsLpfExpanded(!isLpfExpanded);
    } else {
      setIsLpfExpanded(false);
    }
  };

  const content = (
    <div className="flex flex-col h-full py-5 px-3 bg-[#1c1b1b] border-r border-[#353534] overflow-y-auto">

      <SidebarHeader
        isOpenMobile={props.isOpenMobile}
        onCloseMobile={props.onCloseMobile}
      />

      <div className="flex-1 flex flex-col mt-6 px-1">
        <h3 className="text-[#3b873e] text-sm font-bold mb-3 uppercase tracking-wider">
          Destacado
        </h3>

        <div className="flex flex-col mb-1">
          <button
            onClick={() => handleLeagueClick('lpf-2026')}
            className={`w-full flex items-center justify-between p-2 rounded-lg font-medium transition-colors ${isLPF ? 'text-[#d2f000]' : 'text-[#e5e2e1] hover:bg-[#2a2a2a]'
              }`}
          >
            <span>Liga Profesional</span>
            {isLpfExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isLpfExpanded && (
            <div className="ml-4 mt-2 pl-3 border-l-2 border-[#353534] flex flex-col gap-4 animate-in slide-in-from-top-2">
              <TournamentFilters
                activeTournament={props.activeTournament}
                onChangeTournament={props.onChangeTournament}
                activeZone={props.activeZone}
                onChangeZone={props.onChangeZone}
              />

              <BracketButton
                onClick={() => {
                  props.onOpenBracket();
                  if (props.isOpenMobile) props.onCloseMobile();
                }}
              />

              <SidebarNavigation
                activeZone={props.activeZone}
                simulatedCount={props.simulatedCount}
                onNavigate={(id) => {
                  props.onScrollToSection(id);
                  if (props.isOpenMobile) props.onCloseMobile();
                }}
              />

              {props.simulatedCount !== undefined && props.simulatedCount > 0 && props.onResetSimulations && (
                <SimulationBadge
                  count={props.simulatedCount}
                  onReset={props.onResetSimulations}
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => handleLeagueClick('primera-nacional')}
          className={`w-full flex items-center p-2 rounded-lg font-medium transition-colors mb-1 ${props.selectedLeagueId === 'primera-nacional' ? 'text-[#d2f000]' : 'text-[#e5e2e1] hover:bg-[#2a2a2a]'
            }`}
        >
          Primera Nacional
        </button>

        <button
          onClick={() => handleLeagueClick('libertadores')}
          className={`w-full flex items-center p-2 rounded-lg font-medium transition-colors mb-1 ${props.selectedLeagueId === 'libertadores' ? 'text-[#d2f000]' : 'text-[#e5e2e1] hover:bg-[#2a2a2a]'
            }`}
        >
          Libertadores
        </button>

        <button
          onClick={() => handleLeagueClick('sudamericana')}
          className={`w-full flex items-center p-2 rounded-lg font-medium transition-colors ${props.selectedLeagueId === 'sudamericana' ? 'text-[#d2f000]' : 'text-[#e5e2e1] hover:bg-[#2a2a2a]'
            }`}
        >
          Sudamericana
        </button>

        {!isLPF && (
          <div className="mt-6">
            <ComingSoonState onBackToLPF={() => handleLeagueClick('lpf-2026')} />
          </div>
        )}
      </div>

      <SidebarFooter
        onSwitch={() => {
          props.onSwitchToSocial();
          if (props.isOpenMobile) props.onCloseMobile();
        }}
      />
    </div>
  );

  return (
    <>
      <nav className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-40">
        {content}
      </nav>

      {props.isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={props.onCloseMobile} />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};