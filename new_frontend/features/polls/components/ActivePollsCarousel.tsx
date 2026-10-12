"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivePolls } from '../hooks/usePolls';
import { PollCardResume } from './PollCardResume';
import { useNavigationStore } from '@/store/useNavigationStore';

/** Cuántas encuestas entran en el carrusel de la barra derecha. */
const MAX_CAROUSEL_POLLS = 6;

export const ActivePollsCarousel: React.FC = () => {
  const { data: polls, isLoading } = useActivePolls();
  const openPollInFeed = useNavigationStore((state) => state.openPollInFeed);
  // El backend ya ordena: primero las que el usuario no votó, y después las más votadas.
  const carouselPolls = useMemo(() => polls?.slice(0, MAX_CAROUSEL_POLLS), [polls]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Se pausa con el mouse encima o con el foco adentro (WCAG 2.2.2).
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);

  useEffect(() => {
    const isPaused = isHovered || hasFocus;
    if (!carouselPolls || carouselPolls.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        // Si la lista se achicó, se avanza desde el último índice válido.
        const last = carouselPolls.length - 1;
        const base = Math.min(prev, last);
        return base === last ? 0 : base + 1;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [carouselPolls, isHovered, hasFocus]);

  useEffect(() => {
    const handleFocusPoll = (e: CustomEvent) => {
      const targetPollId = e.detail.pollId;
      const index = carouselPolls?.findIndex((p) => p.id === targetPollId) ?? -1;

      if (index !== -1) {
        setCurrentIndex(index);
        setHighlightPulse(true);
        setTimeout(() => setHighlightPulse(false), 2000);
        return;
      }

      // La encuesta existe pero quedó fuera de las 6 del carrusel: se la lleva al feed completo.
      if (polls?.some((poll) => poll.id === targetPollId)) {
        openPollInFeed(targetPollId, false);
      }
    };

    window.addEventListener('focus-poll', handleFocusPoll);
    return () => window.removeEventListener('focus-poll', handleFocusPoll);
  }, [carouselPolls, polls, openPollInFeed]);

  if (isLoading) {
    return <div className="text-center text-[#c6c9ab] text-xs py-4">Cargando encuestas...</div>;
  }

  if (!carouselPolls || carouselPolls.length === 0) {
    return null;
  }

  // Si la lista se achicó en una actualización, no apuntar más allá del final.
  const safeIndex = Math.min(currentIndex, carouselPolls.length - 1);
  const currentPoll = carouselPolls[safeIndex];

  return (
    <motion.div
      className="p-4 border-t border-[#454932] bg-[#1c1b1b] rounded-b-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        // Solo se reanuda cuando el foco sale del carrusel, no cuando se mueve dentro.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasFocus(false);
      }}
      animate={highlightPulse ? { boxShadow: "0px 0px 15px 0px rgba(210, 240, 0, 0.4)" } : { boxShadow: "none" }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-['Montserrat',sans-serif] text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#d2f000]">
            how_to_vote
          </span>
          ENCUESTA DE LA TRIBUNA
        </h3>

        {carouselPolls.length > 1 && (
          <div className="flex items-center gap-1">
            {carouselPolls.map((_, idx) => (
              <button
                type="button"
                key={idx}
                aria-label={`Ver encuesta ${idx + 1} de ${carouselPolls.length}`}
                aria-current={idx === safeIndex ? "true" : undefined}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${idx === safeIndex
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
          key={currentPoll.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <PollCardResume
            poll={currentPoll}
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
