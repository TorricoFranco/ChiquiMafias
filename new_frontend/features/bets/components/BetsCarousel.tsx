"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBetsSocket } from '../socket/useBetsSocket';
import { MarketCard } from './MarketCard';
import { MarketCardSkeleton } from './MarketCardSkeleton';
import { useMarkets } from '../hooks/useMarkets';

const heading = (
    <h3 className="font-headline text-xs font-extrabold text-[#e5e2e1] uppercase tracking-widest flex items-center gap-2">
        <span aria-hidden="true" className="material-symbols-outlined text-base text-[#d2f000]">
            trending_up
        </span>
        MERCADOS DESTACADOS
    </h3>
);

export const BetsCarousel: React.FC = () => {
    useBetsSocket();

    const { markets, isLoading } = useMarkets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!markets || markets.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                // Si la lista se achicó, se avanza desde el último índice válido.
                const last = markets.length - 1;
                const base = Math.min(prev, last);
                return base === last ? 0 : base + 1;
            });
        }, 10000);
        return () => clearInterval(interval);
    }, [markets, isHovered]);

    if (isLoading) {
        return (
            <div role="status" className="p-4 border-b border-[#353534] bg-[#1c1b1b]">
                <div className="mb-3.5">{heading}</div>
                <span className="sr-only">Cargando mercados</span>
                <MarketCardSkeleton />
                {/* Reserva el lugar de los puntos, igual que cuando llegan los datos. */}
                <div aria-hidden="true" className="mt-3 h-6" />
            </div>
        );
    }
    if (!markets || markets.length === 0) return null;

    const safeIndex = Math.min(currentIndex, markets.length - 1);
    const currentMarket = markets[safeIndex];

    return (
        <div
            className="p-4 border-b border-[#353534] bg-[#1c1b1b]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="mb-3.5">{heading}</div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentMarket.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <MarketCard
                        market={currentMarket}
                        onInteract={() => setIsHovered(true)}
                        isCarouselMode={true}
                        isDirectBet={true}
                    />
                </motion.div>
            </AnimatePresence>

            {/* La fila siempre ocupa su lugar; con un solo mercado queda vacía. */}
            <div className="flex items-center justify-center mt-3 h-6">
                {markets.length > 1 && markets.map((_, idx) => (
                    <button
                        type="button"
                        key={idx}
                        aria-label={`Ver mercado ${idx + 1} de ${markets.length}`}
                        aria-current={idx === safeIndex ? "true" : undefined}
                        onClick={() => setCurrentIndex(idx)}
                        className="group flex items-center justify-center w-6 h-6 rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d2f000] outline-offset-2"
                    >
                        <span
                            className={`block h-1.5 rounded-full transition-all ${idx === safeIndex
                                    ? 'w-5 bg-[#d2f000]'
                                    : 'w-1.5 bg-[#454932] group-hover:bg-[#c6c9ab]'
                                }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};
