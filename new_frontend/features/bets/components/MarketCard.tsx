"use client";

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Market } from '@/features/bets/types/index';
import { useTicketStore } from '@/store/useTicketStore';
import { betsApi } from '../api/betsApi';
import { toast } from 'sonner';

interface MarketCardProps {
  market: Market;
  onInteract?: () => void;
  isCarouselMode?: boolean;
  isDirectBet?: boolean;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onInteract,
  isCarouselMode,
  isDirectBet = false
}) => {
  const { ticketItems, addItem, removeItem } = useTicketStore();

  const [localSelectedOption, setLocalSelectedOption] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOptionSelected = (optionId: string) => {
    if (isDirectBet) {
      return localSelectedOption?.id === optionId;
    }
    return ticketItems.some((item) => item.marketId === market.id && item.optionId === optionId);
  };

  const toggleBet = (option: any) => {
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

  return (
    <article className={`flex flex-col gap-4 transition-all ${isCarouselMode
      ? 'w-full'
      : 'bg-[#1c1b1b] border border-[#353534] border-l-4 border-l-[#d2f000] rounded-xl p-4 hover:border-[#d2f000]/60'
      }`}>

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center border-b border-[#353534]/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#d2f000] bg-[#d2f000]/10 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              {market.type === 'MATCH' ? 'FÚTBOL ARGENTINO' : (market.category || 'APUESTA')}
            </span>

            <span className="text-[11px] font-bold text-[#e5e2e1] bg-[#353534]/50 px-2 py-0.5 rounded flex items-center gap-1">
              Pozo total: ${totalPool.toLocaleString('es-AR')}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-[#ffb4ab]">
            Cierra: {new Date(market.closesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <h3 className={`font-extrabold text-[#e5e2e1] leading-snug ${isCarouselMode ? 'text-sm' : 'text-sm md:text-base'}`}>
          {market.title}
        </h3>

        {market.type === 'MATCH' && market.metadata?.homeTeam && market.metadata?.awayTeam && (
          <div className="flex items-center justify-center gap-4 py-2 bg-[#131313]/40 rounded-lg border border-[#353534]/30">
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

            <span className="text-[10px] font-black text-[#c6c9ab] bg-[#353534]/50 px-2 py-1 rounded">
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
          <p className="text-xs text-[#c6c9ab] leading-relaxed bg-[#131313] p-2.5 rounded-lg border border-[#353534]/50">
            {market.description}
          </p>
        )}
      </div>

      <div className="flex gap-2 w-full mt-1">
        {market.options?.map((option) => {
          const isSelected = isOptionSelected(option.id);
          const currentOdds = option.currentOdds ?? 1;

          return (
            <button
              key={option.id}
              onClick={() => toggleBet(option)}
              disabled={market.status === 'LOCKED'}
              className={`flex-1 rounded py-2 relative overflow-hidden transition-all border cursor-pointer ${isSelected
                ? 'bg-[#d2f000] border-[#d2f000] text-[#191e00] font-bold shadow-[0_0_12px_rgba(210,240,0,0.3)]'
                : 'bg-[#131313] border-[#353534] hover:border-[#d2f000]/60 text-[#e5e2e1]'
                } ${market.status === 'LOCKED' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="block text-xs font-bold mb-0.5">{option.name}</span>
              <span className="block text-sm">
                {currentOdds.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>

      {isDirectBet && localSelectedOption && market.status !== 'LOCKED' && (
        <div className="mt-2 p-3 bg-[#131313] rounded-lg border border-[#d2f000]/30 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#c6c9ab]">Monto a apostar:</span>
            <span className="text-xs font-mono text-[#d2f000]">
              Potencial: ${betAmount ? (Number(betAmount) * (localSelectedOption.currentOdds ?? 1)).toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c6c9ab] font-bold">$</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1c1b1b] border border-[#353534] rounded md:rounded-md py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-[#d2f000] transition-colors font-mono"
              />
            </div>
            <button
              onClick={handleDirectBetSubmit}
              disabled={isSubmitting || !betAmount || Number(betAmount) <= 0}
              className="bg-[#d2f000] text-[#191e00] font-bold px-4 py-2 rounded md:rounded-md text-sm hover:bg-[#b8d100] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              {isSubmitting ? '...' : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Apostar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {market.status === 'LOCKED' && (
        <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded text-center w-full mt-2">
          MERCADO CERRADO
        </span>
      )}
    </article>
  );
};