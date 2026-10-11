"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, AlertTriangle, Megaphone, ShoppingCart, Shield } from "lucide-react";
import { toast } from "sonner";
import { useProposePoll } from "@/features/polls/hooks/usePolls";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";
import { MatchLayout, PollType, ProposePollDto } from "@/features/polls/types";
import { POLL_TYPE_META, PROPOSABLE_POLL_TYPES, getPollUiRules } from "@/features/polls/constants/pollTypes";
import type { PollUiRules } from "@/features/polls/constants/pollTypes";
import { getTeamsList } from "@/data/teamData";
import { TeamSelectorModalAPI } from "@/features/auth/components/TeamSelectorModalAPI";

interface CreatePollModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OptionDraft {
    label: string;
    teamId?: string;
    badgeUrl?: string;
}

const EMPTY_OPTIONS: OptionDraft[] = [{ label: "" }, { label: "" }];

export const CreatePollModal = ({ isOpen, onClose }: CreatePollModalProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState<OptionDraft[]>(EMPTY_OPTIONS);
    const [icon, setIcon] = useState("FOOTBALL");
    const [type, setType] = useState<PollType>("CLASSIC");
    const [layout, setLayout] = useState<MatchLayout>("VS");
    const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);

    const { data: inventory, isLoading: isLoadingInventory } = useUserInventory();
    const { mutate: proposePoll, isPending } = useProposePoll();

    if (!isOpen) return null;

    const boucherCount = inventory?.customPolls.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
    const rules = getPollUiRules(type, layout);
    const ticketCost =
        type === "VERSUS" && options.some((opt) => opt.teamId) ? 2 : POLL_TYPE_META[type].ticketCost;
    const hasTickets = boucherCount >= ticketCost;

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setOptions(EMPTY_OPTIONS);
        setIcon("FOOTBALL");
        setType("CLASSIC");
        setLayout("VS");
    };

    /**
     * Recorta o rellena la lista para el formato nuevo y, si el tipo no admite
     * escudos, los descarta: si no, quedarían pegados sin botón para sacarlos y
     * el backend rechazaría la encuesta.
     */
    const fitOptions = (current: OptionDraft[], rules: PollUiRules): OptionDraft[] => {
        const trimmed = current
            .slice(0, Math.max(rules.maxOptions, 0))
            .map((opt) => (rules.badges === "none" ? { label: opt.label } : opt));

        while (trimmed.length < rules.minOptions) trimmed.push({ label: "" });

        return trimmed;
    };

    const handleTypeChange = (nextType: PollType) => {
        setType(nextType);
        setOptions((current) => fitOptions(current, getPollUiRules(nextType, layout)));
    };

    const handleLayoutChange = (nextLayout: MatchLayout) => {
        setLayout(nextLayout);
        setOptions((current) => fitOptions(current, getPollUiRules(type, nextLayout)));
    };

    const handleAddOption = () => {
        if (options.length < rules.maxOptions) setOptions([...options, { label: "" }]);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > rules.minOptions) setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, value: string) => {
        setOptions(options.map((opt, i) => (i === index ? { ...opt, label: value } : opt)));
    };

    const handleTeamSelect = (teamId: string, teamName: string, badgeUrl: string) => {
        if (activeTeamIndex === null) return;
        setOptions(
            options.map((opt, i) =>
                i === activeTeamIndex
                    ? { label: opt.label.trim() === "" ? teamName : opt.label, teamId, badgeUrl }
                    : opt
            )
        );
        setActiveTeamIndex(null);
    };

    const filledOptions = options.filter((opt) => opt.label.trim() !== "");
    const missingBadges = rules.badges === "required" && filledOptions.some((opt) => !opt.teamId);

    const usedTeamIds = filledOptions.map((opt) => opt.teamId).filter(Boolean);
    const usedLabels = filledOptions.map((opt) => opt.label.trim().toLowerCase());
    const hasDuplicates =
        new Set(usedTeamIds).size !== usedTeamIds.length ||
        new Set(usedLabels).size !== usedLabels.length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !title.trim() ||
            filledOptions.length < rules.minOptions ||
            missingBadges ||
            hasDuplicates
        ) {
            return;
        }

        const dto: ProposePollDto = {
            title: title.trim(),
            description: description.trim() === "" ? undefined : description.trim(),
            icon,
        };

        // Solo se mandan los campos que hacen falta: una clásica viaja igual que antes.
        if (type !== "CLASSIC") dto.type = type;
        if (rules.maxOptions > 0) dto.options = filledOptions.map((opt) => opt.label.trim());
        if (rules.badges !== "none" && filledOptions.some((opt) => opt.teamId)) {
            dto.optionTeamIds = filledOptions.map((opt) => opt.teamId || "");
        }
        if (type === "MATCH") dto.config = { layout };

        proposePoll(dto, {
            onSuccess: () => {
                toast.success("¡Encuesta enviada a moderación!");
                onClose();
                resetForm();
            },
            onError: (error: any) => {
                toast.error(error?.message || "No se pudo enviar la encuesta");
            },
        });
    };

    const isSubmitDisabled =
        !hasTickets ||
        !title.trim() ||
        filledOptions.length < rules.minOptions ||
        missingBadges ||
        hasDuplicates ||
        isPending;

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
                        {/* Tipo de encuesta */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-[#e5e2e1]">Tipo de encuesta</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PROPOSABLE_POLL_TYPES.map((pollType) => {
                                    const meta = POLL_TYPE_META[pollType];
                                    const isActive = type === pollType;

                                    return (
                                        <button
                                            key={pollType}
                                            type="button"
                                            onClick={() => handleTypeChange(pollType)}
                                            aria-pressed={isActive}
                                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs font-bold transition-colors ${isActive
                                                ? "border-[#d2f000] bg-[#d2f000]/10 text-[#d2f000]"
                                                : "border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932] hover:text-[#e5e2e1]"
                                                }`}
                                        >
                                            <span className="truncate">{meta.name}</span>
                                            <span className="text-[10px] font-mono flex-shrink-0 opacity-80">
                                                {meta.ticketCost}🎟
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-[#909378]">
                                Esta encuesta te cuesta <strong className="text-[#d2f000]">{ticketCost}</strong>{" "}
                                {ticketCost === 1 ? "ticket" : "tickets"}.
                            </p>
                        </div>

                        {/* Formato de la predicción */}
                        {type === "MATCH" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-[#c6c9ab]">Formato</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleLayoutChange("VS")}
                                        aria-pressed={layout === "VS"}
                                        className={`p-2.5 rounded-lg border text-xs font-bold transition-colors ${layout === "VS"
                                            ? "border-[#d2f000] bg-[#d2f000]/10 text-[#d2f000]"
                                            : "border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932]"
                                            }`}
                                    >
                                        Tarjeta de partido
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleLayoutChange("LIST")}
                                        aria-pressed={layout === "LIST"}
                                        className={`p-2.5 rounded-lg border text-xs font-bold transition-colors ${layout === "LIST"
                                            ? "border-[#d2f000] bg-[#d2f000]/10 text-[#d2f000]"
                                            : "border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932]"
                                            }`}
                                    >
                                        Pregunta con escudos
                                    </button>
                                </div>
                                <p className="text-[11px] text-[#909378]">
                                    {layout === "VS"
                                        ? "Elegí los dos equipos: el empate lo agregamos nosotros."
                                        : "Escribí la pregunta arriba y cargá una opción por equipo."}
                                </p>
                            </div>
                        )}

                        {/* Título */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="propose-poll-title" className="text-sm font-bold text-[#e5e2e1]">Pregunta principal *</label>
                            <input
                                id="propose-poll-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={type === "FACTO" ? "Ej: Riquelme es el mejor 10 de la historia" : "Ej: ¿Quién es el mejor jugador del torneo?"}
                                className="w-full bg-[#131313] border border-[#353534] rounded-lg p-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors"
                                maxLength={100}
                                required
                            />
                            {type === "FACTO" && (
                                <p className="text-[11px] text-[#909378]">
                                    Escribí una afirmación: la tribuna vota Facto o No facto y después se debate en los comentarios.
                                </p>
                            )}
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

                        {/* Ícono temático */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="propose-poll-icon" className="text-sm font-bold text-[#c6c9ab]">Ícono temático</label>
                            <select
                                id="propose-poll-icon"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                className="w-full bg-[#131313] border border-[#353534] rounded-lg p-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors"
                            >
                                <option value="FOOTBALL">⚽ FOOTBALL</option>
                                <option value="TROPHY">🏆 TROPHY</option>
                                <option value="FIRE">🔥 FIRE</option>
                                <option value="USER">👤 USER</option>
                            </select>
                        </div>

                        {/* Opciones */}
                        {rules.maxOptions > 0 ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-[#e5e2e1]">
                                    {type === "MATCH" && layout === "VS" ? "Equipos *" : "Opciones de respuesta *"}{" "}
                                    <span className="text-xs font-normal text-[#909378]">
                                        {rules.minOptions === rules.maxOptions
                                            ? `(Exactamente ${rules.minOptions})`
                                            : `(Mínimo ${rules.minOptions})`}
                                    </span>
                                </label>
                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        {rules.badges !== "none" && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTeamIndex(idx)}
                                                aria-label={`Asignar escudo a la opción ${idx + 1}`}
                                                title="Asignar escudo a esta opción"
                                                className="w-10 h-10 shrink-0 bg-[#131313] border border-[#353534] hover:border-[#d2f000] rounded-lg flex items-center justify-center transition-colors overflow-hidden group"
                                            >
                                                {opt.badgeUrl ? (
                                                    <img src={opt.badgeUrl} alt="Escudo elegido" className="w-6 h-6 object-contain" />
                                                ) : (
                                                    <Shield className="w-4 h-4 text-[#909378] group-hover:text-[#d2f000]" />
                                                )}
                                            </button>
                                        )}
                                        <input
                                            type="text"
                                            aria-label={`Opción ${idx + 1}`}
                                            value={opt.label}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Opción ${idx + 1}`}
                                            className="flex-1 bg-[#131313] border border-[#353534] rounded-lg p-2.5 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#d2f000] transition-colors"
                                            maxLength={50}
                                            required={idx < rules.minOptions}
                                        />
                                        {options.length > rules.minOptions && (
                                            <button type="button" onClick={() => handleRemoveOption(idx)} aria-label={`Quitar opción ${idx + 1}`} className="p-2.5 text-[#909378] hover:text-red-400 bg-[#131313] border border-[#353534] rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {missingBadges && (
                                    <p className="text-[11px] text-[#ffb4ab]">Elegí el escudo de cada equipo.</p>
                                )}
                                {hasDuplicates && (
                                    <p className="text-[11px] text-[#ffb4ab]">No repitas la misma opción ni el mismo escudo.</p>
                                )}
                                {options.length < rules.maxOptions && (
                                    <button type="button" onClick={handleAddOption} className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#c6c9ab] hover:text-[#d2f000] border border-dashed border-[#353534] hover:border-[#d2f000]/50 rounded-lg p-2.5 transition-colors">
                                        <Plus className="w-4 h-4" /> Agregar opción
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-[#c6c9ab] bg-[#131313] border border-[#353534] rounded-lg p-3">
                                Las opciones de este tipo son fijas: <strong className="text-[#e5e2e1]">Facto</strong> y{" "}
                                <strong className="text-[#e5e2e1]">No facto</strong>.
                            </p>
                        )}
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

            <TeamSelectorModalAPI
                isOpen={activeTeamIndex !== null}
                onClose={() => setActiveTeamIndex(null)}
                onSelect={handleTeamSelect}
                teams={getTeamsList()}
            />
        </div>
    );
};
