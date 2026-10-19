import React from "react";

export default function ToxicBanner({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mt-0.5 inline-block max-w-full">
            <div className="absolute inset-0 bg-green-500/30 blur-md rounded-2xl rounded-tl-none animate-pulse"></div>

            <div className="relative p-3 rounded-2xl rounded-tl-none text-sm text-green-100 font-medium border border-green-500 bg-[#0a150a] shadow-[inset_0_0_15px_rgba(34,197,94,0.15)]">
                <div className="absolute right-0 top-0 bottom-0 w-2 rounded-r-2xl bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(34,197,94,0.3)_5px,rgba(34,197,94,0.3)_10px)]" />

                <span className="relative z-10 pr-3 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                    {children}
                </span>
            </div>
        </div>
    );
}