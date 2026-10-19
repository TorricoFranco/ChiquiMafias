import React from 'react';
import { Trophy, X } from 'lucide-react';

interface SidebarHeaderProps {
    isOpenMobile: boolean;
    onCloseMobile: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
    isOpenMobile,
    onCloseMobile,
}) => {
    return (
        <div className="px-1 pb-2 border-b border-[#353534]/70 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#d2f000]/10 border border-[#d2f000]/30 flex items-center justify-center text-[#d2f000] shadow-sm">
                    <Trophy className="w-4 h-4" />
                </div>
                <div>
                    <h2 className="font-black text-xs text-[#e5e2e1] tracking-wider uppercase">
                        DASHBOARD LIGAS
                    </h2>
                    <p className="text-[10px] text-[#c6c9ab] font-medium">
                        Temporada Oficial 2026
                    </p>
                </div>
            </div>

            {isOpenMobile && (
                <button
                    onClick={onCloseMobile}
                    className="md:hidden text-[#c6c9ab] hover:text-[#e5e2e1] p-1.5 rounded-lg hover:bg-[#2a2a2a]"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};