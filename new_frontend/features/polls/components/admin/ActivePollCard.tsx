import React from 'react';
import { Flame, MessageSquare, ThumbsUp, XCircle } from 'lucide-react';
import { AdminPollItem } from '../../types';


interface ActivePollCardProps {
    poll: AdminPollItem;
    onClosePoll: (pollId: string) => void;
}

export const ActivePollCard: React.FC<ActivePollCardProps> = ({ poll, onClosePoll }) => {
    const totalVotes =
        poll.totalVotes ||
        poll.options.reduce((acc, opt) => acc + (opt.votes || 0), 0);

    return (
        <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
            <div className="flex flex-col gap-3">

                {/* Header */}
                <div className="flex justify-between items-start border-b border-[#353534] pb-3">
                    <div>
                        <span className="bg-[#d2f000]/15 text-[#d2f000] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            {poll.icon || 'FOOTBALL'} • EN VIVO
                        </span>
                        <h3 className="font-extrabold text-base text-[#e5e2e1] mt-1">
                            {poll.title}
                        </h3>
                        {poll.description && (
                            <p className="text-xs text-[#c6c9ab]">{poll.description}</p>
                        )}
                    </div>

                    <span className="text-[11px] font-mono text-[#d2f000] font-bold bg-[#131313] px-2.5 py-1 rounded-lg border border-[#353534] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> {totalVotes.toLocaleString('es-AR')} votos
                    </span>
                </div>

                {/* Option Vote Bars */}
                <div className="flex flex-col gap-2.5">
                    {poll.options.map((opt) => {
                        const optVotes = opt.votes || 0;
                        const pct =
                            totalVotes > 0
                                ? Math.round((optVotes / totalVotes) * 100)
                                : 0;

                        return (
                            <div key={opt.id} className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-semibold text-[#e5e2e1]">
                                    <span>{opt.label}</span>
                                    <span className="font-mono text-[#d2f000]">
                                        {pct}% ({optVotes.toLocaleString('es-AR')} v)
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-[#131313] rounded-full overflow-hidden border border-[#353534]">
                                    <div
                                        className="h-full bg-[#d2f000] transition-all duration-500 rounded-full"
                                        style={{ width: `${pct}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Stats & Timers */}
                <div className="flex items-center justify-between text-[11px] text-[#909378] pt-2 border-t border-[#353534]">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {poll.stats?.comments || 0} comentarios
                        </span>
                        <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5 text-[#d2f000]" />
                            {poll.likesCount || 0}
                        </span>
                    </div>
                    <span className="font-mono">
                        Cierra:{' '}
                        {poll.endsAt
                            ? new Date(poll.endsAt).toLocaleDateString()
                            : 'Manual'}
                    </span>
                </div>
            </div>

            {/* Manual Close Action */}
            <div className="pt-3 border-t border-[#353534]">
                <button
                    onClick={() => onClosePoll(poll.id)}
                    className="w-full bg-[#2a2a2a] hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 font-bold text-xs py-2.5 rounded-xl uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <XCircle className="w-4 h-4" />
                    <span>Cerrar Encuesta Manualmente</span>
                </button>
            </div>
        </div>
    );
};