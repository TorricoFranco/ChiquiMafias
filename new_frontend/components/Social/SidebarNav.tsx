"use client";

import React, { useState } from "react";
import SettingsPanel from "@/features/settings/components/SettingsPanel";
import { useNavigationStore } from "@/store/useNavigationStore";
import { useUserStore } from "@/store/useUserStore";

const navItems: Array<{ name: string; icon: string; filled?: boolean }> = [
  { name: "Chat", icon: "forum" },
  { name: "Pronósticos", icon: "casino" },
  { name: "Tienda", icon: "shopping_cart" },
  { name: "Mi Perfil", icon: "person" },
  { name: "Stats", icon: "bar_chart", filled: true },
  { name: "Admin", icon: "admin_panel_settings", filled: true },
  { name: "Ajustes", icon: "settings", filled: true },
];

export const SidebarNav = ({ onNavigate }: { onNavigate?: () => void } = {}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeTab = useNavigationStore((state) => state.activeTab);
  const setActiveTab = useNavigationStore((state) => state.setActiveTab);

  const userRole = useUserStore((state) => state.role);

  const visibleNavItems = navItems.filter((item) => {
    if (item.name === "Admin") {
      return userRole === 'ADMIN' || userRole === 'MODERATOR' || userRole === 'PRESIDENT';
    }
    return true;
  });

  const handleTabClick = (tabName: string) => {
    if (tabName === "Ajustes") {
      setIsSettingsOpen((prev) => !prev);
      return;
    }

    setIsSettingsOpen(false);
    setActiveTab(tabName);
    onNavigate?.();
  };

  return (
    <>
      <aside
        aria-label="Secciones"
        className="h-full w-full bg-[#1c1b1b] border-r border-[#353534] flex flex-col py-6 z-10"
      >
        <nav className="flex-1 px-4 space-y-2 relative overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.name || (item.name === "Ajustes" && isSettingsOpen);
            const isAdmin = item.name === "Admin";

            return (
              <div key={item.name} className="relative">
                <button
                  onClick={() => handleTabClick(item.name)}
                  aria-current={isActive && item.name !== "Ajustes" ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-left cursor-pointer ${isAdmin
                    ? isActive
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold border-l-4 border-yellow-200 shadow-lg shadow-amber-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300"
                    : isActive
                      ? "bg-[#d2f000] text-[#5d6b00] font-bold border-l-4 border-[#b8d300] shadow-md"
                      : "text-[#c6c9ab] hover:bg-[#353534] hover:text-[#e5e2e1]"
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined transition-transform ${isActive ? "" : "group-hover:scale-110 group-hover:rotate-6"
                      }`}
                    style={item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold">{item.name}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="px-4 mt-auto pt-4 border-t border-[#353534]/50">
          <button
            onClick={() => {
              setIsSettingsOpen(false);
              setActiveTab("Soporte");
              onNavigate?.();
            }}
            aria-current={activeTab === "Soporte" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-left cursor-pointer ${activeTab === "Soporte"
              ? "bg-[#d2f000] text-[#5d6b00] font-bold border-l-4 border-[#b8d300] shadow-md"
              : "text-[#909378] hover:bg-[#353534] hover:text-[#e5e2e1]"
              }`}
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined transition-transform ${activeTab === "Soporte" ? "" : "group-hover:scale-110 group-hover:-rotate-6"
                }`}
            >
              contact_support
            </span>
            <span className="text-sm font-semibold">Soporte & Reclamos</span>
          </button>
        </div>
      </aside>

      {/* Modal / Overlay de Ajustes */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md cursor-default"
          >
            <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};