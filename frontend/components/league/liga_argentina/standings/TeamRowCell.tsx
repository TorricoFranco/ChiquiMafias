"use client";
import React from "react";
import { LiveMatch } from "./liveMatchUtils";

interface TeamRowCellProps {
    teamId: string | number;
    teamName: string;
    teamLogo?: string;
    live?: LiveMatch | null;
    className?: string;
    compact?: boolean;
}

/**
 * Componente reutilizable para mostrar un equipo en las tablas
 * Maneja el logo, nombre y badge de LIVE si aplica
 */
export const TeamRowCell: React.FC<TeamRowCellProps> = ({
    teamId,
    teamName,
    teamLogo,
    live,
    className = "",
    compact = false,
}) => {
    const logoSize = compact ? "w-5 h-5" : "w-6 h-6";
    const textSize = compact ? "text-[11px]" : "text-sm";
    const scoreSize = compact ? "text-[9px]" : "text-[10px]";
    const badgeSize = compact ? "text-[7px]" : "text-[8px]";

    const getColorClass = (result: 'win' | 'loss' | 'draw') => {
        switch (result) {
            case 'win':
                return 'text-emerald-400';
            case 'loss':
                return 'text-red-400';
            case 'draw':
                return 'text-amber-400';
        }
    };

    return (
        <div className={`flex items-center space-x-${compact ? "2" : "3"} ${className}`}>
            <img
                src={teamLogo || `https://media.api-sports.io/football/teams/${teamId}.png`}
                alt={teamName}
                className={`${logoSize} object-contain flex-shrink-0`}
                onError={(e) =>
                (e.currentTarget.src =
                    "https://media.api-sports.io/football/teams/unknown.png")
                }
            />
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className={`font-bold text-gray-${compact ? "200" : "100"} whitespace-nowrap uppercase tracking-tight ${textSize}`}>
                        {teamName}
                    </span>
                    {/* Badge LIVE */}
                    {live && (
                        <span
                            className={`animate-[pulse_2s_ease-in-out_infinite] flex items-center gap-1 bg-red-600 text-white px-1 rounded-sm font-black ${badgeSize}`}
                        >
                            {compact && <span className="w-0.5 h-0.5 bg-white rounded-full" />}
                            LIVE
                        </span>
                    )}
                </div>
                {/* Score en vivo */}
                {live && (
                    <span className={`font-mono font-bold ${getColorClass(live.result)} ${scoreSize}`}>
                        {live.score}{" "}
                        <span className="text-[8px] opacity-60 ml-1">{live.status}</span>
                    </span>
                )}
            </div>
        </div>
    );
};
