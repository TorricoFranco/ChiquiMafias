
import { use } from "react";
import MatchPage from "@/components/matchs/MatchPage";
import { PageProps } from "@/types/matchs";

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  
  return <MatchPage matchId={resolvedParams.id} />;
}
