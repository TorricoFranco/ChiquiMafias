import type { LiveResult } from '@/features/fixture/types';
import type { BracketResponse, BracketRound, BracketTeam } from '../types';

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
// PST no cuenta: un partido postergado meses no puede dejar la página en una ronda vieja.
const UPCOMING = ['NS', 'TBD'];
export const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD'];
const PENALTIES = ['P', 'PEN'];

/**
 * `src` del escudo: el asset local si el equipo tiene ID de API-Football y, si
 * no, su escudo en Cloudinary. Null si no tiene ninguno.
 */
export const teamBadgeSrc = (team: Pick<BracketTeam, 'apiTeamId' | 'logoUrl'>) =>
  team.apiTeamId !== null ? `/escudos-api/${team.apiTeamId}.webp` : team.logoUrl;

const hasMatch = (round: BracketRound) => round.slots.some((s) => s.matchId);

/**
 * Ronda que se muestra al entrar: la que se está jugando; si no, la del próximo
 * partido por fecha; si no, la última con partidos.
 */
export const defaultRound = (rounds: BracketRound[]): BracketRound | null => {
  const live = rounds.find((r) => r.slots.some((s) => s.isLive));
  if (live) return live;

  let next: { round: BracketRound; date: number } | null = null;
  for (const round of rounds) {
    for (const slot of round.slots) {
      if (!slot.matchId || !slot.date || !slot.status || !UPCOMING.includes(slot.status)) continue;
      const date = new Date(slot.date).getTime();
      if (!next || date < next.date) next = { round, date };
    }
  }
  if (next) return next.round;
  return [...rounds].reverse().find(hasMatch) ?? rounds[0] ?? null;
};

/** Ronda que tiene al menos un partido (las demás no se pueden elegir todavía). */
export const isRoundAvailable = hasMatch;

/** Suma los marcadores que llegan por socket sobre el cuadro de la API. */
export const withLiveResults = (
  bracket: BracketResponse,
  live: Record<string, LiveResult>,
): BracketResponse => ({
  rounds: bracket.rounds.map((round) => ({
    ...round,
    slots: round.slots.map((slot) => {
      const result = slot.matchId ? live[slot.matchId] : undefined;
      // El socket deja de mandar un partido cuando termina: su último dato en
      // vivo no puede pisar el resultado final que ya trae la API.
      const finished =
        slot.winnerTeamId !== null || (slot.status !== null && FINISHED.includes(slot.status));
      if (!result || finished) return slot;
      // El socket manda 0 cuando no hay penales: solo cuentan en la tanda.
      const penalties = PENALTIES.includes(result.status);
      return {
        ...slot,
        status: result.status,
        isLive: LIVE.includes(result.status),
        homeGoals: result.h,
        awayGoals: result.a,
        homePenalties: penalties ? result.hp : null,
        awayPenalties: penalties ? result.ap : null,
      };
    }),
  })),
});

/** Día y hora de un partido: `29/10 · 20:30`. Las rondas de una copa duran semanas. */
export const formatKickoff = (date: string) => {
  const d = new Date(date);
  const day = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
};
