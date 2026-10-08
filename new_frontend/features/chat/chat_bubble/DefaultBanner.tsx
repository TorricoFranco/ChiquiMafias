import React from "react";

export default function DefaultBanner({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-0.5 break-words p-3 rounded-2xl rounded-tl-none text-sm text-gray-300 bg-[#2b2b2b] inline-block max-w-full shadow-md">
            {children}
        </div>
    );
}

