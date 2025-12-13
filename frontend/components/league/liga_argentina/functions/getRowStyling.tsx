"use client";
import { TeamRow } from "@/lib/mocks";

export const getRowStyling = (row: TeamRow) => {
    // First 8 qualify to octavos — same color for Apertura/Clausura
    if (row.pos <= 8) {
        return "bg-amber-700/10 border-l-4 border-amber-500 hover:bg-amber-700/20";
    }
    return "hover:bg-gray-700/50";
}