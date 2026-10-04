import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ThumbsUp, ArrowRight } from "lucide-react";
import { usePollSocket } from '../socket/usePollSocket';
import { useUserStore } from '@/store/useUserStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import { useReactToPoll } from '../hooks/usePolls';
import { Poll } from "@/features/polls/types";

interface PollCardResumeProps {
    poll: Poll;
}

export const PollCardResume: React.FC<PollCardResumeProps> = ({ poll }) => {
    const userId = useUserStore((state) => state.id);
    const { results, connected, castVote } = usePollSocket(poll.id, poll.options);
    const { mutate: reactToPoll } = useReactToPoll();

    const setActiveTab = useNavigationStore((state) => state.setActiveTab);

    const [localHasVoted, setLocalHasVoted] = useState(poll.userVotedOptionId != null);
    const [isVoting, setIsVoting] = useState(false);

    const totalVotes = Object.values(results).reduce((acc, val) => acc + Number(val), 0);
    const safeOptions = Array.isArray(poll.options) ? poll.options : [];

    const handleVoteClick = (optionId: number) => {
        if (!userId || isVoting) return;
        setIsVoting(true);

        castVote(optionId, userId, (response: any) => {
            setIsVoting(false);
            if (response.status === 'success') {
                setLocalHasVoted(true);
            }
        });
    };

    const handleGoToPronosticos = () => {
        setActiveTab("Pronósticos");
    };

    const handleLike = () => {
        reactToPoll({ pollId: poll.id, dto: { type: "LIKE" } });
    };

    return (
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-start">
                <h4 className="text-[#e5e2e1] text-sm font-bold leading-tight line-clamp-2">
                    {poll.title}
                </h4>
                {!localHasVoted && (
                    <span className="bg-[#d2f000]/20 text-[#d2f000] text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 animate-pulse flex items-center gap-1">
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
                            <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                        </div>
                        <span>+50</span>
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {safeOptions.map((option) => {
                    const optionText = option.label || 'Opción sin texto';
                    const optionVotes = Number(results[option.id]) || 0;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                    if (localHasVoted) {
                        return (
                            <div key={option.id} className="relative h-8 bg-[#2a2929] rounded-lg overflow-hidden flex items-center px-3 z-0">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute top-0 left-0 h-full bg-[#454932] -z-10"
                                />
                                <div className="flex justify-between w-full text-[11px] font-bold text-white z-10">
                                    <span className="truncate mr-2">{optionText}</span>
                                    <span>{percentage}%</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVoteClick(option.id)}
                            disabled={isVoting || !connected}
                            className="h-8 bg-[#201f1f] border border-[#353534] rounded-lg text-[11px] font-bold text-[#c6c9ab] hover:bg-[#353534] hover:text-white transition-all text-left px-3 disabled:opacity-50 truncate cursor-pointer"
                        >
                            {optionText}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#353534]/60">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 hover:bg-[#2a2a2a] p-1 rounded transition-colors ${poll.userReaction === 'LIKE' ? 'text-[#d2f000]' : 'text-[#909378] hover:text-[#d2f000]'}`}
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{poll.likesCount || 0}</span>
                    </button>

                    <button
                        onClick={handleGoToPronosticos}
                        className="text-[#909378] hover:text-white transition-colors flex items-center gap-1.5 p-1 rounded hover:bg-[#2a2a2a] cursor-pointer"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">Comentar</span>
                    </button>
                </div>

                <button
                    onClick={handleGoToPronosticos}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#d2f000] hover:text-white transition-colors cursor-pointer"
                >
                    Ver más <ArrowRight className="w-3 h-3" />3
                </button>
            </div>
        </div>
    );
};