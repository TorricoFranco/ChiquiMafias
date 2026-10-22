import { FootballFixture } from '../football.types'
import { EXACT_SCORE, nameScore } from './name-match'

export interface DbTeam {
  id: string
  name: string
  /** ID del equipo en el proveedor, si ya está vinculado. */
  linkedExternalId?: number | null
}

export interface DbMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  /** Ronda ya traducida, como se guarda en `Matches.round`. */
  round: string
  date: Date
}

export interface SourceTeam {
  externalId: number
  name: string
  logo: string | null
  country: string | null
}

/**
 * - vínculo: ya estaba vinculado al proveedor.
 * - nombre: nombre exacto y único en los dos sentidos.
 * - confirmado: lo eligió una persona en el archivo de decisiones.
 */
export type TeamLinkHow = 'vínculo' | 'nombre' | 'confirmado'

export interface TeamLink {
  teamId: string
  teamName: string
  externalId: number
  externalName: string
  how: TeamLinkHow
}

export interface TeamCandidate {
  teamId: string
  name: string
  score: number
  /** 'nombre' (parecido) o 'calendario' (mismo horario que un partido). */
  reason: 'nombre' | 'calendario'
}

export interface TeamToConfirm {
  source: SourceTeam
  candidates: TeamCandidate[]
}

export interface TeamToCreate {
  source: SourceTeam
  /** Nombre con el que se crea: el del proveedor o el corregido a mano. */
  name: string
  /** Equipo de la base más parecido, para detectar un posible duplicado. */
  closest: { teamId: string; name: string; score: number } | null
}

/** Lo que decidió una persona sobre un equipo del proveedor. */
export type TeamDecision =
  | { action: 'link'; teamId: string }
  | { action: 'create'; name?: string }
  | { action: 'skip' }
  | { action: 'pending' }

export interface MatchLink {
  matchId: string
  externalId: number
  diffHours: number
  sameRound: boolean
}

export interface PlanLinksOptions {
  decisions?: Record<number, TeamDecision>
  /**
   * Ronda de cada partido del proveedor ya traducida por la estrategia del
   * formato, en el mismo orden que `source`. Sin esto se usa la del proveedor.
   */
  rounds?: string[]
}

