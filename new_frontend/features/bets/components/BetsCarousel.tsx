"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBetsSocket } from '../socket/useBetsSocket';
import { MarketCard } from './MarketCard';
import { useMarkets } from '../hooks/useMarkets';

export const BetsCarousel: React.FC = () => {
    useBetsSocket();

    const { markets, isLoading } = useMarkets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!markets || markets.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev === markets.length - 1 ? 0 : prev + 1));
        }, 10000);
        return () => clearInterval(interval);
    }, [markets, isHovered]);

    if (isLoading) return <div className="text-center text-[#c6c9ab] text-xs py-4">Cargando mercados...</div>;
    if (!markets || markets.length === 0) return null;

    const currentMarket = markets[currentIndex];

    return (
        <div
            className="p-4 border-b border-[#353534] bg-[#1c1b1b]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-between mb-3.5">
                <h3 className="font-headline text-xs font-extrabold text-[#e5e2e1] uppercase tracking-widest flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-base text-[#d2f000]">
                        trending_up
                    </span>
                    MERCADOS DESTACADOS
                </h3>

                {markets.length > 1 && (
                    <div className="flex items-center gap-1">
                        {markets.map((_, idx) => (
                            <button
                                type="button"
                                key={idx}
                                aria-label={`Ver mercado ${idx + 1} de ${markets.length}`}
                                aria-current={idx === currentIndex ? "true" : undefined}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full cursor-pointer transition-all ${idx === currentIndex
                                        ? 'w-5 bg-[#d2f000]'
                                        : 'w-1.5 bg-[#454932] hover:bg-[#c6c9ab]'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>

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
        </div>
    );
};