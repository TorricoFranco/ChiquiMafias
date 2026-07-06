// Para mantener compatibilidad hacia atrás, re-exportamos desde liveMatchUtils
export { hasActiveLiveMatches, getLiveMatchForTeam } from "./liveMatchUtils";

/**
 * Componente visual para el encabezado de las tablas.
 */
export const LiveHeaderBadge = () => (
    <span className="ml-3 flex items-center gap-1.5 bg-red-500/10 border border-red-500/50 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">
            En Vivo
        </span>
    </span>
);