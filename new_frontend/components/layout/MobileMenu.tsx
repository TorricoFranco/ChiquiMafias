"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { SidebarNav } from "@/components/Social/SidebarNav";

const MAIN_TABS = [
  { id: "social", label: "Social" },
  { id: "ligas", label: "Ligas" },
  { id: "calendario", label: "Calendario" },
];

interface MobileMenuProps {
  activeMainTab: string;
  onMainTabChange: (tab: string) => void;
}

/** Menú de pantallas chicas: las vistas del header y las secciones de la barra lateral. */
export const MobileMenu: React.FC<MobileMenuProps> = ({ activeMainTab, onMainTabChange }) => {
  const isOpen = useUIStore((state) => state.isMobileSidebarOpen);
  const close = useUIStore((state) => state.closeMobileSidebar);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const goTo = (tab: string) => {
    if (tab !== activeMainTab) onMainTabChange(tab);
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-[#353534] bg-[#1C1B1B] shadow-2xl"
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#353534] px-4">
          <span className="font-headline text-sm font-black uppercase tracking-wider text-[#E5E2E1]">Menú</span>
          <button
            onClick={close}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-[#C6C9AB] transition-colors hover:bg-[#353534] hover:text-[#E5E2E1]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Vistas" className="flex flex-shrink-0 gap-2 border-b border-[#353534] p-4">
          {MAIN_TABS.map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goTo(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${isActive
                  ? "bg-[#D2F000] text-[#191E00]"
                  : "bg-[#131313] text-[#C6C9AB] hover:text-[#E5E2E1]"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1">
          <SidebarNav onNavigate={() => goTo("social")} />
        </div>
      </div>
    </div>
  );
};
