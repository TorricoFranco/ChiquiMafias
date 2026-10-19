import React from "react";

export default function BocaJuniorBanner({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-0.5 inline-block max-w-full">
            <div className="relative p-3 rounded-2xl rounded-tl-none text-sm text-white border border-[#F3A900]/60 shadow-[0_4px_10px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#00315a] via-[#00315a] to-[#00315a]" />
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-[30%] bg-[#F3A900]" />
                <span className="relative z-10 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {children}
                </span>
            </div>
        </div>
    );
}