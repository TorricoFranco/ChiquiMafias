import React from "react";

export default function HoloCardBanner({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`
                @keyframes holo-shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-holo {
                    background-size: 300% 300%;
                    animation: holo-shimmer 4s ease infinite;
                }
            `}</style>
            
            <div className="relative mt-0.5 inline-block max-w-full p-[2px] rounded-2xl rounded-tl-none animate-holo bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                <div className="bg-[#1a1a1a]/90 backdrop-blur-sm p-3 rounded-[14px] rounded-tl-none text-sm text-gray-100 font-medium">
                    {children}
                </div>
            </div>
        </>
    );
}