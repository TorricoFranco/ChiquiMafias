import React from 'react';
import { MatchEvent, Team } from '../types';
import { Clock, ArrowRightLeft, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeam: Team;
  awayTeam: Team;
}

export const MatchTimeline: React.FC<MatchTimelineProps> = ({ events, homeTeam, awayTeam }) => {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-8 text-center my-4">
        <div className="w-12 h-12 rounded-full bg-[#242323] flex items-center justify-center mx-auto mb-3 border border-[#353534]">
          <Activity className="w-6 h-6 text-[#8e9285]" />
        </div>
        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">
          Sin incidencias registradas
        </h3>
        <p className="text-xs text-[#8e9285] max-w-sm mx-auto mt-1">
          Aún no se han reportado goles, amonestaciones ni sustituciones en este encuentro.
        </p>
      </div>
    );
  }

  // Traducción y formateo del detalle del evento
  const getEventTranslation = (type: string, detail: string) => {
    const t = type.toLowerCase();
    const d = detail.toLowerCase();

    if (t === 'goal') {
      if (d.includes('penalty')) return 'Gol de penal';
      if (d.includes('own')) return 'Gol en contra';
      return 'Gol';
    }

    if (t === 'card') {
      if (d.includes('red') || d.includes('roja')) return 'Tarjeta Roja';
      if (d.includes('yellow') || d.includes('amarilla')) return 'Tarjeta Amarilla';
      return 'Tarjeta';
    }

    if (t === 'subst') return 'Cambio';
    if (t === 'var') return 'Revisión VAR';

    return detail || type;
  };

  const getEventIcon = (type: string, detail: string) => {
    const t = type.toLowerCase();
    const d = detail.toLowerCase();

    switch (t) {
      case 'goal':
        return <span className="text-lg">⚽</span>;
      case 'card':
        if (d.includes('roja') || d.includes('red')) {
          return <span className="w-3.5 h-5 bg-red-600 rounded-sm inline-block shadow" />;
        }
        return <span className="w-3.5 h-5 bg-yellow-400 rounded-sm inline-block shadow" />;
      case 'subst':
        return <ArrowRightLeft className="w-4 h-4 text-emerald-400" />;
      case 'var':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#d2f000]" />;
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    if (a.minute === b.minute) {
      return (a.extraMinute || 0) - (b.extraMinute || 0);
    }
    return a.minute - b.minute;
  });

  const firstHalf = sortedEvents.filter((ev) => ev.minute <= 45);
  const secondHalf = sortedEvents.filter((ev) => ev.minute > 45);

  const renderEvent = (ev: MatchEvent) => {
    const isHome = ev.team?.id === homeTeam.id;
    const isSubst = ev.type.toLowerCase() === 'subst' || !!ev.substitutionLog;

    return (
      <div key={ev.id} className="relative flex justify-between items-center w-full mb-6 group">
        {/* Lado Izquierdo (Equipo Local) */}
        <div className="w-[45%] flex justify-end pr-2 md:pr-4">
          {isHome && (
            <div className="w-full max-w-[280px] bg-[#242323] rounded-xl p-3 border border-[#2b2a2a] group-hover:border-[#3e3d3c] transition-all">
              <div className="flex items-start justify-end gap-3 flex-row-reverse">
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#191818] border border-[#353534]">
                  {getEventIcon(ev.type, ev.detail)}
                </div>
                <div className="flex-1 flex flex-col items-end text-right min-w-0">
                  {/* Título de la tarjeta */}
                  <span className="font-bold text-sm text-[#e5e2e1] truncate w-full">
                    {isSubst
                      ? 'Cambio'
                      : ev.player?.name || ev.team?.name || 'Incidencia'}
                  </span>

                  {/* Cuerpo según el tipo de evento */}
                  {isSubst ? (
                    <div className="text-xs mt-1 flex flex-col items-end gap-0.5 w-full">
                      <span className="text-emerald-400 font-semibold truncate w-full">
                        Entra: {ev.substitutionLog?.playerIn || ev.player?.name}
                      </span>
                      <span className="text-red-400/80 font-medium truncate w-full">
                        Sale: {ev.substitutionLog?.playerOut || ev.assist?.name}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8e9285] mt-0.5 truncate w-full">
                      {getEventTranslation(ev.type, ev.detail)}
                    </p>
                  )}

                  {/* Asistencia en caso de Gol */}
                  {!isSubst && ev.assist && (
                    <p className="text-[11px] text-[#c6c9ab] mt-1 truncate w-full">
                      Asistencia: <span className="font-medium text-[#e5e2e1]">{ev.assist.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Círculo Central del Minuto */}
        <div className="w-[10%] flex justify-center relative z-10 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#242323] border border-[#3e3d3c] group-hover:border-[#d2f000] transition-colors shadow-md">
            <span className="text-[10px] font-mono font-bold text-[#d2f000]">
              {ev.minute}'
            </span>
            {ev.extraMinute !== null && (
              <span className="absolute -top-3.5 text-[9px] font-mono font-bold text-[#c6c9ab] bg-[#1c1b1b] px-1 rounded-sm border border-[#2b2a2a]">
                +{ev.extraMinute}
              </span>
            )}
          </div>
        </div>

        {/* Lado Derecho (Equipo Visitante) */}
        <div className="w-[45%] flex justify-start pl-2 md:pl-4">
          {!isHome && (
            <div className="w-full max-w-[280px] bg-[#242323] rounded-xl p-3 border border-[#2b2a2a] group-hover:border-[#3e3d3c] transition-all">
              <div className="flex items-start justify-start gap-3 flex-row">
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#191818] border border-[#353534]">
                  {getEventIcon(ev.type, ev.detail)}
                </div>
                <div className="flex-1 flex flex-col items-start text-left min-w-0">
                  {/* Título de la tarjeta */}
                  <span className="font-bold text-sm text-[#e5e2e1] truncate w-full">
                    {isSubst
                      ? 'Cambio'
                      : ev.player?.name || ev.team?.name || 'Incidencia'}
                  </span>

                  {/* Cuerpo según el tipo de evento */}
                  {isSubst ? (
                    <div className="text-xs mt-1 flex flex-col items-start gap-0.5 w-full">
                      <span className="text-emerald-400 font-semibold truncate w-full">
                        Entra: {ev.substitutionLog?.playerIn || ev.player?.name}
                      </span>
                      <span className="text-red-400/80 font-medium truncate w-full">
                        Sale: {ev.substitutionLog?.playerOut || ev.assist?.name}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8e9285] mt-0.5 truncate w-full">
                      {getEventTranslation(ev.type, ev.detail)}
                    </p>
                  )}

                  {/* Asistencia en caso de Gol */}
                  {!isSubst && ev.assist && (
                    <p className="text-[11px] text-[#c6c9ab] mt-1 truncate w-full">
                      Asistencia: <span className="font-medium text-[#e5e2e1]">{ev.assist.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-4 md:p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-3 mb-6">
        <h3 className="font-extrabold text-sm text-[#e5e2e1] uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#d2f000]" />
          Cronología del Partido ({sortedEvents.length})
        </h3>
      </div>

      <div className="flex justify-between items-center mb-6 px-2 opacity-80">
        <div className="w-[45%] text-right font-bold text-[#d2f000] uppercase text-[10px] md:text-xs truncate pr-4">
          Local: {homeTeam.name}
        </div>
        <div className="w-[10%] text-center text-[#8e9285] text-[10px] font-mono">VS</div>
        <div className="w-[45%] text-left font-bold text-blue-400 uppercase text-[10px] md:text-xs truncate pl-4">
          Visita: {awayTeam.name}
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#2b2a2a]" />

        {firstHalf.map(renderEvent)}

        {(firstHalf.length > 0 || secondHalf.length > 0) && (
          <div className="relative flex justify-center items-center w-full my-8 z-10">
            <div className="bg-[#191818] px-4 py-1.5 rounded-full border-2 border-[#2b2a2a] text-[10px] font-extrabold text-[#8e9285] uppercase tracking-widest shadow-md">
              Entretiempo
            </div>
          </div>
        )}

        {secondHalf.map(renderEvent)}
      </div>
    </div>
  );
};