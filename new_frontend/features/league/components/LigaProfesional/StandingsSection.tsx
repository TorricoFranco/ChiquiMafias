import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { ZoneType, StandingRow, TournamentType } from '../../type';
import { ZoneTabs } from './ZoneTabs';
import { StandingsTable } from './tables/StandingsTable';

interface StandingsSectionProps {
  activeZone: ZoneType;
  onChangeZone: (zone: ZoneType) => void;
  standings: StandingRow[];
  tournament?: TournamentType;
}

export const StandingsSection: React.FC<StandingsSectionProps> = ({
  activeZone,
  onChangeZone,
  standings,
  tournament,
}) => {
  return (
    <div id="posiciones" className="flex flex-col gap-4 scroll-mt-24">
      {/* Zone Selector Header */}
      <div className="flex items-center justify-between bg-[#1c1b1b] border border-[#353534] p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#d2f000]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#c6c9ab]">
            Fase de Grupos • 15 Equipos por Zona
          </span>
        </div>

        <ZoneTabs activeZone={activeZone} onChangeZone={onChangeZone} />
      </div>

      <StandingsTable
        zone={activeZone}
        standings={standings}
        tournament={tournament}
      />
    </div>
  );
};