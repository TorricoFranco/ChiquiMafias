"use client";

import React, { useState } from "react";
import { Sparkles, TrendingUp, Clock, PlusCircle } from "lucide-react";
import { useActivePolls } from "@/features/polls/hooks/usePolls";
import { PollCard } from "./PollCard";
import { CreatePollModal } from "./CreatePollModal";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";

export const SidebarPolls = () => {
    const [activeFilter, setActiveFilter] = useState<"tendencias" | "recientes">("tendencias");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data: activePolls, isLoading, isError } = useActivePolls();

    const { data: inventory } = useUserInventory();

    const pollTicketCount =
        inventory?.all?.find((inv) => inv.item.type === "CUSTOM_POLL")?.quantity ?? 0;

    return (
        <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="font-extrabold text-2xl text-[#e5e2e1] tracking-tight uppercase">TRIBUNA VIRTUAL</h2>
                    <span className="bg-[#d2f000]/10 border border-[#d2f000]/30 text-[#d2f000] text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> COMUNIDAD EN VIVO
                    </span>
                </div>

                <div className="flex items-center bg-[#1c1b1b] border border-[#353534] p-1 rounded-xl text-xs">
                    <button onClick={() => setActiveFilter("tendencias")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeFilter === "tendencias" ? "bg-[#d2f000] text-[#191e00]" : "text-[#c6c9ab] hover:text-[#e5e2e1]"}`}>
                        <TrendingUp className="w-3.5 h-3.5" /> Tendencias
                    </button>
                    <button onClick={() => setActiveFilter("recientes")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeFilter === "recientes" ? "bg-[#d2f000] text-[#191e00]" : "text-[#c6c9ab] hover:text-[#e5e2e1]"}`}>
                        <Clock className="w-3.5 h-3.5" /> Recientes
                    </button>
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
                {!isLoading && !isError && activePolls?.length === 0 && (
                    <p className="text-[#c6c9ab] text-center py-4">No hay encuestas activas en este momento.</p>
                )}
                {activePolls?.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                ))}
            </div>

            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </section>
    );
};