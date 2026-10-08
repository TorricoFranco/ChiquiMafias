import React from 'react';
import { Users, UserCheck } from 'lucide-react';

interface Player {
    id: string | number;
    name: string;
    number: number;
    pos: string;
}

interface MatchSubstitutesProps {
    substitutes?: Player[];
    coach?: string;
}

export const MatchSubstitutes: React.FC<MatchSubstitutesProps> = ({ substitutes, coach }) => {
    return (
        <div className="bg-[#242323] rounded-xl border border-[#2b2a2a] p-5 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-[#353534] pb-3 mb-4">
                <h4 className="text-xs font-extrabold text-[#8e9285] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Suplentes ({substitutes?.length || 0})
                </h4>
            </div>

            {/* Lista de Suplentes con Scroll */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                {substitutes?.map((p) => (
                    <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1919] border border-[#2b2a2a] opacity-90 hover:opacity-100 transition-opacity"
                    >
                        <span className="w-7 h-7 rounded-md bg-[#2b2a2a] text-[#8e9285] font-mono font-bold text-[11px] flex items-center justify-center border border-[#3e3d3c] shrink-0">
                            {p.number}
                        </span>
                        <span className="font-semibold text-xs text-[#e5e2e1] truncate flex-1">{p.name}</span>
                        {p.pos && (
                            <span className="px-2 py-0.5 rounded bg-[#2b2a2a] text-[#8e9285] font-mono text-[10px]">
                                {p.pos}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Director Técnico */}
            {coach && (
                <div className="mt-4 pt-4 border-t border-[#353534]">
                    <div className="flex items-center gap-3 bg-[#1a1919] p-3 rounded-lg border border-[#2b2a2a]">
                        <div className="w-8 h-8 rounded-lg bg-[#2b2a2a] flex items-center justify-center border border-[#3e3d3c]">
                            <UserCheck className="w-4 h-4 text-[#d2f000]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#8e9285] uppercase tracking-wider">Director Técnico</p>
                            <p className="text-sm font-bold text-[#e5e2e1]">{coach}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};