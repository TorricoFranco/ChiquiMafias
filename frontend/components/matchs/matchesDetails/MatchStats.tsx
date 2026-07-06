"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react"; // O cualquier icono que uses

interface MatchStatsProps {
  stats: any[];
}

// Las 4 que SIEMPRE se ven
const MAIN_STATS: Record<string, string> = {
  ball_possession: "Posesión",
  total_shots: "Remates totales",
  shots_on_goal: "Remates al arco",
  corner_kicks: "Córners",
};

// El resto que se ocultan
const EXTRA_STATS: Record<string, string> = {
  fouls: "Faltas",
  yellow_cards: "Tarjetas Amarillas",
  red_cards: "Tarjetas Rojas",
  goalkeeper_saves: "Atajadas",
  total_passes: "Pases totales",
  "passes_%": "Precisión de pases",
  expected_goals: "xG (Goles Esperados)"
};

export const MatchStats = ({ stats }: MatchStatsProps) => {
  const [showAll, setShowAll] = useState(false);

  console.log(stats)
  if (!stats || stats.length < 2) return null;

  const home = stats[0];
  const away = stats[1];

  const parseVal = (val: string | number | null) => {
    if (val === null) return 0;
    if (typeof val === "string") return parseInt(val.replace("%", ""));
    return val;
  };

  // Función para renderizar una fila de estadística
  const renderStatRow = (key: string, label: string) => {
    const homeValRaw = home.statistics[key];
    const awayValRaw = away.statistics[key];
    const homeVal = parseVal(homeValRaw);
    const awayVal = parseVal(awayValRaw);
    const total = homeVal + awayVal;
    const homePercent = total === 0 ? 50 : (homeVal / total) * 100;

    return (
      <div key={key} className="flex flex-col mb-5">
        <div className="flex justify-between items-end mb-1 px-1 text-[13px]">
          <span className="font-black text-blue-400">{homeValRaw ?? 0}</span>
          <span className="uppercase font-bold text-gray-500 text-[10px] tracking-widest">{label}</span>
          <span className="font-black text-orange-400">{awayValRaw ?? 0}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${homePercent}%` }}
            className="h-full bg-blue-500"
            transition={{ duration: 1, type: "spring" }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - homePercent}%` }}
            className="h-full bg-orange-500"
            transition={{ duration: 1, type: "spring" }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#121212] rounded-3xl p-5 border border-white/10 shadow-xl">
      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 text-center">
        Estadísticas del Partido
      </h3>

      {/* Renderizamos las Principales */}
      {Object.entries(MAIN_STATS).map(([key, label]) => renderStatRow(key, label))}

      {/* Acordeón para las Extra */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {Object.entries(EXTRA_STATS).map(([key, label]) => renderStatRow(key, label))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Ver Más / Menos */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
          {showAll ? "Ver Menos" : "Ver Más Estadísticas"}
        </span>
        <motion.div animate={{ rotate: showAll ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white" />
        </motion.div>
      </button>
    </div>
  );
};