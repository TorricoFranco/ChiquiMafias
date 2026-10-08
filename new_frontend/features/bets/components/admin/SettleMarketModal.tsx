import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Market } from '../../types';

interface SettleMarketModalProps {
    market: Market;
    onClose: () => void;
    onConfirm: (
        marketId: string,
        status: 'SETTLED' | 'REFUNDED',
        winningOptionId?: string
    ) => void;
}

export const SettleMarketModal: React.FC<SettleMarketModalProps> = ({
    market,
    onClose,
    onConfirm,
}) => {
    const [settleAction, setSettleAction] = useState<'SETTLED' | 'REFUNDED'>('SETTLED');
    const [selectedWinningOptionId, setSelectedWinningOptionId] = useState<string>('');

    useEffect(() => {
        if (market.options.length > 0) {
            setSelectedWinningOptionId(market.options[0].id);
        }
    }, [market]);

    const handleSettleConfirm = () => {
        if (settleAction === 'SETTLED' && !selectedWinningOptionId) {
            alert('Por favor seleccioná la opción ganadora.');
            return;
        }

        onConfirm(
            market.id,
            settleAction,
            settleAction === 'SETTLED' ? selectedWinningOptionId : undefined
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Liquidar Mercado de Apuestas"
                className="relative bg-[#1c1b1b] border border-[#d2f000]/60 rounded-2xl max-w-lg w-full p-6 z-10 shadow-2xl animate-in zoom-in-95"
            >
                <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-[#d2f000]" />
                        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">
                            Liquidar Mercado de Apuestas
                        </h3>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="text-[#c6c9ab] hover:text-[#e5e2e1]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-[#131313] p-3 rounded-xl border border-[#353534]">
                        <span className="text-[10px] text-[#909378] font-bold uppercase">
                            Mercado:
                        </span>
                        <p className="font-black text-sm text-[#e5e2e1] mt-0.5">{market.title}</p>
                        <span className="text-xs text-[#c6c9ab]">{market.description}</span>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-2">
                            Tipo de Resolución *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                aria-pressed={settleAction === 'SETTLED'}
                                onClick={() => setSettleAction('SETTLED')}
                                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${settleAction === 'SETTLED'
                                    ? 'bg-[#d2f000]/15 border-[#d2f000] text-[#d2f000]'
                                    : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                                    }`}
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>SETTLED (Declarar Ganador)</span>
                            </button>

                            <button
                                type="button"
                                aria-pressed={settleAction === 'REFUNDED'}
                                onClick={() => setSettleAction('REFUNDED')}
                                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${settleAction === 'REFUNDED'
                                    ? 'bg-red-500/20 border-red-500 text-red-300'
                                    : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                                    }`}
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>REFUNDED (Reembolsar Todo)</span>
                            </button>
                        </div>
                    </div>

                    {settleAction === 'SETTLED' && (
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-2">
                                Seleccioná la Opción Ganadora *
                            </label>
                            <div className="flex flex-col gap-2">
                                {market.options.map((opt) => (
                                    <label
                                        key={opt.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedWinningOptionId === opt.id
                                            ? 'bg-[#d2f000]/10 border-[#d2f000] text-[#e5e2e1]'
                                            : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="winningOption"
                                                value={opt.id}
                                                checked={selectedWinningOptionId === opt.id}
                                                onChange={() => setSelectedWinningOptionId(opt.id)}
                                                className="accent-[#d2f000]"
                                            />
                                            <span className="font-bold text-xs">{opt.name}</span>
                                        </div>
                                        <span className="font-mono text-xs text-[#d2f000]">
                                            {(opt.totalStaked || 0).toLocaleString('es-AR')} pts
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {settleAction === 'REFUNDED' && (
                        <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-300 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>
                                Se devolverán las monedas a todos los usuarios que hayan apostado en este
                                mercado de forma inmediata.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-[#353534]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold text-[#c6c9ab] hover:text-[#e5e2e1] px-4 py-2"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSettleConfirm}
                        className="bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] font-black text-xs px-6 py-2.5 rounded-xl uppercase transition-all shadow-md cursor-pointer active:scale-95"
                    >
                        Confirmar Liquidación
                    </button>
                </div>
            </div>
        </div>
    );
};