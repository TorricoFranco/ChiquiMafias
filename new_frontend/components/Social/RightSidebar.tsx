"use client";

import React, { useState } from "react";
import { SidebarFixtureList } from "../widgets/SidebarFixtureList";
import { BetsCarousel } from "@/features/bets/components/BetsCarousel";
import { ActivePollsCarousel } from "@/features/polls/components/ActivePollsCarousel";

export const RightSidebar = ({ currentTab }: { currentTab: string }) => {
  const [activeTab, setActiveTab] = useState<"fixture" | "bets">("fixture");

  const sidebarWidth = currentTab === "Chat" ? "w-[400px]" : "w-72";

  return (
    <aside className={`${sidebarWidth} flex flex-col border-l border-[#353534] bg-[#131313] overflow-hidden transition-all duration-300`}>
      {/* HEADER CON TABS */}
      <div className="p-3 bg-[#201f1f] border-b border-[#454932] flex-shrink-0">
        <div className="grid grid-cols-2 bg-[#131313] p-1 rounded-xl border border-[#454932]">
          <button
            type="button"
            onClick={() => setActiveTab("fixture")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "fixture"
                ? "bg-[#d2f000] text-[#191e00] shadow-md"
                : "text-[#c6c9ab] hover:text-white"
              }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={activeTab === "fixture" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              stadium
            </span>
            <span className="truncate">Fixture / Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bets")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "bets"
                ? "bg-[#d2f000] text-[#191e00] shadow-md"
                : "text-[#c6c9ab] hover:text-white"
              }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={activeTab === "bets" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              payments
            </span>
            <span className="truncate">Apuestas</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO SCROLLEABLE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col w-full">
        {activeTab === "fixture" ? (
          <SidebarFixtureList season="2026" leagueId="1" />
        ) : (
          <div className="flex flex-col flex-1 w-full">
            <BetsCarousel />
            <ActivePollsCarousel />
          </div>
        )}
      </div>
    </aside>
  );
};