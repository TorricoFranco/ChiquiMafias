import React from 'react';
import { Team } from '../../types';

interface RecentFormProps {
    form: { home: string; away: string };
    homeTeam: Team;
    awayTeam: Team;
}

export const RecentForm: React.FC<RecentFormProps> = ({ form, homeTeam, awayTeam }) => {
    const renderFormBadges = (formStr: string) => {
        if (!formStr) return null;
        const letters = formStr.split('');

        return (
            <div className="flex items-center gap-2">
                {letters.map((rawRes, i) => {
                    const res = rawRes.toUpperCase() === 'G' ? 'V' : rawRes.toUpperCase() === 'P' ? 'D' : rawRes.toUpperCase();
                    let bg = 'bg-zinc-800 text-zinc-300';

                    if (res === 'V') bg = 'bg-emerald-500 text-white shadow-sm';
                    if (res === 'E') bg = 'bg-amber-500 text-white shadow-sm';
                    if (res === 'D' || res === 'L') bg = 'bg-red-500 text-white shadow-sm';

                    return (
                        <span
                            key={i}
                            className={`w-8 h-8 rounded-md text-sm font-bold font-mono flex items-center justify-center ${bg}`}
                        >
                            {res}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-5 shadow-sm flex flex-col gap-5">
            <h3 className="font-extrabold text-sm text-[#e5e2e1] uppercase">
                Partidos recientes:
            </h3>

            <div className="flex flex-col md:flex-row items-center justify-center w-full md:gap-10 gap-6">

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                        src={homeTeam.logo || undefined}
                        alt={homeTeam.name}
                        className="w-10 h-10 object-contain"
                    />
                    {renderFormBadges(form.home)}
                </div>

                <span className="text-[#8e9285] font-black text-sm hidden md:block">VS</span>

                <div className="flex flex-col sm:flex-row-reverse items-center gap-4">
                    <img
                        src={awayTeam.logo || undefined}
                        alt={awayTeam.name}
                        className="w-10 h-10 object-contain"
                    />
                    {renderFormBadges(form.away)}
                </div>

            </div>
        </div>
    );
};