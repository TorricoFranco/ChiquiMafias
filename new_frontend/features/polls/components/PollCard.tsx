"use client";

import React, { useState, useCallback } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Poll } from "@/features/polls/types";
import { useReactToPoll } from "@/features/polls/hooks/usePolls";
import { getPollTypeMeta } from "@/features/polls/constants/pollTypes";
import { formatTimeAgo, formatTimeLeft } from "../utils/timeUtils";
import { PollBody } from "./bodies/PollBody";
import { PollComments } from "./PollComments";
import { PollAuthor } from "./PollAuthor";

interface PollCardProps {
    poll: Poll;
    /** Resalta la card un momento: lo usa el carrusel al llevar a una encuesta. */
    highlight?: boolean;
    /** Abre el panel de comentarios desde el arranque (botón Comentar del carrusel). */
    defaultCommentsOpen?: boolean;
}

export const PollCard = ({ poll, highlight = false, defaultCommentsOpen = false }: PollCardProps) => {
    const [showComments, setShowComments] = useState(defaultCommentsOpen);
    const [socketStats, setSocketStats] = useState({ totalVotes: 0, connected: false });
    const { mutate: reactToPoll } = useReactToPoll();

    const handlePollReaction = (type: "LIKE" | "DISLIKE") => {
        reactToPoll({ pollId: poll.id, dto: { type } });
    };

    const handleVoteUpdate = useCallback((totalVotes: number, connected: boolean) => {
        setSocketStats({ totalVotes, connected });
    }, []);


    const commentsCount = poll.stats?.comments || 0;
    const meta = getPollTypeMeta(poll.type);
    const commentsEnabled = poll.commentsEnabled !== false;
    // Las encuestas de un suscriptor se destacan con un anillo lima, igual que sus
    // comentarios. No tocan el fondo: el <article> ya fija `bg-[#1c1b1b]`, y dos
    // `bg-*` en la misma clase los resuelve el orden del CSS generado.
    const isSubscriberPoll = !poll.isOfficial && Boolean(poll.user?.activeSubscriptionTier);
    const cardAccent = isSubscriberPoll ? `${meta.cardClass} ring-1 ring-[#d2f000]/40` : meta.cardClass;

    return (
        <article id={`poll-${poll.id}`} aria-label={poll.title} tabIndex={highlight ? -1 : undefined} className={`bg-[#1c1b1b] border rounded-xl p-5 flex flex-col gap-4 shadow-sm transition-colors ${cardAccent} ${highlight ? "outline-2 outline-offset-4 outline-[#d2f000]" : ""}`}>

            {/* Header de la Card */}
            <div className="flex items-center gap-3">
                <PollAuthor
                    author={poll.user}
                    isOfficial={poll.isOfficial}
                    subtitle={
                        <>
                            {formatTimeAgo(poll.createdAt)}
                            {meta.votable && !socketStats.connected && " (Desconectado)"}
                        </>
                    }
                />
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase flex-shrink-0 ${meta.chipClass}`}>
                    {meta.chipLabel}
                </span>
            </div>

            {/* Título y Descripción */}
            <div>
                <h3 className="font-bold text-base md:text-lg text-[#e5e2e1]">{poll.title}</h3>
                {poll.description && <p className="text-sm text-[#c6c9ab] mt-1">{poll.description}</p>}
            </div>

            {meta.votable && <PollBody poll={poll} onVoteUpdate={handleVoteUpdate} />}

            {/* Footer con estadísticas y botones */}
            <div className="flex justify-between items-center mt-1 pt-3 border-t border-[#353534]/60">
                <span className="text-xs text-[#c6c9ab] font-medium">
                    {meta.votable
                        ? [
                            `${socketStats.totalVotes.toLocaleString("es-AR")} votos`,
                            poll.endsAt && `Cierra en ${formatTimeLeft(poll.endsAt)}`,
                        ].filter(Boolean).join(" • ")
                        : meta.footerNote}
                </span>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${commentsEnabled ? "border-r border-[#353534] pr-4" : ""}`}>
                        <button onClick={() => handlePollReaction("LIKE")} aria-label={`Me gusta (${poll.likesCount || 0})`} aria-pressed={poll.userReaction === 'LIKE'} className={`flex items-center gap-1.5 hover:bg-[#2a2a2a] p-1.5 rounded transition-colors ${poll.userReaction === 'LIKE' ? 'text-[#d2f000]' : 'text-[#c6c9ab] hover:text-[#d2f000]'}`}>
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-[12px] font-medium">{poll.likesCount || 0}</span>
                        </button>
                        <button onClick={() => handlePollReaction("DISLIKE")} aria-label={`No me gusta (${poll.dislikesCount || 0})`} aria-pressed={poll.userReaction === 'DISLIKE'} className={`flex items-center gap-1.5 hover:bg-[#2a2a2a] p-1.5 rounded transition-colors ${poll.userReaction === 'DISLIKE' ? 'text-red-400' : 'text-[#c6c9ab] hover:text-red-400'}`}>
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-[12px] font-medium">{poll.dislikesCount || 0}</span>
                        </button>
                    </div>

                    {commentsEnabled && (
                        <button
                            onClick={() => setShowComments(!showComments)}
                            aria-expanded={showComments}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded transition-colors cursor-pointer ${showComments ? 'text-[#191e00] bg-[#d2f000]' : 'text-[#c6c9ab] hover:text-[#d2f000] hover:bg-[#2a2a2a]'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span>{commentsCount} Comentarios</span>
                        </button>
                    )}
                </div>
            </div>

            {showComments && commentsEnabled && <PollComments pollId={poll.id} />}
        </article>
    );
};
