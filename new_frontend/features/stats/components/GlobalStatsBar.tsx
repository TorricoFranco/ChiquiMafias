import React from 'react';
import { GlobalStats } from '../types';
import { Users, Coins, TrendingUp, Sparkles, Activity } from 'lucide-react';

interface GlobalStatsBarProps {
  stats: GlobalStats | null;
  isLoading?: boolean;
}

export const GlobalStatsBar: React.FC<GlobalStatsBarProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#1c1b1b] border border-[#353534] rounded-2xl" />
        ))}
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-AR').format(num);
  };

  const formatCompact = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {/* Total Bets */}
      <div className="bg-[#1c1b1b]/90 border border-[#353534] hover:border-[#454932] p-4 rounded-2xl relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Apuestas Cerradas
          </span>
          <span className="text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
            +18% hoy
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#e5e2e1] tracking-tight">
            {formatNumber(stats.totalBets)}
          </span>
          <span className="text-xs text-[#c6c9ab] font-medium">boletos</span>
        </div>
        <p className="text-[10px] text-[#c6c9ab]/70 mt-1">Registrados en la plataforma</p>
      </div>

      <div className="bg-[#1c1b1b]/90 border border-[#353534] hover:border-[#454932] p-4 rounded-2xl relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Volumen Jugado
          </span>
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 whitespace-nowrap">
            <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
              <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
            </div>
            {formatCompact(stats.totalVolumeStaked)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#e5e2e1] tracking-tight">
              {formatCompact(stats.totalVolumeStaked)}
            </span>
            <span className="text-xs font-bold text-cyan-400">Staked</span>
          </div>
        </div>
        <div className="text-[10px] text-[#c6c9ab]/70 mt-1 flex items-center gap-1">
          <div className="w-3 h-3 rounded-full overflow-hidden flex-shrink-0 inline-flex">
            <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
          </div>
          <span>{formatNumber(stats.totalVolumeStaked)} monedas en juego</span>
        </div>
      </div>

      <div className="bg-[#1c1b1b]/90 border border-[#353534] hover:border-[#d2f000]/50 p-4 rounded-2xl relative overflow-hidden group transition-all bg-gradient-to-br from-[#1c1b1b] to-[#252a10]/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#d2f000]/15 rounded-full blur-2xl pointer-events-none group-hover:bg-[#d2f000]/25 transition-colors" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d2f000] flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#d2f000]" />
            Premios Repartidos
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#191e00] bg-[#d2f000] px-1.5 py-0.2 rounded-md font-mono">
            <Sparkles className="w-3 h-3" />
            PAGO 85.7%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#d2f000] tracking-tight">
              {formatCompact(stats.totalVolumeWon)}
            </span>
            <span className="text-xs font-bold text-[#e5e2e1]">Ganadas</span>
          </div>
        </div>
        <div className="text-[10px] text-[#c6c9ab]/70 mt-1 flex items-center gap-1">
          <div className="w-3 h-3 rounded-full overflow-hidden flex-shrink-0 inline-flex">
            <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
          </div>
          <span>{formatNumber(stats.totalVolumeWon)} monedas cobradas</span>
        </div>
      </div>
    </div>
  );
};