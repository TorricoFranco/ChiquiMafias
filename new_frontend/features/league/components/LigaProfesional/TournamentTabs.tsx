import React from 'react';
import { TournamentType } from '../../type';

interface TournamentTabsProps {
    activeTournament: TournamentType;
    onChangeTournament: (t: TournamentType) => void;
}

export const TournamentTabs: React.FC<TournamentTabsProps> = ({
    activeTournament,
    onChangeTournament,
}) => {
    return (
        <div className="flex items-center gap-2 bg-[#1c1b1b] border border-[#353534] p-1.5 rounded-2xl w-full">
            <button
                onClick={() => onChangeTournament('APERTURA')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${activeTournament === 'APERTURA'
                        ? 'bg-[#d2f000] text-[#191e00] shadow-[0_0_15px_rgba(210,240,0,0.25)]'
                        : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                    }`}
            >
                <span>TORNEO APERTURA</span>
            </button>

            <button
                onClick={() => onChangeTournament('CLAUSURA')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${activeTournament === 'CLAUSURA'
                        ? 'bg-[#d2f000] text-[#191e00] shadow-[0_0_15px_rgba(210,240,0,0.25)]'
                        : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                    }`}
            >
                <span>TORNEO CLAUSURA</span>
            </button>
        </div>
    );
};
