import React from 'react';
import { Table2, BarChart2, TrendingDown, Calendar, Gamepad2 } from 'lucide-react';
import { ZoneType } from '../../type';

interface SidebarNavigationProps {
    activeZone: ZoneType;
    simulatedCount?: number;
    onNavigate: (sectionId: string) => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
    activeZone,
    simulatedCount = 0,
    onNavigate,
}) => {
    const navSections = [
        {
            id: 'posiciones',
            label: `Posiciones (Zona ${activeZone})`,
            icon: Table2,
            badge: 'LIVE',
            live: true,
        },
        {
            id: 'tabla-anual',
            label: 'Tabla Anual 2026',
            icon: BarChart2,
            badge: '30 EQ',
        },
        {
            id: 'tabla-promedios',
            label: 'Tabla de Promedios',
            icon: TrendingDown,
            badge: 'DESCENSO',
        },
        {
            id: 'fixture',
            label: 'Fixture & Resultados',
            icon: Calendar,
            badge: '14 FECHAS',
        },
        {
            id: 'simulador',
            label: 'Simulador de Resultados',
            icon: Gamepad2,
            badge: simulatedCount > 0 ? `${simulatedCount} SIM` : 'PROYECTAR',
        },
    ];

    return (
        <div className="flex flex-col gap-1 px-1">
            <div className="text-[10px] uppercase font-bold text-[#c6c9ab] tracking-wider mb-1 px-1">
                Secciones
            </div>
            {navSections.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-all cursor-pointer w-full text-left group"
                    >
                        <Icon className="w-4 h-4 text-[#c6c9ab] group-hover:text-[#d2f000] transition-colors" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.badge && (
                            <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${item.live
                                        ? 'bg-[#ffb4ab]/20 text-[#ffb4ab] animate-pulse'
                                        : item.id === 'simulador' && simulatedCount > 0
                                            ? 'bg-[#d2f000] text-[#191e00]'
                                            : 'bg-[#2a2a2a] text-[#c6c9ab] group-hover:text-[#e5e2e1]'
                                    }`}
                            >
                                {item.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};