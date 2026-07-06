"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Coins, Gift, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { streakApi, StreakTimelineItem, StreakTimelineResponse } from "@/services/streakApi";

interface StreakModalProps {
    onClose: () => void;
}

export default function StreakModal({ onClose }: { onClose: StreakModalProps["onClose"] }) {
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [data, setData] = useState<StreakTimelineResponse | null>(null);
    const [rewardVisual, setRewardVisual] = useState<{ coins: number; gift: string | null } | null>(null);

    // Zustand Store
    const balance = useUserStore((state) => state.balance);
    const updateAfterClaim = useUserStore((state) => state.updateAfterClaim);

    // Cargar el camino de recompensas al montar el modal
    useEffect(() => {
        async function fetchTimeline() {
            try {
                setLoading(true);
                const res = await streakApi.getTimeline();
                setData(res);
            } catch (err) {
                console.error("Error al cargar el timeline de racha:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTimeline();
    }, []);

    // Procesar el reclamo del premio del día
    const handleClaim = async () => {
        if (claiming || !data || data.streakRewardClaimed) return;

        try {
            setClaiming(true);
            const res = await streakApi.claimReward();

            // Actualizamos Zustand sumando las monedas ganadas al saldo actual
            const newBalance = balance + res.coinsAwarded;
            updateAfterClaim(newBalance, res.currentStreak);

            // Guardamos visualmente el premio obtenido para la animación de éxito
            setRewardVisual({
                coins: res.coinsAwarded,
                gift: res.cosmeticAwarded,
            });

            // Actualizamos el estado local para reflejar que ya cobró sin re-fetch
            setData((prev) =>
                prev
                    ? {
                        ...prev,
                        streakRewardClaimed: true,
                        timeline: prev.timeline.map((item) =>
                            item.status === "current" ? { ...item, status: "completed" } : item
                        ),
                    }
                    : null
            );
        } catch (err) {
            console.error(err);
            alert("No se pudo reclamar el premio. Intentá de nuevo.");
        } finally {
            setClaiming(false);
        }
    };

    // Variantes para animaciones en cascada (Stagger) de los casilleros
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop Transparente Oscuro */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Contenedor del Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="relative w-full max-w-3xl bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden z-10 p-6 md:p-8 text-white"
                >
                    {/* Botón Cerrar */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2b2b2b] transition"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Animación de Éxito al cobrar */}
                    {rewardVisual ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5 }}
                                className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500 mb-4"
                            >
                                <Coins className="w-10 h-10 text-amber-500" />
                            </motion.div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wide">¡Premio Adquirido!</h3>
                            <p className="text-gray-400 mt-2 text-sm max-w-sm">
                                Sumaste <span className="text-amber-400 font-bold">+{rewardVisual.coins} monedas</span> a tu billetera de tribuna.
                            </p>
                            {rewardVisual.gift && (
                                <div className="mt-4 px-4 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 text-xs font-semibold flex items-center space-x-2">
                                    <Gift className="w-4 h-4" />
                                    <span>Desbloqueaste: {rewardVisual.gift}</span>
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="mt-8 bg-white text-black font-bold px-6 py-2 rounded-full text-sm hover:bg-gray-200 transition"
                            >
                                Listo, gracias
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            {/* Encabezado Principal */}
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-wide uppercase">Recompensas Diarias</h2>
                                    <p className="text-xs text-gray-400">
                                        {data?.streakRewardClaimed
                                            ? `Llevás una racha de ${data.currentStreak} ${data.currentStreak === 1 ? 'día' : 'días'}. ¡Volvé mañana!`
                                            : "No pierdas el hilo de tu racha para multiplicar tus monedas de canje."}
                                    </p>
                                </div>
                            </div>

                            {/* Contenido principal: Loader o Timeline */}
                            {loading ? (
                                /* Skeleton Loader de los 7 Casilleros */
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 my-6">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={i} className="h-32 bg-[#252525] rounded-xl animate-pulse border border-[#333]" />
                                    ))}
                                </div>
                            ) : (
                                /* Grilla de los 7 Días del Timeline */
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 my-6"
                                >
                                    {data?.timeline.map((day: StreakTimelineItem) => {
                                        const isCurrent = day.status === "current";
                                        const isCompleted = day.status === "completed";
                                        const isUpcoming = day.status === "upcoming";

                                        return (
                                            <motion.div
                                                key={day.dayNumber}
                                                variants={itemVariants}
                                                className={`relative flex flex-col items-center justify-between p-3 rounded-xl border text-center h-32 transition-all ${isCurrent && !data.streakRewardClaimed
                                                        ? "bg-gradient-to-b from-amber-500/20 to-[#221c13] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-2 ring-amber-500/20"
                                                        : isCompleted || (isCurrent && data.streakRewardClaimed)
                                                            ? "bg-[#161616] border-[#262626] opacity-60"
                                                            : "bg-[#222222] border-[#2e2e2e]"
                                                    }`}
                                            >
                                                {/* Indicador de número de Día */}
                                                <span className={`text-xs font-mono tracking-tighter ${isCurrent ? "text-amber-400 font-bold" : "text-gray-400"}`}>
                                                    DÍA {day.dayNumber}
                                                </span>

                                                {/* Iconografía central dinámica */}
                                                <div className="my-2">
                                                    {isCompleted || (isCurrent && data.streakRewardClaimed) ? (
                                                        <CheckCircle2 className="w-7 h-7 text-lime-400" />
                                                    ) : day.hasSpecialGift ? (
                                                        <Gift className={`w-7 h-7 ${isCurrent ? "text-sky-400 animate-bounce" : "text-gray-400"}`} />
                                                    ) : (
                                                        <Coins className={`w-7 h-7 ${isCurrent ? "text-amber-400" : "text-gray-500"}`} />
                                                    )}
                                                </div>

                                                {/* Premio en Monedas / Nombre Objeto */}
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-sm font-black font-mono tracking-tight text-white">
                                                        {day.coins}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5 font-medium truncate max-w-[80px]">
                                                        {day.hasSpecialGift ? day.giftName : "monedas"}
                                                    </span>
                                                </div>

                                                {/* Candado para días futuros */}
                                                {isUpcoming && (
                                                    <div className="absolute top-1.5 right-1.5">
                                                        <Lock className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}

                            {/* Botón de Reclamar / Acción al pie */}
                            <div className="mt-8 pt-4 border-t border-[#2d2d2d] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-xs text-gray-400 max-w-md">
                                    * Las recompensas se calculan exponencialmente según tu racha continua. Usuarios con suscripciones Premium reciben bonificaciones multiplicadoras automáticas.
                                </div>

                                <button
                                    disabled={loading || claiming || !data || data.streakRewardClaimed}
                                    onClick={handleClaim}
                                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition duration-300 flex items-center justify-center space-x-2 ${data?.streakRewardClaimed
                                            ? "bg-[#252525] text-gray-500 cursor-not-allowed border border-[#333]"
                                            : "bg-amber-500 text-black hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/10"
                                        }`}
                                >
                                    {claiming ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Procesando...</span>
                                        </>
                                    ) : data?.streakRewardClaimed ? (
                                        <span>Premio Reclamado</span>
                                    ) : (
                                        <span>Reclamar Premio de Hoy</span>
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