import React from "react";
import { motion } from "framer-motion";

export default function RiverPlateBanner({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, originY: 1, originX: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mt-1 inline-block max-w-full"
        >
            <div className="relative overflow-hidden p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-md">
                <div className="absolute inset-0 bg-gray-50" />

                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_38%,#dc2626_38%,#dc2626_62%,transparent_62%)]" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

                <span className="relative z-10 text-sm font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] [text-shadow:_0_1px_4px_black]">
                    {children}
                </span>
            </div>
        </motion.div>
    );
}