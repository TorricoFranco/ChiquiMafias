import React, { useState } from 'react';
import { PlusCircle, X, Trash2, Shield } from 'lucide-react';
import { toDateTimeLocalValue } from '@/lib/dateTimeLocal';
import { CreatePollDto, MatchLayout, PollType } from '../../types';
import { POLL_TYPE_META, getPollUiRules } from '../../constants/pollTypes';
import type { PollUiRules } from '../../constants/pollTypes';
import { getTeamsList } from '@/data/teamData';
import { TeamSelectorModalAPI } from '@/features/auth/components/TeamSelectorModalAPI';

interface CreatePollModalProps {
    onClose: () => void;
    onSubmit: (dto: CreatePollDto) => void;
}

interface OptionDraft {
    label: string;
    teamId?: string;
    badgeUrl?: string;
}

const ALL_TYPES = Object.keys(POLL_TYPE_META) as PollType[];

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('FOOTBALL');
    const [type, setType] = useState<PollType>('CLASSIC');
    const [layout, setLayout] = useState<MatchLayout>('VS');
    const [startsAt, setStartsAt] = useState(() => toDateTimeLocalValue(new Date()));
    const [endsAt, setEndsAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 48 * 60 * 60 * 1000)));
    const [options, setOptions] = useState<OptionDraft[]>([
        { label: 'Boca Juniors' },
        { label: 'River Plate' },
    ]);
    const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);
    const [commentsEnabled, setCommentsEnabled] = useState(true);

    const rules = getPollUiRules(type, layout);
    const isAvailable = type !== 'RATING' && type !== 'RANKING';

    /** Igual que en el modal del usuario: si el tipo nuevo no lleva escudos, se descartan. */
    const fitOptions = (prev: OptionDraft[], rules: PollUiRules): OptionDraft[] => {
        const trimmed = prev
            .slice(0, Math.max(rules.maxOptions, 0))
            .map((opt) => (rules.badges === 'none' ? { label: opt.label } : opt));

        while (trimmed.length < rules.minOptions) trimmed.push({ label: '' });

        return trimmed;
    };

    const handleTypeChange = (nextType: PollType) => {
        setType(nextType);
        setOptions((prev) => fitOptions(prev, getPollUiRules(nextType, layout)));
    };

    const handleLayoutChange = (nextLayout: MatchLayout) => {
        setLayout(nextLayout);
        setOptions((prev) => fitOptions(prev, getPollUiRules(type, nextLayout)));
    };

    const handleAddOption = () =>
        setOptions((prev) => (prev.length < rules.maxOptions ? [...prev, { label: '' }] : prev));

    const handleRemoveOption = (index: number) => {
        if (options.length <= rules.minOptions) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, val: string) => {
        setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, label: val } : opt)));
    };

    const handleTeamSelect = (teamId: string, teamName: string, badgeUrl: string) => {
        if (activeTeamIndex === null) return;
        setOptions((prev) =>
            prev.map((opt, i) =>
                i === activeTeamIndex
                    ? { label: opt.label.trim() === '' ? teamName : opt.label, teamId, badgeUrl }
                    : opt
            )
        );
        setActiveTeamIndex(null);
    };

    const filledOptions = options.filter((opt) => opt.label.trim() !== '');
    const missingBadges = rules.badges === 'required' && filledOptions.some((opt) => !opt.teamId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || filledOptions.length < rules.minOptions || missingBadges) return;

        const dto: CreatePollDto = {
            title: title.trim(),
            description: description.trim() || undefined,
            startsAt: new Date(startsAt).toISOString(),
            icon,
        };

        if (type !== 'CLASSIC') dto.type = type;
        if (!commentsEnabled) dto.commentsEnabled = false;
        if (rules.maxOptions > 0) {
            dto.options = filledOptions.map((opt) => ({
                label: opt.label.trim(),
                ...(rules.badges !== 'none' && opt.teamId ? { teamId: opt.teamId } : {}),
            }));
        }
        if (type === 'MATCH') dto.config = { layout };
        // Las placas informativas y las noticias no cierran salvo que se les ponga fecha.
        if (rules.requiresEndsAt && endsAt) dto.endsAt = new Date(endsAt).toISOString();

        onSubmit(dto);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Crear Encuesta Oficial"
                className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-lg w-full p-6 z-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-[#d2f000]" />
                        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">Crear Encuesta Oficial (Admin)</h3>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="text-[#c6c9ab] hover:text-[#e5e2e1]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* TIPO */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Tipo *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ALL_TYPES.map((pollType) => (
                                <button
                                    key={pollType}
                                    type="button"
                                    onClick={() => handleTypeChange(pollType)}
                                    aria-pressed={type === pollType}
                                    className={`p-2 rounded-lg border text-[11px] font-bold transition-colors truncate ${type === pollType
                                        ? 'border-[#d2f000] bg-[#d2f000]/10 text-[#d2f000]'
                                        : 'border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932]'
                                        }`}
                                >
                                    {POLL_TYPE_META[pollType].name}
                                </button>
                            ))}
                        </div>
                        {!isAvailable && (
                            <p className="text-[11px] text-[#ffb4ab] mt-1.5">
                                Este tipo todavía no está habilitado en el backend.
                            </p>
                        )}
                    </div>

                    {/* FORMATO DEL MATCH */}
                    {type === 'MATCH' && (
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Formato</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['VS', 'LIST'] as MatchLayout[]).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleLayoutChange(option)}
                                        aria-pressed={layout === option}
                                        className={`p-2 rounded-lg border text-[11px] font-bold transition-colors ${layout === option
                                            ? 'border-[#d2f000] bg-[#d2f000]/10 text-[#d2f000]'
                                            : 'border-[#353534] bg-[#131313] text-[#c6c9ab] hover:border-[#454932]'
                                            }`}
                                    >
                                        {option === 'VS' ? 'Tarjeta de partido' : 'Pregunta con escudos'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TÍTULO */}
                    <div>
                        <label htmlFor="create-poll-title" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Título / Pregunta *</label>
                        <input id="create-poll-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2.5 rounded-xl outline-none" />
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label htmlFor="create-poll-description" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Contexto (Opcional)</label>
                        <textarea id="create-poll-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2 rounded-xl outline-none resize-none" />
                    </div>

                    {/* FECHAS */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="create-poll-starts" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Inicio *</label>
                            <input id="create-poll-starts" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none font-mono" />
                        </div>
                        <div>
                            <label htmlFor="create-poll-ends" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">
                                Cierre {rules.requiresEndsAt ? '*' : '(no aplica)'}
                            </label>
                            <input
                                id="create-poll-ends"
                                type="datetime-local"
                                required={rules.requiresEndsAt}
                                disabled={!rules.requiresEndsAt}
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none font-mono disabled:opacity-40"
                            />
                        </div>
                    </div>

                    {/* ÍCONO */}
                    <div>
                        <label htmlFor="create-poll-icon" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Ícono Temático</label>
                        <select id="create-poll-icon" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none">
                            <option value="FOOTBALL">⚽ FOOTBALL</option>
                            <option value="TROPHY">🏆 TROPHY</option>
                            <option value="FIRE">🔥 FIRE</option>
                            <option value="USER">👤 USER</option>
                        </select>
                    </div>

                    {/* OPCIONES */}
                    {rules.maxOptions > 0 ? (
                        <div className="flex flex-col gap-2 bg-[#131313] p-3.5 rounded-xl border border-[#353534]">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-[#c6c9ab]">
                                    {type === 'MATCH' && layout === 'VS'
                                        ? 'Equipos (el empate lo agrega el backend)'
                                        : `Opciones (${rules.minOptions === rules.maxOptions ? `exactamente ${rules.minOptions}` : `mínimo ${rules.minOptions}`})`}
                                    :
                                </span>
                                {options.length < rules.maxOptions && (
                                    <button type="button" onClick={handleAddOption} className="text-[11px] font-bold text-[#d2f000] hover:underline flex items-center gap-1">
                                        <PlusCircle className="w-3.5 h-3.5" /> + Añadir
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold text-[#d2f000] w-6">#{idx + 1}</span>
                                        {rules.badges !== 'none' && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTeamIndex(idx)}
                                                aria-label={`Asignar escudo a la opción ${idx + 1}`}
                                                className="w-8 h-8 shrink-0 bg-[#1c1b1b] border border-[#353534] hover:border-[#d2f000] rounded-lg flex items-center justify-center transition-colors group"
                                            >
                                                {opt.badgeUrl ? (
                                                    <img src={opt.badgeUrl} alt="Escudo elegido" className="w-5 h-5 object-contain" />
                                                ) : (
                                                    <Shield className="w-3.5 h-3.5 text-[#909378] group-hover:text-[#d2f000]" />
                                                )}
                                            </button>
                                        )}
                                        <input type="text" required={idx < rules.minOptions} aria-label={`Opción ${idx + 1}`} value={opt.label} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 bg-[#1c1b1b] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-1.5 rounded-lg outline-none" />
                                        {options.length > rules.minOptions && (
                                            <button type="button" onClick={() => handleRemoveOption(idx)} aria-label={`Quitar opción ${idx + 1}`} className="text-[#909378] hover:text-red-400 p-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {missingBadges && (
                                <p className="text-[11px] text-[#ffb4ab]">Elegí el escudo de cada equipo.</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-[#c6c9ab] bg-[#131313] border border-[#353534] rounded-xl p-3">
                            {type === 'INFO'
                                ? 'Una placa informativa no se vota: lleva título, descripción, likes y comentarios.'
                                : 'Las opciones de este tipo las genera el backend.'}
                        </p>
                    )}

                    <label className="flex items-center gap-2 text-[11px] font-bold text-[#c6c9ab]">
                        <input
                            type="checkbox"
                            checked={commentsEnabled}
                            onChange={(e) => setCommentsEnabled(e.target.checked)}
                            className="accent-[#d2f000]"
                        />
                        Permitir comentarios
                    </label>

                    <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#353534]">
                        <button type="button" onClick={onClose} className="text-xs font-bold text-[#c6c9ab] px-4 py-2">Cancelar</button>
                        <button type="submit" disabled={!isAvailable || missingBadges} className="bg-[#d2f000] text-[#191e00] font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                            <PlusCircle className="w-4 h-4" /> Publicar en DB
                        </button>
                    </div>
                </form>
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
