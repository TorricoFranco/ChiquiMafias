import { Poll } from "@/features/polls/types";

export interface PollBodyProps {
    poll: Poll;
    onVoteUpdate: (totalVotes: number, connected: boolean) => void;
}
