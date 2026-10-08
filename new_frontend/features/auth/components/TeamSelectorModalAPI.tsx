"use client";
import { useState } from "react";
import Image from "next/image";
import { Search, Trophy, Shield, X } from "lucide-react";
import { Team } from "@/data/teamData";


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (teamId: string, teamName: string, badgeUrl: string) => void;
  teams: Team[];
}

export const TeamSelectorModalAPI = ({ isOpen, onClose, onSelect, teams }: Props) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "LIGA_PRO" | "NACIONAL_B">("ALL");

  if (!isOpen) return null;

  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === "LIGA_PRO") return team.tier === 1;
    if (activeTab === "NACIONAL_B") return team.tier === 2;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1c1b1b] border border-[#353534] w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* HEADER DEL MODAL */}
        <div className="p-4 border-b border-[#353534] flex justify-between items-center bg-[#131313]">
          <div>
            <h3 className="text-[#e5e2e1] font-extrabold text-lg uppercase">Elegí un Club</h3>
            <p className="text-xs text-[#c6c9ab]">Seleccioná un equipo para asignar a la opción</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#c6c9ab] hover:text-[#d2f000] p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="p-4 bg-[#1c1b1b] border-b border-[#353534]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#909378] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar club (Ej: Boca, River, Talleres...)"
              className="w-full bg-[#131313] border border-[#353534] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e5e2e1] placeholder-[#909378] focus:outline-none focus:border-[#d2f000] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* TABS (Filtros) */}
        <div className="flex bg-[#131313] px-2 pt-2 border-b border-[#353534] gap-1">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase font-bold rounded-t-xl border-t border-x transition ${
              activeTab === "ALL"
                ? "bg-[#1c1b1b] text-[#d2f000] border-[#353534]"
                : "bg-transparent text-[#909378] border-transparent hover:text-[#e5e2e1]"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab("LIGA_PRO")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase font-bold rounded-t-xl border-t border-x transition ${
              activeTab === "LIGA_PRO"
                ? "bg-[#1c1b1b] text-[#d2f000] border-[#353534]"
                : "bg-transparent text-[#909378] border-transparent hover:text-[#e5e2e1]"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Liga Profesional
          </button>
          <button
            onClick={() => setActiveTab("NACIONAL_B")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase font-bold rounded-t-xl border-t border-x transition ${
              activeTab === "NACIONAL_B"
                ? "bg-[#1c1b1b] text-[#d2f000] border-[#353534]"
                : "bg-transparent text-[#909378] border-transparent hover:text-[#e5e2e1]"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Primera Nacional
          </button>
        </div>

        {/* LISTA DE EQUIPOS (GRILLA) */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#1c1b1b]">
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#909378] text-sm font-medium">No se encontraron clubes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => onSelect(team.id, team.name, team.badgeUrl)}
                  className="flex flex-col items-center justify-center p-4 bg-[#131313] border border-[#353534] rounded-xl cursor-pointer hover:border-[#d2f000] hover:bg-[#d2f000]/10 transition-all duration-200 text-center group"
                >
                  <div className="relative w-14 h-14 mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Image
                      src={team.badgeUrl}
                      alt={team.name}
                      fill
                      sizes="56px"
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#c6c9ab] group-hover:text-[#e5e2e1] transition-colors line-clamp-2 leading-tight">
                    {team.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};