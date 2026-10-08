"use client";

import { useState } from "react";
import { ShieldOff, MoreVertical, Trash2, Megaphone, Flag } from "lucide-react";
import clsx from "clsx";
import { getChatBubbleComponent } from "../config/chatBubbleRegistry";
import { NAME_COLORS } from "../config/ColorsRegistry";
import { useCreateReport } from "@/features/supports/hooks/useSupports";
import { moderationApi } from "@/features/moderation/api/moderationApi";
import { SystemRole, SubscriptionTier, TIER_UI_CONFIG, ROLE_UI_CONFIG } from "@/features/auth/constants/ROLES_SUBSCRIPTION";

interface ChatMessageProps {
    messageId: string;
    userId?: string;
    avatar?: string | null;
    user: string;
    time?: string;
    teamName?: string | null;
    message: string;
    currentRole?: string | null;
    senderRole?: SystemRole | string | null;
    tier?: SubscriptionTier | string | null;
    variant?: "global" | "match";
    onDelete: (messageId: string) => void;
    nameColor?: string;
    stickerId?: string | null;
    isMegaphone?: boolean;
    isOwnMessage?: boolean;
    chatBubbleId?: string | null;
    useChatBubble?: boolean;
    onAvatarClick?: () => void;
}

export default function ChatMessage({
    messageId, userId, avatar, user, time, teamName, message, currentRole, senderRole, tier, variant = "global", onDelete,
    nameColor, stickerId, isMegaphone, isOwnMessage, chatBubbleId, useChatBubble, onAvatarClick,
}: ChatMessageProps) {


    const activeColor = NAME_COLORS[nameColor || "default"] || NAME_COLORS.default;
    const BannerContainer = getChatBubbleComponent(chatBubbleId);
    const isMod = currentRole === 'ADMIN' || currentRole === 'MODERATOR';
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const [reportReason, setReportReason] = useState<'TOXIC_CHAT' | 'FRAUD' | 'BAD_BEHAVIOR' | 'OTHER'>('TOXIC_CHAT');
    const [reportDetails, setReportDetails] = useState('');

    const createReport = useCreateReport();

    const handleTimeout = async (minutes: number) => {
        if (!userId) return alert("Error: No se encontró el ID del usuario");

        try {
            await moderationApi.timeout(userId, minutes);
            alert(`¡Arafue! ${user} muteado por ${minutes} minutos.`);
        } catch (error) {
            console.error("Error aplicando timeout:", error);
            alert("Hubo un error al intentar mutear al usuario.");
        } finally {
            setShowMenu(false);
        }
    };

    const handleUnmute = async () => {
        if (!userId) return;
        try {
            await moderationApi.unmute(userId);
            alert(`Se le quitó el mute a ${user}.`);
        } catch (error) {
            console.error("Error quitando timeout:", error);
            alert("No se pudo quitar el muteo.");
        } finally {
            setShowMenu(false);
        }
    };

    const handleMessageDeletion = () => {
        if (confirm("¿Estás seguro de que querés borrar este mensaje?")) {
            onDelete(messageId);
        }
        setShowMenu(false);
    };

    const handleReportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        createReport.mutate({
            reportedId: userId,
            reason: reportReason,
            details: `Reportado desde el chat. Mensaje original: "${message}". Detalles del usuario: ${reportDetails}`
        }, {
            onSuccess: () => {
                alert("Reporte enviado correctamente. Los moderadores lo revisarán pronto.");
                setShowReportModal(false);
                setReportDetails('');
            },
            onError: () => {
                alert("Hubo un error al enviar el reporte.");
            }
        });
    };


    return (
        <>
            <div className={clsx("flex w-full mb-1.5 rounded-2xl px-1.5 py-1 transition-colors hover:bg-white/[0.03]", isOwnMessage ? "justify-end" : "justify-start")}>
                <div className={clsx(
                    "group relative px-3 py-2 rounded-2xl transition-all max-w-[85%]",
                    isMegaphone && "bg-gradient-to-r from-amber-500/15 via-amber-500/[0.05] to-transparent border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.08)]",
                    variant === "global"
                        ? clsx("flex items-start gap-3", isOwnMessage ? "flex-row-reverse" : "flex-row")
                        : clsx("flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2", isOwnMessage ? "items-end" : "items-start")
                )}>

                    {/* AVATAR */}
                    {variant === "global" && (
                        <button
                            onClick={onAvatarClick}
                            className="w-10 h-10 rounded-full bg-gray-800/80 flex items-center justify-center text-base border-2 border-sky-400/50 overflow-hidden flex-shrink-0 hover:border-[#d2f000]/70 hover:scale-105 transition-all cursor-pointer shadow-[0_0_10px_rgba(56,189,248,0.15)]"
                        >
                            {avatar ? (
                                <img src={avatar} alt="Escudo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-xs text-gray-400 font-bold">?</span>
                            )}
                        </button>
                    )}

                    {/* CONTENIDO DEL MENSAJE */}
                    <div className={clsx(
                        "flex-1 min-w-0 w-full flex flex-col",
                        isOwnMessage ? "text-right items-end" : "text-left items-start"
                    )}>

                        {/* CABECERA (Nombre, Badges, Menú) */}
                        <div className={clsx(
                            "flex flex-wrap items-center gap-1.5 mb-1",
                            isOwnMessage ? "flex-row-reverse justify-start" : "flex-row justify-start"
                        )}>

                            {isMegaphone && <Megaphone className="w-3 h-3 text-amber-400 animate-bounce" />}

                            {/* NOMBRE DE USUARIO */}
                            <span className={clsx("text-sm font-bold", activeColor.textClass)}>
                                {user}
                            </span>

                            {/* CONTENEDOR DE BADGES (Roles y Tiers) */}
                            <div className="flex items-center gap-1">
                                {senderRole && ROLE_UI_CONFIG[senderRole as string] && (
                                    <span className={clsx(
                                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-wide",
                                        ROLE_UI_CONFIG[senderRole as string].className
                                    )}>
                                        {ROLE_UI_CONFIG[senderRole as string].badge}
                                    </span>
                                )}

                                {/* Badge de Suscripción (Popular, Plateísta, Palco) */}
                                {tier && TIER_UI_CONFIG[tier as string] && (
                                    <span
                                        className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-wide"
                                        style={{
                                            backgroundColor: TIER_UI_CONFIG[tier as string].badgeColor,
                                            color: TIER_UI_CONFIG[tier as string].textColor
                                        }}
                                    >
                                        {TIER_UI_CONFIG[tier as string].badge}
                                    </span>
                                )}
                            </div>

                            {variant === "global" && time && <span className="text-[10px] text-gray-600 ml-1 font-medium">{time}</span>}
                            {variant === "match" && teamName && <span className="text-[8px] text-gray-500 font-bold ml-1 uppercase tracking-wide">{teamName}</span>}

                            {/* MENU */}
                            {userId && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                                    >
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>

                                    {showMenu && (
                                        <div className={clsx(
                                            "absolute mt-2 bg-[#252525] border border-gray-700 rounded-lg shadow-xl z-50 w-40 p-1 text-sm text-left",
                                            isOwnMessage ? "right-0" : "left-0"
                                        )}>

                                            {isMod && !isOwnMessage && (
                                                <>
                                                    <button onClick={() => handleTimeout(15)} className="w-full text-left px-2 py-1.5 hover:bg-gray-700 rounded text-red-400">
                                                        Mutear (15m)
                                                    </button>
                                                    <button onClick={() => handleUnmute()} className="w-full text-left px-2 py-1.5 hover:bg-gray-700 rounded text-green-400">
                                                        Quitar Mute
                                                    </button>
                                                    <div className="h-px bg-gray-700 my-1"></div>
                                                </>
                                            )}

                                            {(isMod || isOwnMessage) && (
                                                <button onClick={handleMessageDeletion} className="w-full flex items-center gap-2 text-left px-2 py-1.5 hover:bg-gray-700 rounded text-red-500">
                                                    <Trash2 className="w-3 h-3" /> Borrar
                                                </button>
                                            )}

                                            {!isOwnMessage && (
                                                <button
                                                    onClick={() => {
                                                        setShowReportModal(true);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 hover:bg-gray-700 rounded text-yellow-500"
                                                >
                                                    <Flag className="w-3 h-3" /> Reportar
                                                </button>
                                            )}

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CONTENIDO DEL MENSAJE O STICKER */}
                        {stickerId ? (
                            <div className="mt-1 w-40 h-40 animate-in zoom-in-50 duration-200">
                                <img src={`/cosmetics/stickers/${stickerId}.webp`} alt="Sticker" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <BannerContainer>
                                <span className={clsx(
                                    "text-sm break-words block",
                                    activeColor.textClass,
                                    isMegaphone && "text-amber-200 font-medium !text-shadow-none"
                                )}>
                                    {message}
                                </span>
                            </BannerContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE REPORTE */}
            {
                showReportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-gray-100 mb-1">Reportar a {user}</h3>
                            <p className="text-xs text-gray-400 mb-4">El equipo de moderación revisará este mensaje.</p>

                            <form onSubmit={handleReportSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Motivo</label>
                                    <select
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value as any)}
                                        className="w-full bg-[#2a2a2a] border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                                    >
                                        <option value="TOXIC_CHAT">Chat Tóxico / Insultos</option>
                                        <option value="BAD_BEHAVIOR">Mal Comportamiento / Troleo</option>
                                        <option value="FRAUD">Fraude / Spam</option>
                                        <option value="OTHER">Otro motivo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Detalles (Opcional)</label>
                                    <textarea
                                        rows={2}
                                        value={reportDetails}
                                        onChange={(e) => setReportDetails(e.target.value)}
                                        placeholder="Contanos un poco más qué pasó..."
                                        className="w-full bg-[#2a2a2a] border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-yellow-500 outline-none"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowReportModal(false)}
                                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createReport.isPending}
                                        className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {createReport.isPending ? 'Enviando...' : 'Enviar Reporte'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
}