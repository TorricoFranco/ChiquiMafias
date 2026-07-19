import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionApi } from "@/services/subscriptionsApi";
import { useUserStore } from "@/store/useUserStore";
import { SubscriptionTier } from "@/types/subscription";


export function useSubscriptions() {
  const queryClient = useQueryClient();
  const username = useUserStore((state) => state.username);
  const userTier = useUserStore((state) => state.tier);
  const setUserInfo = useUserStore((state) => state.setUserInfo);

  const plansQuery = useQuery({
    queryKey: ["subscription-plans", userTier],
    queryFn: () => subscriptionApi.getPlans(userTier as SubscriptionTier),
  });

  const currentSubQuery = useQuery({
    queryKey: ["current-subscription"],
    queryFn: subscriptionApi.getCurrent,
    enabled: !!username,
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier: SubscriptionTier) => subscriptionApi.startCheckout(tier),
    onSuccess: (data) => {
      if (data.init_point) window.location.href = data.init_point;
    },
    onError: (err) => console.error("Error en checkout:", err),
  });

  const upgradeMutation = useMutation({
    mutationFn: (newTier: SubscriptionTier) => subscriptionApi.upgrade(newTier),
    onSuccess: (data) => {
      if (data.init_point) window.location.href = data.init_point;
    },
    onError: (err) => console.error("Error en upgrade:", err),
  });

  // ⚡ MUTATION DE CANCELACIÓN OPTIMIZADA
  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => subscriptionApi.cancel(reason),
    onSuccess: () => {
      // 1. Invalidamos la query para traer los datos frescos del backend
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
    onError: (err) => console.error("Error al cancelar:", err),
  });

  return {
    plans: plansQuery.data,
    isLoadingPlans: plansQuery.isLoading,
    currentSub: currentSubQuery.data,
    isLoadingCurrentSub: currentSubQuery.isLoading,

    startCheckout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,

    startUpgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,

    cancelSubscription: cancelMutation.mutate,
    isCanceling: cancelMutation.isPending,
  };
}