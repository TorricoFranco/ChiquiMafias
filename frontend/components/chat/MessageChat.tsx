"use client";

import { useState } from "react";
import { ShieldOff, MoreVertical, Trash2, Megaphone, Flag} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import clsx from "clsx";
import { getBannerComponent } from "./banners/BannerRegistry";
import { NAME_COLORS } from "@/config/cosmetic";
import { useCreateReport } from "@/hook/react-query/useSupport";

interface ChatMessageProps {
  messageId: string;
  userId?: string;
  avatar?: string;
  user: string;
  time?: string;
  teamName?: string;
  message: string;
  currentRole?: string | null;
  variant?: "global" | "match";
  onDelete: (messageId: string) => void;
  nameColor?: string;
  bannerId?: string;
  stickerId?: string | null;
  isMegaphone?: boolean;
}

export default function ChatMessage({
  messageId, userId, avatar, user, time, teamName, message, currentRole, variant = "global", onDelete,
  nameColor, bannerId, stickerId, isMegaphone
}: ChatMessageProps) {

  const activeColor = NAME_COLORS[nameColor || "default"] || NAME_COLORS.default;
  const BannerContainer = getBannerComponent(bannerId);
  const isMod = currentRole === 'ADMIN' || currentRole === 'MODERATOR';
  const [showMenu, setShowMenu] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);

  // Estados para el reporte
  const [reportReason, setReportReason] = useState<'TOXIC_CHAT' | 'FRAUD' | 'BAD_BEHAVIOR' | 'OTHER'>('TOXIC_CHAT');
  const [reportDetails, setReportDetails] = useState('');

  const createReport = useCreateReport();

  const handleTimeout = async (minutes: number) => {
    if (!userId) return alert("Error: No se encontró el ID del usuario");

    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/timeout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, durationMinutes: minutes }),
      });

      if (res.ok) {
        alert(`¡Arafue! ${user} muteado por ${minutes} minutos.`);
      } else {
        alert("Hubo un error al intentar mutear al usuario.");
      }
    } catch (error) {
      console.error("Error aplicando timeout:", error);
    }
    setShowMenu(false);
  }

  const handleUnmute = async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/unmute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) alert("No se pudo quitar el muteo.");
    } catch (error) {
      console.error("Error quitando timeout:", error);
    }
    setShowMenu(false);
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
      // Automáticamente le pasamos el mensaje que originó el reporte como contexto
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
      <div className={clsx(
        "group relative p-2 rounded-2xl transition-all",
        isMegaphone && "bg-gradient-to-r from-amber-500/10 via-amber-500/[0.02] to-transparent border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.03)]",
        variant === "global" ? "flex items-start space-x-3" : "flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2"
      )}>
        {/* AVATAR */}
        {variant === "global" && (
          <div className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center text-base border-2 border-sky-400/50 overflow-hidden flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt="Escudo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xs text-gray-400 font-bold">?</span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center space-x-2 mb-0.5">
            {isMegaphone && <Megaphone className="w-3 h-3 text-amber-400 animate-bounce" />}
            <span className={clsx("text-sm font-bold", activeColor.textClass)}>
              {user}
            </span>

            {variant === "global" && time && <span className="text-xs text-gray-500">{time}</span>}
            {variant === "match" && teamName && <span className="text-[8px] text-gray-500 font-bold">{teamName}</span>}

            {/* MENÚ UNIFICADO (Mods y Usuarios) */}
            {userId && ( // Solo mostramos menú si hay un userId a quien reportar/mutear
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>

                {showMenu && (
                  <div className="absolute left-0 mt-2 bg-[#252525] border border-gray-700 rounded-lg shadow-xl z-50 w-40 p-1 text-sm">

                    {/* Opciones de Administrador/Moderador */}
                    {isMod && (
                      <>
                        <button onClick={handleMessageDeletion} className="w-full text-left px-2 py-1.5 text-red-400 hover:bg-gray-700 flex items-center gap-2 rounded">
                          <Trash2 className="w-3.5 h-3.5" /> Borrar mensaje
                        </button>
                        <div className="h-[1px] bg-gray-700 my-1" />
                        <button onClick={() => handleTimeout(5)} className="w-full text-left px-2 py-1.5 hover:bg-gray-700 text-gray-200 rounded">Mute 5 min</button>
                        <button onClick={() => handleTimeout(60)} className="w-full text-left px-2 py-1.5 hover:bg-gray-700 text-gray-200 rounded">Mute 1 hora</button>
                        <button onClick={handleUnmute} className="w-full text-left px-2 py-1.5 text-green-400 hover:bg-gray-700 flex items-center gap-2 rounded">
                          <ShieldOff className="w-3.5 h-3.5" /> Quitar Mute
                        </button>
                        <div className="h-[1px] bg-gray-700 my-1" />
                      </>
                    )}

                    {/* Opción de Reporte (Para todos) */}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full text-left px-2 py-1.5 text-yellow-400 hover:bg-gray-700 flex items-center gap-2 rounded"
                    >
                      <Flag className="w-3.5 h-3.5" /> Reportar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {stickerId ? (
            <div className="mt-1 w-20 h-20 animate-in zoom-in-50 duration-200">
              <img src={`/cosmetics/stickers/${stickerId}.webp`} alt="Sticker" className="w-full h-full object-contain" />
            </div>
          ) : (
            <BannerContainer>
              <span className={clsx("text-xs break-words", isMegaphone ? "text-amber-200 font-medium" : "text-gray-300")}>
                {message}
              </span>
            </BannerContainer>
          )}
        </div>
      </div>

      {/* MODAL DE REPORTE */}
      {showReportModal && (
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
      )}
    </>
  );
}