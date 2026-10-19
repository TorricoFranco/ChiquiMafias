import React from 'react';
import { Sliders, Coins, Clock } from 'lucide-react';
import { Market, MarketStatus } from '../../types';

interface AdminMarketCardProps {
  market: Market;
  onOpenSettleModal: (market: Market) => void;
}

// Estados con la paleta de la app: el lima marca lo que está vivo y el resto baja de intensidad.
const STATUS_BADGE: Record<MarketStatus, { label: string; className: string; dot: string }> = {
  OPEN: {
    label: 'ABIERTO',
    className: 'bg-[#d2f000]/10 text-[#d2f000] border-[#d2f000]/30',
    dot: 'bg-[#d2f000]',
  },
  LOCKED: {
    label: 'BLOQUEADO',
    className: 'bg-[#2a2a2a] text-[#c6c9ab] border-[#454932]',
    dot: 'bg-[#c6c9ab]',
  },
  SETTLED: {
    label: 'LIQUIDADO',
    className: 'bg-[#e5e2e1]/10 text-[#e5e2e1] border-[#e5e2e1]/20',
    dot: 'bg-[#e5e2e1]',
  },
  REFUNDED: {
    label: 'REEMBOLSADO',
    className: 'bg-[#131313] text-[#909378] border-[#353534] border-dashed',
    dot: 'bg-[#909378]',
  },
};

export const AdminMarketCard: React.FC<AdminMarketCardProps> = ({
  market,
  onOpenSettleModal,
}) => {
  const marketPool = market.options.reduce(
    (acc, opt) => acc + (opt.totalStaked || 0),
    0
  );
  const badge = STATUS_BADGE[market.status];

  return (
    <article aria-label={market.title} className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#454932] transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#353534] pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {badge && (
              <span className={`inline-flex items-center gap-1.5 border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.className}`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            )}
            <span className="bg-[#2a2a2a] text-[#c6c9ab] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {market.category || 'Fútbol'}
            </span>
            <span className="bg-[#131313] border border-[#353534] text-[#909378] text-[10px] font-mono px-2 py-0.5 rounded-full">
              {market.type} {market.isManual ? '(MANUAL)' : '(API)'}
            </span>
          </div>

          <h3 className="font-extrabold text-lg text-[#e5e2e1]">{market.title}</h3>
          {market.description && (
            <p className="text-xs text-[#c6c9ab]">{market.description}</p>
          )}
        </div>

        {/* Right quick stats & action */}
        <div className="flex items-center gap-3">
          <div className="bg-[#131313] px-3.5 py-2 rounded-xl border border-[#353534] text-right">
            <span className="text-[10px] text-[#909378] block font-bold uppercase">
              Pozo del Mercado
            </span>
            <span className="font-mono text-[#d2f000] font-black text-sm flex items-center justify-end gap-1">
              <Coins className="w-3.5 h-3.5" />
              {marketPool.toLocaleString('es-AR')}
            </span>
          </div>

          {market.status !== 'SETTLED' && market.status !== 'REFUNDED' && (
            <button
              onClick={() => onOpenSettleModal(market)}
              className="bg-[#2a2a2a] border border-[#353534] hover:bg-[#d2f000] hover:border-[#d2f000] text-[#e5e2e1] hover:text-[#191e00] font-extrabold text-xs px-4 py-3 rounded-xl uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Liquidar / Resolver</span>
            </button>
          )}
        </div>
      </div>

      {/* Opciones: misma lectura que la tarjeta del usuario (cuota grande + parte del pozo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {market.options.map((opt) => {
          const staked = opt.totalStaked || 0;
          const share = marketPool > 0 ? Math.round((staked / marketPool) * 100) : (opt.initialProb || 0);
          const oddsEst = opt.currentOdds ? opt.currentOdds.toFixed(2) : "1.00";

          return (
            <div
              key={opt.id}
              className="bg-[#131313] border border-[#353534] p-3.5 rounded-xl flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-xs text-[#c6c9ab]">{opt.name}</span>
                <span className="font-black text-lg leading-none text-[#e5e2e1] tabular-nums">
                  x{oddsEst}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#909378]">
                <span>Apostado:</span>
                <span className="font-mono text-[#e5e2e1] font-semibold">
                  {staked.toLocaleString('es-AR')} pts
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-[#2a2a2a] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#d2f000]/80 rounded-sm transition-all duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#909378] w-8 text-right">{share}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="flex justify-between items-center text-[11px] text-[#909378] pt-1">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Cierre de apuestas: {new Date(market.closesAt).toLocaleString()}
        </span>
        <span className="font-mono text-[10px]">ID: {market.id}</span>
      </div>
    </article>
  );
};
