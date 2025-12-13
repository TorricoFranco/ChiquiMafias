"use client";
import { PlayerList } from "./PlayerList";
import { Users } from 'lucide-react';
import { useState } from "react";


export const LineupsSection = ({ lineups, teams }) => {
    const [activeTeamTab, setActiveTeamTab] = useState('home'); // 'home' o 'away'

    if (!lineups) return null;

    const activeLineup = activeTeamTab === 'home' ? lineups.home : lineups.away;
    const activeTeam = activeTeamTab === 'home' ? teams.home : teams.away;
    const teamColorClass = activeTeamTab === 'home' ? 'border-red-600' : 'border-blue-600';
    const teamColorText = activeTeamTab === 'home' ? 'text-red-500' : 'text-blue-500';

    return (
        <div className="p-5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                <Users className="w-5 h-5 mr-2 text-green-400" /> Alineaciones Oficiales
            </h2>
            
            {/* Controles de Pestañas de Equipo */}
            <div className="flex bg-gray-900 rounded-t-lg overflow-hidden border-b border-gray-700 shadow-inner">
                <button
                    onClick={() => setActiveTeamTab('home')}
                    className={`flex-1 py-3 text-base font-semibold transition-colors duration-200 ${
                        activeTeamTab === 'home' 
                            ? 'bg-gray-700/50 text-red-500 border-b-2 border-red-500' 
                            : 'text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    {teams.home.name} (Local)
                </button>
                <button
                    onClick={() => setActiveTeamTab('away')}
                    className={`flex-1 py-3 text-base font-semibold transition-colors duration-200 ${
                        activeTeamTab === 'away' 
                            ? 'bg-gray-700/50 text-blue-500 border-b-2 border-blue-500' 
                            : 'text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    {teams.away.name} (Visitante)
                </button>
            </div>

            {/* Contenido de la Pestaña Activa (Alineación Completa del Equipo Seleccionado) */}
            <div className={`mt-0 p-4 rounded-b-xl bg-gray-900 shadow-2xl border-l-4 ${teamColorClass}`}>
                
                <p className="text-sm text-gray-400 mb-4">
                    Formación: <span className="font-bold text-white mr-4">{activeLineup.formation}</span>
                    DT: <span className="text-white">{activeLineup.coach}</span>
                </p>

                {/* Titulares */}
                <h4 className={`text-lg font-bold text-white mt-4 border-b border-gray-700 pb-2 ${teamColorText}`}>
                    Titulares ({activeLineup.startingXI.length})
                </h4>
                <PlayerList players={activeLineup.startingXI} type="XI" />

                {/* Suplentes */}
                <h4 className={`text-lg font-bold text-white mt-6 border-b border-gray-700 pb-2 ${teamColorText}`}>
                    Suplentes ({activeLineup.substitutes.length})
                </h4>
                {activeLineup.substitutes.length > 0 ? (
                    <PlayerList players={activeLineup.substitutes} type="SUB" />
                ) : (
                    <p className="text-gray-500 mt-2 text-sm">No hay suplentes registrados.</p>
                )}
            </div>
        </div>
    );
};