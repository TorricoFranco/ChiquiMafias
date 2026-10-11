"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, X } from "lucide-react";
import { usePollVote } from "@/features/polls/hooks/usePollVote";
import { PollOption } from "@/features/polls/types";
import { TeamBadge } from "../TeamBadge";
import { PollBodyProps } from "./types";

/** Estilo de la chapita de posición: el oro es el lima, después baja el contraste. */
const POSITION_STYLES = [
    "bg-[#d2f000] text-[#191e00]",
    "bg-[#c6c9ab] text-[#191e00]",
    "bg-[#909378] text-[#191e00]",
];

const positionStyle = (index: number) =>
    POSITION_STYLES[index] ?? "bg-[#2a2a2a] text-[#c6c9ab]";

/**
 * Podio: el usuario toca sus opciones en orden y al enviar aparece, por cada
 * una, cuántas veces la tribuna la eligió primera, segunda y tercera.
 */
export const RankingBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    const { options, connected, isVoted, isVoting, totalVotes, voteRanking, ranking, userRanking } =
        usePollVote(poll);
    const [picks, setPicks] = useState<number[]>([]);

    useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const maxPicks = poll.config?.picks ?? 3;

    const togglePick = (optionId: number) => {
        setPicks((current) =>
            current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : current.length < maxPicks
                  ? [...current, optionId]
                  : current
        );
    };

    /** Ordenado por puntaje: un primer puesto vale más que un segundo. */
    const standings = useMemo(() => {
        if (!ranking) return [];

        return options
            .map((option) => {
                const positions = ranking[option.id.toString()] ?? [];
                const score = positions.reduce(
                    (total, times, index) => total + times * (maxPicks - index),
                    0
                );

                return { option, positions, score };
            })
            .sort((a, b) => b.score - a.score);
    }, [maxPicks, options, ranking]);

    if (options.length === 0) return null;

    if (isVoted && ranking) {
        const topScore = standings[0]?.score || 1;

        return (
            <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#909378]">
                    <Trophy className="w-3.5 h-3.5 text-[#d2f000]" />
                    Podio de la tribuna
                </div>

                {standings.map(({ option, positions, score }, index) => {
                    const isMine = userRanking?.includes(option.id);

                    return (
                        <div
                            key={option.id}
                            className={`relative overflow-hidden rounded-lg border px-3 py-2 ${
                                isMine
                                    ? "border-[#d2f000]/60 bg-[#d2f000]/5"
                                    : "border-[#353534] bg-[#131313]"
                            }`}
                        >
                            <motion.div
                                className="absolute left-0 top-0 bottom-0 bg-[#2a2a2a] z-0"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max((score / topScore) * 100, 4)}%` }}
                                transition={{ duration: 0.7 }}
                            />

                            <div className="relative z-10 flex items-center gap-2.5">
                                <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${positionStyle(index)}`}
                                >
                                    {index + 1}
                                </span>
                                {option.teamId && (
                                    <TeamBadge teamId={option.teamId} teamName={option.label} size="sm" />
                                )}
                                <span className="text-xs md:text-sm font-bold text-[#e5e2e1] truncate flex-1">
                                    {option.label}
                                </span>

                                {/* Veces que quedó en cada lugar */}
                                <span className="flex items-center gap-1 flex-shrink-0">
                                    {positions.map((times, position) => (
                                        <span
                                            key={position}
                                            title={`${times} ${times === 1 ? "voto" : "votos"} para el puesto ${position + 1}`}
                                            className={`min-w-6 text-center text-[10px] font-mono font-bold rounded px-1 py-0.5 ${positionStyle(position)} ${times === 0 ? "opacity-30" : ""}`}
                                        >
                                            {times}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        </div>
                    );
                })}

                <p className="text-[10px] text-[#909378]">
                    Los tres números son las veces que quedó 1º, 2º y 3º.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-1">
            <p className="text-[11px] text-[#909378]">
                Tocá tus {maxPicks} mejores en orden: la primera que elijas es la número 1.
            </p>

            {options.map((option: PollOption) => {
                const position = picks.indexOf(option.id);
                const isPicked = position >= 0;

                return (
                    <button
                        key={option.id}
                        onClick={() => togglePick(option.id)}
                        disabled={!connected || isVoting}
                        aria-label={option.label}
                        aria-pressed={isPicked}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPicked
                                ? "border-[#d2f000] bg-[#d2f000]/10"
                                : "border-[#353534] bg-[#131313] hover:border-[#454932]"
                        }`}
                    >
                        <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                isPicked ? positionStyle(position) : "bg-[#2a2a2a] text-[#454932]"
                            }`}
                        >
                            {isPicked ? position + 1 : "–"}
                        </span>
                        {option.teamId && (
                            <TeamBadge teamId={option.teamId} teamName={option.label} size="sm" />
                        )}
                        <span
                            className={`text-xs md:text-sm font-bold truncate flex-1 text-left ${
                                isPicked ? "text-[#d2f000]" : "text-[#e5e2e1]"
                            }`}
                        >
                            {option.label}
                        </span>
                        {isPicked && <X className="w-3.5 h-3.5 text-[#909378] flex-shrink-0" />}
                    </button>
                );
            })}

            <button
                onClick={() => voteRanking(picks)}
                disabled={picks.length < maxPicks || !connected || isVoting}
                className="mt-1 min-h-11 rounded-lg bg-[#d2f000] text-[#191e00] font-black text-sm uppercase tracking-wide transition-all active:scale-[0.99] disabled:bg-[#2a2a2a] disabled:text-[#909378] disabled:cursor-not-allowed cursor-pointer"
            >
                {picks.length < maxPicks
                    ? `Elegí ${maxPicks - picks.length} más`
                    : isVoting
                      ? "Enviando..."
                      : "Enviar mi podio"}
            </button>
        </div>
    );
};
