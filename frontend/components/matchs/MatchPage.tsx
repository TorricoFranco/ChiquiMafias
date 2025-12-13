"use client";

import { useState, useEffect, useMemo} from 'react';
import { Clock, Users, Calendar, Trophy, Zap, ChevronRight, BarChart3, AlertTriangle, MessageSquare } from 'lucide-react';


import { fetchMatchData } from '@/app/utils/api';
import { MatchHeader } from "./MatchHeader";
import { MatchPreview } from "./MatchPreview";
import { LineupsSection } from "./LineupsSection";
import { StatsSection } from "./StatsSection";
import { Timeline } from './Timeline';
import { FinishedSummary } from './FinishedSummary';
import ChatPanel from '../chat/ChatPanel';
import { MOCK_CHAT } from '@/lib/mocks';
import { SectionTabs } from './SectionTabs';
import { SectionMatchLeague } from './SectionMatchLeague';

import { MatchPageProps } from '@/types/matchs';
import { MatchData } from '@/types/matchs';


const MatchPage = ({ matchId = '13' }) => { 
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    // Estado para la navegación por pestañas en la sección inferior
    const [activeTab, setActiveTab] = useState('lineups'); 

    useEffect(() => {
        fetchMatchData(matchId)
            .then(data => {
                setMatch(data);
                // Si el partido ya terminó, por defecto va a estadísticas, si no, a alineaciones.
                if (data.status === 'finished') {
                    setActiveTab('stats'); 
                } else if (data.status === 'live' || data.status === 'lineups_available') {
                    setActiveTab('lineups'); 
                }
            })
            .catch(error => {
                console.error("Error fetching match data:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [matchId]);

    // Definir las pestañas disponibles
    const tabs = useMemo(() => {
        if (!match) return [];
        const { status } = match;

        // Pestañas visibles en los diferentes estados
        if (status === 'live' || status === 'lineups_available') {
            return [
                { id: 'lineups', label: 'Alineaciones', icon: Users },
                // Las estadísticas solo se muestran si hay datos en vivo
                { id: 'stats', label: 'Estadísticas', icon: BarChart3, hideInLineups: status !== 'live' }, 
                { id: 'chat', label: 'Chat', icon: MessageSquare },
            ].filter(tab => !tab.hideInLineups);

        } else if (status === 'finished') {
             return [
                { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
                { id: 'timeline', label: 'Minuto a Minuto', icon: Clock },
            ];
        }
        // Estado 'not_started' o cualquier otro, no se muestran pestañas de detalle.
        return [];
    }, [match]);


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-500 mb-3" />
                    <p className="text-xl font-semibold text-white">Cargando datos del partido...</p>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6 text-white text-lg">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                Lo siento, no se pudieron cargar los datos del partido.
            </div>
        );
    }

    const { status, lineups, liveData, finishedData, matchInfo, teams } = match;
    const showTimelineInTop = status === 'finished'; // Mostrar el timeline en la columna principal si está finalizado


    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
            {/* Estilos para el scrollbar personalizado */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #4B5563; 
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background-color: #1F2937; 
                }
            `}</style>
            
            <div className="max-w-7xl mx-auto">
                <SectionMatchLeague league={matchInfo.league} />
                
                {/* 1. Header del Partido (Siempre Visible) */}
                <MatchHeader match={match} />
                

                {/* 3. SECCIÓN INFERIOR DEDICADA: Navegación por Pestañas */}
                {(status === 'live' || status === 'lineups_available' || status === 'finished') && tabs.length > 0 && (
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-0">
                        {/* Control de Pestañas */}
                        <SectionTabs 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            tabs={tabs}
                        />

                        {/* Contenido de la Pestaña Activa */}
                        <div className="p-0">
                            {/* Alineaciones */}
                            {activeTab === 'lineups' && lineups && (
                                <LineupsSection lineups={lineups} teams={teams} />
                            )}

                            {/* Estadísticas */}
                            {activeTab === 'stats' && liveData?.stats && (
                                <div className="p-5">
                                    <StatsSection stats={liveData.stats} teams={teams} />
                                </div>
                            )}
                            
                            {/* Chat */}
                            {activeTab === 'chat' && (
                                <ChatPanel 
                                messages={MOCK_CHAT} 
                                className="h-[500px] lg:h-[600px] rounded-xl"
                                />
                            )}
                            
                            {/* Minuto a Minuto (solo si está finalizado y se quiere ver en pestaña) */}
                            {activeTab === 'timeline' && liveData?.events && (
                                <div className="p-5">
                                    <Timeline 
                                        events={liveData.events} 
                                        homeTeam={teams.home.name} 
                                        awayTeam={teams.away.name}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="pt-5" ></div>
                {/* 2. Contenido Principal Superior */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    
                    {/* COLUMNA IZQUIERDA (2/3 de ancho) */}
                    <div className={`lg:col-span-2 space-y-6 ${status === 'not_started' ? 'lg:col-span-3' : ''}`}>
                        
                        {/* 2A. Resumen/Previa/Finalizado */}
                        {status === 'finished' && liveData ? (
                            <FinishedSummary finishedData={finishedData} liveData={liveData} />
                        ) : (
                            <MatchPreview matchInfo={matchInfo} teams={teams} /> 
                        )}

                        {/* 2B. Timeline en el espacio principal si el partido terminó */}
                        {showTimelineInTop && liveData?.events && (
                            <Timeline 
                                events={liveData.events} 
                                homeTeam={teams.home.name} 
                                awayTeam={teams.away.name}
                            />
                        )}

                    </div>

                    {/* COLUMNA DERECHA (1/3 de ancho) - Solo aparece si está en vivo */}
                    {status === 'live' && (
                        <div className="lg:col-span-1 space-y-6">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-red-500" /> Datos Clave (EN VIVO)
                            </h3>
                            {/* Aquí puedes poner un resumen rápido de eventos o una estadística clave si quieres */}
                            <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm text-center">
                                <p className="text-gray-400">Próxima Sección en Pestañas</p>
                            </div>
                            
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Exportar el componente principal
export default MatchPage;