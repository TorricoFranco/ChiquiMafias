"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { usePollVote } from "@/features/polls/hooks/usePollVote";
import { PollOption } from "@/features/polls/types";
import { TeamBadge } from "../TeamBadge";
import { SplitBar } from "./SplitBar";
import { PollBodyProps } from "./types";

interface VersusSideProps {
    option: PollOption;
    align: "left" | "right";
    isSelected: boolean;
    isVoted: boolean;
    showBadge: boolean;
    disabled: boolean;
    onVote: (optionId: number) => void;
}

const VersusSide: React.FC<VersusSideProps> = ({
    option,
    align,
    isSelected,
    isVoted,
    showBadge,
    disabled,
    onVote,
}) => (
    <button
        onClick={() => onVote(option.id)}
        disabled={disabled}
        aria-label={option.label}
        aria-pressed={isSelected}
        className={`group flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-lg border transition-all cursor-pointer disabled:cursor-default active:scale-[0.99] ${isSelected
            ? "border-[#d2f000] bg-[#d2f000]/10"
            : isVoted
                ? "border-[#353534] bg-[#131313] opacity-75"
                : "border-[#353534] bg-[#131313] hover:border-[#d2f000] hover:bg-[#d2f000]/5"
            } ${align === "right" ? "md:items-end" : "md:items-start"}`}
    >
        {showBadge && <TeamBadge teamId={option.teamId} teamName={option.label} size="lg" />}
        <span
            className={`font-headline font-black text-sm md:text-base uppercase text-center leading-tight ${isSelected ? "text-[#d2f000]" : "text-[#e5e2e1]"
                }`}
        >
            {option.label}
        </span>
        {isSelected && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#d2f000]">
                <CheckCircle2 className="w-3 h-3" /> TU ELECCIÓN
            </span>
        )}
    </button>
);

/** Duelo 1 vs 1: los dos lados enfrentados con el VS en el medio. */
export const VersusBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    const { options, connected, votedOptionId, isVoted, totalVotes, getPercentage, vote } =
        usePollVote(poll);

    useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const [left, right] = options;
    if (!left || !right) return null;

    const hasBadges = Boolean(left.teamId || right.teamId);
    const disabled = !connected || isVoted;

    return (
        <div className="flex flex-col gap-3 mt-1">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                <VersusSide
                    option={left}
                    align="right"
                    isSelected={votedOptionId === left.id}
                    isVoted={isVoted}
                    showBadge={hasBadges}
                    disabled={disabled}
                    onVote={vote}
                />
                <div className="flex items-center justify-center px-1">
                    <span className="font-headline font-black text-base text-[#909378] tracking-tight">VS</span>
                </div>
                <VersusSide
                    option={right}
                    align="left"
                    isSelected={votedOptionId === right.id}
                    isVoted={isVoted}
                    showBadge={hasBadges}
                    disabled={disabled}
                    onVote={vote}
                />
            </div>

            {isVoted && (
                <SplitBar
                    leftPercentage={getPercentage(left.id)}
                    leftLabel={left.label}
                    rightLabel={right.label}
                />
            )}
        </div>
    );
};
