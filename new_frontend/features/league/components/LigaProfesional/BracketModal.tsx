import React, { useEffect } from 'react';
import { BracketMatch } from '../../type';
import { X, GitBranch, Radio } from 'lucide-react';

interface BracketModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentName?: string;
    brackets: BracketMatch[];
}

export const BracketModal: React.FC<BracketModalProps> = ({
    isOpen,
    onClose,
    tournamentName = 'Torneo Clausura 2026',
    brackets,
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const octavosLeft = brackets.filter((b) => b.round.includes('octavos') && b.side === 'left');
    const octavosRight = brackets.filter((b) => b.round.includes('octavos') && b.side === 'right');

    const cuartosLeft = brackets.filter((b) => b.round.includes('cuartos') && b.side === 'left');
    const cuartosRight = brackets.filter((b) => b.round.includes('cuartos') && b.side === 'right');

    const semiLeft = brackets.filter((b) => b.round.includes('semifinal') && b.side === 'left');
    const semiRight = brackets.filter((b) => b.round.includes('semifinal') && b.side === 'right');

    const finalMatch = brackets.find((b) => b.round.includes('final'));

    const renderMatchCard = (m: BracketMatch, roundName: string, isCenter = false) => {
        const isLive = m.status_short === 'LIVE' || m.status_short === '1H' || m.status_short === '2H';
        const isFinished = m.status_short === 'FT' || m.status_short === 'PEN' || m.status_short === 'AET';

        const isTBD =
            !m.home_team?.name ||
            !m.away_team?.name ||
            m.home_team.name.includes('CONFIRMAR') ||
            m.home_team.id === 'tbd' ||
            m.away_team.name.includes('CONFIRMAR') ||
            m.away_team.id === 'tbd';

        let calculatedWinnerId = m.winnerTeamId;
        if (isFinished && !calculatedWinnerId) {
            if (m.status_short === 'PEN') {
                if ((m.home_penalty_goals ?? 0) > (m.away_penalty_goals ?? 0)) {
                    calculatedWinnerId = m.home_team.name;
                } else if ((m.away_penalty_goals ?? 0) > (m.home_penalty_goals ?? 0)) {
                    calculatedWinnerId = m.away_team.name;
                }
            } else {
                if ((m.home_goals ?? 0) > (m.away_goals ?? 0)) {
                    calculatedWinnerId = m.home_team.name;
                } else if ((m.away_goals ?? 0) > (m.home_goals ?? 0)) {
                    calculatedWinnerId = m.away_team.name;
                }
            }
        }

        const isHomeWinner = isFinished && (
            m.winnerTeamId === m.home_team.id ||
            calculatedWinnerId === m.home_team.id ||
            calculatedWinnerId === m.home_team.name
        );

        const isAwayWinner = isFinished && (
            m.winnerTeamId === m.away_team.id ||
            calculatedWinnerId === m.away_team.id ||
            calculatedWinnerId === m.away_team.name
        );

        return (
            <div
                key={m.id}
                className={`flex flex-col rounded-xl p-2 transition-all shadow-md shrink-0 ${isCenter
                    ? 'w-44 sm:w-52 bg-gradient-to-b from-[#2a2a2a] to-[#1c1b1b] border-2 border-[#d2f000] shadow-[0_0_20px_rgba(210,240,0,0.25)]'
                    : isTBD
                        ? 'w-36 sm:w-40 bg-[#161616]/60 border border-[#2a2a2a] opacity-50'
                        : isLive
                            ? 'w-36 sm:w-40 bg-[#221a1a] border border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                            : 'w-36 sm:w-40 bg-[#202020] border border-[#353534] hover:border-[#454932]'
                    }`}
            >
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#353534]/50 text-[9px] sm:text-[10px]">
                    <span className="font-bold text-[#8e9285] uppercase tracking-wider">
                        {roundName}
                    </span>
                    {isLive ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-bold animate-pulse font-mono">
                            <Radio className="w-2.5 h-2.5 text-red-500" /> VIVO
                        </span>
                    ) : isFinished ? (
                        <span className="text-[#8e9285] font-semibold">
                            {m.status_short === 'PEN' ? 'Penales' : m.status_short === 'AET' ? 'Prórroga' : 'Final'}
                        </span>
                    ) : (
                        <span className="text-[#555]">{isTBD ? '' : 'Programado'}</span>
                    )}
                </div>

                <div className={`flex items-center justify-between py-1 rounded px-1 -mx-1 ${isHomeWinner ? 'bg-[#d2f000]/10 font-semibold' : ''}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-[#181818] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {!isTBD && m.home_team?.logo_url ? (
                                <img
                                    src={m.home_team.logo_url}
                                    alt={m.home_team.name}
                                    className="w-3 h-3 object-contain"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-[#353534]" />
                            )}
                        </div>
                        <span className={`text-[10px] sm:text-xs uppercase font-bold truncate ${isHomeWinner ? 'text-[#d2f000]' : isFinished ? 'text-[#888]' : 'text-[#e5e2e1]'}`}>
                            {m.home_team?.name || 'A confirmar'}
                        </span>
                    </div>
                    {!isTBD && (
                        <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-black">
                            {m.home_penalty_goals !== undefined && m.home_penalty_goals !== null && (
                                <span className={`text-[9px] ${isHomeWinner ? 'text-[#d2f000]' : 'text-[#8e9285]'}`}>
                                    ({m.home_penalty_goals})
                                </span>
                            )}
                            <span className={isLive ? 'text-yellow-400' : isFinished ? 'text-[#e5e2e1]' : 'text-[#666]'}>
                                {m.home_goals !== null ? m.home_goals : '-'}
                            </span>
                        </div>
                    )}
                </div>

                <div className={`flex items-center justify-between py-1 rounded px-1 -mx-1 mt-0.5 ${isAwayWinner ? 'bg-[#d2f000]/10 font-semibold' : ''}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-[#181818] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {!isTBD && m.away_team?.logo_url ? (
                                <img
                                    src={m.away_team.logo_url}
                                    alt={m.away_team.name}
                                    className="w-3 h-3 object-contain"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-[#353534]" />
                            )}
                        </div>
                        <span className={`text-[10px] sm:text-xs uppercase font-bold truncate ${isAwayWinner ? 'text-[#d2f000]' : isFinished ? 'text-[#888]' : 'text-[#e5e2e1]'}`}>
                            {m.away_team?.name || 'A confirmar'}
                        </span>
                    </div>
                    {!isTBD && (
                        <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-black">
                            {m.away_penalty_goals !== undefined && m.away_penalty_goals !== null && (
                                <span className={`text-[9px] ${isAwayWinner ? 'text-[#d2f000]' : 'text-[#8e9285]'}`}>
                                    ({m.away_penalty_goals})
                                </span>
                            )}
                            <span className={isLive ? 'text-yellow-400' : isFinished ? 'text-[#e5e2e1]' : 'text-[#666]'}>
                                {m.away_goals !== null ? m.away_goals : '-'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-[1300px] h-[95vh] bg-[#161616] border border-[#353534] rounded-3xl flex flex-col overflow-hidden shadow-2xl">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#353534] bg-[#1c1b1b] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#d2f000]/10 border border-[#d2f000]/30 flex items-center justify-center text-[#d2f000]">
                            <GitBranch className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-[#e5e2e1] uppercase tracking-tight">
                                    Cuadro de Eliminación Directa
                                </h2>
                                <span className="px-2 py-0.5 rounded-full bg-[#d2f000]/15 text-[#d2f000] text-[10px] font-black border border-[#d2f000]/30">
                                    PLAYOFFS
                                </span>
                            </div>
                            <p className="text-xs text-[#8e9285]">
                                {tournamentName} • Partido único
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1] flex items-center justify-center transition-colors"
                        title="Cerrar (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto p-4 flex items-center justify-start lg:justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1c1b1b] to-[#161616]">

                    {/* Ancho mínimo optimizado */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-[780px] h-full max-h-[600px] my-auto">

                        {/* LADO IZQUIERDO: Octavos */}
                        <div className="flex flex-col justify-between h-full py-1">
                            {octavosLeft.map((m) => renderMatchCard(m, 'Octavos'))}
                        </div>

                        {/* LADO IZQUIERDO: Cuartos */}
                        <div className="flex flex-col justify-around h-full py-10">
                            {cuartosLeft.map((m) => renderMatchCard(m, 'Cuartos'))}
                        </div>

                        {/* LADO IZQUIERDO: Semifinal (Acercada al centro) */}
                        <div className="flex flex-col justify-center gap-36 h-full">
                            {semiLeft.map((m) => renderMatchCard(m, 'Semifinal'))}
                        </div>

                        {/* CENTRO: FINAL (Centrada perfectamente entre las dos semis) */}
                        <div className="flex flex-col items-center justify-center h-full px-1">
                            {finalMatch ? renderMatchCard(finalMatch, 'Final', true) : (
                                <div className="w-44 h-20 rounded-xl border border-dashed border-[#353534] flex items-center justify-center text-[10px] text-[#555]">
                                    Final a confirmar
                                </div>
                            )}
                        </div>

                        {/* LADO DERECHO: Semifinal (Acercada al centro) */}
                        <div className="flex flex-col justify-center gap-36 h-full">
                            {semiRight.map((m) => renderMatchCard(m, 'Semifinal'))}
                        </div>

                        {/* LADO DERECHO: Cuartos */}
                        <div className="flex flex-col justify-around h-full py-10">
                            {cuartosRight.map((m) => renderMatchCard(m, 'Cuartos'))}
                        </div>

                        {/* LADO DERECHO: Octavos */}
                        <div className="flex flex-col justify-between h-full py-1">
                            {octavosRight.map((m) => renderMatchCard(m, 'Octavos'))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-[#353534] bg-[#181818] flex items-center justify-between text-xs text-[#8e9285] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            En juego
                        </span>
                        <span className="flex items-center gap-1.5 text-[#e5e2e1]">
                            <span className="w-2 h-2 rounded-full bg-[#d2f000]"></span>
                            Ganador avanza
                        </span>
                    </div>
                    <span>Presione Esc para cerrar</span>
                </div>
            </div>
        </div>
    );
};