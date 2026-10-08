import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Market, MarketType } from '../types';
import { AdminBetsStats } from './admin/AdminBetsStats';
import { AdminBetsFilter } from './admin/AdminBetsFilter';
import { AdminMarketCard } from './admin/AdminMarketCard';
import { SettleMarketModal } from './admin/SettleMarketModal';
import { CreateMarketModal } from './admin/CreateMarketModal';
import { useBetsSocket } from '../socket/useBetsSocket';

import { useAdminMarkets, useCreateManualMarket, useSettleMarket } from '../hooks/useBets';

export const AdminBets: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [settleModalMarket, setSettleModalMarket] = useState<Market | null>(null);

  const { data: markets = [], isLoading } = useAdminMarkets();
  const createMarket = useCreateManualMarket();
  const settleMarket = useSettleMarket();

  useBetsSocket();

  const filteredMarkets = markets.filter((m) => {
    if (filterStatus === 'ALL') return true;
    return m.status === filterStatus;
  });

  const totalPoolCoins = markets.reduce(
    (acc, m) =>
      acc + m.options.reduce((oAcc, opt) => oAcc + (opt.totalStaked || 0), 0),
    0
  );

  // 3. HANDLERS
  const handleCreateMarket = (marketData: {
    title: string;
    type: MarketType;
    category: string;
    description: string;
    closesAt: string;
    options: { name: string; initialProb: number }[];
  }) => {
    createMarket.mutate(marketData, {
      onSuccess: () => {
        toast.success('Mercado creado y publicado exitosamente');
        setIsCreateModalOpen(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Ocurrió un error al crear el mercado');
      },
    });
  };

  const handleSettleMarket = (
    marketId: string,
    status: 'SETTLED' | 'REFUNDED',
    winningOptionId?: string
  ) => {
    settleMarket.mutate(
      { marketId, data: { status, winningOptionId } },
      {
        onSuccess: () => {
          toast.success(
            status === 'SETTLED' 
              ? 'Mercado liquidado y premios repartidos' 
              : 'Mercado reembolsado correctamente'
          );
          setSettleModalMarket(null);
        },
        onError: (error: any) => {
          toast.error(error.message || 'Error al resolver el mercado');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 text-[#d2f000] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminBetsStats 
        markets={markets} 
        totalPoolCoins={totalPoolCoins} 
        onOpenCreateModal={() => setIsCreateModalOpen(true)} 
      />

      <AdminBetsFilter 
        filterStatus={filterStatus} 
        setFilterStatus={setFilterStatus} 
      />

      <div className="flex flex-col gap-4">
        {filteredMarkets.length === 0 ? (
           <div className="text-center py-10 text-[#c6c9ab] bg-[#1c1b1b] rounded-2xl border border-[#353534]">
             No hay mercados que coincidan con este filtro.
           </div>
        ) : (
          filteredMarkets.map((market) => (
            <AdminMarketCard
              key={market.id}
              market={market}
              onOpenSettleModal={setSettleModalMarket}
            />
          ))
        )}
      </div>

      {settleModalMarket && (
        <SettleMarketModal
          market={settleModalMarket}
          onClose={() => setSettleModalMarket(null)}
          onConfirm={handleSettleMarket}
        />
      )}

      {isCreateModalOpen && (
        <CreateMarketModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateMarket}
        />
      )}
    </div>
  );
};