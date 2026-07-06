"use client";

import React, { useState, useEffect } from "react";
import { Calculator, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export const SimulatorPanel = ({ fixtures, onSimulate }: any) => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Filtrar solo partidos que NO sean playoff
  const regularFixtures = fixtures?.map((day: any) => ({
    ...day,
    matches: day.matches?.filter((m: any) => !m.isPlayoff) || []
  })).filter((day: any) => day.matches.length > 0) || [];

  useEffect(() => {
    setResults({});
    setCurrentStep(0);
  }, [fixtures]);

  if (!regularFixtures || regularFixtures.length === 0) {
    return (
      <div className="h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center italic text-gray-500 text-sm">
        No hay partidos del torneo para simular
      </div>
    );
  }

  const activeDay = regularFixtures[currentStep];

  const handleScoreChange = (matchId: string, side: 'h' | 'a', value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    if (value.length > 2) return;

    const val = value === "" ? "" : parseInt(value, 10);
    const match = activeDay?.matches.find((m: any) => m.id === matchId);
    if (!match) return;

    const currentMatchResults = {
      ...results[matchId],
      [side]: val,
      homeTeamId: match.home_team.id,
      awayTeamId: match.away_team.id,
      isSimulated: true,
    };

    const newResults = { ...results, [matchId]: currentMatchResults };
    setResults(newResults);

    const homeScore = newResults[matchId].h;
    const awayScore = newResults[matchId].a;

    // Solo simulamos si ambos son números
    if (typeof homeScore === 'number' && typeof awayScore === 'number') {
      onSimulate(newResults);
    } else {
      const filtered = { ...newResults };
      delete filtered[matchId];
      onSimulate(filtered);
    }
  };

  return (
    <div className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Cabecera */}
      <div className="px-6 py-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="w-4 h-4 text-sky-500" />
          <h3 className="text-white font-black uppercase italic tracking-tighter text-sm">Simulador</h3>
        </div>
        <button
          onClick={() => { setResults({}); onSimulate({}); }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Selector de Fecha */}
      <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between">
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="p-1 disabled:opacity-10 text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">
            {activeDay?.matchday || "Fecha"}
          </p>
        </div>
        <button
          disabled={currentStep === regularFixtures.length - 1}
          onClick={() => setCurrentStep(prev => prev + 1)}
          className="p-1 disabled:opacity-10 text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Inputs de Partidos */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {activeDay?.matches.map((m: any) => {
          // LÓGICA DE COLOR: Verificamos si ambos inputs tienen número
          const isCompleted =
            typeof results[m.id]?.h === 'number' &&
            typeof results[m.id]?.a === 'number';

          return (
            <div
              key={m.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300 ${isCompleted
                ? "bg-sky-500/10 border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
                : "bg-black/20 border-white/5"
                }`}
            >
              <span className={`flex-1 text-[10px] font-bold text-right truncate transition-colors ${isCompleted ? "text-sky-200" : "text-gray-400"
                }`}>
                {m.home_team.short_code || m.home_team.name}
              </span>

              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  className={`w-10 h-10 bg-black border rounded-lg text-center font-bold outline-none transition-all ${isCompleted ? "border-sky-500 text-sky-400" : "border-white/10 text-gray-300"
                    } focus:border-sky-500`}
                  placeholder="-"
                  value={results[m.id]?.h ?? ""}
                  onChange={(e) => handleScoreChange(m.id, 'h', e.target.value)}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className={`w-10 h-10 bg-black border rounded-lg text-center font-bold outline-none transition-all ${isCompleted ? "border-sky-500 text-sky-400" : "border-white/10 text-gray-300"
                    } focus:border-sky-500`}
                  placeholder="-"
                  value={results[m.id]?.a ?? ""}
                  onChange={(e) => handleScoreChange(m.id, 'a', e.target.value)}
                />
              </div>

              <span className={`flex-1 text-[10px] font-bold text-left truncate transition-colors ${isCompleted ? "text-sky-200" : "text-gray-400"
                }`}>
                {m.away_team.short_code || m.away_team.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};