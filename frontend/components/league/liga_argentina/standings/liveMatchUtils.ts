/**
 * Utilidades centralizadas para manejar matches en vivo con soporte para playoff
 */

export interface LiveMatch {
    score: string;
    status: string;
    result: 'win' | 'loss' | 'draw';
}

export interface RawLiveResult {
    homeTeamId: string | number;
    awayTeamId: string | number;
    h: number | string;
    a: number | string;
    status: string;
    isSimulated: boolean;
    isPlayoff?: boolean;
}

/**
 * Verifica si hay al menos un partido real (no simulado y no playoff) en curso.
 * Se usa para mostrar el badge "EN VIVO" en el título de las tablas.
 */
export const hasActiveLiveMatches = (results: Record<string, any>): boolean => {
    if (!results) return false;
    return Object.values(results).some((m: any) => !m.isSimulated && !m.isPlayoff);
};

/**
 * Busca si un equipo específico tiene un partido activo en los resultados.
 * Excluye partidos simulados Y partidos de playoff
 */
export const getLiveMatchForTeam = (
    teamId: string | number,
    results: Record<string, any>
): LiveMatch | null => {
    if (!results || Object.keys(results).length === 0) return null;

    const searchId = String(teamId);

    // Buscamos el partido donde el equipo sea local o visitante
    // EXCLUYENDO simulados Y partidos playoff
    const activeMatch = Object.values(results).find((m: any) => {
        const isTeamMatch = String(m.homeTeamId) === searchId || String(m.awayTeamId) === searchId;
        const isNotSimulated = !m.isSimulated;
        const isNotPlayoff = !m.isPlayoff;
        return isTeamMatch && isNotSimulated && isNotPlayoff;
    });

    if (!activeMatch) return null;

    const isHome = String(activeMatch.homeTeamId) === searchId;
    const myGoals = isHome ? Number(activeMatch.h) : Number(activeMatch.a);
    const oppGoals = isHome ? Number(activeMatch.a) : Number(activeMatch.h);

    return {
        score: `${activeMatch.h} - ${activeMatch.a}`,
        status: activeMatch.status || "LIVE",
        result: myGoals > oppGoals ? "win" : myGoals < oppGoals ? "loss" : "draw",
    };
};

/**
 * Estilos de filas compartidos para tablas
 */
export const getRowClassForStandings = (index: number, totalRows: number): string => {
    if (index < 8) return "bg-sky-500/5 border-l-4 border-sky-500 hover:bg-sky-500/10";
    return "hover:bg-gray-700/30 border-l-4 border-transparent";
};

export const getRowClassForAverages = (index: number, totalRows: number): string => {
    if (index === totalRows - 1) {
        return "bg-red-900/20 border-l-2 border-red-500 hover:bg-red-800/30";
    }
    return "hover:bg-white/[0.02] border-l-2 border-transparent";
};
