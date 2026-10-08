import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../api/teamsApi';

export const useTeams = () => {
    return useQuery({
        queryKey: ['teams'],
        queryFn: teamsApi.getTeams,
        staleTime: 1000 * 60 * 60 * 24,
    });
};