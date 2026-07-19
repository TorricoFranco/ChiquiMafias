import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getStandings } from '@/services/fetchStandings';
import { getAvailableStages } from '@/services/fetchAvailableStages';
import { getBracketsMatch } from '@/services/fetchBracketsMatch';

import { ArgentinaLeaguePage } from "@/components/league/liga_argentina/ArgentinaLeaguePage";


import { notFound } from "next/navigation";

const LEAGUE_CONFIG: Record<string, { component: React.ComponentType<any>, uuid: string }> = {
  'liga-profesional': {
    component: ArgentinaLeaguePage,
    uuid: '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7'
  },
  // 'copa-argentina': {} PROXIMAMENTE....
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = LEAGUE_CONFIG[id];

  if (!config) return notFound();

  const queryClient = new QueryClient();
  const LeagueComponent = config.component;

  await queryClient.prefetchQuery({
    queryKey: ['standings', 2026],
    queryFn: () => getStandings(2026),
  });

  await queryClient.prefetchQuery({
    queryKey: ['league-stages', "2026", 'APERTURA'],
    queryFn: () => getAvailableStages("2026", 'APERTURA'),
  });

  await queryClient.prefetchQuery({
    queryKey: ['brackets', "2026", 'APERTURA'],
    queryFn: () => getBracketsMatch("2026", 'APERTURA'),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeagueComponent leagueId={config.uuid} />
    </HydrationBoundary>
  );
}