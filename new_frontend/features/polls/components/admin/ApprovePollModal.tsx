import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AdminPollItem } from '../../types';
import { toDateTimeLocalValue } from '@/lib/dateTimeLocal';

interface ApprovePollModalProps {
    poll: AdminPollItem;
    onClose: () => void;
    onConfirm: (pollId: string, startsAt: string, endsAt: string) => void;
}

export const ApprovePollModal: React.FC<ApprovePollModalProps> = ({ poll, onClose, onConfirm }) => {
    const [startsAt, setStartsAt] = useState(() => toDateTimeLocalValue(new Date()));
    const [endsAt, setEndsAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Aprobar Encuesta"
                className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-md w-full p-6 z-10 shadow-2xl"
            >
                <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#d2f000]" />
                        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">Aprobar Encuesta</h3>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="text-[#c6c9ab] hover:text-[#e5e2e1]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="bg-[#131313] p-3 rounded-xl border border-[#353534]">
                        <span className="text-[10px] text-[#909378] uppercase font-bold">Pregunta:</span>
                        <p className="font-bold text-xs text-[#e5e2e1] mt-0.5">{poll.title}</p>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-[#d2f000]">Por: @{poll.user?.username}</span>
                            <span className="text-[10px] font-mono font-bold text-[#c6c9ab]">Ícono: {poll.icon || 'FOOTBALL'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="approve-poll-starts" className="text-[10px] font-bold uppercase text-[#c6c9ab]">Inicio (startsAt)</label>
                        <input id="approve-poll-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="bg-[#131313] border border-[#353534] text-xs text-[#e5e2e1] px-3 py-2 rounded-lg outline-none font-mono" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="approve-poll-ends" className="text-[10px] font-bold uppercase text-[#c6c9ab]">Cierre (endsAt)</label>
                        <input id="approve-poll-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="bg-[#131313] border border-[#353534] text-xs text-[#e5e2e1] px-3 py-2 rounded-lg outline-none font-mono" />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-[#353534]">
                    <button type="button" onClick={onClose} className="text-xs font-bold text-[#c6c9ab] px-4 py-2">Cancelar</button>
                    <button type="button" onClick={() => onConfirm(poll.id, new Date(startsAt).toISOString(), new Date(endsAt).toISOString())} className="bg-[#d2f000] text-[#191e00] font-black text-xs px-5 py-2.5 rounded-xl">
                        Confirmar y Publicar
                    </button>
                </div>
            </div>
        </div>
    );
};