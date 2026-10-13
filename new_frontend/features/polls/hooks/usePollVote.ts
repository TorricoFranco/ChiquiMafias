import { useCallback, useState } from "react";
import { toast } from "sonner";
import { usePollSocket } from "@/features/polls/socket/usePollSocket";
import { Poll, PollRankingResults, VoteAck } from "@/features/polls/types";
import { useUserStore } from "@/store/useUserStore";

/**
 * Lógica de votación compartida por todos los cuerpos de encuesta.
 * Los resultados por opción llegan en cero hasta que el usuario vota: el total
 * de votantes, en cambio, es público y viene en `poll.totalVotes`.
 */
export const usePollVote = (poll: Poll) => {
    const { id: userId } = useUserStore();
    const [votedOptionId, setVotedOptionId] = useState<number | null>(poll.userVotedOptionId ?? null);
    const [isVoting, setIsVoting] = useState(false);

    const { results, castVote, castRanking, connected, liveTotal, rankingResults } =
        usePollSocket(poll.id, poll.options);

    const options = Array.isArray(poll.options) ? poll.options : [];
    const isVoted = votedOptionId != null;

    const getOptionVotes = useCallback(
        (optionId: number) => parseInt(results[optionId.toString()] || "0", 10),
        [results]
    );

    const totalFromResults = options.reduce((sum, option) => sum + getOptionVotes(option.id), 0);
    // Quien votó suma los resultados por opción; quien no, usa el total que
    // llega por REST y se actualiza con el evento `totalActualizado_<pollId>`.
    const totalVotes = isVoted
        ? totalFromResults
        : (liveTotal ?? poll.totalVotes ?? totalFromResults);

    const getPercentage = useCallback(
        (optionId: number) => {
            if (totalFromResults === 0) return 0;
            return Math.round((getOptionVotes(optionId) / totalFromResults) * 100);
        },
        [getOptionVotes, totalFromResults]
    );

    /** Resultado del ack, compartido por el voto simple y el del podio. */
    const handleAck = useCallback(
        (chosenOptionId: number) => (res: VoteAck) => {
            setIsVoting(false);

            if (res.status === "ok" || res.status === "success" || res.success) {
                setVotedOptionId(chosenOptionId);
                return;
            }

            // El backend ya tenía el voto registrado: mostramos los resultados
            // en vez de un error.
            if (res.code === "ALREADY_VOTED") {
                setVotedOptionId(poll.userVotedOptionId ?? chosenOptionId);
                return;
            }

            toast.error(res.message || "No se pudo registrar tu voto");
        },
        [poll.userVotedOptionId]
    );

    /** Pide la sesión si falta; devuelve false si no se puede votar ahora. */
    const canVote = useCallback(() => {
        if (votedOptionId || isVoting) return false;
        if (!userId) {
            useUserStore.getState().setLoginModalOpen(true, "poll");
            return false;
        }
        return true;
    }, [isVoting, userId, votedOptionId]);

    const vote = useCallback(
        (optionId: number) => {
            if (!canVote() || !userId) return;

            if (castVote(optionId, userId, handleAck(optionId))) setIsVoting(true);
        },
        [canVote, castVote, handleAck, userId]
    );

    /** Voto del podio: la primera del ranking es la que queda como elegida. */
    const voteRanking = useCallback(
        (ranking: number[]) => {
            if (!canVote() || !userId || ranking.length === 0) return;

            if (castRanking(ranking, userId, handleAck(ranking[0]))) setIsVoting(true);
        },
        [canVote, castRanking, handleAck, userId]
    );

    // El del socket llega al votar; el del REST solo si el usuario ya había votado.
    const ranking: PollRankingResults | null = rankingResults ?? poll.rankingResults ?? null;

    return {
        options,
        results,
        connected,
        votedOptionId,
        isVoted,
        isVoting,
        totalVotes,
        getOptionVotes,
        getPercentage,
        vote,
        voteRanking,
        ranking,
        userRanking: poll.userRanking ?? null,
    };
};
