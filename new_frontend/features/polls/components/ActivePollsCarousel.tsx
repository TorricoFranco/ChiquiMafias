"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivePolls } from '../hooks/usePolls';
import { PollCardResume } from './PollCardResume';
import { PollCardResumeSkeleton } from './PollCardResumeSkeleton';

/** Cuántas encuestas entran en el carrusel de la barra derecha. */
const MAX_CAROUSEL_POLLS = 6;

const heading = (
  <h3 className="font-['Montserrat',sans-serif] text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
    <span className="material-symbols-outlined text-sm text-[#d2f000]">
      how_to_vote
    </span>
    ENCUESTA DE LA TRIBUNA
  </h3>
);

export const ActivePollsCarousel: React.FC = () => {
  const { data: polls, isLoading } = useActivePolls();
  // El backend ya ordena: primero las que el usuario no votó, y después las más votadas.
  const carouselPolls = useMemo(() => polls?.slice(0, MAX_CAROUSEL_POLLS), [polls]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Se pausa con el mouse encima o con el foco adentro (WCAG 2.2.2).
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

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

  if (isLoading) {
    return (
      <div role="status" className="p-4 border-t border-[#454932] bg-[#1c1b1b] rounded-b-xl">
        <div className="mb-3">{heading}</div>
        <span className="sr-only">Cargando encuestas</span>
        <PollCardResumeSkeleton />
        {/* Reserva el lugar de los puntos, igual que cuando llegan los datos. */}
        <div aria-hidden="true" className="mt-3 h-6" />
      </div>
    );
  }

  if (!carouselPolls || carouselPolls.length === 0) {
    return null;
  }

  // Si la lista se achicó en una actualización, no apuntar más allá del final.
  const safeIndex = Math.min(currentIndex, carouselPolls.length - 1);
  const currentPoll = carouselPolls[safeIndex];

  return (
    <div
      className="p-4 border-t border-[#454932] bg-[#1c1b1b] rounded-b-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        // Solo se reanuda cuando el foco sale del carrusel, no cuando se mueve dentro.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasFocus(false);
      }}
    >
      <div className="mb-3">{heading}</div>

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

      {/* La fila siempre ocupa su lugar; con una sola encuesta queda vacía. */}
      <div className="flex items-center justify-center mt-3 h-6">
        {carouselPolls.length > 1 && carouselPolls.map((_, idx) => (
          <button
            type="button"
            key={idx}
            aria-label={`Ver encuesta ${idx + 1} de ${carouselPolls.length}`}
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
