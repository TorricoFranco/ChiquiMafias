import { useQuery } from '@tanstack/react-query';
import { authApi } from "@/features/auth/api/authApi";

export const usePublicProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => authApi.getPublicProfile(userId as string),
    enabled: !!userId,
    retry: 1,
  });
};