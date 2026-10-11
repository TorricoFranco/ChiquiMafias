"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { usePollVote } from "@/features/polls/hooks/usePollVote";
import { TeamBadge } from "../TeamBadge";
import { PollBodyProps } from "./types";

/**
 * Predicción de partido. En el formato VS se pinta como la tarjeta de un
 * partido (equipo 1 · Empate · equipo 2); en el formato LIST es una pregunta
 * con el escudo al lado de cada opción.
 */
export const MatchBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    const { options, connected, votedOptionId, isVoted, totalVotes, getOptionVotes, getPercentage, vote } =
        usePollVote(poll);

    useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const isVersusLayout = poll.config?.layout !== "LIST" && options.length === 3;

    if (isVersusLayout) {
        const [home, draw, away] = options;

        return (
            <div className="flex flex-col gap-3 mt-1">
                {/* Cabecera estilo tarjeta de partido */}
                <div className="flex items-center justify-center gap-4 md:gap-6 py-3 bg-[#131313] border border-[#353534] rounded-lg">
                    <div className="flex flex-col items-center gap-1.5 w-24">
                        <TeamBadge teamId={home.teamId} teamName={home.label} size="lg" />
                        <span className="text-[11px] font-bold text-[#c6c9ab] text-center leading-tight">
                            {home.label}
                        </span>
                    </div>
                    <span className="font-headline font-black text-lg text-[#909378]">VS</span>
                    <div className="flex flex-col items-center gap-1.5 w-24">
                        <TeamBadge teamId={away.teamId} teamName={away.label} size="lg" />
                        <span className="text-[11px] font-bold text-[#c6c9ab] text-center leading-tight">
                            {away.label}
                        </span>
                    </div>
                </div>

                {/* 1 · X · 2 */}
                <div className="grid grid-cols-3 gap-2">
                    {[home, draw, away].map((option) => {
                        const isSelected = votedOptionId === option.id;
                        const percentage = getPercentage(option.id);

                        return (
                            <button
                                key={option.id}
                                onClick={() => vote(option.id)}
                                disabled={!connected || isVoted}
                                aria-label={option.label}
                                aria-pressed={isSelected}
                                className={`relative min-h-12 rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer disabled:cursor-default active:scale-[0.99] ${
                                    isSelected
                                        ? "border-[#d2f000] bg-[#d2f000]/10"
                                        : isVoted
                                          ? "border-[#353534] bg-[#131313] opacity-80"
                                          : "border-[#353534] bg-[#131313] hover:border-[#d2f000] hover:bg-[#d2f000]/5"
                                }`}
                            >
                                {isVoted && (
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-[#2a2a2a] transition-all duration-700 z-0"
                                        style={{ width: `${Math.max(percentage, 5)}%` }}
                                    />
                                )}
                                <span
                                    className={`relative z-10 text-xs font-bold truncate max-w-full px-1 ${
                                        isSelected ? "text-[#d2f000]" : "text-[#e5e2e1]"
                                    }`}
                                >
                                    {option.label}
                                </span>
                                {isVoted && (
                                    <span
                                        className={`relative z-10 font-mono text-[11px] font-bold ${
                                            isSelected ? "text-[#d2f000]" : "text-[#c6c9ab]"
                                        }`}
                                    >
                                        {percentage}%
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5 mt-1">
            {options.map((option) => {
                const isSelected = votedOptionId === option.id;
                const percentage = getPercentage(option.id);

                return (
                    <button
                        key={option.id}
                        onClick={() => vote(option.id)}
                        disabled={!connected || isVoted}
                        aria-label={option.label}
                        aria-pressed={isSelected}
                        className={`relative min-h-12 rounded-lg border overflow-hidden flex items-center gap-3 px-3 transition-all cursor-pointer disabled:cursor-default active:scale-[0.99] ${
                            isSelected
                                ? "border-[#d2f000] bg-[#d2f000]/10"
                                : isVoted
                                  ? "border-[#353534] bg-[#131313] opacity-80"
                                  : "border-[#353534] bg-[#131313] hover:border-[#d2f000] hover:bg-[#d2f000]/5"
                        }`}
                    >
                        {isVoted && (
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-[#2a2a2a] transition-all duration-700 z-0"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2.5 flex-1 min-w-0">
                            <TeamBadge teamId={option.teamId} teamName={option.label} size="md" />
                            <span
                                className={`text-xs md:text-sm font-bold truncate ${
                                    isSelected ? "text-[#d2f000]" : "text-[#e5e2e1]"
                                }`}
                            >
                                {option.label}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#d2f000] flex-shrink-0" />}
                        </span>
                        {isVoted && (
                            <span
                                className={`relative z-10 font-mono text-xs font-bold ${
                                    isSelected ? "text-[#d2f000]" : "text-[#c6c9ab]"
                                }`}
                            >
                                {percentage}% ({getOptionVotes(option.id)} v)
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
