import { FootballFixture } from '../football.types'
import { resolveLigaDivididaRound } from '../formats/liga-dividida.strategy'
import { EXACT_SCORE, nameScore } from './name-match'

export interface DbTeam {
  id: string
  name: string
}

export interface DbMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  /** Ronda ya traducida, como se guarda en `Matches.round`. */
  round: string
  date: Date
}

export type TeamLinkHow = 'nombre' | 'nombre aproximado' | 'calendario'

export interface TeamLink {
  teamId: string
  teamName: string
  externalId: number
  externalName: string
  how: TeamLinkHow
  score: number
}

export interface MatchLink {
  matchId: string
  externalId: number
  diffHours: number
  sameRound: boolean
}

export interface LinkPlan {
  teams: TeamLink[]
  teamsWithoutLink: DbTeam[]
  sourceTeamsUnused: { externalId: number; name: string }[]
  /** Vínculos de partido seguros (misma ronda, o fecha cercana). */
  matches: MatchLink[]
  /** Partidos con ronda distinta y fecha lejana: no se aplican solos. */
  matchesToReview: (MatchLink & { reason: string })[]
  matchesWithoutLink: { match: DbMatch; reason: string }[]
  /** Partidos del proveedor que no existen en la base (los crea el sync). */
  sourceOnly: FootballFixture[]
}

const HOUR = 3600 * 1000
// Con la misma ronda se acepta cualquier diferencia de horario (hay reprogramaciones
// de semanas); con otra ronda solo si la fecha casi coincide.
const REVIEW_THRESHOLD_HOURS = 72
const CALENDAR_TOLERANCE_MS = 2 * HOUR
const MIN_NAME_SCORE = 0.6

/**
 * Calcula cómo vincular equipos y partidos de la base con los de un proveedor.
 * No toca la base: devuelve el plan para mostrarlo o aplicarlo.
 *
 * - Equipos: por nombre (uno a uno, mejor puntaje primero) y, los que sobran, por
 *   calendario (mismo horario que un partido donde el rival ya está vinculado).
 * - Partidos: local + visitante + ronda. Si el cruce se repite, se elige el más
 *   cercano en fecha.
 */
export function planLinks(
  dbTeams: DbTeam[],
  dbMatches: DbMatch[],
  source: FootballFixture[],
): LinkPlan {
  // ---------- equipos ----------
  const sourceTeams = new Map<number, string>()
  for (const f of source) {
    sourceTeams.set(f.home.externalId, f.home.name)
    sourceTeams.set(f.away.externalId, f.away.name)
  }

  const teamLinks = new Map<string, TeamLink>()
  const usedSource = new Set<number>()
  const link = (
    team: DbTeam,
    externalId: number,
    how: TeamLinkHow,
    score: number,
  ) => {
    teamLinks.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      externalId,
      externalName: sourceTeams.get(externalId) ?? '',
      how,
      score,
    })
    usedSource.add(externalId)
  }

  const candidates: { team: DbTeam; externalId: number; score: number }[] = []
  for (const team of dbTeams) {
    for (const [externalId, name] of sourceTeams) {
      const score = nameScore(team.name, name)
      if (score >= MIN_NAME_SCORE) candidates.push({ team, externalId, score })
    }
  }
  candidates.sort((x, y) => y.score - x.score)
  for (const c of candidates) {
    if (teamLinks.has(c.team.id) || usedSource.has(c.externalId)) continue
    link(
      c.team,
      c.externalId,
      c.score >= EXACT_SCORE ? 'nombre' : 'nombre aproximado',
      c.score,
    )
  }

  // Por calendario: un lado del partido ya vinculado y el otro no.
  const teamById = new Map(dbTeams.map((t) => [t.id, t]))
  let changed = true
  while (changed) {
    changed = false
    for (const m of dbMatches) {
      for (const side of ['home', 'away'] as const) {
        const mine = side === 'home' ? m.homeTeamId : m.awayTeamId
        const otherId = side === 'home' ? m.awayTeamId : m.homeTeamId
        const known = teamLinks.get(otherId)?.externalId
        const team = teamById.get(mine)
        if (!team || teamLinks.has(mine) || known === undefined) continue

        const options = source.filter(
          (f) =>
            Math.abs(new Date(f.date).getTime() - m.date.getTime()) <=
              CALENDAR_TOLERANCE_MS &&
            (side === 'home' ? f.away : f.home).externalId === known &&
            !usedSource.has((side === 'home' ? f.home : f.away).externalId),
        )
        const targets = [
          ...new Set(
            options.map((f) => (side === 'home' ? f.home : f.away).externalId),
          ),
        ]
        if (targets.length === 1) {
          link(team, targets[0], 'calendario', 0)
          changed = true
        }
      }
    }
  }

  // ---------- partidos ----------
  const internalByExternalTeam = new Map(
    [...teamLinks.values()].map((l) => [l.externalId, l.teamId]),
  )
  const usedSourceMatches = new Set<number>()
  const matches: MatchLink[] = []
  const matchesToReview: LinkPlan['matchesToReview'] = []
  const matchesWithoutLink: LinkPlan['matchesWithoutLink'] = []

  const sourceView = source.map((f) => ({
    f,
    home: internalByExternalTeam.get(f.home.externalId),
    away: internalByExternalTeam.get(f.away.externalId),
    round: resolveLigaDivididaRound(f.league.round, 'N/A').round,
    ts: new Date(f.date).getTime(),
  }))

  for (const m of dbMatches) {
    const pair = sourceView.filter(
      (s) =>
        s.home === m.homeTeamId &&
        s.away === m.awayTeamId &&
        !usedSourceMatches.has(s.f.externalId),
    )
    if (!pair.length) {
      matchesWithoutLink.push({
        match: m,
        reason:
          teamLinks.has(m.homeTeamId) && teamLinks.has(m.awayTeamId)
            ? 'no hay un partido equivalente en el proveedor'
            : 'equipo sin vincular',
      })
      continue
    }

    const byDate = (a: (typeof pair)[number], b: (typeof pair)[number]) =>
      Math.abs(a.ts - m.date.getTime()) - Math.abs(b.ts - m.date.getTime())
    const sameRound = pair.filter((s) => s.round === m.round).sort(byDate)
    const best = (sameRound.length ? sameRound : pair.sort(byDate))[0]

    usedSourceMatches.add(best.f.externalId)
    const entry: MatchLink = {
      matchId: m.id,
      externalId: best.f.externalId,
      diffHours: Math.abs(best.ts - m.date.getTime()) / HOUR,
      sameRound: best.round === m.round,
    }
    if (!entry.sameRound && entry.diffHours > REVIEW_THRESHOLD_HOURS) {
      matchesToReview.push({
        ...entry,
        reason: `ronda distinta y ${entry.diffHours.toFixed(0)} h de diferencia`,
      })
    } else {
      matches.push(entry)
    }
  }

  return {
    teams: [...teamLinks.values()],
    teamsWithoutLink: dbTeams.filter((t) => !teamLinks.has(t.id)),
    sourceTeamsUnused: [...sourceTeams]
      .filter(([id]) => !usedSource.has(id))
      .map(([externalId, name]) => ({ externalId, name })),
    matches,
    matchesToReview,
    matchesWithoutLink,
    sourceOnly: source.filter((f) => !usedSourceMatches.has(f.externalId)),
  }
}
