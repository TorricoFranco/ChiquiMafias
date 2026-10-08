import React from 'react';

import { useMarkets } from '../hooks/useMarkets';
import { MarketCard } from './MarketCard';

interface MatchMarketWidgetProps {
  teamA: string;
  teamB: string;
}

export const MatchMarketWidget: React.FC<MatchMarketWidgetProps> = ({ teamA, teamB }) => {
  const { getMarketByTeams, isLoading } = useMarkets();
  
  const market = getMarketByTeams(teamA, teamB);

  if (isLoading) {
    return (
      <div className="w-full h-32 rounded-xl bg-[#1c1b1b] border border-[#2b2a2a] animate-pulse my-4" />
    );
  }

  if (!market) return null;

  return (
    <div className="w-full my-4">
      <h3 className="text-xs font-bold text-[#c6c9ab] uppercase tracking-wider mb-2 px-1">
        Predicción del Partido
      </h3>
      <MarketCard market={market} isCarouselMode={false} isDirectBet={true} />
    </div>
  );
};