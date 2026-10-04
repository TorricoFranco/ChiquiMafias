import React from "react";
import { motion } from "framer-motion";

export default function ArgentinaBanner({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, originY: 1, originX: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mt-1 inline-block max-w-full group"
        >
            <div className="relative p-3 rounded-2xl rounded-tl-none text-sm font-bold border border-yellow-500/80 shadow-[0_0_15px_rgba(250,204,21,0.2)] overflow-hidden bg-gradient-to-br from-gray-900 to-black">
                
                <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
                    <div className="w-full h-1/3 bg-[#43A1D5]" />
                    <div className="w-full h-1/3 bg-white" />
                    <div className="w-full h-1/3 bg-[#43A1D5]" />
                </div>

                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none skew-x-12" />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className="text-xl tracking-[0.2em] text-yellow-500 opacity-40 drop-shadow-md">
                        ⭐⭐⭐
                    </span>
                </div>

                <div className="relative z-10">
                    <span className="bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {children}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}