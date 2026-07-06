'use client'

import { FixturesPanel } from './FixturesPanel'

import { useFixture } from '@/hook/react-query/useFixture';

// IMPLEMENTAR TABLE SKELETON PARA CUANDO CAMBIA DE FECHA Y ESTÁ CARGANDO LOS PARTIDOS NUEVOS DESPUES

export const FixturesPanelContainer = ({
  tournament,
  season,
  activeMatchday,
  onMatchdayChange,
  availableStages,
}: any) => {
  const { matches, isLoading, activeDay } = useFixture(season, tournament, activeMatchday);

  const currentShowingDay = activeMatchday || activeDay || 1;

  if (isLoading && !matches.length) {
    return <div className="h-[500px] bg-gray-900/50 animate-pulse rounded-xl" />;
  }
  return (
    <FixturesPanel
      tournament={tournament}
      matches={matches}
      activeMatchday={currentShowingDay}
      onSelectMatchday={onMatchdayChange}
      availableStages={availableStages}

    />
  );
};