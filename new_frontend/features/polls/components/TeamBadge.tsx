"use client";

import React, { useState } from "react";
import { Shield } from "lucide-react";

interface TeamBadgeProps {
    /** api_team_id, igual que en los mercados de apuestas. */
    teamId?: string;
    teamName?: string;
    size?: "sm" | "md" | "lg";
}

const SIZES = {
    sm: "w-6 h-6",
    md: "w-9 h-9",
    lg: "w-14 h-14 md:w-16 md:h-16",
} as const;

/**
 * Escudo de una opción de encuesta. Usa el asset local `/escudos-api/<id>.webp`,
 * la misma convención que `MarketCard` en bets, con el ícono de escudo como
 * fallback si la imagen no existe.
 */
export const TeamBadge: React.FC<TeamBadgeProps> = ({ teamId, teamName, size = "md" }) => {
    const [failed, setFailed] = useState(false);
    const dimension = SIZES[size];

    if (!teamId || failed) {
        return (
            <span className={`${dimension} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
                <Shield className="w-full h-full text-[#454932]" />
            </span>
        );
    }

    return (
        <img
            src={`/escudos-api/${teamId}.webp`}
            alt={teamName ? `Escudo de ${teamName}` : ""}
            className={`${dimension} object-contain flex-shrink-0 drop-shadow-md`}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
};
