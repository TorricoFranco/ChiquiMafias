"use client";

import { useEffect, useState } from "react";
import { VoteCard } from "./VoteCard";
import { pollsApi, Poll } from "@/services/polls";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useUserStore } from "@/store/useUserStore";
import ProposePollModal from "./ProposePollModal";
import AdminPollModal from "./AdminPollModal";
import PollsModerationModal from "./PollsModerationModal";
import { Ticket, Plus, Shield, ListChecks } from "lucide-react";

export default function VotingSummary() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false); // 🔍 2. Estado para abrir el panel de moderación
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null); // 🔍 3. Estado dinámico para la encuesta a aprobar/editar

  const { items, fetchInventory } = useInventoryStore();
  const { accessToken, role } = useUserStore();

  const loadPolls = async () => {
    try {
      const data = await pollsApi.getActivePolls();
      if (Array.isArray(data)) {
        setPolls(data);
      } else {
        console.error("El servicio no devolvió un array válido:", data);
        setPolls([]);
      }
    } catch (error) {
      console.error("Error cargando votaciones:", error);
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchInventory();
    }
  }, [accessToken, fetchInventory]);

  const pollTicket = items.find(
    (inv) => inv.item?.type === "CUSTOM_POLL" && inv.quantity > 0
  );
  const ticketCount = pollTicket ? pollTicket.quantity : 0;

  if (loading) return <div className="p-4 text-white">Cargando votaciones...</div>;

  return (
    <div className="bg-[#181818] p-4 flex flex-col h-full">

      {/* HEADER DE LA SECCIÓN: Título + Botones de Acción */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Votaciones Destacadas</h2>

        <div className="flex items-center gap-2">

          {/* 🕵️‍♂️ BOTONES EXCLUSIVOS ADMIN */}
          {accessToken && role === "ADMIN" && (
            <>
              {/* 🔍 NUEVO: Botón para abrir las propuestas pendientes */}
              <button
                onClick={() => setIsModerationOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-400 transition-all duration-200 active:scale-[0.97]"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Moderación</span>
              </button>

              {/* Botón de creación limpia (resetea el selectedPoll a null) */}
              <button
                onClick={() => {
                  setSelectedPoll(null); // Asegura modo "crear desde cero"
                  setIsAdminModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-400 transition-all duration-200 active:scale-[0.97]"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Crear Oficial</span>
                <Plus className="w-3 h-3 ml-0.5 text-amber-500" />
              </button>
            </>
          )}

          {/* 🎫 Botón estándar del hincha */}
          {accessToken && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#252525] border border-[#2b2b2b] hover:border-lime-400/40 rounded-xl text-xs font-medium text-gray-200 transition-all duration-200 group active:scale-[0.97]"
            >
              <Ticket className="w-3.5 h-3.5 text-lime-400 transition-transform group-hover:rotate-12" />
              <span>Proponer Encuesta</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ticketCount > 0 ? "bg-lime-400/10 text-lime-400" : "bg-[#2b2b2b] text-gray-500"}`}>
                {ticketCount}
              </span>
              <Plus className="w-3 h-3 text-gray-500 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* FEED DE ENCUESTAS */}
      {polls.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay votaciones activas en este momento.</p>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
          {polls.map((poll) => (
            <VoteCard
              key={poll.id}
              id={poll.id}
              title={poll.title}
              description={poll.description || ""}
              iconKey={poll.icon}
              endsAt={poll.endsAt || ""}
            />
          ))}
        </div>
      )}

      {/* MODAL 1: Para propuestas de hinchas regulares */}
      <ProposePollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* 🔍 NUEVO MODAL 3: Lista de encuestas pendientes de moderación */}
      <PollsModerationModal
        isOpen={isModerationOpen}
        onClose={() => setIsModerationOpen(false)}
        onSelectPollForApproval={(poll) => {
          setSelectedPoll(poll); // Guardamos la encuesta que seleccionó el Admin
          setIsAdminModalOpen(true); // Abrimos el modal de aprobación con los datos precargados
        }}
      />

      {/* MODAL 2: Aprobación/Creación del Admin */}
      <AdminPollModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setSelectedPoll(null); // Limpiamos al cerrar
        }}
        pollToApprove={selectedPoll} // 🔍 4. Ahora es DINÁMICO (null o la encuesta seleccionada)
        onSuccess={() => {
          loadPolls(); // Refresca el feed principal si se activó una encuesta
          // Si tenés una función para refrescar la moderación podrías llamarla acá también
        }}
      />
    </div>
  );
}