"use client";
import {  AlertTriangle, ChevronRight, ChevronLeft, Calendar, CheckCircle } from 'lucide-react';
import { Matchday, Match } from '@/lib/mocks';

import { useState } from "react";

export const FixturesPanel: React.FC<{ tournament: 'apertura' | 'clausura', fixtures: Matchday[] }> = ({ tournament, fixtures }) => {
    const [activeMatchday, setActiveMatchday] = useState(fixtures.length > 0 ? 8 : 1); // Empezamos en la jornada 8

    if (fixtures.length === 0) {
        return (
            <div className="p-6 bg-gray-800 rounded-xl shadow-2xl">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white text-center">Calendario No Disponible</h3>
                <p className="text-gray-400 text-sm text-center mt-2">
                    El Torneo {tournament === 'apertura' ? 'Clausura' : 'Apertura'} aún no ha terminado. Los partidos se anuncian al finalizar la fase anterior.
                </p>
            </div>
        );
    }

    const currentMatchdayData = fixtures.find(f => f.matchday === activeMatchday);
    const totalMatchdays = fixtures.length;

    const handleNext = () => setActiveMatchday(prev => Math.min(prev + 1, totalMatchdays));
    const handlePrev = () => setActiveMatchday(prev => Math.max(prev - 1, 1));
    const handleGoTo = (day: number) => setActiveMatchday(day);

    const renderMatch = (match: Match, index: number) => (
        <div key={index} className="flex justify-between items-center p-3 bg-gray-700/40 rounded-lg shadow-inner text-sm mb-2 hover:bg-gray-700 transition duration-150">
            <div className="font-medium text-right w-5/12 truncate pr-1">
                {match.homeTeam}
            </div>
            <div className={`font-extrabold w-2/12 text-center flex-shrink-0 px-1 rounded-full ${match.status === 'played' ? 'text-yellow-400 bg-gray-900/50' : 'text-gray-400'}`}>
                {match.result}
            </div>
            <div className="font-medium text-left w-5/12 truncate pl-1">
                {match.awayTeam}
            </div>
        </div>
    );

    return (
        <div className="p-4 bg-gray-800 rounded-xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
                <Calendar className="w-5 h-5 mr-2 text-green-400" /> Partidos - {tournament === 'apertura' ? 'Apertura' : 'Clausura'}
            </h3>

            {/* Selector de Jornada */}
            <div className="flex items-center justify-between bg-gray-900 p-2 rounded-lg mb-4 shadow-md">
                <button 
                    onClick={handlePrev} 
                    disabled={activeMatchday === 1}
                    className="p-1 rounded-full text-gray-400 disabled:opacity-30 hover:bg-gray-700 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                    <span className="text-lg font-extrabold text-sky-400">Jornada {activeMatchday}</span>
                    <span className="text-xs text-gray-500 block">({currentMatchdayData?.matches.length} partidos)</span>
                </div>
                <button 
                    onClick={handleNext} 
                    disabled={activeMatchday === totalMatchdays}
                    className="p-1 rounded-full text-gray-400 disabled:opacity-30 hover:bg-gray-700 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            
            {/* Scroll de Jornadas (Números) */}
            <div className="flex overflow-x-auto whitespace-nowrap space-x-2 pb-2 custom-scrollbar-horizontal mb-4">
                {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map(day => (
                    <button
                        key={day}
                        onClick={() => handleGoTo(day)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-bold transition-all duration-200 ${
                            day === activeMatchday
                                ? 'bg-sky-600 text-white shadow-lg border-2 border-sky-300 scale-110'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title={`Ir a Jornada ${day}`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {/* Lista de Partidos */}
            <div className="h-96 overflow-y-auto pr-2 custom-scrollbar-vertical">
                {currentMatchdayData?.matches.map(renderMatch)}
            </div>

            <div className="mt-4 p-2 text-xs text-gray-500 border-t border-gray-700 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-yellow-400" /> 
                <span className="font-semibold text-white">Estado:</span> Los partidos hasta la Jornada 8 han finalizado (simulado).
            </div>
        </div>
    );
}