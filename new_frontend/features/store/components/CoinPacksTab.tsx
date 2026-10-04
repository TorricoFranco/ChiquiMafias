import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { CoinPack } from '@/features/coins-shop/types'; // Asegurate de actualizar tu type con isPopular

interface CoinPacksTabProps {
    packs: CoinPack[];
    onBuyPack: (packId: string) => void;
}

export const CoinPacksTab: React.FC<CoinPacksTabProps> = ({ packs, onBuyPack }) => {
    const activePacks = packs.filter(pack => pack.isActive);

    return (
        <section className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Header de la sección */}
            <div className="flex flex-col gap-1 items-center text-center">
                <h2 className="font-extrabold text-2xl md:text-3xl text-white uppercase tracking-tight flex items-center gap-2">
                    Tienda de Chiqui-Coins
                </h2>
                <p className="text-sm text-[#909378] max-w-md">
                    Cargá saldo al instante, comprá ventajas tácticas y dominá la liga.
                </p>
            </div>

            {/* Grilla de Packs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activePacks.map((pack) => (
                    <div
                        key={pack.id}
                        className={`group bg-[#151515] rounded-3xl p-6 flex flex-col relative transition-all duration-300 hover:-translate-y-2 ${pack.isPopular // Cambiado a usar la propiedad del modelo
                                ? 'border-2 border-[#009ee3] shadow-[0_10px_40px_rgba(0,158,227,0.15)]'
                                : 'border border-[#2a2a2a] hover:border-[#454932] shadow-lg'
                            }`}
                    >
                        {/* Etiqueta Popular */}
                        {pack.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#009ee3] to-[#0070a3] text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-current" />
                                Más elegido
                            </div>
                        )}

                        {/* Título y Descripción */}
                        <div className="text-center mb-6 mt-2">
                            <h3 className="font-extrabold text-xl text-white uppercase tracking-tight leading-none mb-2">
                                {pack.name}
                            </h3>
                            <p className="text-[13px] text-[#8a8d73] leading-snug min-h-[40px]">
                                {pack.description}
                            </p>
                        </div>

                        {/* Área de la Moneda (El Hook de Dopamina) */}
                        <div className="flex flex-col items-center justify-center flex-grow mb-6 relative">
                            {pack.bonusCoins > 0 && (
                                <div className="absolute -top-2 -right-2 z-10 bg-[#22c55e] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse">
                                    ¡+{pack.bonusCoins} GRATIS!
                                </div>
                            )}

                            <div className="relative mb-3 group-hover:scale-110 transition-transform duration-300">
                                {/* Imagen con bordes redondeados forzados */}
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmqR0yfmW-RNHAww8KglPrSb5-eXhosZ10nxIgFWLlI1F86NSV2ob8XEkM6orsgi8d9MitdOkdraAQpcp6NJj9L6sUeFSL5tcQxKRSk7lssgzV54Rd5TImekLRXFm7RUNjyJd5oHB1gXq2K8jRjfGSXvROjAVjSOlQit7LZneMUd6t936WA75yKsOHzg61Qm05tNJqlnojXCXCMW8mPFZLc3v-8tYwa2dgWAI6ALCGHBW-VisLCHsPTPkpV8EovyBJaYg"
                                    alt="Chiqui Coins"
                                    className="w-16 h-16 rounded-full object-cover shadow-2xl"
                                />
                                {/* Efecto de brillo de fondo */}
                                <div className="absolute inset-0 bg-[#d2f000] blur-2xl opacity-10 rounded-full"></div>
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className="font-black text-4xl font-mono text-[#d2f000] tracking-tighter">
                                    {pack.coinsAmount.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>

                        {/* Precio y Botón */}
                        <div className="mt-auto flex flex-col gap-3">
                            <div className="text-center">
                                <span className="text-[#8a8d73] text-sm font-bold mr-1">AR$</span>
                                <span className="font-black text-2xl text-white">
                                    {pack.priceARS.toLocaleString('es-AR')}
                                </span>
                            </div>

                            <button
                                onClick={() => onBuyPack(pack.id)}
                                className={`w-full font-extrabold text-sm py-3.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${pack.isPopular
                                        ? 'bg-gradient-to-r from-[#009ee3] to-[#007cd6] hover:from-[#0086c3] hover:to-[#006bb8] text-white border border-[#009ee3]/50'
                                        : 'bg-[#222] hover:bg-[#009ee3] text-white border border-[#333] hover:border-[#009ee3]'
                                    }`}
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Comprar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Trust Badge global en lugar de saturar las tarjetas */}
            <div className="flex items-center justify-center gap-2 mt-4 text-[#777]">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-medium">Pagos seguros procesados por <strong className="text-[#009ee3]">Mercado Pago</strong></span>
            </div>
        </section>
    );
};