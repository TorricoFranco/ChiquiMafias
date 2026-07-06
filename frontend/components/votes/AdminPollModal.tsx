// src/components/polls/AdminPollModal.tsx
"use client";

import { useState, useEffect } from "react";
import { pollsApi, Poll } from "@/services/polls";
import { POLL_ICONS } from "@/constants/poll-icons";
import { toast } from "sonner";
import { Plus, Trash, X, Calendar, ShieldCheck } from "lucide-react";

interface AdminPollModalProps {
    isOpen: boolean;
    onClose: () => void;
    pollToApprove?: Poll | null; // Si viene una poll, el modal entra en modo "Aprobación"
    onSuccess: () => void; // Para recargar la lista del dashboard al terminar
}

export default function AdminPollModal({ isOpen, onClose, pollToApprove, onSuccess }: AdminPollModalProps) {
    const isApproving = !!pollToApprove;

    // Estados del formulario
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("USER");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Si entra en modo aprobación, precargamos los datos que propuso el usuario
    useEffect(() => {
        if (pollToApprove) {
            setTitle(pollToApprove.title);
            setDescription(pollToApprove.description || "");
            setIcon(pollToApprove.icon || "USER");
            // Como las opciones vienen del backend con id y label, extraemos solo el texto
            const rawOptions = pollToApprove.options?.map((o) => o.label) || ["", ""];
            setOptions(rawOptions);
        } else {
            // Reset si es creación limpia
            setTitle("");
            setDescription("");
            setIcon("USER");
            setOptions(["", ""]);
        }
        // Seteamos fechas por defecto coherentes (hoy y mañana)
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setStartsAt(now.toISOString().slice(0, 16));
        setEndsAt(tomorrow.toISOString().slice(0, 16));
    }, [pollToApprove, isOpen]);

    if (!isOpen) return null;

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOptionField = () => {
        if (options.length >= 5) return;
        setOptions([...options, ""]);
    };

    const removeOptionField = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt !== "");
        if (validOptions.length < 2) {
            toast.error("Completá al menos 2 opciones válidas.");
            return;
        }

        if (new Date(endsAt) <= new Date(startsAt)) {
            toast.error("La fecha de fin debe ser posterior a la de inicio.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isApproving && pollToApprove) {
                // MODO APROBACIÓN: Agendamos las fechas de la poll del usuario
                await pollsApi.approvePoll(pollToApprove.id, {
                    startsAt: new Date(startsAt).toISOString(),
                    endsAt: new Date(endsAt).toISOString(),
                });
                toast.success("¡Encuesta de usuario aprobada y programada! 🚀");
            } else {
                // MODO CREACIÓN DIRECTA: Formateamos las opciones al formato JSON que pide tu Service
                const formattedOptions = validOptions.map((text, idx) => ({
                    id: idx + 1,
                    label: text,
                }));

                await pollsApi.createPoll({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    options: formattedOptions,
                    startsAt: new Date(startsAt).toISOString(),
                    endsAt: new Date(endsAt).toISOString(),
                    icon,
                });
                toast.success("¡Encuesta oficial creada y activada correctamente! 🎯");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Hubo un error al procesar la encuesta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg bg-[#141414] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="p-4 bg-[#1b1b1b] border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-lime-400" />
                        <h3 className="text-md font-bold text-white">
                            {isApproving ? "Moderar & Programar Encuesta" : "Crear Nueva Encuesta Oficial"}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar">

                    {/* Alerta de modo */}
                    <div className={`p-3 rounded-xl border text-xs ${isApproving ? "bg-amber-500/5 border-amber-500/20 text-amber-400" : "bg-lime-400/5 border-lime-400/20 text-lime-400"
                        }`}>
                        {isApproving
                            ? `Estás aprobando la propuesta del usuario @${pollToApprove.user?.username}. Podés revisar sus textos antes de agendar las fechas.`
                            : "Estás creando una votación de forma directa con rango de Administrador administrativo."
                        }
                    </div>

                    {/* Título */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Título</label>
                        <input
                            type="text"
                            required
                            disabled={isApproving} // No se edita el título del usuario por respeto
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: ¿Quién fue la figura del partido?"
                            className="w-full p-2.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-lime-400/50 text-sm disabled:opacity-60"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Descripción</label>
                        <textarea
                            disabled={isApproving}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Contexto adicional..."
                            rows={2}
                            className="w-full p-2.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-lime-400/50 text-sm resize-none disabled:opacity-60"
                        />
                    </div>

                    {/* Rango de Fechas Obligatorio */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#1a1a1a] border border-zinc-800 rounded-xl">
                        <div>
                            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-lime-400" /> Fecha de Inicio
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                className="w-full bg-transparent text-white text-xs focus:outline-none border-b border-zinc-700 pb-1"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-red-400" /> Fecha de Fin
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className="w-full bg-transparent text-white text-xs focus:outline-none border-b border-zinc-700 pb-1"
                            />
                        </div>
                    </div>

                    {/* Icono (Solo visible/editable si no está aprobando) */}
                    {!isApproving && (
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Icono Distintivo</label>
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {Object.keys(POLL_ICONS).map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setIcon(key)}
                                        className={`p-2.5 rounded-xl border text-md transition-all ${icon === key ? "bg-lime-400/10 border-lime-400 text-lime-400" : "bg-[#1a1a1a] border-zinc-800 text-zinc-500"
                                            }`}
                                    >
                                        {POLL_ICONS[key]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Opciones Dinámicas */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Opciones</label>
                            {!isApproving && (
                                <button
                                    type="button"
                                    onClick={addOptionField}
                                    disabled={options.length >= 5}
                                    className="text-xs text-lime-400 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                </button>
                            )}
                        </div>

                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <span className="text-xs font-bold text-zinc-600 w-4">{index + 1}.</span>
                                <input
                                    type="text"
                                    required
                                    disabled={isApproving}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Opción ${index + 1}`}
                                    className="flex-1 p-2 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white text-sm disabled:opacity-60"
                                />
                                {!isApproving && options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOptionField(index)}
                                        className="p-1.5 text-zinc-500 hover:text-red-400"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Botones de acción del footer */}
                    <div className="pt-4 border-t border-zinc-800 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-5 py-2 text-black text-sm font-bold rounded-xl transition-all ${isApproving ? "bg-amber-400 hover:bg-amber-300" : "bg-lime-400 hover:bg-lime-300"
                                }`}
                        >
                            {isSubmitting ? "Procesando..." : isApproving ? "Confirmar Aprobación" : "Publicar Encuesta"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}