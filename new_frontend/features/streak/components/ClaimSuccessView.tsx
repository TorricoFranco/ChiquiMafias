import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ClaimSuccessViewProps {
    coins: number;
    gift: string | null;
    onClose: () => void;
}

export default function ClaimSuccessView({ coins, gift, onClose }: ClaimSuccessViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center"
        >
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#d2f000]/20 blur-2xl rounded-full" />
                <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.6 }}
                    className="relative w-24 h-24 rounded-full bg-[#131313] border-2 border-[#d2f000] flex items-center justify-center shadow-[0_0_25px_rgba(210,240,0,0.3)] overflow-hidden"
                >
                    <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(210,240,0,0.5)] rounded-full" />
                </motion.div>
            </div>

            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#d2f000] bg-[#d2f000]/10 px-3 py-1 rounded-full border border-[#d2f000]/20 mb-2">
                ¡Recompensa Reclamada!
            </span>
            <h3 className="text-3xl font-black text-white uppercase tracking-tight">
                +{coins} Chiqui Coins
            </h3>
            <p className="text-[#c6c9ab] mt-2 text-xs max-w-sm">
                Se acreditaron automáticamente en tu billetera. ¡Seguí entrando todos los días para no romper la racha!
            </p>

            {gift && (
                <div className="mt-5 px-4 py-2.5 bg-[#d2f000]/10 border border-[#d2f000]/30 rounded-2xl text-[#d2f000] text-xs font-bold flex items-center space-x-2 shadow-lg">
                    <Sparkles className="w-4 h-4 text-[#d2f000]" />
                    <span>¡Desbloqueaste: {gift}!</span>
                </div>
            )}

            <button
                onClick={onClose}
                className="mt-8 bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-md"
            >
                Continuar
            </button>
        </motion.div>
    );
}