import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivePolls } from '../hooks/usePolls';
import { PollCardResume } from './PollCardResume';

export const ActivePollsCarousel: React.FC = () => {
  const { data: polls, isLoading } = useActivePolls();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);

  useEffect(() => {
    if (!polls || polls.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === polls.length - 1 ? 0 : prev + 1));
    }, 8000);

    return () => clearInterval(interval);
  }, [polls, isHovered]);

  useEffect(() => {
    const handleFocusPoll = (e: CustomEvent) => {
      const targetPollId = e.detail.pollId;
      const index = polls?.findIndex(p => p.id === targetPollId);

      if (index !== undefined && index !== -1) {
        setCurrentIndex(index);
        setHighlightPulse(true);
        setTimeout(() => setHighlightPulse(false), 2000);
      }
    };

    window.addEventListener('focus-poll' as any, handleFocusPoll);
    return () => window.removeEventListener('focus-poll' as any, handleFocusPoll);
  }, [polls])

  if (isLoading) {
    return <div className="text-center text-[#c6c9ab] text-xs py-4">Cargando encuestas...</div>;
  }

  if (!polls || polls.length === 0) {
    return null;
  }

  const currentPoll = polls[currentIndex];

  return (
    <motion.div
      className="p-4 border-t border-[#454932] bg-[#1c1b1b] rounded-b-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        {polls.length > 1 && (
          <div className="flex gap-1">
            {polls.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${idx === currentIndex ? 'bg-[#d2f000]' : 'bg-[#454932] hover:bg-[#c6c9ab]'
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