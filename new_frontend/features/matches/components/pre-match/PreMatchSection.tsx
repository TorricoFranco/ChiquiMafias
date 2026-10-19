import React from 'react';
import { PreMatchResponse, Team } from '../../types';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { HeadToHead } from './HeadToHead';
import { RecentForm } from './RecentForm';
import { ComparativeTables } from './ComparativeTables';

interface PreMatchSectionProps {
    data: PreMatchResponse | null;
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    homeTeam: Team;
    awayTeam: Team;
}

export const PreMatchSection: React.FC<PreMatchSectionProps> = ({
    data,
    isLoading,
    error,
    onRetry,
    homeTeam,
    awayTeam,
}) => {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 animate-pulse">
                <div className="h-20 bg-[#1c1b1b] rounded-2xl border border-[#2b2a2a]" />
                <div className="h-72 bg-[#1c1b1b] rounded-2xl border border-[#2b2a2a]" />
                <div className="h-48 bg-[#1c1b1b] rounded-2xl border border-[#2b2a2a]" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl bg-[#1c1b1b] border border-red-900/30 p-8 text-center my-4">
                <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center mx-auto mb-3 border border-red-800/40">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">
                    Información Pre-Partido no disponible
                </h3>
                <p className="text-xs text-[#8e9285] max-w-md mx-auto mt-1 mb-4">
                    {error || 'No se pudieron sincronizar las estadísticas de historial y forma reciente.'}
                </p>
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2b2a2a] hover:bg-[#353534] text-[#d2f000] text-xs font-bold uppercase tracking-wider border border-[#3e3d3c] transition-all cursor-pointer"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reintentar Carga
                </button>
            </div>
        );
    }

    const { history, form, miniTable } = data;

    return (
        <div className="flex flex-col gap-6">
            <RecentForm
                form={form}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
            />

            <HeadToHead
                history={history}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
            />

            <ComparativeTables
                miniTable={miniTable}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
            />
        </div>
    );
};