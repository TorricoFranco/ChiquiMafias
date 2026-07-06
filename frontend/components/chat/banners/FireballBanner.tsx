// src/components/chat/banners/FireballBanner.tsx
"use client";

import React from "react";

export default function FireballBanner({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mt-0.5 break-words p-3 rounded-2xl rounded-tl-none text-sm font-semibold max-w-full overflow-hidden
                    bg-gradient-to-r from-orange-600 via-red-600 to-amber-500 text-white shadow-[0_4px_20px_rgba(239,68,68,0.4)]">

            {/* 🔥 Elementos HTML adicionales para el efecto de la Bola de Fuego */}
            {/* Capa de destello animado de fondo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-400/40 via-transparent to-transparent animate-pulse pointer-events-none" />

            {/* Mini partículas de fuego flotando (animadas por CSS puro) */}
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-400 rounded-full blur-xl opacity-40 animate-bounce" />
            <div className="absolute right-4 top-1 w-2 h-2 bg-orange-400 rounded-full animate-ping pointer-events-none" />

            {/* El contenido real del mensaje (el texto que escribió el usuario) */}
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {children}
            </span>
        </div>
    );
}