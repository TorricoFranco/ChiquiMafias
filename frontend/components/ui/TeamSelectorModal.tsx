"use client";
import { useState, useEffect } from "react";
import Image from "next/image"; // 🚀 Optimización de imágenes automática
import { Search, Trophy, Shield, X } from "lucide-react";

interface Team {
    id: string;
    name: string;
    badgeUrl: string;
    tier: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (teamId: string, teamName: string, badgeUrl: string) => void;
    teams: Team[];
}

export default function TeamSelectorModal({ isOpen, onClose, onSelect, teams }: Props) {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "LIGA_PRO" | "NACIONAL_B">("LIGA_PRO");

    if (!isOpen) return null;

    // 🔍 Filtrado inteligente en el cliente (rápido porque es solo texto)
    const filteredTeams = teams.filter((team) => {
        const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;
        if (activeTab === "LIGA_PRO") return team.tier === 1;
        if (activeTab === "NACIONAL_B") return team.tier === 2;
        return true; // "ALL" muestra el remanente y todo lo demás
    });

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-[#2b2b2b] w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">

                {/* HEADER DEL MODAL */}
                <div className="p-4 border-b border-[#2b2b2b] flex justify-between items-center bg-[#111]">
                    <div>
                        <h3 className="text-white font-bold text-lg">Elegí tu Club</h3>
                        <p className="text-xs text-gray-400">Seleccioná el cuadro del cual sos hincha para personalizar tu experiencia</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* BUSCADOR */}
                <div className="p-4 bg-[#151515] border-b border-[#2b2b2b]">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                        <input
                            type="text"
                            placeholder="Buscar club (Ej: Central, Belgrano, Chacarita...)"
                            className="w-full bg-[#222] border border-[#333] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* PESTAÑAS DE PRIORIDAD (UX PREMIUM) */}
                <div className="flex bg-[#111] px-2 pt-2 border-b border-[#2b2b2b] gap-1">
                    <button
                        onClick={() => setActiveTab("LIGA_PRO")}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition ${activeTab === "LIGA_PRO"
                                ? "bg-[#1a1a1a] text-sky-400 border-[#2b2b2b]"
                                : "bg-transparent text-gray-400 border-transparent hover:text-white"
                            }`}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        Liga Profesional
                    </button>
                    <button
                        onClick={() => setActiveTab("NACIONAL_B")}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition ${activeTab === "NACIONAL_B"
                                ? "bg-[#1a1a1a] text-lime-400 border-[#2b2b2b]"
                                : "bg-transparent text-gray-400 border-transparent hover:text-white"
                            }`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        Primera Nacional
                    </button>
                    <button
                        onClick={() => setActiveTab("ALL")}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition ${activeTab === "ALL"
                                ? "bg-[#1a1a1a] text-purple-400 border-[#2b2b2b]"
                                : "bg-transparent text-gray-400 border-transparent hover:text-white"
                            }`}
                    >
                        Ver Todos / Ascenso
                    </button>
                </div>

                {/* CONTENEDOR GRID CON LAZY LOADING */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#1a1a1a]">
                    {filteredTeams.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-sm">No se encontraron clubes que coincidan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {filteredTeams.map((team) => (
                                <div
                                    key={team.id}
                                    onClick={() => onSelect(team.id, team.name, team.badgeUrl)}
                                    className="flex flex-col items-center justify-center p-4 bg-[#222]/40 border border-[#2b2b2b] rounded-xl cursor-pointer hover:bg-sky-500/10 hover:border-sky-500/50 transition duration-200 text-center group"
                                >
                                    <div className="relative w-14 h-14 mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                        <Image
                                            src={team.badgeUrl}
                                            alt={team.name}
                                            fill
                                            sizes="56px"
                                            className="object-contain"
                                            loading="lazy" // ⚡️ Clave de rendimiento: solo carga lo visible
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-2">
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
}