import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface LoadErrorStateProps {
    title: string;
    description?: string;
    onRetry: () => void;
    /** Mientras reintenta, el botón se bloquea y gira el ícono. */
    isRetrying?: boolean;
}

/**
 * Estado de error de una lista que no cargó: dice qué pasó y deja reintentar,
 * en vez de mostrar una lista vacía que parece real.
 */
export const LoadErrorState: React.FC<LoadErrorStateProps> = ({ title, description, onRetry, isRetrying = false }) => (
    <div role="alert" className="flex flex-col items-center text-center gap-3 p-6 bg-[#1c1b1b] border border-[#353534] rounded-xl">
        <AlertCircle aria-hidden="true" className="w-8 h-8 text-[#ffb4ab]" />
        <div className="flex flex-col gap-1">
            <p className="font-bold text-sm text-[#e5e2e1]">{title}</p>
            {description && <p className="text-xs text-[#c6c9ab]">{description}</p>}
        </div>
        <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d2f000]/50 text-[#d2f000] font-bold text-xs uppercase hover:bg-[#d2f000]/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
            <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Reintentando..." : "Reintentar"}
        </button>
    </div>
);
