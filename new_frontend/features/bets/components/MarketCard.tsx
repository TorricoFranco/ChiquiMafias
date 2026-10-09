"use client";

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Market, MarketOption } from '@/features/bets/types/index';
import { useTicketStore } from '@/store/useTicketStore';
import { betsApi } from '../api/betsApi';
import { getClosingInfo, useNow } from '../utils/closingTime';
import { toast } from 'sonner';

interface MarketCardProps {
  market: Market;
  onInteract?: () => void;
  isCarouselMode?: boolean;
  isDirectBet?: boolean;
}

const QUICK_AMOUNTS = [100, 500, 1000];

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onInteract,
  isCarouselMode,
  isDirectBet = false
}) => {
  const { ticketItems, addItem, removeItem } = useTicketStore();
  const now = useNow();

  const [localSelectedOption, setLocalSelectedOption] = useState<MarketOption | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked = market.status === 'LOCKED';

  const isOptionSelected = (optionId: string) => {
    if (isDirectBet) {
      return localSelectedOption?.id === optionId;
    }
    return ticketItems.some((item) => item.marketId === market.id && item.optionId === optionId);
  };

  const toggleBet = (option: MarketOption) => {
    onInteract?.();

    if (isDirectBet) {
      if (localSelectedOption?.id === option.id) {
        setLocalSelectedOption(null);
      } else {
        setLocalSelectedOption(option);
      }
    } else {
      if (isOptionSelected(option.id)) {
        removeItem(market.id, option.id);
      } else {
        const matchTitle = market.type === 'MATCH' && market.metadata?.homeTeam
          ? `${market.metadata.homeTeam.short} vs ${market.metadata?.awayTeam?.short}`
          : market.title;

        addItem({
          marketId: market.id,
          optionId: option.id,
          matchTitle,
          selectionLabel: option.name,
          odds: (option.currentOdds ?? 1) - 1,
        });
      }
    }
  };

  const handleDirectBetSubmit = async () => {
    if (!localSelectedOption || !betAmount || isNaN(Number(betAmount))) return;

    setIsSubmitting(true);
    try {
      await betsApi.placeBet(market.id, localSelectedOption.id, Number(betAmount));

      setLocalSelectedOption(null);
      setBetAmount('');
      toast.success("¡Apuesta realizada con éxito!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Hubo un error al colocar la apuesta directa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPool = market.options?.reduce((sum, option) => sum + (option.totalStaked || 0), 0) || 0;
  const closing = getClosingInfo(market.closesAt, now);
  const isMatch = market.type === 'MATCH';
  const categoryLabel = isMatch ? 'Fútbol argentino' : (market.category || 'Apuesta');

  return (
    <article aria-label={market.title} className={`flex flex-col gap-3.5 transition-colors ${isCarouselMode
      ? 'w-full'
      : 'bg-[#1c1b1b] border border-[#353534] rounded-xl p-4 hover:border-[#454932]'
      }`}>

      {/* Categoría y cierre */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 min-w-0 text-[10px] font-bold uppercase tracking-wider text-[#c6c9ab] bg-[#2a2a2a] px-2 py-1 rounded-full">
          <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-[#d2f000]">
            {isMatch ? 'sports_soccer' : 'emoji_events'}
          </span>
          <span className="truncate">{categoryLabel}</span>
        </span>

        {!isLocked && closing.label && (
          <span className={`inline-flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold ${closing.urgent ? 'text-[#d2f000]' : 'text-[#909378]'}`}>
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
              schedule
            </span>
            {closing.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className={`font-extrabold text-[#e5e2e1] leading-snug ${isCarouselMode ? 'text-sm' : 'text-sm md:text-base'}`}>
          {market.title}
        </h3>

        {isMatch && market.metadata?.homeTeam && market.metadata?.awayTeam && (
          <div className="flex items-center justify-center gap-3 py-3 bg-[#131313] rounded-xl border border-[#353534]/60">
            <div className="flex flex-col items-center gap-1.5 w-24">
              <img
                src={`/escudos-api/${market.metadata.homeTeam.logoUrl}.webp`}
                alt={market.metadata.homeTeam.name}
                className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
                loading="lazy"
              />
              <span className="text-[11px] md:text-xs font-bold text-[#e5e2e1] text-center leading-tight">
                {market.metadata.homeTeam.short}
              </span>
            </div>

            <span className="text-[10px] font-black tracking-widest text-[#909378]">
              VS
            </span>

            <div className="flex flex-col items-center gap-1.5 w-24">
              <img
                src={`/escudos-api/${market.metadata.awayTeam.logoUrl}.webp`}
                alt={market.metadata.awayTeam.name}
                className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
                loading="lazy"
              />
              <span className="text-[11px] md:text-xs font-bold text-[#e5e2e1] text-center leading-tight">
                {market.metadata.awayTeam.short}
              </span>
            </div>
          </div>
        )}

        {market.description && market.description.trim() !== '' && (
          <p className="text-xs text-[#c6c9ab] leading-relaxed">
            {market.description}
          </p>
        )}
      </div>

      {/* Cuotas: cada una muestra qué parte del pozo se juega a esa opción */}
      <div
        className="grid gap-2 w-full"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))' }}
      >
        {market.options?.map((option) => {
          const isSelected = isOptionSelected(option.id);
          const currentOdds = option.currentOdds ?? 1;
          const share = totalPool > 0 ? Math.round(((option.totalStaked || 0) / totalPool) * 100) : 0;

          return (
            <button
              key={option.id}
              onClick={() => toggleBet(option)}
              disabled={isLocked}
              aria-pressed={isSelected}
              className={`group relative overflow-hidden rounded-lg border px-2 pt-2.5 pb-3.5 text-center transition-all ${isSelected
                ? 'bg-[#d2f000] border-[#d2f000] text-[#191e00] shadow-[0_0_12px_rgba(210,240,0,0.25)]'
                : 'bg-[#131313] border-[#353534] text-[#e5e2e1] hover:border-[#d2f000]/50 hover:bg-[#201f1f]'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <span className={`block line-clamp-2 break-words leading-tight text-[11px] font-semibold ${isSelected ? 'text-[#191e00]' : 'text-[#c6c9ab]'}`}>
                {option.name}
              </span>
              <span className={`block text-lg font-black leading-tight tabular-nums ${isSelected ? 'text-[#191e00]' : 'text-[#e5e2e1] group-hover:text-[#d2f000]'}`}>
                {currentOdds.toFixed(2)}
              </span>
              {totalPool > 0 && (
                <>
                  <span className={`block text-[11px] font-mono ${isSelected ? 'text-[#191e00]/70' : 'text-[#909378]'}`}>
                    {share}%
                  </span>
                  <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[3px] ${isSelected ? 'bg-[#191e00]/15' : 'bg-[#2a2a2a]'}`}>
                    <span
                      className={`block h-full transition-all duration-500 ${isSelected ? 'bg-[#191e00]/60' : 'bg-[#d2f000]/70'}`}
                      style={{ width: `${share}%` }}
                    />
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {isDirectBet && localSelectedOption && !isLocked && (
        <div className="p-3 bg-[#131313] rounded-xl border border-[#d2f000]/25 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold text-[#c6c9ab] truncate">
              Monto a apostar: <span className="text-[#e5e2e1]">{localSelectedOption.name}</span>
            </span>
            <span className="text-xs font-mono font-bold text-[#d2f000] flex-shrink-0">
              Potencial: ${betAmount ? (Number(betAmount) * (localSelectedOption.currentOdds ?? 1)).toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex gap-1.5">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBetAmount(String(amount))}
                className={`flex-1 rounded-lg border py-1 text-[11px] font-bold font-mono transition-colors cursor-pointer ${Number(betAmount) === amount
                  ? 'border-[#d2f000] text-[#d2f000] bg-[#d2f000]/10'
                  : 'border-[#353534] text-[#c6c9ab] hover:border-[#454932] hover:text-[#e5e2e1]'
                  }`}
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909378] font-bold">$</span>
              <input
                type="number"
                aria-label="Monto a apostar"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1c1b1b] border border-[#353534] rounded-lg py-2 pl-7 pr-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors font-mono"
              />
            </div>
            <button
              onClick={handleDirectBetSubmit}
              disabled={isSubmitting || !betAmount || Number(betAmount) <= 0}
              className="bg-[#d2f000] text-[#191e00] font-extrabold px-4 py-2 rounded-lg text-sm hover:bg-[#b8d300] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isSubmitting ? '...' : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-base">check_circle</span>
                  Apostar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isLocked ? (
        <span className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-wider text-[#909378] bg-[#2a2a2a] px-2 py-1.5 rounded-lg w-full">
          <Lock aria-hidden="true" className="w-3 h-3" />
          MERCADO CERRADO
        </span>
      ) : null}

      <div className="flex items-center justify-between text-[11px] text-[#909378]">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#d2f000]/80">savings</span>
          Pozo total: ${totalPool.toLocaleString('es-AR')}
        </span>
      </div>
    </article>
  );
};
