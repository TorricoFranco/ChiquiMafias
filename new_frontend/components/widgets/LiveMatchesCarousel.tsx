"use client";

import React, { useState, useEffect } from "react";
import { MatchScorecard } from "./MatchScorecard";

interface LiveMatchesCarouselProps {
    matches: any[];
}

export const LiveMatchesCarousel: React.FC<LiveMatchesCarouselProps> = ({ matches }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (matches.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => 
                prevIndex === matches.length - 1 ? 0 : prevIndex + 1
            );
        }, 5000);

        return () => clearInterval(interval);
    }, [matches.length]);

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === 0 ? matches.length - 1 : prevIndex - 1
        );
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === matches.length - 1 ? 0 : prevIndex + 1
        );
    };

    if (!matches || matches.length === 0) return null;

    return (
        <div className="bg-[#1e1414] border border-red-900/40 rounded-xl p-4 overflow-hidden w-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-['Montserrat',sans-serif] text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                    EN VIVO
                </h3>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#d2f000]">
                        {currentIndex + 1} de {matches.length}
                    </span>
                    
                    {matches.length > 1 && (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handlePrev} 
                                className="p-1 flex items-center justify-center bg-[#2a1c1c] hover:bg-red-900/40 rounded text-red-500 transition-colors border border-red-900/30"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <button 
                                onClick={handleNext} 
                                className="p-1 flex items-center justify-center bg-[#2a1c1c] hover:bg-red-900/40 rounded text-red-500 transition-colors border border-red-900/30"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-hidden relative w-full rounded-xl">
                <div 
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {matches.map((match) => (
                        <div key={match.id} className="w-full flex-shrink-0">
                            <MatchScorecard match={match} showOdds={false} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};