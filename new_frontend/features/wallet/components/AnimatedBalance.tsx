"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface AnimatedBalanceProps {
    balance: number;
    loading: boolean;
}

export const AnimatedBalance: React.FC<AnimatedBalanceProps> = ({ balance, loading }) => {
    const [displayBalance, setDisplayBalance] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const searchParams = useSearchParams();

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (loading) return;

        if (isFirstRender.current) {
            isFirstRender.current = false;

            const isMpSuccess = searchParams.get('status') === 'success';
            const savedPrevBalance = localStorage.getItem('prePurchaseBalance');

            if (isMpSuccess && savedPrevBalance) {
                setDisplayBalance(Number(savedPrevBalance));
                localStorage.removeItem('prePurchaseBalance');
            } else {
                setDisplayBalance(balance);
                return;
            }
        }

        if (displayBalance === balance) return;

        setIsAnimating(true);
        const startValue = displayBalance;
        const endValue = balance;
        const duration = 1000;
        let startTimestamp: number | null = null;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (endValue - startValue) * easeProgress);

            setDisplayBalance(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayBalance(endValue);
                setIsAnimating(false);
            }
        };

        window.requestAnimationFrame(step);

    }, [balance, loading, searchParams]);

    if (loading) return <span>...</span>;

    return (
        <span
            className={`font-bold text-xs sm:text-sm font-mono inline-block transition-all duration-300 ${isAnimating
                    ? balance > displayBalance
                        ? 'scale-125 text-white drop-shadow-[0_0_10px_rgba(210,240,0,0.8)]'
                        : 'scale-110 text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]'
                    : 'scale-100 text-[#d2f000]'
                }`}
        >
            {displayBalance.toLocaleString('es-AR')}
        </span>
    );
};