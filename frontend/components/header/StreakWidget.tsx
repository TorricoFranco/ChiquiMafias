// src/components/header/StreakWidget.tsx
import { Flame } from "lucide-react";

interface StreakWidgetProps {
  currentStreak: number;
  streakRewardClaimed: boolean;
  onClick: () => void;
}

export default function StreakWidget({ currentStreak, streakRewardClaimed, onClick }: StreakWidgetProps) {
  const titleText = !streakRewardClaimed
    ? "¡Tenés un premio diario disponible, campeón!"
    : "Racha al día y asegurada. ¡Volvé mañana!";

  const buttonStyles = !streakRewardClaimed
    ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]"
    : currentStreak > 0
      ? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:border-orange-500/60"
      : "bg-[#2b2b2b] border-[#3b3b3b] text-gray-500 hover:text-gray-400";

  const flameStyles = !streakRewardClaimed
    ? "fill-amber-500 text-amber-500 scale-110"
    : currentStreak > 0
      ? "fill-orange-500 text-orange-500"
      : "text-gray-500";

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide transition duration-300 border ${buttonStyles}`}
      title={titleText}
    >
      <Flame className={`w-4 h-4 transition-transform duration-300 ${flameStyles}`} />
      <span className="font-mono uppercase">
        {currentStreak} {currentStreak === 1 ? 'Día' : 'Días'}
      </span>
    </button>
  );
}