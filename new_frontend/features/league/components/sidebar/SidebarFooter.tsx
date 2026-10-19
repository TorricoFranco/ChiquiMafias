import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface SidebarFooterProps {
    onSwitch: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ onSwitch }) => {
    return (
        <div className="px-1 pt-3 border-t border-[#353534]/60 mt-auto">
            <button
                onClick={onSwitch}
                className="w-full bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] hover:text-[#d2f000] py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-[#353534] flex items-center justify-center gap-2 cursor-pointer group shadow-sm"
            >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#d2f000] group-hover:rotate-180 transition-transform" />
                <span>Panel Social / Apuestas</span>
            </button>
        </div>
    );
};