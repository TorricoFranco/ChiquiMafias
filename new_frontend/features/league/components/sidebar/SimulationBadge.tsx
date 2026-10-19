import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';

interface SimulationBadgeProps {
    count: number;
    onReset: () => void;
}

export const SimulationBadge: React.FC<SimulationBadgeProps> = ({ count, onReset }) => {
    return (
        <div className="px-1">
            <div className="bg-[#d2f000]/10 border border-[#d2f000]/30 rounded-xl p-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#d2f000]" />
                    <span className="text-[10px] text-[#e5e2e1] font-bold">
                        {count} simulado{count > 1 ? 's' : ''}
                    </span>
                </div>
                <button
                    onClick={onReset}
                    className="text-[10px] font-black text-[#d2f000] hover:underline flex items-center gap-1 cursor-pointer"
                >
                    <RotateCcw className="w-3 h-3" />
                    Limpiar
                </button>
            </div>
        </div>
    );
};