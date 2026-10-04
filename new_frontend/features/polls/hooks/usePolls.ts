import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserStore } from '@/store/useUserStore';
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
  return useQuery({
    queryKey: ['pending-rewards'],
    queryFn: pollsApi.getPendingRewards,
    staleTime: 1000 * 60,
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
    onSuccess: (data) => {
      const currentBalance = useUserStore.getState().balance;
      const setBalance = useUserStore.getState().setBalance;
      setBalance(currentBalance + data.coinsAwarded);

      queryClient.setQueryData(['pending-rewards'], { count: 0, potentialCoins: 0 });
      queryClient.invalidateQueries({ queryKey: ['pending-rewards'] });
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