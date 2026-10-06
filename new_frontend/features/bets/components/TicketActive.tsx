import { useState, useEffect } from 'react';
import { useTicketStore } from '@/store/useTicketStore';
import { betsApi } from '@/features/bets/api/betsApi';
import { useUserStore } from '@/store/useUserStore';
import { Trash2, Receipt, ChevronUp, ChevronDown, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const TicketActive = () => {
    const [isOpenMobile, setIsOpenMobile] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const balance = useUserStore((state) => state.balance);
    const { ticketItems, updateAmount, removeItem, clearTicket } = useTicketStore();

    // En móvil la hoja no se abre sola: taparía los mercados y no dejaría sumar más selecciones.
    // La barra colapsada muestra el contador y se abre al tocarla.
    useEffect(() => {
        if (ticketItems.length > 0) {
            setIsDesktopOpen(true);
        } else {
            setIsOpenMobile(false);
        }
    }, [ticketItems.length]);

    const totalBet = ticketItems.reduce((acc, item) => acc + (item.betAmount || 0), 0);
    const totalPotentialReturn = ticketItems.reduce(
        (acc, item) => acc + (item.betAmount || 0) * ((item.odds ?? 0) + 1),
        0
    );

    const totalNetProfit = totalPotentialReturn - totalBet;

    const hasEnoughCoins = balance >= totalBet;

    const handleConfirmBets = async () => {
        if (!hasEnoughCoins || ticketItems.length === 0) return;

        setIsSubmitting(true);
        try {
            for (const item of ticketItems) {
                await betsApi.placeBet(item.marketId, item.optionId, item.betAmount);
                // Si falla una posterior, las ya hechas no deben quedar en el ticket para reenviarse.
                removeItem(item.marketId, item.optionId);
            }
            toast.success('¡Apuestas confirmadas con éxito!');
            setIsOpenMobile(false);
        } catch (error: any) {
            toast.error(error.message || 'Hubo un error al colocar la apuesta');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = (isMobile = false) => (
        <aside aria-label="Mi ticket" className={`w-full flex-shrink-0 bg-[#1c1b1b] border-[#353534] flex flex-col overflow-hidden ${isMobile ? 'border-none rounded-none h-full' : 'border rounded-xl max-h-[calc(100vh-220px)]'
            }`}>
            <div className="bg-[#131313] px-3 py-2.5 border-b border-[#353534] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#e5e2e1] font-bold text-xs tracking-wider uppercase">
                    <Receipt className="w-4 h-4 text-[#d2f000]" />
                    <h2>MI TICKET</h2>
                </div>
                <div className="flex items-center gap-2">
                    {ticketItems.length > 0 && (
                        <span className="bg-[#d2f000]/10 text-[#d2f000] text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                            {ticketItems.length} SEL.
                        </span>
                    )}
                    {ticketItems.length > 0 && (
                        <button
                            onClick={clearTicket}
                            className="text-[#ffb4ab] hover:text-red-400 text-[11px] transition-colors underline-offset-2 hover:underline"
                        >
                            Limpiar
                        </button>
                    )}
                    {!isMobile && (
                        <button
                            onClick={() => setIsDesktopOpen(false)}
                            className="text-[#c6c9ab] hover:text-[#e5e2e1] p-0.5 rounded hover:bg-[#353534] transition-colors ml-0.5"
                            title="Ocultar Ticket"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {ticketItems.length === 0 ? (
                    <div className="text-center py-8 text-[#c6c9ab] flex flex-col items-center gap-2">
                        <Receipt className="w-10 h-10 opacity-20" />
                        <p className="text-xs font-medium">Tu ticket está vacío.</p>
                        <p className="text-[11px] opacity-60 max-w-[180px]">Hacé clic en las cuotas para agregar apuestas.</p>
                    </div>
                ) : (
                    ticketItems.map((item) => {
                        const odds = (item.odds ?? 0) + 1;
                        const itemBet = item.betAmount || 0;
                        const itemPotential = itemBet * odds;

                        return (
                            <div key={item.id} className="bg-[#131313] border border-[#353534] rounded-lg p-2.5 flex flex-col gap-1.5 relative group hover:border-[#353534]/80 transition-all flex-shrink-0">
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-[10px] text-[#c6c9ab] font-semibold leading-tight pr-5 uppercase tracking-wider line-clamp-1">
                                        {item.matchTitle}
                                    </span>
                                    <button onClick={() => removeItem(item.marketId, item.optionId)} aria-label={`Quitar ${item.selectionLabel} del ticket`} className="absolute top-2 right-2 p-0.5 text-[#353534] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[#e5e2e1]">{item.selectionLabel}</span>
                                    <span className="text-xs font-black text-[#d2f000]">{odds.toFixed(2)}</span>
                                </div>

                                {/* INPUT Y CÁLCULO INDIVIDUAL */}
                                <div className="flex flex-col gap-2 mt-0.5 border-t border-[#353534]/50 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] text-[#c6c9ab]">Monto a apostar</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                                <img src="/icons/chiqui-coin-icon.png" alt="" className="w-full h-full object-cover opacity-80" />
                                            </div>
                                            <input
                                                type="number"
                                                aria-label={`Monto a apostar en ${item.selectionLabel}`}
                                                min="10"
                                                step="50"
                                                value={item.betAmount || ''}
                                                onChange={(e) => updateAmount(item.id, Number(e.target.value))}
                                                placeholder="0"
                                                className="bg-[#1c1b1b] border border-[#353534] text-[#e5e2e1] text-xs font-mono rounded-md px-2 py-1 w-20 text-right focus:border-[#d2f000] outline-none transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {itemBet > 0 && (
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-[#c6c9ab]/70">Retorno potencial:</span>
                                            <span className="text-[#d2f000] font-mono font-bold">{itemPotential.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-3 bg-[#131313] border-t border-[#353534] flex flex-col gap-3 flex-shrink-0">
                <div className="flex flex-col gap-2">

                    {/* Dinero en juego */}
                    <div className="flex justify-between items-center text-xs text-[#c6c9ab]">
                        <span>Total en juego:</span>
                        <div className="flex items-center gap-1 font-mono text-[#e5e2e1]">
                            <img src="/icons/chiqui-coin-icon.png" alt="Coin" className="w-4 h-4 opacity-80" />
                            <span>{totalBet.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Retorno Potencial Bruto */}
                    <div className="flex justify-between items-center text-xs text-[#c6c9ab]">
                        <span>Retorno potencial:</span>
                        <div className="flex items-center gap-1 font-mono text-[#e5e2e1]">
                            <img src="/icons/chiqui-coin-icon.png" alt="Coin" className="w-4 h-4 opacity-80" />
                            <span>{totalPotentialReturn.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-[#353534]/50 my-0.5"></div>

                    {/* Ganancia Neta (Profit) */}
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-[#e5e2e1]">Ganancia neta esperada:</span>
                        <div className="flex items-center gap-1 font-mono text-[#d2f000]">
                            <img src="/icons/chiqui-coin-icon.png" alt="Coin" className="w-5 h-5" />
                            <span>{totalNetProfit > 0 ? `+${totalNetProfit.toFixed(2)}` : "0.00"}</span>
                        </div>
                    </div>
                </div>

                {!hasEnoughCoins && ticketItems.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#ffb4ab] bg-[#ffb4ab]/10 p-2 rounded-lg border border-[#ffb4ab]/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex items-center gap-1">
                            <span>Saldo insuficiente (</span>
                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 inline-flex">
                                <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                            </div>
                            <span>{balance}).</span>
                        </span>
                    </div>
                )}

                <button
                    onClick={handleConfirmBets}
                    aria-label={isSubmitting ? undefined : `Confirmar (${totalBet})`}
                    disabled={ticketItems.length === 0 || !hasEnoughCoins || totalBet <= 0 || isSubmitting}
                    className={`w-full py-2.5 rounded-lg font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${ticketItems.length === 0 || !hasEnoughCoins || totalBet <= 0 || isSubmitting
                        ? 'bg-[#1c1b1b] border border-[#353534] text-[#353534] cursor-not-allowed'
                        : 'bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] shadow-[0_0_12px_rgba(210,240,0,0.25)] cursor-pointer active:scale-95'
                        }`}
                >
                    {isSubmitting ? (
                        <span className="animate-pulse">Procesando...</span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <span>Confirmar (</span>
                            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                                <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                            </div>
                            <span>{totalBet})</span>
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );

    return (
        <>
            {/* VISTA DESKTOP */}
            <div className={`hidden lg:block sticky top-2 z-20 flex-shrink-0 transition-all duration-300 ${isDesktopOpen ? 'w-64' : 'w-auto'}`}>
                {isDesktopOpen ? (
                    renderContent(false)
                ) : (
                    <button
                        onClick={() => setIsDesktopOpen(true)}
                        className="bg-[#1c1b1b] border border-[#353534] p-2.5 rounded-xl hover:bg-[#353534] transition-all flex flex-col items-center gap-2 shadow-lg"
                        title="Abrir Ticket"
                    >
                        <div className="relative">
                            <Receipt className="w-5 h-5 text-[#d2f000]" />
                            {ticketItems.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-[#d2f000] text-[#191e00] text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow">
                                    {ticketItems.length}
                                </span>
                            )}
                        </div>
                    </button>
                )}
            </div>

            {/* VISTA MOBILE: solo con selecciones; bottom-16 la deja arriba de la MobileNav fija */}
            {ticketItems.length > 0 && (
                <div className="block lg:hidden fixed bottom-16 left-0 right-0 z-40">
                    <div
                        className={`bg-[#1c1b1b] border-t border-[#353534] rounded-t-2xl transition-transform duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col ${isOpenMobile ? 'translate-y-0 h-[80vh]' : 'translate-y-[calc(100%-56px)]'
                            }`}
                    >
                        <button
                            onClick={() => setIsOpenMobile(!isOpenMobile)}
                            aria-expanded={isOpenMobile}
                            className="w-full h-[56px] flex-shrink-0 flex items-center justify-between px-4 bg-[#131313] rounded-t-2xl border-b border-[#353534]"
                        >
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-[#d2f000]" />
                                <span className="font-extrabold text-[#e5e2e1] text-xs uppercase tracking-wider">
                                    TICKET ({ticketItems.length})
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-[#d2f000] text-xs flex items-center gap-1">
                                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
                                        <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                                    </div>
                                    <span>{totalBet}</span>
                                </span>
                                {isOpenMobile ? (
                                    <ChevronDown className="w-4 h-4 text-[#c6c9ab]" />
                                ) : (
                                    <ChevronUp className="w-4 h-4 text-[#c6c9ab] animate-bounce" />
                                )}
                            </div>
                        </button>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            {renderContent(true)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};