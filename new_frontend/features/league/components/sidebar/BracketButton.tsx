import React from 'react';
import { GitBranch } from 'lucide-react';

interface BracketButtonProps {
    onClick: () => void;
}

export const BracketButton: React.FC<BracketButtonProps> = ({ onClick }) => {
    return (
        <div className="px-1">
            <button
                onClick={onClick}
                className="w-full bg-gradient-to-r from-[#d2f000]/15 to-[#38e8ac]/10 hover:from-[#d2f000]/25 hover:to-[#38e8ac]/20 text-[#e5e2e1] hover:text-[#d2f000] p-2.5 rounded-xl border border-[#d2f000]/30 transition-all flex items-center justify-between group shadow-sm cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#d2f000] group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                        <span className="block font-black text-xs uppercase tracking-tight text-[#e5e2e1] group-hover:text-[#d2f000]">
                            Ver Llaves Playoffs
                        </span>
                        <span className="text-[9px] text-[#c6c9ab] block">
                            Octavos a Gran Final
                        </span>
                    </div>
                </div>
                <span className="text-[9px] bg-[#d2f000] text-[#191e00] font-black px-1.5 py-0.5 rounded">
                    CUADRO
                </span>
            </button>
        </div>
    );
};