import { LeaguePage } from "@/components/league/liga_argentina/LeaguePage";

export default function Page({ params }: { params: { id: string } }) {
  return <LeaguePage leagueId={params.id} />;
}
