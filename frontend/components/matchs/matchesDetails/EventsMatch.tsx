import React from 'react';

const EVENT_ICONS = {
    GOAL: "https://cdn-icons-png.flaticon.com/512/53/53283.png",
    YELLOW_CARD: "https://cdn-icons-png.flaticon.com/512/6722/6722420.png",
    RED_CARD: "https://cdn-icons-png.flaticon.com/512/6722/6722432.png",
    SUBST: "https://cdn-icons-png.flaticon.com/512/6304/6304925.png",
    VAR: "https://cdn-icons-png.flaticon.com/512/11135/11135338.png",
    DEFAULT: "https://cdn-icons-png.flaticon.com/512/1165/1165230.png"
};

const getEventImage = (type?: string | null, detail?: string | null): string => {
    const t = type?.toLowerCase() || '';
    const d = detail?.toLowerCase() || '';
    if (t === 'goal') return EVENT_ICONS.GOAL;
    if (t === 'subst') return EVENT_ICONS.SUBST;
    if (t === 'card' && d.includes('yellow')) return EVENT_ICONS.YELLOW_CARD;
    if (t === 'card' && d.includes('red')) return EVENT_ICONS.RED_CARD;
    if (t === 'var') return EVENT_ICONS.VAR;
    return EVENT_ICONS.DEFAULT;
};

interface EventsMatchProps {
    events: any[];
    teams: {
        home?: { id: number | string };
        away?: { id: number | string };
    };
}

export const EventsMatch = ({ events, teams }: EventsMatchProps) => {
    if (!events || events.length === 0) {
        return <div className="py-10 text-center text-gray-400 italic font-medium">Esperando sucesos del encuentro...</div>;
    }

    const homeTeamId = teams?.home?.id;

    const sortedEvents = [...events].sort((a, b) => {
        const minA = a.minute ?? a.time?.elapsed ?? 0;
        const minB = b.minute ?? b.time?.elapsed ?? 0;
        if (minB !== minA) return minB - minA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-[#1a1d21] rounded-2xl shadow-xl border border-gray-800/50">
            <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-[2px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-700"></div>

                {sortedEvents.map((event, index) => {
                    const isHome = event.team?.id === homeTeamId;
                    const eventImg = getEventImage(event.type, event.detail);
                    const isSub = event.type?.toLowerCase() === 'subst';

                    return (
                        <div key={event.id || index} className="mb-8 flex items-center w-full relative">
                            <div className="w-[45%] pr-6">
                                {isHome && (
                                    <div className="flex flex-col items-end text-right">
                                        {isSub ? (
                                            <>
                                                <span className="text-white font-black text-sm md:text-base uppercase leading-none mb-1">
                                                    {/* El que ENTRA (Player In) */}
                                                    {event.assist?.name || event.substitutionLog?.playerOut}
                                                </span>
                                                <span className="text-red-500 text-xs font-bold opacity-90 italic">
                                                    {/* El que SALE (Player Out) */}
                                                    {event.player?.name || event.substitutionLog?.playerIn}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-extrabold text-gray-100 text-sm md:text-base leading-tight">
                                                    {event.player?.name}
                                                </p>
                                                <p className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                                    {event.detail}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="w-[10%] z-20 flex flex-col items-center">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-full bg-[#25292e] border-2 shadow-lg ${event.type?.toLowerCase() === 'var'
                                    ? 'border-blue-500 animate-pulse bg-blue-900/20'
                                    : 'border-gray-700'
                                    }`}>
                                    <img src={eventImg} alt="" className="w-5 h-5 object-contain" />
                                </div>
                                <div className="mt-2 bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-700">
                                    <span className="text-[11px] font-black text-yellow-500">
                                        {event.minute ?? event.time?.elapsed}{event.extraMinute ?? event.time?.extra ? `+${event.extraMinute ?? event.time?.extra}` : ''}'
                                    </span>
                                </div>
                            </div>

                            <div className="w-[45%] pl-6">
                                {!isHome && (
                                    <div className="flex flex-col items-start text-left">
                                        {isSub ? (
                                            <>

                                                {/* JUGADOR QUE ENTRA: En verde o blanco brillante */}
                                                <span className="text-white font-black text-sm md:text-base uppercase leading-none mb-1">
                                                    {event.assist?.name || event.substitutionLog?.playerOut}
                                                </span>

                                                {/* JUGADOR QUE SALE: En rojo y más chico */}
                                                <span className="text-red-500 text-xs font-bold opacity-80 italic">
                                                    {event.player?.name || event.substitutionLog?.playerIn}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-extrabold text-gray-100 text-sm md:text-base leading-tight">
                                                    {event.player?.name}
                                                </p>
                                                <p className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                                    {event.detail}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};