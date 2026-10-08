import React from "react";

export default function EpicBubble({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`
                @keyframes epic-pulse {
                    0%, 100% { 
                        box-shadow: 0 0 10px rgba(168,85,247,0.4), inset 0 0 10px rgba(168,85,247,0.2); 
                        border-color: rgba(168,85,247,0.4); 
                    }
                    50% { 
                        box-shadow: 0 0 20px rgba(217,70,239,0.8), inset 0 0 15px rgba(217,70,239,0.3); 
                        border-color: rgba(217,70,239,0.8); 
                    }
                }
                .animate-epic {
                    animation: epic-pulse 2.5s ease-in-out infinite;
                }
            `}</style>

            <div className="relative mt-0.5 inline-block max-w-full">
                <div className="absolute inset-0 bg-purple-600/20 blur-md rounded-2xl rounded-tl-none" />

                <div className="relative p-3 rounded-2xl rounded-tl-none text-sm text-purple-50 font-medium bg-[#130b1f] border-2 border-purple-500/50 animate-epic overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-1/2 bg-gradient-to-b from-purple-400/10 to-transparent pointer-events-none" />

                    <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(168,85,247,0.6)] tracking-wide">
                        {children}
                    </span>
                </div>
            </div>
        </>
    );
}