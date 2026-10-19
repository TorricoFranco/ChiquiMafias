import React from "react";

export default function MythicBubble({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`
                @keyframes mythic-border {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-mythic-border {
                    background-size: 300% 300%;
                    animation: mythic-border 3s ease infinite;
                }
                @keyframes mythic-text-glow {
                    0%, 100% { text-shadow: 0 0 8px rgba(251,191,36,0.5); }
                    50% { text-shadow: 0 0 16px rgba(251,191,36,1), 0 0 4px rgba(255,255,255,0.8); }
                }
                .animate-mythic-text {
                    animation: mythic-text-glow 2s ease-in-out infinite;
                }
            `}</style>

            <div className="relative mt-0.5 inline-block max-w-full p-[2px] rounded-2xl rounded-tl-none animate-mythic-border bg-gradient-to-r from-amber-400 via-red-600 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]">

                <div className="relative bg-[#0d0400] overflow-hidden p-3 rounded-[14px] rounded-tl-none text-sm font-bold text-amber-50">

                    <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-red-500/10 to-transparent blur-xl pointer-events-none" />

                    <span className="relative z-10 animate-mythic-text tracking-wide">
                        {children}
                    </span>
                </div>
            </div>
        </>
    );
}