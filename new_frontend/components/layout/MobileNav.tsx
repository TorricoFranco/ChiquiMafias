"use client";

import React, { useState } from "react";

export const MobileNav: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Vivo");

  const tabs = [
    { id: "Vivo", label: "Vivo", icon: "live_tv", filled: true },
    { id: "Tribuna", label: "Tribuna", icon: "forum" },
    { id: "Apuestas", label: "Apuestas", icon: "payments" },
    { id: "Perfil", label: "Perfil", icon: "account_circle" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-[#131313] border-t border-[#454932] md:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isActive ? "text-[#d2f000] font-bold" : "text-[#c6c9ab]"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={
                tab.filled ? { fontVariationSettings: "'FILL' 1" } : undefined
              }
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
