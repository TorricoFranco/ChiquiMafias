"use client";

import React, { useState } from "react";
import { TIER_UI_CONFIG } from "@/features/auth/constants/ROLES_SUBSCRIPTION";
import { PollAuthor as PollAuthorData } from "@/features/polls/types";

/** Chips de origen: la casa manda en lima, la tribuna en gris. */
const OFFICIAL_CHIP = "bg-[#d2f000] text-[#191e00]";
const COMMUNITY_CHIP = "bg-[#2a2a2a] text-[#c6c9ab]";
const ORIGIN_CHIP_CLASS = "text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase flex-shrink-0";

interface PollAuthorProps {
    /** Autor de una encuesta de la comunidad. `null` si la cuenta ya no existe. */
    author?: PollAuthorData | null;
    isOfficial: boolean;
    /** Línea de abajo: "hace 2 h", el aviso de socket desconectado, etc. */
    subtitle?: React.ReactNode;
    size?: "md" | "sm";
}

/** Iniciales para quien todavía no eligió equipo. */
const getInitials = (author: PollAuthorData) =>
    (author.name || author.username || "?")
        .trim()
        .slice(0, 2)
        .toUpperCase();

interface AuthorRowProps {
    avatar: React.ReactNode;
    name: string;
    chips: React.ReactNode;
    details: React.ReactNode[];
    nameSize: string;
}

/** Diseño común: avatar a la izquierda, nombre con sus chips y una línea de detalle. */
const AuthorRow = ({ avatar, name, chips, details, nameSize }: AuthorRowProps) => {
    const parts = details.filter(Boolean);

    return (
        <div className="flex items-center gap-3 min-w-0">
            {avatar}
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${nameSize} text-[#e5e2e1] truncate`}>{name}</span>
                    {chips}
                </div>
                {parts.length > 0 && (
                    <span className="text-[11px] text-[#909378] truncate">
                        {parts.map((part, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && " · "}
                                {part}
                            </React.Fragment>
                        ))}
                    </span>
                )}
            </div>
        </div>
    );
};

export const PollAuthor: React.FC<PollAuthorProps> = ({
    author,
    isOfficial,
    subtitle,
    size = "md",
}) => {
    // Escudo que no se pudo cargar: se recuerda para caer a las iniciales sin reintentar.
    const [failedBadge, setFailedBadge] = useState<string | null>(null);

    const avatarClass = `${size === "sm" ? "w-8 h-8" : "w-10 h-10"} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0`;
    const nameSize = size === "sm" ? "text-xs" : "text-sm";

    // El origen manda sobre el autor: una oficial nunca muestra a una persona.
    if (isOfficial) {
        return (
            <AuthorRow
                avatar={
                    <div className={`${avatarClass} bg-[#d2f000]/10 border border-[#d2f000]/30`}>
                        <img
                            src="/logo/chiqui-mafias-logo.png"
                            alt="ChiquiMafias"
                            className="w-full h-full object-contain p-1"
                        />
                    </div>
                }
                name="ChiquiMafias"
                chips={<span className={`${ORIGIN_CHIP_CLASS} ${OFFICIAL_CHIP}`}>Oficial</span>}
                details={[subtitle]}
                nameSize={nameSize}
            />
        );
    }

    // Comunitaria sin autor: la cuenta ya no existe. No puede heredar el chip de la casa.
    if (!author) {
        return (
            <AuthorRow
                avatar={
                    <div className={`${avatarClass} bg-[#2a2a2a] border border-[#353534]`}>
                        <span className="text-[11px] font-bold text-[#909378]">?</span>
                    </div>
                }
                name="Autor no disponible"
                chips={<span className={`${ORIGIN_CHIP_CLASS} ${COMMUNITY_CHIP}`}>Comunidad</span>}
                details={[subtitle]}
                nameSize={nameSize}
            />
        );
    }

    const tier = author.activeSubscriptionTier
        ? TIER_UI_CONFIG[author.activeSubscriptionTier]
        : undefined;
    // El avatar de la app es el escudo del equipo del usuario (igual que el chat).
    const badgeUrl = author.team?.badgeUrl;
    const teamName = author.team?.name;
    const showBadge = Boolean(badgeUrl) && failedBadge !== badgeUrl;

    return (
        <AuthorRow
            avatar={
                <div className={`${avatarClass} bg-[#2a2a2a] border border-[#353534]`}>
                    {showBadge ? (
                        <img
                            src={badgeUrl}
                            alt={teamName ? `Escudo de ${teamName}` : ""}
                            onError={() => setFailedBadge(badgeUrl ?? null)}
                            className="w-full h-full object-contain p-1"
                        />
                    ) : (
                        <span className="text-[11px] font-bold text-[#c6c9ab]">
                            {getInitials(author)}
                        </span>
                    )}
                </div>
            }
            name={author.name}
            chips={
                <>
                    <span className={`${ORIGIN_CHIP_CLASS} ${COMMUNITY_CHIP}`}>Comunidad</span>
                    {tier?.badge && (
                        <span
                            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-wide flex-shrink-0"
                            style={{
                                backgroundColor: tier.badgeColor,
                                color: tier.textColor,
                            }}
                        >
                            {tier.badge}
                        </span>
                    )}
                </>
            }
            details={[author.username && `@${author.username}`, subtitle]}
            nameSize={nameSize}
        />
    );
};
