"use client";
import { AnnualRow } from "@/lib/mocks";

export const getRowStylingAnnual = (row: AnnualRow) => {
    switch (row.qualification) {
        case 'libertadores_group':
            // Amarillo-naranja para clasificación directa a Libertadores
            return "bg-amber-700/20 border-l-4 border-amber-500 hover:bg-amber-700/40";
        case 'libertadores_qualifier':
            // Color más fuerte para el repechaje (pre-Libertadores)
            return "bg-orange-600/20 border-l-4 border-orange-500 hover:bg-orange-600/40";
        case 'sudamericana':
            // Celeste para Sudamericana
            return "bg-sky-500/20 border-l-4 border-sky-400 hover:bg-sky-500/40";
        default:
            return "hover:bg-gray-700/50";
    }
}