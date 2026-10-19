"use client";

import React from "react";
import { Coins, Sparkles } from "lucide-react";
import { usePendingRewards, useClaimAllRewards } from "@/features/polls/hooks/usePolls";
import { useNavigationStore } from "@/store/useNavigationStore";

export const ClaimRewardsBanner = () => {
  const { data: pending, isLoading } = usePendingRewards();
  const claimMutation = useClaimAllRewards();

  if (isLoading || !pending || pending.count === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#1c1b1b] to-[#252520] border border-[#d2f000]/40 rounded-xl p-4 flex items-center justify-between shadow-lg mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-[#d2f000]/10 p-2.5 rounded-lg border border-[#d2f000]/20 text-[#d2f000]">
          <Coins className="w-6 h-6 animate-bounce" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#e5e2e1] flex items-center gap-1.5">
            ¡Tenés recompensas sin reclamar! <Sparkles className="w-4 h-4 text-[#d2f000]" />
          </h4>
          <p className="text-xs text-[#c6c9ab]">
            Participaste en <span className="font-bold text-[#e5e2e1]">{pending.count}</span> {pending.count === 1 ? 'encuesta' : 'encuestas'} y podés reclamar <span className="text-[#d2f000] font-bold inline-flex items-center gap-1">
              +<span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 inline-flex items-center justify-center">
                <img src="/icons/chiqui-coin-icon.png" alt="" className="w-full h-full object-cover" />
              </span>
              {pending.potentialCoins} monedas
            </span>.
          </p>
        </div>
      </div>

      <button
        onClick={() => claimMutation.mutate()}
        disabled={claimMutation.isPending}
        className="bg-[#d2f000] hover:bg-[#B8D300] text-[#131313] font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md hover:shadow-[#d2f000]/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
      >
        {claimMutation.isPending ? (
          "Reclamando..."
        ) : (
          <span className="flex items-center gap-1.5">
            <span>Reclamar</span>
            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
              <img src="/icons/chiqui-coin-icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span>{pending.potentialCoins}</span>
          </span>
        )}
      </button>
    </div>
  );
};

// Aviso flotante para el resto de las pestañas: al tocarlo, lleva a Comunidad,
// donde está el banner completo para reclamar.
export const ClaimRewardsNotice = () => {
  const { data: pending, isLoading } = usePendingRewards();
  const setActiveTab = useNavigationStore((state) => state.setActiveTab);

  if (isLoading || !pending || pending.count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => setActiveTab("Comunidad")}
      className="pointer-events-auto neon-glow flex items-center gap-2 max-w-[calc(100%-2rem)] bg-[#d2f000] hover:bg-[#B8D300] text-[#191e00] font-bold px-4 py-2 rounded-full text-xs shadow-lg cursor-pointer transition-all animate-fade-in"
    >
      <Coins className="w-4 h-4 flex-shrink-0 animate-bounce" />
      <span className="truncate">¡Recompensa para reclamar!</span>
      <span className="flex items-center gap-1 bg-[#191e00]/15 px-2 py-0.5 rounded-full flex-shrink-0">
        <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
          <img src="/icons/chiqui-coin-icon.png" alt="" className="w-full h-full object-cover" />
        </span>
        +{pending.potentialCoins}
      </span>
    </button>
  );
};