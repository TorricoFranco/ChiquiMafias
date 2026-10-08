import React, { useState } from 'react';
import { PlusCircle, X, Trash2 } from 'lucide-react';
import { toDateTimeLocalValue } from '@/lib/dateTimeLocal';

interface CreatePollModalProps {
    onClose: () => void;
    onSubmit: (
        title: string,
        description: string,
        options: { id: number; label: string }[],
        startsAt: string,
        endsAt: string,
        icon: string
    ) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('FOOTBALL');
    const [startsAt, setStartsAt] = useState(() => toDateTimeLocalValue(new Date()));
    const [endsAt, setEndsAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 48 * 60 * 60 * 1000)));
    const [options, setOptions] = useState<string[]>(['Boca Juniors', 'River Plate', 'Empate']);

    const handleAddOption = () => setOptions((prev) => [...prev, `Opción ${prev.length + 1}`]);

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, val: string) => {
        const copy = [...options];
        copy[index] = val;
        setOptions(copy);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || options.some((opt) => !opt.trim())) return;

        const formattedOptions = options.map((label, idx) => ({
            id: idx + 1,
            label: label.trim(),
        }));

        onSubmit(
            title.trim(),
            description.trim(),
            formattedOptions,
            new Date(startsAt).toISOString(),
            new Date(endsAt).toISOString(),
            icon
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-lg w-full p-6 z-10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-[#d2f000]" />
                        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">Crear Encuesta Oficial (Admin)</h3>
                    </div>
                    <button onClick={onClose} className="text-[#c6c9ab] hover:text-[#e5e2e1]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* TÍTULO */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Título / Pregunta *</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2.5 rounded-xl outline-none" />
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Contexto (Opcional)</label>
                        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2 rounded-xl outline-none resize-none" />
                    </div>

                    {/* FECHAS */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Inicio *</label>
                            <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none font-mono" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Cierre *</label>
                            <input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none font-mono" />
                        </div>
                    </div>

                    {/* ÍCONO */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">Ícono Temático</label>
                        <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none">
                            <option value="FOOTBALL">⚽ FOOTBALL</option>
                            <option value="TROPHY">🏆 TROPHY</option>
                            <option value="FIRE">🔥 FIRE</option>
                            <option value="USER">👤 USER</option>
                        </select>
                    </div>

                    {/* OPCIONES */}
                    <div className="flex flex-col gap-2 bg-[#131313] p-3.5 rounded-xl border border-[#353534]">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase text-[#c6c9ab]">Opciones (Mínimo 2):</span>
                            <button type="button" onClick={handleAddOption} className="text-[11px] font-bold text-[#d2f000] hover:underline flex items-center gap-1">
                                <PlusCircle className="w-3.5 h-3.5" /> + Añadir
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-[#d2f000] w-6">#{idx + 1}</span>
                                    <input type="text" required value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 bg-[#1c1b1b] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-1.5 rounded-lg outline-none" />
                                    {options.length > 2 && (
                                        <button type="button" onClick={() => handleRemoveOption(idx)} className="text-[#909378] hover:text-red-400 p-1">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#353534]">
                        <button type="button" onClick={onClose} className="text-xs font-bold text-[#c6c9ab] px-4 py-2">Cancelar</button>
                        <button type="submit" className="bg-[#d2f000] text-[#191e00] font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5">
                            <PlusCircle className="w-4 h-4" /> Publicar en DB
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};