import React, { useState, useEffect } from 'react';
import { useMatch } from '../hooks/useMatch';
import { MatchHeader } from './MatchHeader';
import { MatchStatusBanner } from './MatchStatusBanner';
import { MatchTabs, MatchTabKey } from './MatchTabs';
import { PreMatchSection } from './pre-match/PreMatchSection';
import { MatchTimeline } from './MatchTimeline';
import { MatchStats } from './MatchStats';
import { MatchLineups } from './MatchLineups';
import { MatchChat } from './MatchChat';
import { ArrowLeft, AlertOctagon, RefreshCw, MessageSquare } from 'lucide-react';
import { MatchMarketWidget } from '@/features/bets/components/MatchMarketWidget';

interface MatchDetailViewProps {
    leagueId: string;
    season: string;
    matchId: string;
    onBack: () => void;
}

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({ leagueId, season, matchId, onBack }) => {
    const {
        matchDetails,
        isLoading,
        error,
        preMatchData,
        isPreMatchLoading,
        preMatchError,
        isNotStarted,
        hasLineups,
        refetchMatch,
        refetchPreMatch,
    } = useMatch({ leagueId, season, matchId });

    const isFinished = ['FT', 'FINALIZADO', 'FINISHED'].includes(
        matchDetails?.metadata?.status?.toUpperCase() || ''
    );

    const [activeTab, setActiveTab] = useState<MatchTabKey>(
        isNotStarted && !hasLineups ? 'pre-partido' : 'resumen'
    );

    useEffect(() => {
        if (!isNotStarted && activeTab === 'pre-partido') {
            setActiveTab('resumen');
        }
        if (isFinished && activeTab === 'chat') {
            setActiveTab('resumen');
        }
    }, [isNotStarted, isFinished, activeTab]);

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12 px-2 md:px-0">
            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c1b1b] hover:bg-[#252424] text-[#c6c9ab] hover:text-[#e5e2e1] text-xs font-bold uppercase tracking-wider border border-[#2b2a2a] transition-all cursor-pointer shadow-sm active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver al fixture</span>
                </button>
            </div>

            {/* Loading / Error states */}
            {isLoading ? (
                <div className="flex flex-col gap-6 animate-pulse">
                    <div className="h-64 rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a]" />
                    <div className="h-12 w-96 rounded-xl bg-[#1c1b1b] border border-[#2b2a2a]" />
                    <div className="h-96 rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a]" />
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-[#1c1b1b] border border-red-900/40 p-12 text-center my-6 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-red-950/60 flex items-center justify-center mx-auto mb-4 border border-red-800/60">
                        <AlertOctagon className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-black text-[#e5e2e1] uppercase tracking-tight">
                        Error al consultar el partido
                    </h2>
                    <p className="text-xs text-[#8e9285] max-w-md mx-auto mt-2 mb-6">
                        {typeof error === 'string' ? error : (error as any)?.message || 'Error desconocido'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => refetchMatch()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d2f000] text-[#191e00] font-bold text-xs uppercase tracking-wider hover:bg-[#b8d300] cursor-pointer shadow-md"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar
                        </button>
                        <button
                            onClick={onBack}
                            className="px-4 py-2.5 rounded-xl bg-[#2b2a2a] text-[#c6c9ab] font-bold text-xs uppercase tracking-wider hover:bg-[#353534] cursor-pointer border border-[#3e3d3c]"
                        >
                            Regresar
                        </button>
                    </div>
                </div>
            ) : matchDetails ? (
                <>
                    <MatchHeader details={matchDetails} />

                    <MatchStatusBanner
                        status={matchDetails.metadata.status}
                        statusLong={matchDetails.metadata.status_long}
                    />

                    {isNotStarted && (
                        <MatchMarketWidget
                            teamA={matchDetails.teams.home.name}
                            teamB={matchDetails.teams.away.name}
                        />
                    )}

                    <MatchTabs
                        activeTab={activeTab}
                        onChangeTab={setActiveTab}
                        isNotStarted={isNotStarted} 
                        hasLineups={hasLineups}
                        isFinished={isFinished}
                        chatCount={0}
                        eventsCount={matchDetails.events?.length || 0}
                    />

                    {activeTab === 'pre-partido' && (
                        <PreMatchSection
                            data={preMatchData ?? null}
                            isLoading={isPreMatchLoading}
                            error={preMatchError ? preMatchError.message : null}
                            onRetry={() => refetchPreMatch()}
                            homeTeam={matchDetails.teams.home}
                            awayTeam={matchDetails.teams.away}
                        />
                    )}

                    {activeTab === 'resumen' && (
                        <div className="flex flex-col gap-6">
                            <MatchTimeline
                                events={matchDetails.events}
                                homeTeam={matchDetails.teams.home}
                                awayTeam={matchDetails.teams.away}
                            />
                            {matchDetails.stats && matchDetails.stats.length > 0 && (
                                <MatchStats
                                    stats={matchDetails.stats}
                                    homeTeam={matchDetails.teams.home}
                                    awayTeam={matchDetails.teams.away}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'formaciones' && (
                        <MatchLineups
                            lineups={matchDetails.lineups}
                            homeTeam={matchDetails.teams.home}
                            awayTeam={matchDetails.teams.away}
                        />
                    )}

                    {activeTab === 'chat' && (
                        false ? (
                            <div className="flex flex-col items-center justify-center p-16 bg-[#1c1b1b] rounded-2xl border border-[#2b2a2a] text-center shadow-sm">
                                <MessageSquare className="w-12 h-12 text-[#8e9285] mb-4" />
                                <h3 className="text-xl font-black text-[#e5e2e1] uppercase tracking-tight">
                                    El chat inicia cuando arranque el partido
                                </h3>
                                <p className="text-[#8e9285] mt-2 max-w-md">
                                    La sala de discusión se habilitará automáticamente con el pitazo inicial.
                                </p>
                            </div>
                        ) : (
                            <MatchChat matchId={matchId} className="w-full h-[600px] shrink-0" />
                        )
                    )}
                </>
            ) : null}
        </div>
    );
};




