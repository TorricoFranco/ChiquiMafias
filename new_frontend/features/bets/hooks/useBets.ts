import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { betsApi } from '../api/betsApi'; 
import { AdminMarket } from '../types';

export const useAdminMarkets = () => {
  return useQuery({
    queryKey: ['markets'],
    queryFn: betsApi.getActiveMarkets,
  });
};

export const useCreateManualMarket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: betsApi.createManualMarket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
};

export const useSettleMarket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ marketId, data }: { 
      marketId: string; 
      data: { status: 'SETTLED' | 'REFUNDED'; winningOptionId?: string } 
    }) => betsApi.settleMarket(marketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
};
