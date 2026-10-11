"use client";

import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { usePollVote } from "@/features/polls/hooks/usePollVote";
import { PollBodyProps } from "./types";

/**
 * Puntuación de 1 a 5 estrellas. Cada estrella es una opción (`optionId` = la
 * cantidad), así que el promedio sale de la distribución de votos.
 */
export const RatingBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    const { options, connected, votedOptionId, isVoted, isVoting, totalVotes, getOptionVotes, vote } =
        usePollVote(poll);
    const [hovered, setHovered] = useState<number | null>(null);

    useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const scale = poll.config?.scale ?? options.length ?? 5;
    const stars = options.length > 0 ? options : [];

    if (stars.length === 0) return null;

    const votesByStar = stars.map((option) => getOptionVotes(option.id));
    const votesCounted = votesByStar.reduce((sum, votes) => sum + votes, 0);
    const average =
        votesCounted === 0
            ? 0
            : stars.reduce((sum, option, index) => sum + option.id * votesByStar[index], 0) / votesCounted;
    const mostVoted = Math.max(...votesByStar, 1);

    // Antes de votar las estrellas siguen al mouse; después muestran la nota puesta.
    const filledUpTo = isVoted ? (votedOptionId ?? 0) : (hovered ?? 0);

    return (
        <div className="flex flex-col gap-3 mt-1">
            <div
                className="flex items-center justify-center gap-1.5 py-2"
                onMouseLeave={() => setHovered(null)}
                role="group"
                aria-label="Puntuación"
            >
                {stars.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => vote(option.id)}
                        onMouseEnter={() => !isVoted && setHovered(option.id)}
                        disabled={!connected || isVoted || isVoting}
                        aria-label={`${option.id} ${option.id === 1 ? "estrella" : "estrellas"}`}
                        aria-pressed={votedOptionId === option.id}
                        className="p-1 rounded transition-transform enabled:hover:scale-110 disabled:cursor-default cursor-pointer"
                    >
                        <Star
                            className={`w-8 h-8 md:w-9 md:h-9 transition-colors ${
                                option.id <= filledUpTo
                                    ? "text-[#d2f000] fill-[#d2f000]"
                                    : "text-[#454932]"
                            }`}
                        />
                    </button>
                ))}
            </div>

            {isVoted ? (
                <div className="flex items-stretch gap-4 bg-[#131313] border border-[#353534] rounded-lg p-3">
                    <div className="flex flex-col items-center justify-center px-2 min-w-[72px]">
                        <span className="font-headline font-black text-3xl text-[#d2f000] leading-none">
                            {average.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-[#909378] mt-1">
                            de {scale}
                        </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 justify-center border-l border-[#353534] pl-4">
                        {[...stars].reverse().map((option) => {
                            const votes = getOptionVotes(option.id);

                            return (
                                <div key={option.id} className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-[#c6c9ab] w-3 text-right">
                                        {option.id}
                                    </span>
                                    <Star className="w-3 h-3 text-[#909378] flex-shrink-0" />
                                    <div className="flex-1 h-2 bg-[#2a2a2a] rounded-sm overflow-hidden">
                                        <motion.div
                                            className="h-full bg-[#d2f000]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(votes / mostVoted) * 100}%` }}
                                            transition={{ duration: 0.6 }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-[#909378] w-6">{votes}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-[11px] text-[#909378] text-center">
                    Poné tu nota para ver el promedio de la tribuna
                </p>
            )}
        </div>
    );
};
