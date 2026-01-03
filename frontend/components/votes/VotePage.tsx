"use client";

import { useEffect, useState } from "react";
import { usePollSocket } from "@/hook/usePollSocket";
import { PollData } from "@/types/voting";
import { toast } from "sonner"; 
import { POLL_ICONS } from "@/constants/poll-icons";
import { VOTE_ERRORS } from "@/constants/error-messages";
import LoginModal from "../auth/LoginModal";

export default function VotePage({ pollId, userId }: { pollId: string; userId: string }) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const { results, castVote, connected, reconnect } = usePollSocket(pollId);

  //  Carga inicial
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}?userId=${userId}`) // Envía el userId
      .then((res) => res.json())
      .then((data) => {
        setPoll(data);
        if (data.hasVoted) {
          setAlreadyVoted(true);
        }
      });
  }, [pollId, userId]);

  //  Sincronizar votos en tiempo real
  useEffect(() => {
    if (Object.keys(results).length > 0) {
      setPoll((prevPoll) => {
        if (!prevPoll) return null;
        const updatedOptions = prevPoll.options.map((opt) => ({
          ...opt,
          votes: results[opt.id.toString()] 
            ? parseInt(results[opt.id.toString()], 10) 
            : opt.votes,
        }));
        return { ...prevPoll, options: updatedOptions };
      });
    }
  }, [results]);



  const handleVoteClick = (optionId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setShowLogin(true);
      return;
    }
    if (isPending || alreadyVoted) return;
    setIsPending(true);
    
    castVote(optionId, userId, (response) => {
      setIsPending(false);

      if (response.status === 'error') {

        console.error(`[Security/Validation]: ${response.code}`);

        const userFriendlyMessage = VOTE_ERRORS[response.code] || VOTE_ERRORS.DEFAULT;
        
        if (response.code === 'UNAUTHORIZED') {
          // Redirigir al login o abrir el modal de auth
          setShowLogin(true)
        }

        if (response.code === 'ALREADY_VOTED') {
          setAlreadyVoted(true);
        }

        toast.error(userFriendlyMessage);
      } else {
        setAlreadyVoted(true);
        toast.success("¡Voto registrado!");
      }
    });
  };

  if (!poll) return <div className="text-white text-center p-10">Cargando votación...</div>;

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#181818] rounded-2xl border border-[#2b2b2b] mt-10 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-[#2b2b2b] rounded-xl text-lime-400">
          {POLL_ICONS[poll.icon] || POLL_ICONS.USER}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{poll.title}</h1>
          <p className="text-gray-400 text-sm italic">{poll.description}</p>
        </div>
        <div 
          className={`ml-auto w-3 h-3 rounded-full shadow-sm ${connected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} 
          title={connected ? "Conectado en vivo" : "Desconectado"} 
        />
      </div>

      {/* Opciones */}
      <div className="space-y-4">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <button
              key={option.id}
              disabled={isPending || alreadyVoted}
              onClick={() => handleVoteClick(option.id)}
              className={`w-full relative overflow-hidden p-5 rounded-xl text-left border transition-all duration-300 group
                ${alreadyVoted ? 'border-[#2b2b2b] cursor-default' : 'border-[#2b2b2b] hover:border-lime-400/50 active:scale-[0.98]'}
                ${isPending ? 'opacity-70 cursor-wait' : ''}
                bg-[#1f1f1f]`}
            >
              {/* Barra de progreso */}
              <div 
                className="absolute left-0 top-0 h-full bg-lime-400/10 transition-all duration-1000 ease-out z-0" 
                style={{ width: `${percentage}%` }}
              />
              
              <div className="relative flex justify-between items-center z-10">
                <span className={`font-medium transition-colors ${alreadyVoted ? 'text-gray-300' : 'text-white group-hover:text-lime-400'}`}>
                  {option.label}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-lime-400 font-bold text-lg">{percentage}%</span>
                  <span className="text-[10px] text-gray-500 uppercase">
                    {option.votes.toLocaleString()} votos
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-[#2b2b2b] flex justify-between items-center text-[11px] text-gray-500 uppercase tracking-widest">
        <span className="font-bold text-gray-400">Total: {totalVotes.toLocaleString()} votos</span>
      </div>
       {/* MODAL LOGIN */}
            {showLogin && (
              <LoginModal
                onClose={() => setShowLogin(false)}
                onSuccess={() => {
                  reconnect()
                  setShowLogin(false);
                }}
             />
            )}
    </div>
  );
}