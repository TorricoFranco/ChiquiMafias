"use client";

import React, { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { usePollVote } from "@/features/polls/hooks/usePollVote";
import { SplitBar } from "./SplitBar";
import { PollBodyProps } from "./types";

/**
 * Facto o no facto: la afirmación va en el título de la tarjeta y acá quedan
 * los dos botones. Después de votar se ven los resultados y el debate sigue
 * en los comentarios.
 */
export const FactoBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    const { options, connected, votedOptionId, isVoted, totalVotes, getPercentage, vote } =
        usePollVote(poll);

    useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const [facto, noFacto] = options;
    if (!facto || !noFacto) return null;

    return (
        <div className="flex flex-col gap-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
                {options.map((option, index) => {
                    const isSelected = votedOptionId === option.id;
                    const isFacto = index === 0;

                    return (
                        <button
                            key={option.id}
                            onClick={() => vote(option.id)}
                            disabled={!connected || isVoted}
                            aria-label={option.label}
                            aria-pressed={isSelected}
                            className={`min-h-14 rounded-lg border font-headline font-black text-sm md:text-base uppercase tracking-wide transition-all cursor-pointer disabled:cursor-default active:scale-[0.99] ${
                                isSelected
                                    ? "border-[#d2f000] bg-[#d2f000] text-[#191e00]"
                                    : isVoted
                                      ? "border-[#353534] bg-[#131313] text-[#909378]"
                                      : isFacto
                                        ? "border-[#353534] bg-[#131313] text-[#e5e2e1] hover:border-[#d2f000] hover:text-[#d2f000]"
                                        : "border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932] hover:text-[#e5e2e1]"
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {isVoted ? (
                <SplitBar
                    leftPercentage={getPercentage(facto.id)}
                    leftLabel={facto.label}
                    rightLabel={noFacto.label}
                />
            ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-[#909378]">
                    <MessageSquare className="w-3 h-3" />
                    Votá para ver los resultados y bancá tu postura en los comentarios
                </p>
            )}
        </div>
    );
};
