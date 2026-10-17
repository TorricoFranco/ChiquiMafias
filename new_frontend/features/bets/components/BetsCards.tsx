import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { betsApi } from '@/features/bets/api/betsApi';
import { MarketCard } from './MarketCard';
import { MarketGridSkeleton } from './MarketGridSkeleton';
import { Market } from '@/features/bets/types/index';
import { useBetsSocket } from '../socket/useBetsSocket';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

export const BetsCards = () => {
  useBetsSocket();
  const [filter, setFilter] = useState<'all' | 'matches' | 'custom'>('all');

  const { data: markets = [], isLoading, isError, isFetching, refetch } = useQuery<Market[]>({
    queryKey: ["markets"],
    queryFn: betsApi.getActiveMarkets
  });


  const matches = useMemo(() =>
    markets.filter((m) => m.type === 'MATCH'),
    [markets]);

  const customBets = useMemo(() =>
    markets.filter((m) => m.type !== 'MATCH'),
    [markets]);

  const filteredMarkets = useMemo(() => {
    if (filter === 'matches') return matches;
    if (filter === 'custom') return customBets;
    return markets;
  }, [markets, filter, matches, customBets]);

  // Sin datos, el conteo de cada filtro no es un 0 que parezca real: mientras carga es un bloque que pulsa,
  // y con error no se muestra.
  const countBadge = (count: number) => {
    if (isLoading) return <Skeleton className="inline-block h-3 w-6 ml-1.5 align-middle" />;
    if (isError && markets.length === 0) return null;
    return ` (${count})`;
  };

  return (
    <section className="flex flex-col gap-5">

      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-[#e5e2e1] tracking-tight uppercase flex items-center gap-2">
            APUESTAS
          </h1>
          <p className="text-xs text-[#c6c9ab] mt-0.5">
            Aposta tus Chiqui-Coins en los mercados abiertos.
          </p>
        </div>
      </div>

      {/* 2. FILTROS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#353534] pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${filter === 'all'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] border border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1]'
            }`}
        >
          Todos{countBadge(markets.length)}
        </button>
        <button
          onClick={() => setFilter('matches')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${filter === 'matches'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] border border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1]'
            }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">sports_soccer</span>
          Partidos{countBadge(matches.length)}
        </button>
        <button
          onClick={() => setFilter('custom')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${filter === 'custom'
            ? 'bg-[#d2f000] text-[#191e00] shadow-sm'
            : 'bg-[#1c1b1b] border border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1]'
            }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">emoji_events</span>
          Especiales{countBadge(customBets.length)}
        </button>
      </div>

      {isLoading ? (
        <MarketGridSkeleton />
      ) : isError && markets.length === 0 ? (
        <LoadErrorState
          title="No pudimos cargar los mercados"
          description="Revisá tu conexión y probá de nuevo."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#909378] bg-[#1c1b1b] rounded-xl border border-[#353534]">
          No hay mercados abiertos en esta categoría por ahora.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              isCarouselMode={false}
            />
          ))}
        </div>
      )}

    </section>
  );
};