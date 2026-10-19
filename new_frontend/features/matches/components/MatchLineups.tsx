import React, { useState } from 'react';
import { MatchLineup, Team } from '../types';
import { Users, Shield, Shirt, UserCheck } from 'lucide-react';
import { SoccerPitch } from './SoccerPitch';

interface MatchLineupsProps {
    lineups: MatchLineup[];
    homeTeam: Team;
    awayTeam: Team;
}

export const MatchLineups: React.FC<MatchLineupsProps> = ({ lineups, homeTeam, awayTeam }) => {
    const [activeViewTeam, setActiveViewTeam] = useState<string>(homeTeam.id);

    if (!lineups || lineups.length === 0) {
        return (
            <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-10 text-center my-4">
                <div className="w-14 h-14 rounded-full bg-[#242323] flex items-center justify-center mx-auto mb-4 border border-[#353534]">
                    <Users className="w-7 h-7 text-[#8e9285]" />
                </div>
                <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase tracking-wide">
                    Alineaciones no confirmadas
                </h3>
                <p className="text-xs text-[#8e9285] max-w-md mx-auto mt-1.5">
                    Los directores técnicos aún no han presentado las planillas oficiales.
                </p>
            </div>
        );
    }

    const homeLineup = lineups.find((l) => l.teamId === homeTeam.id);
    const awayLineup = lineups.find((l) => l.teamId === awayTeam.id);
    const selectedLineup = lineups.find((l) => l.teamId === activeViewTeam);

    return (
        <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-4 sm:p-6 flex flex-col gap-6">
            
            {/* Header de la Cancha */}
            <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-[#8e9285]">
                <div className="flex items-center gap-2">
                    {homeTeam.logo && <img src={homeTeam.logo} alt="" className="w-4 h-4" />}
                    <span className="hidden sm:inline">{homeTeam.name}</span>
                    <span className="text-[#d2f000] bg-[#d2f000]/10 px-1.5 py-0.5 rounded ml-1">{homeLineup?.formation || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#d2f000] bg-[#d2f000]/10 px-1.5 py-0.5 rounded mr-1">{awayLineup?.formation || '-'}</span>
                    <span className="hidden sm:inline">{awayTeam.name}</span>
                    {awayTeam.logo && <img src={awayTeam.logo} alt="" className="w-4 h-4" />}
                </div>
            </div>

            {/* LA CANCHA HORIZONTAL (Ocupa todo el ancho) */}
            <SoccerPitch 
                homePlayers={homeLineup?.startXI || []}
                awayPlayers={awayLineup?.startXI || []}
                homeColors={homeLineup?.kitColors}
                awayColors={awayLineup?.kitColors}
            />

            {/* SEPARADOR / SELECTOR DE EQUIPO (Para ver las listas abajo) */}
            <div className="flex bg-[#242323] p-1.5 rounded-xl border border-[#2b2a2a] mt-2">
                {[homeTeam, awayTeam].map((team) => (
                    <button
                        key={team.id}
                        onClick={() => setActiveViewTeam(team.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold uppercase transition-all ${
                            activeViewTeam === team.id
                                ? 'bg-[#353534] text-[#e5e2e1] shadow-sm ring-1 ring-white/10'
                                : 'text-[#8e9285] hover:text-[#e5e2e1] hover:bg-[#2b2a2a]'
                        }`}
                    >
                        {team.logo && <img src={team.logo} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />}
                        <span className="truncate">{team.name}</span>
                    </button>
                ))}
            </div>

            {/* LISTAS: Titulares y Suplentes del equipo seleccionado */}
            {!selectedLineup ? (
                <div className="rounded-xl bg-[#242323] border border-[#353534] p-8 text-center">
                    <Shield className="w-8 h-8 text-[#8e9285] mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#e5e2e1]">Sin datos para este equipo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Columna: Titulares */}
                    <div className="bg-[#242323] rounded-xl p-4 border border-[#2b2a2a]">
                        <h4 className="text-[11px] font-extrabold text-[#d2f000] uppercase tracking-widest flex items-center gap-2 border-b border-[#353534] pb-3 mb-3">
                            <Shirt className="w-4 h-4" /> Titulares
                        </h4>
                        <div className="flex flex-col gap-1">
                            {selectedLineup.startXI?.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#353534] transition-colors group">
                                    <span className="w-6 h-6 rounded bg-[#1a1919] border border-[#353534] text-[#e5e2e1] font-mono font-bold text-[10px] flex items-center justify-center">
                                        {p.number}
                                    </span>
                                    <span className="font-semibold text-xs text-[#e5e2e1] flex-1">{p.name}</span>
                                    {p.pos && <span className="text-[9px] text-[#8e9285] font-mono bg-[#1a1919] px-1.5 py-0.5 rounded">{p.pos}</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Columna: Suplentes y DT */}
                    <div className="bg-[#242323] rounded-xl p-4 border border-[#2b2a2a] flex flex-col">
                        <h4 className="text-[11px] font-extrabold text-[#8e9285] uppercase tracking-widest flex items-center gap-2 border-b border-[#353534] pb-3 mb-3">
                            <Users className="w-4 h-4" /> Suplentes
                        </h4>
                        <div className="flex flex-col gap-1 flex-1">
                            {selectedLineup.substitutes?.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#353534] transition-colors group">
                                    <span className="w-6 h-6 rounded bg-[#1a1919] border border-[#353534] text-[#8e9285] font-mono font-bold text-[10px] flex items-center justify-center">
                                        {p.number}
                                    </span>
                                    <span className="font-semibold text-xs text-[#8e9285] group-hover:text-[#e5e2e1] transition-colors flex-1">{p.name}</span>
                                    {p.pos && <span className="text-[9px] text-[#8e9285] font-mono bg-[#1a1919] px-1.5 py-0.5 rounded">{p.pos}</span>}
                                </div>
                            ))}
                        </div>
                        
                        {selectedLineup.coach && (
                            <div className="mt-4 pt-4 border-t border-[#353534] flex items-center gap-3 px-2">
                                <div className="w-8 h-8 rounded-lg bg-[#1c1b1b] flex items-center justify-center border border-[#353534]">
                                    <UserCheck className="w-4 h-4 text-[#d2f000]" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-[#8e9285] uppercase tracking-widest">Director Técnico</p>
                                    <p className="text-xs font-bold text-[#e5e2e1]">{selectedLineup.coach}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};