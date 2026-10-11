"use client";

import React from "react";
import { motion } from "framer-motion";

interface SplitBarProps {
    leftPercentage: number;
    leftLabel: string;
    rightLabel: string;
}

/**
 * Barra única que se parte entre los dos lados de un duelo o un debate:
 * el lado que va ganando empuja al otro.
 */
export const SplitBar: React.FC<SplitBarProps> = ({ leftPercentage, leftLabel, rightLabel }) => (
    <div className="flex flex-col gap-1">
        <div className="h-3 w-full bg-[#2a2a2a] rounded-sm overflow-hidden flex">
            <motion.div
                className="h-full bg-[#d2f000]"
                initial={{ width: 0 }}
                animate={{ width: `${leftPercentage}%` }}
                transition={{ duration: 0.7 }}
            />
            <div className="h-full flex-1 bg-[#454932]" />
        </div>
        <div className="flex justify-between text-[11px] font-bold">
            <span className="text-[#d2f000]">
                {leftLabel} {leftPercentage}%
            </span>
            <span className="text-[#c6c9ab]">
                {100 - leftPercentage}% {rightLabel}
            </span>
        </div>
    </div>
);
