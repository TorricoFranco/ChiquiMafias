import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { Team } from '../../types';

interface ComparativeTablesProps {
    miniTable: any;
    homeTeam: Team;
    awayTeam: Team;
}

export const ComparativeTables: React.FC<ComparativeTablesProps> = ({ miniTable, homeTeam, awayTeam }) => {
    
    const capitalize = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const TeamRow = ({ data, targetTeam, isAverage = false }: { data: any, targetTeam: Team, isAverage?: boolean }) => {
        if (!data) return null;

        const isTarget = data.teamId === targetTeam.id || data.teamName === targetTeam.name;

        return (
            <div className={`flex justify-between items-center py-1.5 px-2 rounded-lg transition-colors ${
                isTarget ? 'bg-[#353534] border border-[#4a4a4a] shadow-sm' : 'border border-transparent'
            }`}>
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <span className={`text-[11px] font-mono w-5 text-center ${
                        isTarget ? 'text-[#d2f000] font-black' : 'text-[#8e9285] font-semibold'
                    }`}>
                        {data.position || '-'}
                    </span>
                    <img 
                        src={data.teamLogo} 
                        alt={data.teamName} 
                        className={`w-4 h-4 object-contain ${!isTarget && 'opacity-60'}`} 
                    />
                    <span className={`text-xs truncate ${
                        isTarget ? 'text-[#e5e2e1] font-bold' : 'text-[#8e9285] font-medium'
                    }`}>
                        {data.teamName}
                    </span>
                </div>
                <span className={`font-mono text-xs ${
                    isTarget ? 'text-[#d2f000] font-bold' : 'text-[#8e9285]'
                }`}>
                    {isAverage ? data.coefficient?.toFixed(3) : data.points}
                </span>
            </div>
        );
    };

    const tablesConfig = [
        {
            title: `Tabla ${capitalize(miniTable?.activeTournament || 'Torneo')}`,
            dataKey: 'tournament',
            isAverage: false
        },
        {
            title: 'Tabla Anual (Copas)',
            dataKey: 'annual',
            isAverage: false
        },
        {
            title: 'Tabla de Promedios',
            dataKey: 'averages',
            isAverage: true
        }
    ];

    return (
        <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-6 shadow-sm">
            
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-3 mb-5">
                <h3 className="font-extrabold text-sm text-[#e5e2e1] uppercase flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-[#d2f000]" />
                    Comparativa de Tablas
                </h3>
                <span className="text-[11px] font-bold text-[#d2f000] uppercase tracking-widest bg-[#d2f000]/10 px-2 py-1 rounded-md">
                    {miniTable?.activeTournament}
                </span>
            </div>

            {/* Grilla de 3 Columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {tablesConfig.map((config, index) => {
                    const homeTeamsArray = miniTable?.[config.dataKey]?.home || [];
                    const awayTeamsArray = miniTable?.[config.dataKey]?.away || [];

                    return (
                        <div key={index} className="bg-[#242323] p-4 rounded-xl border border-[#2b2a2a] flex flex-col h-full">
                            
                            {/* Título de la mini tabla */}
                            <span className="text-xs font-extrabold text-[#d2f000] uppercase tracking-wider block mb-4 border-b border-[#353534] pb-2">
                                {config.title}
                            </span>
                            
                            <div className="flex flex-col flex-grow justify-between gap-4">
                                
                                {/* Bloque Local */}
                                <div className="flex flex-col gap-1">
                                    {homeTeamsArray.map((team: any, i: number) => (
                                        <TeamRow 
                                            key={`home-${i}`} 
                                            data={team} 
                                            targetTeam={homeTeam} 
                                            isAverage={config.isAverage} 
                                        />
                                    ))}
                                </div>

                                {/* Divisor VS */}
                                <div className="flex items-center gap-3 w-full opacity-30 my-1">
                                    <div className="h-px bg-[#8e9285] flex-grow"></div>
                                    <span className="text-[10px] font-black text-[#8e9285]">VS</span>
                                    <div className="h-px bg-[#8e9285] flex-grow"></div>
                                </div>

                                {/* Bloque Visitante */}
                                <div className="flex flex-col gap-1">

                                    {awayTeamsArray.map((team: any, i: number) => (
                                        <TeamRow 
                                            key={`away-${i}`} 
                                            data={team} 
                                            targetTeam={awayTeam} 
                                            isAverage={config.isAverage} 
                                        />
                                    ))}
                                </div>

                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );
};