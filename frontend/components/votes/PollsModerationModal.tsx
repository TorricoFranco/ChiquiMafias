"use client";

import { useEffect, useState } from "react";
import { pollsApi, Poll } from "@/services/polls";
import { X, Check, ShieldAlert, Ban } from "lucide-react"; // 🔍 Importamos Ban para el botón de rechazo

interface PollsModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPollForApproval: (poll: Poll) => void;
}

export default function PollsModerationModal({
  isOpen,
  onClose,
  onSelectPollForApproval,
}: PollsModerationModalProps) {
  const [pendingPolls, setPendingPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null); // 🔍 Estado para bloquear interacciones mientras se rechaza

  // Función para traer las encuestas pendientes
  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await pollsApi.getPendingPolls();
      setPendingPolls(data);
    } catch (error) {
      console.error("Error al traer propuestas pendientes:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 NUEVA FUNCIÓN: Ejecuta el rechazo y reembolsa el ticket
  const handleReject = async (pollId: string) => {
    // Si ya se está procesando algo, no hacemos nada
    if (processingId) return;

    if (!confirm("¿Estás seguro de que querés rechazar esta encuesta? Se le reembolsará el ticket al hincha.")) {
      return;
    }

    try {
      setProcessingId(pollId);

      // Llamamos al endpoint del backend que ejecuta la transacción de rechazo y reembolso
      await pollsApi.rejectPoll(pollId);

      // Removemos la encuesta rechazada de la lista local para feedback inmediato
      setPendingPolls((prev) => prev.filter((poll) => poll.id !== pollId));
    } catch (error) {
      console.error("Error al rechazar la encuesta:", error);
      alert("No se pudo rechazar la encuesta. Revisá la consola.");
    } finally {
      setProcessingId(null);
    }
  };

  // Cada vez que se abra el modal, mandamos la petición a buscar pendientes
  useEffect(() => {
    if (isOpen) {
      fetchPending();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-[#2b2b2b] flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Panel de Moderación</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listado */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Cargando propuestas pendientes...</p>
          ) : pendingPolls.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No hay propuestas de usuarios pendientes de revisión.</p>
          ) : (
            pendingPolls.map((poll) => (
              <div
                key={poll.id}
                className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500 bg-[#222] px-2 py-0.5 rounded-md">
                      @{poll.user?.username || "Usuario"}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(poll.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-100">{poll.title}</h4>
                  {poll.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{poll.description}</p>
                  )}

                  {/* Opciones propuestas */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {poll.options.map((opt) => (
                      <span key={opt.id} className="text-[11px] bg-[#1c1c1c] text-gray-300 border border-[#2b2b2b] px-2 py-0.5 rounded-md">
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 🔍 Contenedor de Acciones de Moderación */}
                <div className="flex items-center gap-2 shrink-0">

                  {/* 🔴 BOTÓN RECHAZAR */}
                  <button
                    onClick={() => handleReject(poll.id)}
                    disabled={processingId !== null}
                    className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400 rounded-xl text-xs font-bold text-red-400 transition-all duration-200 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{processingId === poll.id ? "Rechazando..." : "Rechazar"}</span>
                  </button>

                  {/* 🟢 BOTÓN REVISAR / APROBAR */}
                  <button
                    onClick={() => {
                      onClose(); // Cerramos este panel
                      onSelectPollForApproval(poll); // Mandamos la encuesta al AdminPollModal
                    }}
                    disabled={processingId !== null}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-400 transition-all duration-200 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Revisar</span>
                  </button>

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}