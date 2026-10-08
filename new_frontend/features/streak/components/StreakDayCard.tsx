import { motion, Variants } from "framer-motion";
import { CheckCircle2, Lock, Gift, MessageSquare, Palette, Sticker, Image as ImageIcon } from "lucide-react";
import { StreakTimelineItem } from "../types";

interface StreakDayCardProps {
    day: StreakTimelineItem;
    streakRewardClaimed: boolean;
    itemVariants: Variants;
}

export default function StreakDayCard({ day, streakRewardClaimed, itemVariants }: StreakDayCardProps) {
    const isCurrent = day.status === "current";
    const isCompleted = day.status === "completed";
    const isUpcoming = day.status === "upcoming";

    const renderGiftVisual = (giftType: string | null, isCurrent: boolean) => {
        const iconClasses = `relative w-8 h-8 ${isCurrent ? "text-[#d2f000] animate-bounce" : "text-[#c6c9ab]"}`;
        const imgClasses = `relative w-8 h-8 object-contain drop-shadow-md ${isCurrent ? "animate-bounce" : "opacity-70 grayscale"}`;

        switch (giftType) {
            case 'MEGAPHONE': return <img src="/icons/megaphone-icon.png" alt="Megáfono" className={imgClasses} />;
            case 'CUSTOM_POLL': return <img src="/icons/custom-poll-icon.png" alt="Encuesta" className={imgClasses} />;
            case 'CHAT_BUBBLE': return <MessageSquare className={iconClasses} />;
            case 'NAME_COLOR': return <Palette className={iconClasses} />;
            case 'BANNER': return <ImageIcon className={iconClasses} />;
            case 'STICKER_PACK': return <Sticker className={iconClasses} />;
            default: return <Gift className={iconClasses} />;
        }
    };

    const getShortGiftName = (giftType: string | null, originalName: string | undefined) => {
        switch (giftType) {
            case 'MEGAPHONE': return "MEGÁFONO";
            case 'CUSTOM_POLL': return "ENCUESTA";
            case 'CHAT_BUBBLE': return "BURBUJA";
            case 'NAME_COLOR': return "COLOR";
            case 'BANNER': return "BANNER";
            case 'STICKER_PACK': return "STICKER";
            default: return originalName || "ESPECIAL";
        }
    };

    return (
        <motion.div
            variants={itemVariants}
            data-current={isCurrent}
            className={`flex-none w-[110px] snap-center relative flex flex-col items-center justify-between p-3 rounded-2xl border text-center h-36 transition-all ${isCurrent && !streakRewardClaimed
                ? "bg-gradient-to-b from-[#d2f000]/20 to-[#1c1b1b] border-[#d2f000] shadow-[0_0_20px_rgba(210,240,0,0.15)] ring-2 ring-[#d2f000]/30"
                : isCompleted || (isCurrent && streakRewardClaimed)
                    ? "bg-[#131313] border-[#2d2d2d] opacity-60"
                    : "bg-[#252524] border-[#353534]"
                }`}
        >
            <div className="w-full flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold tracking-tight ${isCurrent ? "text-[#d2f000]" : "text-[#909378]"}`}>
                    DÍA {day.dayNumber}
                </span>
                {isUpcoming && <Lock className="w-3 h-3 text-[#666]" />}
            </div>

            <div className="my-1 flex items-center justify-center">
                {isCompleted || (isCurrent && streakRewardClaimed) ? (
                    <CheckCircle2 className="w-8 h-8 text-[#d2f000]" />
                ) : day.hasSpecialGift ? (
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#d2f000]/30 blur-md rounded-full" />
                        {renderGiftVisual(day.giftType, isCurrent)}
                    </div>
                ) : (
                    <div className="w-8 h-8 relative flex items-center justify-center bg-black/20 rounded-full overflow-hidden">
                        <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className={`w-full h-full object-cover rounded-full ${!isCurrent && "grayscale opacity-70"}`} />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center leading-none w-full">
                <span className="text-xs font-black font-mono tracking-tight text-white">+{day.coins}</span>
                <span className="text-[9px] font-bold text-[#c6c9ab] mt-1 truncate max-w-[85px] uppercase">
                    {day.hasSpecialGift ? getShortGiftName(day.giftType, day.giftName) : "COINS"}
                </span>
            </div>
        </motion.div>
    );
}