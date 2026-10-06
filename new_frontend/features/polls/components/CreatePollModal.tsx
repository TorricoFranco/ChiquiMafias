"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, AlertTriangle, Megaphone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useProposePoll } from "@/features/polls/hooks/usePolls";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";

interface CreatePollModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreatePollModal = ({ isOpen, onClose }: CreatePollModalProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);

    const { data: inventory, isLoading: isLoadingInventory } = useUserInventory();
    const { mutate: proposePoll, isPending } = useProposePoll();

    if (!isOpen) return null;

    const boucherCount = inventory?.customPolls.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
    const hasTickets = boucherCount > 0;

    const handleAddOption = () => {
        if (options.length < 5) {
            setOptions([...options, ""]);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Filtramos opciones vacías
        const validOptions = options.map(o => o.trim()).filter(opt => opt !== "");

        if (!title.trim() || validOptions.length < 2) return;

        // 2. Limpiamos la descripción (si está vacía, no la mandamos)
        const cleanDescription = description.trim() === "" ? undefined : description.trim();

        proposePoll(
            {
                title: title.trim(),
                description: cleanDescription,
                options: validOptions
            },
            {
                onSuccess: () => {
                    toast.success("¡Encuesta enviada a moderación!");
                    onClose();
                    setTitle("");
                    setDescription("");
                    setOptions(["", ""]);
                },
                onError: (error: any) => {
                    console.error("Error del backend al proponer:", error);
                    alert(`Hubo un error: ${error?.message || "Revisá la consola"}`);
                }
            }
        );
    };

    const isSubmitDisabled = !hasTickets || !title.trim() || options.filter(o => o.trim()).length < 2 || isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Desafiar a la Tribuna"
                className="bg-[#1c1b1b] border border-[#353534] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[#353534]/60">
                    <h2 className="text-xl font-extrabold text-[#e5e2e1] flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-[#d2f000]" />
                        Desafiar a la Tribuna
                    </h2>
                    <button onClick={onClose} aria-label="Cerrar" className="text-[#909378] hover:text-[#e5e2e1] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">
                    {/* Contador de Tickets */}
                    <div className={`flex items-center justify-between p-3 rounded-lg mb-6 border ${hasTickets ? 'bg-[#d2f000]/10 border-[#d2f000]/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[#e5e2e1]">Bouchers <span className="font-mono text-[#d2f000] font-bold"> Crear Poll</span>:</span>
                            {isLoadingInventory ? (
                                <span className="w-4 h-4 rounded-full border-2 border-t-transparent border-[#d2f000] animate-spin"></span>
                            ) : (
                                <span className={`font-bold text-lg ${hasTickets ? 'text-[#d2f000]' : 'text-red-400'}`}>
                                    {boucherCount}
                                </span>
                            )}
                        </div>
                        {!hasTickets && (
                            <button className="text-xs bg-[#d2f000] text-[#131313] px-3 py-1.5 rounded font-bold flex items-center gap-1.5 hover:bg-[#bce000] transition-colors">
                                <ShoppingCart className="w-3.5 h-3.5" /> Conseguir
                            </button>
                        )}
                    </div>

                    <form id="poll-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Título */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="propose-poll-title" className="text-sm font-bold text-[#e5e2e1]">Pregunta principal *</label>
                            <input
                                id="propose-poll-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: ¿Quién es el mejor jugador del torneo?"
                                className="w-full bg-[#131313] border border-[#353534] rounded-lg p-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors"
                                maxLength={100}
                                required
                            />
                        </div>

                        {/* Descripción */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="propose-poll-description" className="text-sm font-bold text-[#c6c9ab]">Contexto / Descripción (Opcional)</label>
                            <textarea
                                id="propose-poll-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Agregá más detalles a tu pregunta..."
                                className="w-full bg-[#131313] border border-[#353534] rounded-lg p-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors min-h-[80px] resize-none"
                                maxLength={250}
                            />
                        </div>

                        {/* Opciones */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-[#e5e2e1]">Opciones de respuesta * <span className="text-xs font-normal text-[#909378]">(Mínimo 2)</span></label>
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        aria-label={`Opción ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        placeholder={`Opción ${idx + 1}`}
                                        className="flex-1 bg-[#131313] border border-[#353534] rounded-lg p-2.5 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors"
                                        maxLength={50}
                                        required={idx < 2} // Las dos primeras son obligatorias
                                    />
                                    {options.length > 2 && (
                                        <button type="button" onClick={() => handleRemoveOption(idx)} aria-label={`Quitar opción ${idx + 1}`} className="p-2.5 text-[#909378] hover:text-red-400 bg-[#131313] border border-[#353534] rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {options.length < 5 && (
                                <button type="button" onClick={handleAddOption} className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#c6c9ab] hover:text-[#d2f000] border border-dashed border-[#353534] hover:border-[#d2f000]/50 rounded-lg p-2.5 transition-colors">
                                    <Plus className="w-4 h-4" /> Agregar opción
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer y Aviso de moderación */}
                <div className="p-5 border-t border-[#353534]/60 bg-[#131313]">
                    <div className="flex items-start gap-2.5 mb-4 p-3 bg-[#2a2a2a]/50 rounded-lg border border-[#353534]">
                        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#c6c9ab] leading-relaxed">
                            Al enviar esta encuesta, pasará a una cola de <strong className="text-[#e5e2e1]">moderación</strong>. Un administrador deberá aprobarla antes de que sea pública en la Tribuna.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-[#c6c9ab] hover:text-[#e5e2e1] transition-colors">
                            Cancelar
                        </button>

                        {hasTickets ? (
                            <button
                                type="submit"
                                form="poll-form"
                                disabled={isSubmitDisabled}
                                className="bg-[#d2f000] hover:bg-[#bce000] text-[#131313] px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isPending ? "Enviando..." : "Enviar Propuesta"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="bg-[#2a2a2a] border border-[#353534] hover:border-[#d2f000] text-[#d2f000] px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                            >
                                <ShoppingCart className="w-4 h-4" /> Conseguir más tickets
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};