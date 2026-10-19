import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorMessage';
import { pollsApi } from '../api/pollsApi';
import { ApprovePollDto, CreateCommentDto, ProposePollDto, ReactDto } from '../types';

// --- QUERIES ---

export const useActivePolls = () => {
  return useQuery({
    queryKey: ['active-polls'],
    queryFn: pollsApi.getActivePolls,
    staleTime: 1000 * 60 * 2,
  });
};

export const useClosedPolls = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['closed-polls', page, limit],
    queryFn: () => pollsApi.getClosedPolls(page, limit),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePollComments = (pollId: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['poll-comments', pollId, page, limit],
    queryFn: () => pollsApi.getPollComments(pollId, page, limit),
    enabled: !!pollId,
    placeholderData: keepPreviousData,
  });
};

export const usePendingRewards = () => {
  const userId = useUserStore((state) => state.id);
  // Por usuario: al cerrar sesión la cache no debe servir el conteo de la cuenta anterior.
  return useQuery({
    queryKey: ['pending-rewards', userId],
    queryFn: pollsApi.getPendingRewards,
    staleTime: 1000 * 60,
    enabled: !!userId,
  });
};

export const usePendingPolls = () => {
  return useQuery({
    queryKey: ['pending-polls'],
    queryFn: pollsApi.getPendingPolls,
  });
};

// --- MUTATIONS DE USUARIO ---

export const useProposePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ProposePollDto) => pollsApi.proposePoll(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-polls'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useAddComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCommentDto) => pollsApi.addComment(pollId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-comments', pollId] });
    },
  });
};

export const useReactToPoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pollId, dto }: { pollId: string; dto: ReactDto }) => 
      pollsApi.reactToPoll(pollId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
    },
  });
};

export const useReactToComment = (pollId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, dto }: { commentId: string; dto: ReactDto }) => 
      pollsApi.reactToComment(commentId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-comments', pollId] });
    },
  });
};

export const useClaimAllRewards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pollsApi.claimAllRewards,
    // La cuenta se toma al disparar el claim: si cambia antes de la respuesta, el saldo de la nueva no se toca.
    onMutate: () => ({ userId: useUserStore.getState().id }),
    onSuccess: (data, _variables, context) => {
      const { id, balance, setBalance } = useUserStore.getState();
      if (context?.userId && id === context.userId) {
        setBalance(balance + data.coinsAwarded);
      }

      queryClient.setQueryData(['pending-rewards', context?.userId], { count: 0, potentialCoins: 0 });
      queryClient.invalidateQueries({ queryKey: ['pending-rewards'] });
    },
    onError: (error, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['pending-rewards'] });
      // Si cambió la cuenta, el aviso caería en la sesión equivocada.
      if (useUserStore.getState().id !== context?.userId) return;
      // Solo el mensaje de negocio (400) viene en español; red, 5xx o 429 muestran el texto por defecto.
      const message = (error as { status?: number }).status === 400 ? getErrorMessage(error) : undefined;
      toast.error(message || 'No se pudieron reclamar las recompensas');
    },
  });
};

// --- MUTATIONS DE ADMIN ---

export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pollsApi.createPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
    },
  });
};

export const useApprovePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pollId, dto }: { pollId: string; dto: ApprovePollDto }) =>
      pollsApi.approvePoll(pollId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-polls'] });
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
    },
  });
};

export const useRejectPoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollsApi.rejectPoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-polls'] });
    },
  });
};

export const useClosePollManually = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollsApi.closePollManually(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-polls'] });
      queryClient.invalidateQueries({ queryKey: ['closed-polls'] });
    },
  });
};