export interface LinkPlan {
  teams: TeamLink[]
  /** Parecidos a un equipo de la base: no se vinculan sin confirmación. */
  teamsToConfirm: TeamToConfirm[]
  /** Sin equivalente en la base: se crean con --apply. */
  teamsToCreate: TeamToCreate[]
  teamsSkipped: SourceTeam[]
  /** Decisiones que no se pueden aplicar (equipo inexistente, ya vinculado…). */
  decisionErrors: string[]
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
// Un equipo libre de la base con este parecido o más es candidato: el del
// proveedor va a confirmar en vez de crearse, para no duplicar un club que en la
// base tiene otro nombre (ej. "Estudiantes L.P." y "Estudiantes de La Plata").
const MIN_CANDIDATE_SCORE = 0.3
const MAX_CANDIDATES = 3

/** Equipos que aparecen en los partidos del proveedor, sin repetir. */
export function sourceTeamsOf(source: FootballFixture[]): SourceTeam[] {
  const teams = new Map<number, SourceTeam>()
  for (const f of source) {
    for (const side of [f.home, f.away]) {
      if (teams.has(side.externalId)) continue
      teams.set(side.externalId, {
        externalId: side.externalId,
        name: side.name,
        logo: side.logo ?? null,
        country: side.country ?? null,
      })
    }
  }
  return [...teams.values()]
}

/**
 * Calcula cómo vincular equipos y partidos de la base con los de un proveedor.
 * No toca la base: devuelve el plan para mostrarlo o aplicarlo.
 *
 * Equipos (ERS RF-A09 y RF-A10), en este orden:
 * 1. Los que ya tienen vínculo con el proveedor entran por el vínculo y dejan
 *    de ser candidatos para otros nombres.
 * 2. Las decisiones del archivo (vincular, crear, saltear).
 * 3. Nombre exacto y único en los dos sentidos: se vincula solo. Dos "San
 *    Martín" en la base o en el proveedor no son únicos y van a confirmar.
 * 4. Parecidos por nombre (aunque sea poco) o por calendario a un equipo libre
 *    de la base: a confirmar, nunca solos.
 * 5. Sin candidatos libres: a crear.
 *
 * Partidos: local + visitante + ronda. Si el cruce se repite, se elige el más
 * cercano en fecha.
 */
export function planLinks(
  dbTeams: DbTeam[],
  dbMatches: DbMatch[],
  source: FootballFixture[],
  { decisions = {}, rounds }: PlanLinksOptions = {},
): LinkPlan {
  const sourceTeams = sourceTeamsOf(source)
  const teamById = new Map(dbTeams.map((t) => [t.id, t]))

  const links = new Map<number, TeamLink>()
  const usedTeams = new Set<string>()
  const link = (team: DbTeam, src: SourceTeam, how: TeamLinkHow) => {
    links.set(src.externalId, {
      teamId: team.id,
      teamName: team.name,
      externalId: src.externalId,
      externalName: src.name,
      how,
    })
    usedTeams.add(team.id)
  }

  const teamsToCreate: TeamToCreate[] = []
  const teamsSkipped: SourceTeam[] = []
  const decisionErrors: string[] = []
  const decided = new Set<number>()

  // 1. Ya vinculados.
  const linkedByExternal = new Map(
    dbTeams
      .filter((t) => t.linkedExternalId != null)
      .map((t) => [t.linkedExternalId!, t]),
  )
  for (const src of sourceTeams) {
    const team = linkedByExternal.get(src.externalId)
    if (team) link(team, src, 'vínculo')
  }

  // 2. Decisiones.
  for (const src of sourceTeams) {
    const decision = decisions[src.externalId]
    if (links.has(src.externalId) || !decision) continue
    if (decision.action === 'pending') continue
    decided.add(src.externalId)

    if (decision.action === 'skip') {
      teamsSkipped.push(src)
    } else if (decision.action === 'create') {
      teamsToCreate.push({
        source: src,
        name: decision.name?.trim() || src.name,
        closest: closestTeam(src, dbTeams),
      })
    } else {
      const team = teamById.get(decision.teamId)
      if (!team) {
        decisionErrors.push(
          `${src.name} (${src.externalId}): no existe el equipo ${decision.teamId}`,
        )
      } else if (team.linkedExternalId != null) {
        decisionErrors.push(
          `${src.name} (${src.externalId}): ${team.name} ya está vinculado a ${team.linkedExternalId}`,
        )
      } else if (usedTeams.has(team.id)) {
        decisionErrors.push(
          `${src.name} (${src.externalId}): ${team.name} ya fue elegido para otro equipo`,
        )
      } else {
        link(team, src, 'confirmado')
      }
    }
  }

  // 3. Nombre exacto y único en los dos sentidos.
  const pending = () =>
    sourceTeams.filter(
      (s) => !links.has(s.externalId) && !decided.has(s.externalId),
    )
  const freeTeams = () =>
    dbTeams.filter((t) => t.linkedExternalId == null && !usedTeams.has(t.id))

  const exactOf = new Map<number, DbTeam[]>()
  const exactCount = new Map<string, number>()
  for (const src of pending()) {
    const exact = freeTeams().filter(
      (t) => nameScore(t.name, src.name) >= EXACT_SCORE,
    )
    exactOf.set(src.externalId, exact)
    for (const t of exact) exactCount.set(t.id, (exactCount.get(t.id) ?? 0) + 1)
  }
  for (const src of pending()) {
    const exact = exactOf.get(src.externalId) ?? []
    if (exact.length === 1 && exactCount.get(exact[0].id) === 1) {
      link(exact[0], src, 'nombre')
    }
  }

  // 4 y 5. Parecidos a confirmar; el resto, a crear.
  const calendar = calendarHints(dbMatches, source, links, freeTeams())
  const teamsToConfirm: TeamToConfirm[] = []
  for (const src of pending()) {
    const candidates: TeamCandidate[] = freeTeams()
      .map((t) => ({
        teamId: t.id,
        name: t.name,
        score: nameScore(t.name, src.name),
        reason: 'nombre' as const,
      }))
      .filter((c) => c.score >= MIN_CANDIDATE_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES)

    const byCalendar = calendar.get(src.externalId)
    if (byCalendar && !candidates.some((c) => c.teamId === byCalendar.id)) {
      candidates.push({
        teamId: byCalendar.id,
        name: byCalendar.name,
        score: nameScore(byCalendar.name, src.name),
        reason: 'calendario',
      })
    }

    if (candidates.length > 0) {
      teamsToConfirm.push({ source: src, candidates })
    } else {
      teamsToCreate.push({
        source: src,
        name: src.name,
        closest: closestTeam(src, dbTeams),
      })
    }
  }

  return {
    teams: [...links.values()],
    teamsToConfirm,
    teamsToCreate,
    teamsSkipped,
    decisionErrors,
    ...planMatches(links, dbMatches, source, rounds),
  }
}

function closestTeam(
  src: SourceTeam,
  dbTeams: DbTeam[],
): TeamToCreate['closest'] {
  let best: TeamToCreate['closest'] = null
  for (const t of dbTeams) {
    const score = nameScore(t.name, src.name)
    if (score >= MIN_CANDIDATE_SCORE && (!best || score > best.score)) {
      best = { teamId: t.id, name: t.name, score }
    }
  }
  return best
}

/**
 * Equipo de la base que juega a la misma hora contra un rival ya vinculado. Es
 * solo una sugerencia: va a confirmar como cualquier parecido.
 */
function calendarHints(
  dbMatches: DbMatch[],
  source: FootballFixture[],
  links: Map<number, TeamLink>,
  freeTeams: DbTeam[],
): Map<number, DbTeam> {
  const free = new Map(freeTeams.map((t) => [t.id, t]))
  const externalOfTeam = new Map(
    [...links.values()].map((l) => [l.teamId, l.externalId]),
  )
  const options = new Map<number, Set<string>>()

  for (const m of dbMatches) {
    for (const side of ['home', 'away'] as const) {
      const mine = side === 'home' ? m.homeTeamId : m.awayTeamId
      const other = side === 'home' ? m.awayTeamId : m.homeTeamId
      const known = externalOfTeam.get(other)
      if (!free.has(mine) || known === undefined) continue

      for (const f of source) {
        const sameTime =
          Math.abs(new Date(f.date).getTime() - m.date.getTime()) <=
          CALENDAR_TOLERANCE_MS
        const rival = side === 'home' ? f.away : f.home
        const candidate = side === 'home' ? f.home : f.away
        if (!sameTime || rival.externalId !== known) continue
        if (links.has(candidate.externalId)) continue
        const set = options.get(candidate.externalId) ?? new Set<string>()
        set.add(mine)
        options.set(candidate.externalId, set)
      }
    }
  }

  const hints = new Map<number, DbTeam>()
  for (const [externalId, teamIds] of options) {
    if (teamIds.size === 1) hints.set(externalId, free.get([...teamIds][0])!)
  }
  return hints
}

function planMatches(
  links: Map<number, TeamLink>,
  dbMatches: DbMatch[],
  source: FootballFixture[],
  rounds: string[] | undefined,
): Pick<
  LinkPlan,
  'matches' | 'matchesToReview' | 'matchesWithoutLink' | 'sourceOnly'
> {
  const internalByExternalTeam = new Map(
    [...links.values()].map((l) => [l.externalId, l.teamId]),
  )
  const linkedTeams = new Set(internalByExternalTeam.values())
  const usedSourceMatches = new Set<number>()
  const matches: MatchLink[] = []
  const matchesToReview: LinkPlan['matchesToReview'] = []
  const matchesWithoutLink: LinkPlan['matchesWithoutLink'] = []

  const sourceView = source.map((f, i) => ({
    f,
    home: internalByExternalTeam.get(f.home.externalId),
    away: internalByExternalTeam.get(f.away.externalId),
    round: rounds?.[i] ?? f.league.round,
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
          linkedTeams.has(m.homeTeamId) && linkedTeams.has(m.awayTeamId)
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
    matches,
    matchesToReview,
    matchesWithoutLink,
    sourceOnly: source.filter((f) => !usedSourceMatches.has(f.externalId)),
  }
}
