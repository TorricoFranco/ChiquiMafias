"use client";

import React, { useState } from "react";
import { Crown, ThumbsDown, ThumbsUp } from "lucide-react";
import { TIER_UI_CONFIG } from "@/features/auth/constants/ROLES_SUBSCRIPTION";
import { NAME_COLORS } from "@/features/chat/config/ColorsRegistry";
import type { Comment, CommentTier, ReactionType } from "../types";
import { formatTimeAgo } from "../utils/timeUtils";

// Tarjeta según el plan del autor: el destaque crece de POPULAR a PALCO VIP.
const CARD_CLASS: Record<CommentTier | "NONE", string> = {
    NONE: "bg-[#1c1b1b]/50 border border-transparent hover:bg-[#1c1b1b]",
    TIER_1: "bg-[#1c1b1b]/70 border border-transparent border-l-2 border-l-[#c6c9ab]",
    TIER_2: "bg-[#1c1b1b]/70 border border-[#d2f000]/25",
    TIER_3: "bg-gradient-to-r from-[#d2f000]/[0.14] via-[#d2f000]/[0.05] to-[#1c1b1b]/60 border border-[#d2f000]/70 border-l-[3px] border-l-[#d2f000] neon-glow",
};

// Color del @username si no tiene uno equipado de la tienda.
const DEFAULT_NAME_CLASS: Record<CommentTier | "NONE", string> = {
    NONE: "text-[#e5e2e1]",
    TIER_1: "text-[#e5e2e1]",
    TIER_2: "text-[#e5e2e1]",
    TIER_3: "text-[#d2f000]",
};

/** Escudo del equipo del autor (su "foto", como en el chat), o la inicial si no tiene. */
const CommentAvatar = ({ badgeUrl, username }: { badgeUrl: string | null; username: string | null }) => {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const showBadge = Boolean(badgeUrl) && failedUrl !== badgeUrl;

    return (
        <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center overflow-hidden">
            {showBadge ? (
                <img
                    src={badgeUrl ?? undefined}
                    alt={`Escudo de @${username ?? "anónimo"}`}
                    onError={() => setFailedUrl(badgeUrl)}
                    className="w-full h-full object-contain p-0.5"
                    loading="lazy"
                />
            ) : (
                <span aria-hidden="true" className="text-[10px] font-bold text-[#c6c9ab] uppercase">
                    {(username ?? "?").charAt(0)}
                </span>
            )}
        </div>
    );
};

export const PollCommentItem = ({
    comment: c,
    onReact,
}: {
    comment: Comment;
    onReact: (commentId: string, type: ReactionType) => void;
}) => {
    const tierKey = c.user.tier ?? "NONE";
    const tier = c.user.tier ? TIER_UI_CONFIG[c.user.tier] : undefined;
    const isVip = c.user.tier === "TIER_3";
    const username = c.user.username || "anónimo";
    const nameClass =
        (c.user.nameColor && NAME_COLORS[c.user.nameColor]?.textClass) || `font-bold ${DEFAULT_NAME_CLASS[tierKey]}`;

    return (
        <article
            aria-label={`Comentario de @${username}${tier?.badge ? ` (${tier.badge})` : ""}`}
            className={`p-3 rounded-lg text-xs flex flex-col gap-1.5 transition-all ${CARD_CLASS[tierKey]}`}
        >
            <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <CommentAvatar badgeUrl={c.user.badgeUrl} username={c.user.username} />
                    <span className={`truncate ${nameClass}`}>@{username}</span>
                    {tier?.badge && (
                        <span
                            className="flex items-center gap-1 flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm"
                            style={{ backgroundColor: tier.badgeColor, color: tier.textColor }}
                        >
                            {isVip && <Crown aria-hidden="true" className="w-2.5 h-2.5 text-[#191e00]" />}
                            {tier.badge}
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-[#8e9285] font-medium flex-shrink-0">{formatTimeAgo(c.createdAt)}</span>
            </div>

            <p className={`leading-relaxed mt-0.5 ${isVip ? "text-[#e5e2e1]" : "text-[#c6c9ab]"}`}>{c.text}</p>

            <div className="flex justify-end gap-4 mt-1">
                <button
                    type="button"
                    onClick={() => onReact(c.id, "LIKE")}
                    aria-label={`Me gusta el comentario de @${username} (${c.likesCount || 0})`}
                    aria-pressed={c.userReaction === "LIKE"}
                    className={`flex items-center gap-1.5 transition-colors ${c.userReaction === "LIKE" ? "text-[#d2f000]" : "text-[#8e9285] hover:text-[#d2f000]"}`}
                >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{c.likesCount || 0}</span>
                </button>
                <button
                    type="button"
                    onClick={() => onReact(c.id, "DISLIKE")}
                    aria-label={`No me gusta el comentario de @${username} (${c.dislikesCount || 0})`}
                    aria-pressed={c.userReaction === "DISLIKE"}
                    className={`flex items-center gap-1.5 transition-colors ${c.userReaction === "DISLIKE" ? "text-[#ffb4ab]" : "text-[#8e9285] hover:text-[#ffb4ab]"}`}
                >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{c.dislikesCount || 0}</span>
                </button>
            </div>
        </article>
    );
};
