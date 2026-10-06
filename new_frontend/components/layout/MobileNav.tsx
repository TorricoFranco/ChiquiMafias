"use client";

import React from "react";

const TABS = [
  { section: "Vivo", label: "Vivo", icon: "live_tv", filled: true },
  { section: "Chat", label: "Tribuna", icon: "forum" },
  { section: "Pronósticos", label: "Apuestas", icon: "payments" },
  { section: "Mi Perfil", label: "Perfil", icon: "account_circle" },
];

interface MobileNavProps {
  /** Sección activa de la vista social, o null si se está en otra vista (Ligas, Calendario). */
  activeSection: string | null;
  onSelect: (section: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeSection, onSelect }) => {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-[#131313] border-t border-[#454932] lg:hidden"
    >
      {TABS.map((tab) => {
        const isActive = activeSection === tab.section;
        return (
          <button
            key={tab.section}
            onClick={() => onSelect(tab.section)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isActive ? "text-[#d2f000] font-bold" : "text-[#c6c9ab]"
            }`}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl"
              style={tab.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
