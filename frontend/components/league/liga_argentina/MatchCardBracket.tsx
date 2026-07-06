import { Match } from '@/types/league/bracketsMatch';


export const MatchCardBracket = ({ match, live }: { match: Match, live?: any }) => {
    const homeScore = live ? live.h : match.home_goals;
    const awayScore = live ? live.a : match.away_goals;
    const homePen = live ? live.hp : match.home_pen;
    const awayPen = live ? live.ap : match.away_pen;

    const status = live ? live.status : match.status_short;
    const isFinished = status === 'FT';
    const isLive = status === 'LIVE';

    const getWinnerScore = () => Math.max(Number(homeScore || 0), Number(awayScore || 0));

    return (
        <div className={`w-40 bg-zinc-800/80 border ${isLive ? 'border-red-500 animate-pulse' : 'border-zinc-700'} rounded shadow-md overflow-hidden transition-all hover:border-sky-500/50 backdrop-blur-sm relative`}>

            {isLive && (
                <div className="absolute top-0 right-0 bg-red-500 text-[7px] text-white px-1 font-bold uppercase">
                    Vivo
                </div>
            )}

            {[
                { team: match.home_team, score: homeScore, pen: homePen },
                { team: match.away_team, score: awayScore, pen: awayPen }
            ].map((item, idx) => {
                const isWinner = isFinished && item.score === getWinnerScore();

                return (
                    <div key={idx} className={`flex items-center justify-between p-2 ${idx === 0 ? 'border-b border-zinc-700/50' : ''}`}>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {item.team?.logo_url ? (
                                <img src={item.team.logo_url} alt="" className="w-4 h-4 flex-shrink-0 object-contain" />
                            ) : (<div className="w-4 h-4 bg-zinc-700 rounded-full" />)}

                            <span className={`text-[10px] truncate font-semibold uppercase tracking-tight ${isWinner ? 'text-white' : 'text-zinc-400'}`}>
                                {item.team?.name || 'TBD'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Penales (Si existen) */}
                            {item.pen !== null && item.pen !== undefined && (
                                <span className="text-[8px] text-zinc-500 font-bold">
                                    ({item.pen})
                                </span>
                            )}
                            {/* Goles */}
                            <span className={`text-[11px] font-black ${isLive ? 'text-red-500' : 'text-sky-400'}`}>
                                {item.score ?? ''}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};