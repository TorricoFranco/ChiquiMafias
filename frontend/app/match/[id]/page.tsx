
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getMatchDetails } from '@/services/fetchMatchDetails';
import { MatchDetailsPage } from '@/components/matchs/matchesDetails/MatchDetailsPage';
import { notFound } from 'next/navigation';
import { getPreMatchInfo } from '@/services/fetchPreMatch';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = new QueryClient();

  const match = await getMatchDetails(id);
  if (!match) notFound();

  // Seteamos la data 
  queryClient.setQueryData(['match', id], match);

  const isNotStarted = ["NS", "SCHEDULED"].includes(match.metadata.status);
  
  if (isNotStarted) {
    await queryClient.prefetchQuery({
      queryKey: ['pre-match', id],
      queryFn: () => getPreMatchInfo(id), 
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MatchDetailsPage initialMatch={match} />
    </HydrationBoundary>
  );
}