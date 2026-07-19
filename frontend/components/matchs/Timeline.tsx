"use client";

import { Clock } from 'lucide-react';
// IMPORTA EventType AQUÍ
import { EventIcon, EventType } from "./EventIcon";

// 1. Definimos la estructura de un evento
interface MatchEvent {
    team: 'home' | 'away' | 'general';
    // AQUÍ USAMOS EventType EN LUGAR DE string
    type: EventType;
    minute?: number | string;
    player?: string;
    playerOut?: string;
    playerIn?: string;
    detail?: string;
}

interface TimelineProps {
    events: MatchEvent[];
    homeTeam: string;
    awayTeam: string;
}

export const Timeline = ({ events, homeTeam, awayTeam }: TimelineProps) => (
    <section className="bg-gray-800 p-5 rounded-lg mb-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
            <Clock className="w-5 h-5 mr-2 text-orange-400" /> Minuto a Minuto
        </h2>
        <div className="relative border-l border-gray-700 ml-5 md:ml-12">
            {events.slice().reverse().map((event, index) => {
                const isHome = event.team === 'home';
                const isGeneral = event.team === 'general';

                return (
                    <div
                        key={index}
                        className={`relative py-3 ${isGeneral ? 'pl-2' : 'pl-6 md:pl-16'}`}
                    >
                        <div className={`absolute left-0 top-1/2 -mt-2 -ml-2 w-4 h-4 rounded-full flex items-center justify-center 
                ${isGeneral ? 'bg-gray-500' : isHome ? 'bg-red-600' : 'bg-blue-600'}`}
                        >
                            {/* Ahora TS sabe que event.type ES UN EventType */}
                            <EventIcon type={event.type} />
                        </div>

                        <div className={`flex flex-col ${isGeneral ? 'text-left w-full' : 'text-left'}`}>
                            <div className="text-xs font-mono text-gray-400">
                                {event.minute ? `${event.minute}'` : ''}
                            </div>

                            <p className={`text-sm md:text-base font-semibold ${isGeneral ? 'text-white' : isHome ? 'text-red-300' : 'text-blue-300'}`}>
                                {event.type === 'goal' && `¡GOL! - ${event.player}`}
                                {event.type === 'yellow_card' && `Tarjeta Amarilla para ${event.player}`}
                                {event.type === 'red_card' && `Tarjeta Roja para ${event.player}`}
                                {event.type === 'substitution' && `Cambio: Sale ${event.playerOut}, Entra ${event.playerIn}`}
                                {event.type === 'var_check' && `Revisión VAR`}
                                {event.type === 'full_time' && `Fin del Partido`}
                                {event.type === 'half_time' && `Fin del Primer Tiempo`}
                            </p>

                            {event.detail && (
                                <p className={`text-xs text-gray-500 mt-0.5 ${isGeneral ? 'font-normal' : 'italic'}`}>
                                    {event.detail}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
);