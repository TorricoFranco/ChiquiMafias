
// src/components/chat/banners/GoldenVipBanner.tsx
"use client";

import React from "react";

export default function GoldenVipBanner({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mt-0.5 break-words p-3 rounded-2xl rounded-tl-none text-sm font-bold max-w-full overflow-hidden
                        bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 text-amber-950 
                        border border-yellow-200/40 shadow-[0_4px_25px_rgba(217,119,6,0.45)]">

            {/* ✨ Capa de reflejo metálico sutil de fondo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent animate-pulse pointer-events-none" />

            {/* Aura dorada brillante que sobresale por los bordes */}
            <div className="absolute -left-4 -bottom-4 w-14 h-14 bg-yellow-200 rounded-full blur-xl opacity-60 animate-pulse pointer-events-none" />

            {/* ✨ Destellos de diamantes (Sparkles de jeque de la tribuna) */}
            {/* Destello 1: Arriba a la derecha */}
            <div className="absolute right-3 top-1.5 w-1.5 h-1.5 bg-white rotate-45 animate-ping pointer-events-none rounded-sm" />

            {/* Destello 2: Abajo al centro */}
            <div className="absolute left-1/3 bottom-1 w-1 h-1 bg-white rotate-45 animate-pulse pointer-events-none opacity-80" />

            {/* Destello 3: Desfasado en tiempo para que no titilen todos juntos */}
            <div className="absolute right-12 bottom-2 w-1 h-1 bg-yellow-100 rotate-45 animate-ping pointer-events-none [animation-delay:1.2s]" />

            {/* Contenido real del mensaje */}
            <span className="relative z-10 tracking-wide drop-shadow-[0_1px_0px_rgba(255,255,255,0.4)]">
                {children}
            </span>
        </div>
    );
}