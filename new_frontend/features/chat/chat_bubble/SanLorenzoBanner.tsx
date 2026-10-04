import React from "react";
import { motion } from "framer-motion";

export default function SanLorenzoBanner({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, originY: 1, originX: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mt-1 inline-block max-w-full"
        >
            <div className="relative overflow-hidden p-3 rounded-2xl rounded-tl-none border border-blue-950 shadow-md">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#1e3a8a_0,#1e3a8a_25px,#991b1b_25px,#991b1b_50px)]" />

                <div className="absolute inset-0 bg-black/20 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] pointer-events-none" />

                <span className="relative z-10 text-sm font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
                    {children}
                </span>
            </div>
        </motion.div>
    );
}