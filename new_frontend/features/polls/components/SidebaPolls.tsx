"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, PlusCircle } from "lucide-react";
import { useActivePolls } from "@/features/polls/hooks/usePolls";
import { PollCard } from "./PollCard";
import { CreatePollModal } from "./CreatePollModal";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";
import { POLL_FILTER_GROUPS } from "@/features/polls/constants/pollTypes";
import { useNavigationStore } from "@/store/useNavigationStore";

export const SidebarPolls = () => {
    const [activeFilter, setActiveFilter] = useState(POLL_FILTER_GROUPS[0].id);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data: activePolls, isLoading, isError, isFetching } = useActivePolls();

    const { data: inventory } = useUserInventory();

    // El stock puede estar repartido en varias filas (ticket de tienda y regalo
    // de suscripción son ítems distintos del mismo tipo), igual que lo suma el backend.
    const pollTicketCount =
        inventory?.customPolls?.reduce((total, inv) => total + (inv.quantity ?? 0), 0) ?? 0;

    const focusedPoll = useNavigationStore((state) => state.focusedPoll);
    const clearFocusedPoll = useNavigationStore((state) => state.clearFocusedPoll);
    const markFocusApplied = useNavigationStore((state) => state.markFocusApplied);
    // La encuesta que llegó desde el carrusel sigue activa (el feed arranca en "Todas").
    const focusedExists = Boolean(focusedPoll && activePolls?.some((poll) => poll.id === focusedPoll.id));

    const activeGroup = POLL_FILTER_GROUPS.find((group) => group.id === activeFilter);
    const visiblePolls = activeGroup?.types
        ? activePolls?.filter((poll) => activeGroup.types!.includes(poll.type))
        : activePolls;

    // Si la lista ya cargó y la encuesta enfocada no está, se descarta el enfoque. Mientras se refetchea, espera.
    useEffect(() => {
        if (focusedPoll && !isLoading && !isFetching && !focusedExists) clearFocusedPoll();
    }, [focusedPoll, focusedExists, isLoading, isFetching, clearFocusedPoll]);

    // La encuesta enfocada se lleva al centro de la pantalla y recibe el foco. El resalte lo apaga el store.
    useEffect(() => {
        if (!focusedPoll || !focusedExists) return;

        const card = document.getElementById(`poll-${focusedPoll.id}`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        // La barra derecha se desmonta al cambiar de pestaña y el foco se pierde: se lo
        // damos a la card para que el lector de pantalla anuncie la encuesta.
        if (!card) return;
        card.focus({ preventScroll: true });
        // Recién ahora la encuesta está en pantalla: arranca el reloj que apaga el resalte.
        markFocusApplied();
    }, [focusedPoll, focusedExists, markFocusApplied]);

    return (
        <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="font-extrabold text-2xl text-[#e5e2e1] tracking-tight uppercase">TRIBUNA VIRTUAL</h2>
                    <span className="bg-[#d2f000]/10 border border-[#d2f000]/30 text-[#d2f000] text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> COMUNIDAD EN VIVO
                    </span>
                </div>

                <div className="flex items-center bg-[#1c1b1b] border border-[#353534] p-1 rounded-xl text-xs overflow-x-auto max-w-full">
                    {POLL_FILTER_GROUPS.map((group) => (
                        <button
                            key={group.id}
                            onClick={() => setActiveFilter(group.id)}
                            aria-pressed={activeFilter === group.id}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeFilter === group.id ? "bg-[#d2f000] text-[#191e00]" : "text-[#c6c9ab] hover:text-[#e5e2e1]"}`}
                        >
                            {group.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#2a2a2a] border-l-4 border-[#d2f000] rounded-r-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-[#d2f000]/20 blur-xl rounded-full" />

                        <img
                            src="/icons/custom-poll-icon.png"
                            alt="Encuesta"
                            className="relative w-12 h-12 object-contain drop-shadow-[0_0_6px_rgba(210,240,0,0.45)]"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#e5e2e1]">
                                ¿Tenés una mejor pregunta?
                            </span>

                            <span className="bg-[#d2f000]/10 border border-[#d2f000]/30 text-[#d2f000] text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                                Encuesta
                            </span>
                        </div>

                        <span className="text-xs text-[#c6c9ab]">
                            Creá una encuesta y desafiá a la tribuna.
                        </span>

                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-[#909378] font-bold uppercase">
                                Disponibles:
                            </span>

                            <span className="text-xs font-mono font-black text-[#d2f000]">
                                {pollTicketCount}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={pollTicketCount <= 0}
                    className="whitespace-nowrap bg-[#131313] border border-[#d2f000]/50 hover:border-[#d2f000] text-[#d2f000] px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-[#d2f000]/10 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#d2f000]/50 disabled:hover:bg-[#131313]"
                >
                    <PlusCircle className="w-4 h-4" />
                    Crear encuesta
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {isLoading && <p className="text-[#c6c9ab] text-center py-4">Cargando encuestas de la tribuna...</p>}
                {isError && <p className="text-red-500 text-center py-4">Hubo un error al cargar las encuestas.</p>}
                {!isLoading && !isError && visiblePolls?.length === 0 && (
                    <p className="text-[#c6c9ab] text-center py-4">
                        {activeGroup?.types ? "No hay encuestas de este tipo por ahora." : "No hay encuestas activas en este momento."}
                    </p>
                )}
                {visiblePolls?.map((poll) => (
                    <PollCard
                        key={poll.id}
                        poll={poll}
                        highlight={focusedPoll?.id === poll.id}
                        defaultCommentsOpen={focusedPoll?.id === poll.id && focusedPoll.openComments}
                    />
                ))}
            </div>

            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </section>
    );
};