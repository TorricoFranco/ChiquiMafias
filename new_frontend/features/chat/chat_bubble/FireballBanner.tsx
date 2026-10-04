import React from "react";
import { motion } from "framer-motion";

export default function FireballBanner({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -15 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="relative mt-1 inline-block max-w-full"
        >
            <motion.div
                animate={{ scale: [1, 1.03, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-2xl rounded-tl-none blur-md"
            />

            {/* Contenedor principal con sombra interna */}
            <div className="relative overflow-hidden p-3 rounded-2xl rounded-tl-none border border-orange-400/50 shadow-[inset_0_2px_10px_rgba(255,100,0,0.3)] bg-gradient-to-r from-red-950 via-red-900 to-orange-950">
                
                <motion.div
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 z-0 opacity-40 bg-[length:200%_200%] bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
                />

                <span className="relative z-10 text-sm font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    {children}
                </span>
            </div>
        </motion.div>
    );
}