import React from 'react';
import { MatchStatus } from '../types';
import { AlertTriangle, Clock, Ban } from 'lucide-react';

interface MatchStatusBannerProps {
    status: MatchStatus;
    statusLong?: string;
}

export const MatchStatusBanner: React.FC<MatchStatusBannerProps> = ({ status, statusLong }) => {
    if (['SUSP', 'CANC', 'PST', 'ABD'].includes(status)) {
        const isCancelled = status === 'CANC';
        const isSuspended = status === 'SUSP';
        const isPostponed = status === 'PST';

        return (
            <div
                className={`rounded-xl border p-4 my-4 flex items-center gap-3 ${isCancelled
                        ? 'bg-red-950/40 border-red-800/60 text-red-200'
                        : isSuspended
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                            : 'bg-zinc-900/60 border-zinc-700/60 text-zinc-300'
                    }`}
            >
                <div className="shrink-0">
                    {isCancelled && <Ban className="w-6 h-6 text-red-400" />}
                    {isSuspended && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                    {isPostponed && <Clock className="w-6 h-6 text-zinc-400" />}
                </div>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">
                        {isCancelled && 'Partido Cancelado'}
                        {isSuspended && 'Partido Suspendido'}
                        {isPostponed && 'Partido Postergado'}
                        {status === 'ABD' && 'Partido Abandonado'}
                    </h3>
                    <p className="text-xs text-[#c6c9ab] mt-0.5">
                        {statusLong ||
                            'El encuentro no se desarrollará con normalidad. La programación y reprogramación oficial será informada por la AFA y la Liga.'}
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
