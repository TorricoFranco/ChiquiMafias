import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionApi } from "../api/subscriptionsApi";
import { useUserStore } from "@/store/useUserStore"; 
import { SubscriptionTier } from "../types/index";

export function useSubscriptions() {
  const queryClient = useQueryClient();
  
  const userTier = useUserStore((state) => state.tier) as SubscriptionTier;

  const plansQuery = useQuery({
    queryKey: ["subscription-plans", userTier],
    queryFn: () => subscriptionApi.getPlans(userTier),
  });

  const checkoutMutation = useMutation({
    mutationFn: subscriptionApi.startCheckout,
    onSuccess: (data) => {
      if (data.init_point) window.location.href = data.init_point;
    },
    onError: () => toast.error("No pudimos iniciar la suscripción. Probá de nuevo."),
  });

  const upgradeMutation = useMutation({
    mutationFn: (newTier: SubscriptionTier) => subscriptionApi.upgrade(newTier),
    onSuccess: (data) => {
      if (data.init_point) window.location.href = data.init_point;
    },
    onError: () => toast.error("No pudimos mejorar tu plan. Probá de nuevo."),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => subscriptionApi.cancel(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
    onError: (err) => console.error("Error al cancelar:", err),
  });

  return {
    plans: plansQuery.data,
    isLoadingPlans: plansQuery.isLoading,
    startCheckout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
    startUpgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
    cancelSubscription: cancelMutation.mutate,
    isCanceling: cancelMutation.isPending,
  };
}