"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, Flame, Zap, Loader2 } from "lucide-react";
import { useStreakTimeline, useClaimStreakReward } from "../hooks/useStreak";
import StreakDayCard from "./StreakDayCard";
import ClaimSuccessView from "./ClaimSuccessView";
import { StreakTimelineItem } from "../types";

interface StreakModalProps {
  onClose: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 22 } },
};

export default function StreakModal({ onClose }: StreakModalProps) {
  const { data, isLoading } = useStreakTimeline();
  const { mutate: claimReward, isPending: claiming } = useClaimStreakReward();
  const [rewardVisual, setRewardVisual] = useState<{ coins: number; gift: string | null } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al día actual
  useEffect(() => {
    if (data?.timeline && scrollContainerRef.current) {
      const currentDayElement = scrollContainerRef.current.querySelector('[data-current="true"]');
      if (currentDayElement) {
        currentDayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [data]);

  const handleClaim = () => {
    if (claiming || !data || data.streakRewardClaimed) return;
    claimReward(undefined, {
      onSuccess: (res) => {
        setRewardVisual({ coins: res.coinsAwarded, gift: res.cosmeticAwarded });
      },
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-3xl bg-[#1c1b1b] border border-[#353534] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-6 md:p-8 text-[#e5e2e1]"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-[#909378] hover:text-white p-2 rounded-full hover:bg-[#282827] transition">
            <X className="w-5 h-5" />
          </button>

          {rewardVisual ? (
            <ClaimSuccessView coins={rewardVisual.coins} gift={rewardVisual.gift} onClose={onClose} />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center space-x-3.5 mb-6 border-b border-[#353534] pb-5">
                <div className="p-3 bg-[#d2f000]/10 rounded-2xl border border-[#d2f000]/20 relative">
                  <Flame className="w-7 h-7 text-[#d2f000] fill-[#d2f000]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-wide uppercase text-white">Racha Diaria</h2>
                    {data?.currentStreak && data.currentStreak > 0 && (
                      <span className="text-[10px] font-extrabold bg-[#d2f000] text-[#191e00] px-2 py-0.5 rounded-md uppercase">
                        {data.currentStreak} {data.currentStreak === 1 ? "Día" : "Días"} 🔥
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#c6c9ab] mt-0.5">
                    {data?.streakRewardClaimed ? "¡Ya reclamaste el premio de hoy! Volvé mañana para mantener el fuego sagrado." : "Entrá todos los días para acumular más Chiqui Coins y cosméticos exclusivos."}
                  </p>
                </div>
              </div>

              {/* Carrusel Horizontal de Días */}
              {isLoading ? (
                <div className="flex overflow-hidden gap-3 my-6 pb-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex-none w-[110px] h-36 bg-[#131313] rounded-2xl animate-pulse border border-[#353534]" />
                  ))}
                </div>
              ) : (
                <motion.div
                  ref={scrollContainerRef}
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="flex overflow-x-auto gap-3 my-6 pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#353534 transparent' }}
                >
                  {data?.timeline
                    .filter((day: StreakTimelineItem) => day.dayNumber >= (data.currentStreak - 3))
                    .map((day: StreakTimelineItem) => (
                      <StreakDayCard
                        key={day.dayNumber}
                        day={day}
                        streakRewardClaimed={data.streakRewardClaimed}
                        itemVariants={itemVariants}
                      />
                    ))}
                </motion.div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-[#353534] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-[11px] text-[#909378] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#d2f000] flex-shrink-0" />
                  <span>Las recompensas aumentan exponencialmente cada día consecutivo.</span>
                </div>

                <button
                  disabled={isLoading || claiming || !data || data.streakRewardClaimed}
                  onClick={handleClaim}
                  className={`w-full sm:w-auto px-7 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${data?.streakRewardClaimed ? "bg-[#131313] text-[#666] border border-[#353534] cursor-not-allowed opacity-70" : "bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] shadow-lg shadow-[#d2f000]/10 active:scale-95 cursor-pointer"
                    }`}
                >
                  {claiming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
                  ) : data?.streakRewardClaimed ? (
                    <span>Premio Reclamado</span>
                  ) : (
                    <span>Reclamar Premio</span>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}