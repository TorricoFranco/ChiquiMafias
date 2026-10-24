import React, { useState } from 'react';
import { useMatch } from '../hooks/useMatch';
import { MatchHeader } from './MatchHeader';
import { MatchStatusBanner } from './MatchStatusBanner';
import { MatchTabs, MatchTabKey } from './MatchTabs';
import { PreMatchSection } from './pre-match/PreMatchSection';
import { MatchTimeline } from './MatchTimeline';
import { MatchPenaltyShootout } from './MatchPenaltyShootout';
import { MatchStats } from './MatchStats';
import { MatchLineups } from './MatchLineups';
import { MatchChat } from './MatchChat';
import { ArrowLeft, AlertOctagon, RefreshCw, MessageSquare } from 'lucide-react';
import { MatchMarketWidget } from '@/features/bets/components/MatchMarketWidget';
import { chatStateFor } from '../types';
import type { MatchChatState } from '../types';

interface MatchDetailViewProps {
    matchId: string;
    onBack: () => void;
}

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({ matchId, onBack }) => {
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
    } = useMatch({ matchId });

    // El backend decide el estado del chat según el estado del partido.
    const chatState: MatchChatState =
        matchDetails?.chatState ?? chatStateFor(matchDetails?.metadata?.status);
    const showChatTab = chatState !== 'CLOSED';

    const [selectedTab, setActiveTab] = useState<MatchTabKey>(
        isNotStarted && !hasLineups ? 'pre-partido' : 'resumen'
    );

    // Pre-partido deja de existir al arrancar el partido y el chat al terminar: en ese caso se muestra resumen. Derivado, sin efecto.
    const activeTab: MatchTabKey =
        (!isNotStarted && selectedTab === 'pre-partido') || (!showChatTab && selectedTab === 'chat')
            ? 'resumen'
            : selectedTab;

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
                        {typeof error === 'string' ? error : (error as { message?: string } | null)?.message || 'Error desconocido'}
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
                        showChatTab={showChatTab}
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
                            {matchDetails.shootout && matchDetails.shootout.length > 0 && (
                                <MatchPenaltyShootout
                                    kicks={matchDetails.shootout}
                                    homeTeam={matchDetails.teams.home}
                                    awayTeam={matchDetails.teams.away}
                                    homePenalties={matchDetails.score.home_penalties}
                                    awayPenalties={matchDetails.score.away_penalties}
                                />
                            )}
                            <MatchTimeline
                                events={matchDetails.events}
                                homeTeam={matchDetails.teams.home}
                                awayTeam={matchDetails.teams.away}
                                neutralVenue={matchDetails.competition?.neutralVenue}
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

                    {/* Región viva montada siempre: anuncia cuando el chat se abre, se pausa o se cierra. */}
                    <p role="status" className="sr-only">
                        {activeTab === 'chat' ? CHAT_ANNOUNCEMENTS[chatState] : ''}
                    </p>

                    {activeTab === 'chat' && (
                        chatState === 'OPEN' ? (
                            <MatchChat matchId={matchId} className="w-full h-[80dvh] min-h-[600px] max-h-[900px] shrink-0" />
                        ) : (
                            <ChatNotice state={chatState} />
                        )
                    )}
                </>
            ) : null}
        </div>
    );
};

const CHAT_ANNOUNCEMENTS: Record<MatchChatState, string> = {
    NOT_STARTED: 'El chat comienza cuando arranque el partido.',
    OPEN: 'El chat del partido está abierto.',
    PAUSED: 'Chat pausado: el partido está suspendido.',
    CLOSED: 'El chat cerró al terminar el partido.',
};

const CHAT_NOTICES: Record<Exclude<MatchChatState, 'OPEN'>, { title: string; text: string }> = {
    NOT_STARTED: {
        title: 'El chat comienza cuando arranque el partido',
        text: 'La tribuna se abre automáticamente con el pitazo inicial.',
    },
    PAUSED: {
        title: 'Chat pausado: el partido está suspendido',
        text: 'La tribuna se vuelve a abrir si el partido se reanuda.',
    },
    CLOSED: {
        title: 'El chat cerró al terminar el partido',
        text: 'La tribuna de este partido ya no recibe mensajes.',
    },
};

function ChatNotice({ state }: { state: Exclude<MatchChatState, 'OPEN'> }) {
    const notice = CHAT_NOTICES[state];
    return (
        <div
            className="flex flex-col items-center justify-center p-16 bg-[#1c1b1b] rounded-2xl border border-[#2b2a2a] text-center shadow-sm"
        >
            <MessageSquare className="w-12 h-12 text-[#8e9285] mb-4" aria-hidden="true" />
            <h3 className="text-xl font-black text-[#e5e2e1] uppercase tracking-tight">{notice.title}</h3>
            <p className="text-[#8e9285] mt-2 max-w-md">{notice.text}</p>
        </div>
    );
}




