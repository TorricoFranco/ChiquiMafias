import React, { useState } from 'react';
import { X, PlusCircle, Shield } from 'lucide-react';
import { MarketType } from '../../types';
import { getTeamsList } from '@/data/teamData';
import { TeamSelectorModalAPI } from '@/features/auth/components/TeamSelectorModalAPI';

interface CreateMarketModalProps {
    onClose: () => void;
    onCreate: (marketData: {
        title: string;
        type: MarketType;
        category: string;
        description: string;
        closesAt: string;
        metadata?: any;
        options: {
            name: string;
            initialProb: number;
            badgeUrl?: string;
            teamId?: string;
        }[];
    }) => void;
}

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({
    onClose,
    onCreate,
}) => {
    const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Liga Profesional');
    const [type, setType] = useState<MarketType>('CUSTOM');
    const [description, setDescription] = useState('');
    const [closesAt, setClosesAt] = useState(
        new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );

    const [options, setOptions] = useState<{
        name: string;
        initialProb: number;
        badgeUrl?: string;
        teamId?: string;
    }>([
        { name: 'Local', initialProb: 33 },
        { name: 'Empate', initialProb: 34 },
        { name: 'Visitante', initialProb: 33 },
    ]);

    const handleTeamSelect = (id: string, name: string, badgeUrl: string) => {
        if (activeTeamIndex === null) return;

        setOptions((prev) => {
            const copy = [...prev];
            copy[activeTeamIndex] = {
                ...copy[activeTeamIndex],
                name: name,
                badgeUrl: badgeUrl,
                teamId: id,
            };
            return copy;
        });

        setActiveTeamIndex(null);
    };

    const handleAddOption = () => {
        setOptions((prev) => [
            ...prev,
            { name: `Nueva Opción ${prev.length + 1}`, initialProb: 20 },
        ]);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleOptionChange = (
        index: number,
        field: 'name' | 'initialProb',
        value: string | number
    ) => {
        setOptions((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || options.some((o) => !o.name.trim())) return;

        let metadata: any = undefined;

        if (type === 'MATCH') {
            const home = options[0];
            const away = options[2];

            const homeTeam = home?.teamId
                ? {
                    name: home.name,
                    short: home.name.substring(0, 3).toUpperCase(),
                    logoUrl: home.badgeUrl || home.teamId,
                }
                : undefined;

            const awayTeam = away?.teamId
                ? {
                    name: away.name,
                    short: away.name.substring(0, 3).toUpperCase(),
                    logoUrl: away.badgeUrl || away.teamId,
                }
                : undefined;

            if (homeTeam || awayTeam) {
                metadata = {
                    ...(homeTeam && { homeTeam }),
                    ...(awayTeam && { awayTeam }),
                };
            }
        }

        onCreate({
            title: title.trim(),
            category: category.trim(),
            type,
            description: description.trim(),
            closesAt: new Date(closesAt).toISOString(),
            metadata,
            options: options.map((opt) => ({
                name: opt.name.trim(),
                initialProb: Number(opt.initialProb) || 10,
                badgeUrl: opt.badgeUrl,
                teamId: opt.teamId,
            })),
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-lg w-full p-6 z-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-[#d2f000]" />
                        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">
                            Crear Mercado de Apuestas
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-[#c6c9ab] hover:text-[#e5e2e1]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">
                            Título del Mercado *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Boca vs River - ¿Quién gana?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2.5 rounded-xl outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Categoría</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Tipo de Mercado</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as MarketType)}
                                className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
                            >
                                <option value="CUSTOM">CUSTOM (Especial / Polémica)</option>
                                <option value="MATCH">MATCH (Partido Directo)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Descripción</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2 rounded-xl outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Cierre (closesAt) *</label>
                        <input
                            type="datetime-local"
                            required
                            value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)}
                            className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none font-mono"
                        />
                    </div>

                    {/* SECCIÓN DE OPCIONES */}
                    <div className="flex flex-col gap-2 bg-[#131313] p-3.5 rounded-xl border border-[#353534]">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase text-[#c6c9ab]">
                                Opciones & Probabilidad Inicial (%):
                            </span>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="text-[11px] font-bold text-[#d2f000] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <PlusCircle className="w-3.5 h-3.5" /> + Añadir opción
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 mt-1">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    {type === 'MATCH' && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTeamIndex(idx)}
                                            className="w-9 h-9 shrink-0 bg-[#1c1b1b] border border-[#353534] hover:border-[#d2f000] rounded-lg flex items-center justify-center transition-colors overflow-hidden group"
                                            title="Asignar club a esta opción"
                                        >
                                            {opt.badgeUrl ? (
                                                <img src={opt.badgeUrl} alt="Escudo" className="w-5 h-5 object-contain" />
                                            ) : (
                                                <Shield className="w-4 h-4 text-[#909378] group-hover:text-[#d2f000]" />
                                            )}
                                        </button>
                                    )}

                                    <input
                                        type="text"
                                        required
                                        placeholder="Nombre (Ej: Boca, River, Empate)"
                                        value={opt.name}
                                        onChange={(e) => handleOptionChange(idx, 'name', e.target.value)}
                                        className="flex-1 bg-[#1c1b1b] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-lg outline-none"
                                    />

                                    <div className="flex items-center gap-1 bg-[#1c1b1b] border border-[#353534] px-2 py-1.5 rounded-lg h-9">
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={opt.initialProb}
                                            onChange={(e) => handleOptionChange(idx, 'initialProb', parseInt(e.target.value) || 0)}
                                            className="w-10 bg-transparent text-xs text-[#d2f000] font-mono outline-none text-right font-bold"
                                        />
                                        <span className="text-[10px] text-[#909378]">%</span>
                                    </div>

                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(idx)}
                                            className="text-[#909378] hover:text-red-400 p-1 cursor-pointer shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#353534]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-bold text-[#c6c9ab] hover:text-[#e5e2e1] px-4 py-2"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] font-black text-xs px-6 py-2.5 rounded-xl uppercase transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Crear Mercado</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal de Selección de Equipo */}
            {activeTeamIndex !== null && (
                <TeamSelectorModalAPI
                    isOpen={activeTeamIndex !== null}
                    onClose={() => setActiveTeamIndex(null)}
                    teams={getTeamsList()}
                    onSelect={(teamId, teamName, badgeUrl) =>
                        handleTeamSelect(teamId, teamName, badgeUrl)
                    }
                />
            )}
        </div>
    );
};