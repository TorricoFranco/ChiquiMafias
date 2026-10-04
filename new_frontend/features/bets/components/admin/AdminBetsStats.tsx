import React from 'react';
import { Layers, Coins, DollarSign, PlusCircle } from 'lucide-react';
import { AdminMarket } from '../../types';

interface AdminBetsStatsProps {
  markets: AdminMarket[];
  totalPoolCoins: number;
  onOpenCreateModal: () => void;
}

export const AdminBetsStats: React.FC<AdminBetsStatsProps> = ({
  markets,
  totalPoolCoins,
  onOpenCreateModal,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#909378]">
            Mercados Totales
          </span>
          <div className="text-2xl font-black text-[#e5e2e1] mt-0.5">
            {markets.length}
          </div>
          <span className="text-[11px] text-[#c6c9ab]">
            {markets.filter((m) => m.status === 'OPEN').length} Abiertos para apostar
          </span>
        </div>
        <div className="p-3 bg-[#d2f000]/10 rounded-xl text-[#d2f000]">
          <Layers className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#909378]">
            Pozo Total Apostado
          </span>
          <div className="text-2xl font-black text-[#d2f000] font-mono mt-0.5 flex items-center gap-1">
            <Coins className="w-5 h-5" />
            {totalPoolCoins.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[#c6c9ab]">
            Monedas circulando en tickets
          </span>
        </div>
        <div className="p-3 bg-[#131313] rounded-xl text-[#d2f000] border border-[#353534]">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-[#1c1b1b] border border-[#353534] p-4 rounded-2xl flex flex-col justify-center">
        <button
          onClick={onOpenCreateModal}
          className="w-full bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black text-xs py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(210,240,0,0.25)] active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear Mercado Manual</span>
        </button>
      </div>
    </div>
  );
};