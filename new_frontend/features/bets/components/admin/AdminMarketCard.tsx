import React from 'react';
import { Sliders, Coins, Clock } from 'lucide-react';
import { AdminMarket } from '../../types';

interface AdminMarketCardProps {
  market: AdminMarket;
  onOpenSettleModal: (market: AdminMarket) => void;
}

export const AdminMarketCard: React.FC<AdminMarketCardProps> = ({
  market,
  onOpenSettleModal,
}) => {
  const marketPool = market.options.reduce(
    (acc, opt) => acc + (opt.totalStaked || 0),
    0
  );

  return (
    <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#454932] transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#353534] pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#2a2a2a] text-[#c6c9ab] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {market.category || 'Fútbol'}
            </span>
            <span className="bg-[#131313] border border-[#353534] text-[#909378] text-[10px] font-mono px-2 py-0.5 rounded">
              {market.type} {market.isManual ? '(MANUAL)' : '(API)'}
            </span>
            {market.status === 'OPEN' && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                ABIERTO
              </span>
            )}
            {market.status === 'LOCKED' && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                BLOQUEADO
              </span>
            )}
            {market.status === 'SETTLED' && (
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                LIQUIDADO
              </span>
            )}
            {market.status === 'REFUNDED' && (
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                REEMBOLSADO
              </span>
            )}
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
              className="bg-[#353534] hover:bg-[#d2f000] text-[#e5e2e1] hover:text-[#191e00] font-extrabold text-xs px-4 py-3 rounded-xl uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Liquidar / Resolver</span>
            </button>
          )}
        </div>
      </div>

      {/* Options Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {market.options.map((opt) => {
          const prob = opt.initialProb || 0;

          const oddsEst = opt.currentOdds ? opt.currentOdds.toFixed(2) : "1.00";

          return (
            <div
              key={opt.id}
              className="bg-[#131313] border border-[#353534] p-3.5 rounded-xl flex flex-col justify-between gap-2"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-[#e5e2e1]">{opt.name}</span>
                <span className="bg-[#2a2a2a] text-[#d2f000] font-mono text-[11px] font-black px-2 py-0.5 rounded">
                  x{oddsEst}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#909378]">
                <span>Apostado:</span>
                <span className="font-mono text-[#e5e2e1] font-semibold">
                  {(opt.totalStaked || 0).toLocaleString('es-AR')} pts
                </span>
              </div>

              <div className="h-1.5 w-full bg-[#1c1b1b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#d2f000]"
                  style={{
                    width: `${marketPool > 0
                        ? Math.round((opt.totalStaked / marketPool) * 100)
                        : prob
                      }%`,
                  }}
                ></div>
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
    </div>
  );
};