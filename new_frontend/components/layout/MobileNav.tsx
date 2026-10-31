"use client";

import React, { useId } from "react";
import { usePendingRewards } from "@/features/polls/hooks/usePolls";
import { useUserStore } from "@/store/useUserStore";

const TABS = [
  { section: "Vivo", label: "Vivo", icon: "live_tv", filled: true },
  { section: "Chat", label: "Tribuna", icon: "forum" },
  { section: "Comunidad", label: "Comunidad", icon: "how_to_vote" },
  { section: "Apuestas", label: "Apuestas", icon: "payments" },
  { section: "Mi Perfil", label: "Perfil", icon: "account_circle" },
];

interface MobileNavProps {
  /** Sección activa de la vista social, o null si se está en otra vista (Ligas). */
  activeSection: string | null;
  onSelect: (section: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeSection, onSelect }) => {
  const rewardHintId = useId();
  const { data: pendingRewards } = usePendingRewards();
  const userId = useUserStore((state) => state.id);
  // Sin sesión no hay resalte: la cache de la query sobrevive al logout.
  const hasPendingRewards = Boolean(userId) && (pendingRewards?.count ?? 0) > 0;

  return (
    <nav
      aria-label="Navegación principal"
      // z-40, debajo de los overlays (z-50 en adelante): con el mismo z la barra iba después en el DOM
      // y tapaba los botones de abajo de cada modal. El contenido ya le deja su lugar con pb-16.
      className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 bg-[#131313] border-t border-[#454932] lg:hidden"
    >
      {TABS.map((tab) => {
        const isActive = activeSection === tab.section;
        // Recompensas de encuestas sin reclamar: Comunidad se resalta y pide el clic para cobrarlas.
        const showRewardHint = tab.section === "Comunidad" && hasPendingRewards;
        return (
          <button
            key={tab.section}
            onClick={() => onSelect(tab.section)}
            aria-current={isActive ? "page" : undefined}
            aria-describedby={showRewardHint ? rewardHintId : undefined}
            className={`relative flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isActive ? "text-[#d2f000] font-bold" : "text-[#c6c9ab]"
            }${showRewardHint ? " rounded-lg outline-2 outline-offset-2 outline-[#d2f000]" : ""}`}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-xl"
              style={tab.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px]">{tab.label}</span>
            {showRewardHint && (
              <span
                aria-hidden="true"
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#d2f000] px-1.5 py-px text-[9px] font-black uppercase leading-tight text-[#191e00]"
              >
                ¡Reclamá!
              </span>
            )}
          </button>
        );
      })}
      {/* Fuera de los botones: si estuviera adentro, el nombre accesible dejaría de ser "Comunidad". */}
      {hasPendingRewards && (
        <span id={rewardHintId} className="sr-only">
          Tenés recompensas para reclamar. Entrá a Comunidad y hacé clic en Reclamar.
        </span>
      )}
    </nav>
  );
};
