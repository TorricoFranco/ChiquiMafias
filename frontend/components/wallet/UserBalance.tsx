// src/components/wallet/UserBalance.tsx
"use client";

import { Coins } from "lucide-react";
import { useWallet } from "@/hook/socket/useWallet";
import { useUserStore } from "@/store/useUserStore";

export default function UserBalance() {
    const username = useUserStore((state) => state.username);
    const { balance, loading } = useWallet();

    if (!username) return null;

    return (
        <div className="flex items-center space-x-2 bg-[#2b2b2b]/60 border border-[#3b3b3b] px-3 py-1.5 rounded-full select-none hover:bg-[#3b3b3b]/70 transition duration-200">
            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            {loading && balance === 0 ? (
                <div className="w-10 h-4 bg-gray-700 animate-pulse rounded" />
            ) : (
                <span className="text-sm font-bold text-amber-400 font-mono tracking-tight">
                    {balance.toLocaleString("es-AR")}
                    <span className="text-xs text-gray-400 ml-1 font-sans font-medium">puntos</span>
                </span>
            )}
        </div>
    );
}