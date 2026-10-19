import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streakApi } from '../api/streakApi';
import { useUserStore } from '@/store/useUserStore';

export const useStreakTimeline = () => {
    const id = useUserStore((state) => state.id);
    return useQuery({
        queryKey: ['streak-timeline'],
        queryFn: streakApi.getTimeline,
        staleTime: 1000 * 60 * 5,
        enabled: !!id,
    });
};

export const useClaimStreakReward = () => {
    const queryClient = useQueryClient();
    const updateStreak = useUserStore((state) => state.setStreak); 

    return useMutation({
        mutationFn: streakApi.claimReward,
        onSuccess: (data) => {
            if (updateStreak) updateStreak(data.currentStreak);

            queryClient.invalidateQueries({ queryKey: ['streak-timeline'] });
        },
        onError: (error) => {
            console.error('Error al reclamar:', error);
        }
    });
};