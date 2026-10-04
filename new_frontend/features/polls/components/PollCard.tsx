import React, { useState, useCallback } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Poll } from "@/features/polls/types";
import { useReactToPoll } from "@/features/polls/hooks/usePolls";
import { formatTimeAgo, formatTimeLeft } from "../utils/timeUtils";
import { PollOptions } from "./PollOptions";
import { PollComments } from "./PollComments";

export const PollCard = ({ poll }: { poll: Poll }) => {
    const [showComments, setShowComments] = useState(false);
    const [socketStats, setSocketStats] = useState({ totalVotes: 0, connected: false });
    const { mutate: reactToPoll } = useReactToPoll();

    const handlePollReaction = (type: "LIKE" | "DISLIKE") => {
        reactToPoll({ pollId: poll.id, dto: { type } });
    };

    const handleVoteUpdate = useCallback((totalVotes: number, connected: boolean) => {
        setSocketStats({ totalVotes, connected });
    }, []);


    const commentsCount = poll.stats?.comments || 0;

    return (
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:border-[#454932] transition-colors">

            {/* Header de la Card */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2a2a2a] overflow-hidden border border-[#353534] flex-shrink-0">
                    <img src={poll.user?.avatarUrl || `https://ui-avatars.com/api/?name=${poll.user?.username || 'U'}&background=2a2a2a&color=e5e2e1`} alt={poll.user?.username || "Anónimo"} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#e5e2e1]">@{poll.user?.username || "usuario_anonimo"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase bg-[#2a2a2a] text-[#c6c9ab]">HINCHA</span>
                    </div>
                    <span className="text-[11px] text-[#909378]">
                        {formatTimeAgo(poll.createdAt)} {!socketStats.connected && "(Desconectado)"}
                    </span>
                </div>
            </div>

            {/* Título y Descripción */}
            <div>
                <h3 className="font-bold text-base md:text-lg text-[#e5e2e1]">{poll.title}</h3>
                {poll.description && <p className="text-sm text-[#c6c9ab] mt-1">{poll.description}</p>}
            </div>

            <PollOptions poll={poll} onVoteUpdate={handleVoteUpdate} />

            {/* Footer con estadísticas y botones */}
            <div className="flex justify-between items-center mt-1 pt-3 border-t border-[#353534]/60">
                <span className="text-xs text-[#c6c9ab] font-medium">
                    {socketStats.totalVotes.toLocaleString("es-AR")} votos • Cierra en {formatTimeLeft(poll.endsAt)}
                </span>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r border-[#353534] pr-4">
                        <button onClick={() => handlePollReaction("LIKE")} className={`flex items-center gap-1.5 hover:bg-[#2a2a2a] p-1.5 rounded transition-colors ${poll.userReaction === 'LIKE' ? 'text-[#d2f000]' : 'text-[#c6c9ab] hover:text-[#d2f000]'}`}>
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-[12px] font-medium">{poll.likesCount || 0}</span>
                        </button>
                        <button onClick={() => handlePollReaction("DISLIKE")} className={`flex items-center gap-1.5 hover:bg-[#2a2a2a] p-1.5 rounded transition-colors ${poll.userReaction === 'DISLIKE' ? 'text-red-400' : 'text-[#c6c9ab] hover:text-red-400'}`}>
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-[12px] font-medium">{poll.dislikesCount || 0}</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded transition-colors cursor-pointer ${showComments ? 'text-[#191e00] bg-[#d2f000]' : 'text-[#c6c9ab] hover:text-[#d2f000] hover:bg-[#2a2a2a]'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>{commentsCount} Comentarios</span>
                    </button>
                </div>
            </div>

            {showComments && <PollComments pollId={poll.id} />}
        </div>
    );
};