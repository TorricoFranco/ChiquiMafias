import React, { useMemo } from 'react';

interface Player {
    id: string | number;
    name: string;
    number: string | number;
    pos: string | null;
    grid?: string | null;
}

interface KitColors {
    player?: { primary: string; number: string; border: string };
    goalkeeper?: { primary: string; number: string; border: string };
}

interface SoccerPitchProps {
    homePlayers: Player[];
    awayPlayers: Player[];
    homeColors?: KitColors | null;
    awayColors?: KitColors | null;
}

export const SoccerPitch: React.FC<SoccerPitchProps> = ({ 
    homePlayers, 
    awayPlayers, 
    homeColors, 
    awayColors 
}) => {
    
    // Función para calcular las posiciones en X e Y según si es local o visitante
    const processPlayers = (players: Player[], side: 'home' | 'away') => {
        const rowsMap: { [key: string]: number } = {};
        const validPlayers = players.filter((p) => p.grid);

        let maxRow = 1;
        validPlayers.forEach((p) => {
            if (p.grid) {
                const row = parseInt(p.grid.split(":")[0]);
                if (row > maxRow) maxRow = row;
                rowsMap[row] = (rowsMap[row] || 0) + 1;
            }
        });

        return validPlayers.map((player) => {
            const parts = player.grid?.split(":") || ["5", "1"];
            const [row, col] = parts.map(Number);

            // Mapeo Horizontal (X): Distribuimos las líneas entre el área (8%) y el mediocampo (45%)
            const minPercent = 8;
            const maxPercent = 45;
            let percent = minPercent;
            
            if (maxRow > 1) {
                percent = minPercent + ((row - 1) / (maxRow - 1)) * (maxPercent - minPercent);
            }

            // Si es local, ataca hacia la derecha (0% a 50%). Si es visitante, hacia la izquierda (100% a 50%).
            const xPos = side === 'home' ? percent : 100 - percent;

            // Mapeo Vertical (Y): Distribución equitativa en la columna
            const totalInRow = rowsMap[row] || 1;
            const yPos = (col / (totalInRow + 1)) * 100;

            return { ...player, xPos, yPos, side };
        });
    };

    const renderedHome = useMemo(() => processPlayers(homePlayers, 'home'), [homePlayers]);
    const renderedAway = useMemo(() => processPlayers(awayPlayers, 'away'), [awayPlayers]);
    const allPlayers = [...renderedHome, ...renderedAway];

    const getColors = (pos: string | null, side: 'home' | 'away') => {
        const type = pos === 'G' ? 'goalkeeper' : 'player';
        const teamColors = side === 'home' ? homeColors : awayColors;
        const fallback = side === 'home' 
            ? { primary: '263142', border: 'ffffff', number: 'ffffff' } // Fallback local
            : { primary: 'ffffff', border: '263142', number: '000000' }; // Fallback visitante

        const colors = teamColors?.[type] || fallback;
        const formatColor = (c: string) => (c.startsWith('#') ? c : `#${c}`);

        return {
            bg: formatColor(colors.primary),
            border: formatColor(colors.border),
            text: formatColor(colors.number),
        };
    };

    return (
        <div className="relative w-full aspect-video md:aspect-[2/1] bg-[#1a472a] rounded-xl border-2 border-[#2b2a2a] shadow-inner overflow-hidden">
            {/* Patrón de césped (Franjas verticales para cancha horizontal) */}
            <div className="absolute inset-0 flex flex-row">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
                ))}
            </div>

            {/* Marcas de la cancha */}
            <div className="absolute inset-0 m-2 border-2 border-white/30 pointer-events-none">
                {/* Línea central y círculo */}
                <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/30 -translate-x-1/2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border-2 border-white/30 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />

                {/* Áreas Local (Izquierda) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-r-2 border-y-2 border-white/30">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[40%] h-[40%] border-r-2 border-y-2 border-white/30" />
                    <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
                </div>

                {/* Áreas Visitante (Derecha) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-l-2 border-y-2 border-white/30">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[40%] h-[40%] border-l-2 border-y-2 border-white/30" />
                    <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
                </div>
            </div>

            {/* Jugadores */}
            {allPlayers.map((p) => {
                const colors = getColors(p.pos, p.side as 'home' | 'away');
                return (
                    <div
                        key={`${p.side}-${p.id}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-500"
                        style={{ left: `${p.xPos}%`, top: `${p.yPos}%` }}
                    >
                        <div
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-[4px] sm:rounded-md border flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                        >
                            <span className="text-[9px] sm:text-[12px] font-black" style={{ color: colors.text }}>
                                {p.number}
                            </span>
                        </div>
                        <div className="mt-0.5 sm:mt-1 bg-black/75 px-1 py-0.5 rounded shadow-sm max-w-[50px] sm:max-w-[70px]">
                            <p className="text-[7px] sm:text-[9px] font-bold text-[#e5e2e1] truncate text-center uppercase tracking-tighter">
                                {p.name.split(' ').pop()}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};