"use client";
import React from "react";

interface Props {
  active: "apertura" | "clausura";
  onChange: (t: "apertura" | "clausura") => void;
}

export default function TournamentTabs({ active, onChange }: Props) {
  return (
    <div className="flex bg-gray-800 rounded-t-xl overflow-hidden shadow-xl mb-6">
      <button
        onClick={() => onChange("apertura")}
        className={`flex-1 py-3 text-lg font-bold transition-colors duration-200 border-b-2 ${
          active === "apertura"
            ? "text-sky-400 border-sky-400 bg-gray-700/50"
            : "text-gray-400 border-transparent hover:bg-gray-700"
        }`}
      >
        Torneo Apertura
      </button>

      <button
        onClick={() => onChange("clausura")}
        className={`flex-1 py-3 text-lg font-bold transition-colors duration-200 border-b-2 ${
          active === "clausura"
            ? "text-sky-400 border-sky-400 bg-gray-700/50"
            : "text-gray-400 border-transparent hover:bg-gray-700"
        }`}
      >
        Torneo Clausura
      </button>
    </div>
  );
}
