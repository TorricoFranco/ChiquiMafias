"use client";

import { useEffect, useState } from "react";
import { VoteCard } from "./VoteCard";

interface Poll {
  id: string;
  title: string;
  description: string;
  icon: string;
  endsAt: string;
}

export default function VotingSummary() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolls() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/active`);
        const data = await response.json();
        setPolls(data);
      } catch (error) {
        console.error("Error cargando votaciones:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPolls();
  }, []);

  if (loading) return <div className="p-4 text-white">Cargando votaciones...</div>;

  return (
    <div className="bg-[#181818] p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-white mb-3">Votaciones Destacadas</h2>
      
      {polls.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay votaciones activas en este momento.</p>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
          {polls.map((poll) => (
            <VoteCard
              key={poll.id}
              id={poll.id}
              title={poll.title}
              description={poll.description}
              iconKey={poll.icon}
              endsAt={poll.endsAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
