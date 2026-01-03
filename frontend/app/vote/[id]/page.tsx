
"use client";
import { useParams } from "next/navigation";
import VotePage from "@/components/votes/VotePage";
import { useUserStore } from "@/store/useUserStore";

export default function Page() {
  const params = useParams();
  const pollId = params?.id as string | undefined;
  const userId = useUserStore((s) => s.id) || "";

  if (!pollId) return <div className="text-white p-8">Votación no encontrada</div>;

  return <VotePage pollId={pollId} userId={userId} />;
}
