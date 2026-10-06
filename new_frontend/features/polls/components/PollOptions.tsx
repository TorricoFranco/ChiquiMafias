import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { usePollSocket } from "@/features/polls/socket/usePollSocket";
import { Poll } from "@/features/polls/types";
import { useUserStore } from "@/store/useUserStore";

export const PollOptions = ({ poll, onVoteUpdate }: { poll: Poll, onVoteUpdate: (totalVotes: number, connected: boolean) => void }) => {
    const { id: userId } = useUserStore();
    const [localVotedOptionId, setLocalVotedOptionId] = useState<number | null>(poll.userVotedOptionId || null);
    
    const { results, castVote, connected } = usePollSocket(poll.id, poll.options);

    const getOptionVotes = (optId: number) => parseInt(results[optId.toString()] || "0");
    const totalVotes = poll.options.reduce((sum, opt) => sum + getOptionVotes(opt.id), 0);

    React.useEffect(() => {
        onVoteUpdate(totalVotes, connected);
    }, [totalVotes, connected, onVoteUpdate]);

    const handleVote = (optionId: number) => {
        if (localVotedOptionId) return;
        if (!userId) {
            useUserStore.getState().setLoginModalOpen(true);
            return;
        }
        castVote(optionId, userId, (res: any) => {
            if (res.status === "ok" || res.status === "success" || res.success) {
                setLocalVotedOptionId(optionId);
            } else {
                toast.error(res.message || "No se pudo registrar tu voto");
            }
        });
    };

    const isVoted = Boolean(localVotedOptionId);

    return (
        <div className="flex flex-col gap-2.5 mt-1">
            {poll.options.map((option) => {
                const isUserSelected = localVotedOptionId === option.id;
                const votesForOption = getOptionVotes(option.id);
                const percentage = totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100);

                if (isVoted) {
                    return (
                        <div key={option.id} className={`relative min-h-11 bg-[#131313] border rounded-lg overflow-hidden flex items-center px-4 transition-all ${isUserSelected ? "border-[#d2f000]" : "border-[#353534] opacity-80"}`}>
                            <div className={`absolute left-0 top-0 bottom-0 transition-all duration-700 z-0 ${isUserSelected ? "bg-[#d2f000]/25" : "bg-[#2a2a2a]"}`} style={{ width: `${Math.max(percentage, 5)}%` }} />
                            <div className="relative z-10 w-full flex justify-between items-center text-xs md:text-sm">
                                <span className="font-semibold text-[#e5e2e1] flex items-center gap-2">
                                    {isUserSelected && <CheckCircle2 className="w-4 h-4 text-[#d2f000] flex-shrink-0" />}
                                    {option.label}
                                </span>
                                <span className={`font-mono font-bold ${isUserSelected ? "text-[#d2f000]" : "text-[#c6c9ab]"}`}>
                                    {percentage}% ({votesForOption} v)
                                </span>
                            </div>
                        </div>
                    );
                }

                return (
                    <button key={option.id} onClick={() => handleVote(option.id)} disabled={!connected} className="min-h-11 bg-[#131313] border border-[#353534] hover:border-[#d2f000] rounded-lg flex justify-center items-center font-bold text-xs md:text-sm text-[#e5e2e1] hover:text-[#d2f000] hover:bg-[#d2f000]/5 transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};