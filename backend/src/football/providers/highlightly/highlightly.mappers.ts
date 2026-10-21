import {
  FootballEvent,
  FootballFixture,
  FootballLineup,
  FootballLineupPlayer,
  FootballPlayerRef,
  FootballStandingRow,
  FootballTeamRef,
  FootballTeamStatistics,
} from '../../football.types'
import {
  HlEvent,
  HlLineupPlayer,
  HlLineups,
  HlLineupTeam,
  HlMatch,
  HlMatchDetail,
  HlStandingRow,
  HlTeamBasic,
  HlTeamStatistics,
} from './raw/highlightly.raw'

// Highlightly usa otro vocabulario que el que guarda la DB y lee el front. Todo
// lo que sigue traduce a los códigos canónicos descriptos en football.types.ts.

const STATUS_BY_DESCRIPTION: Record<string, string> = {
  'to be announced': 'TBD',
  'not started': 'NS',
  'first half': '1H',
  'half time': 'HT',
  'second half': '2H',
  'extra time': 'ET',
  'break time': 'BT',
  penalties: 'P',
  suspended: 'SUSP',
  interrupted: 'INT',
  finished: 'FT',
  'finished after penalties': 'PEN',
  'finished after extra time': 'AET',
  postponed: 'PST',
  cancelled: 'CANC',
  abandoned: 'ABD',
  awarded: 'AWD',
  'in progress': 'LIVE',
  unknown: 'TBD',
}

export function mapStatusShort(description: string | null | undefined) {
  return (
    STATUS_BY_DESCRIPTION[(description ?? '').trim().toLowerCase()] ?? 'TBD'
  )
}

/** Estados que equivalen a "el partido todavía no empezó". */
export const NOT_STARTED_SHORTS = ['TBD', 'NS', 'PST', 'CANC']

const FINISHED_SHORTS = ['FT', 'AET', 'PEN']

export function parseScore(score: string | null | undefined) {
  const m = /(\d+)\s*-\s*(\d+)/.exec(score ?? '')
  return m
    ? { home: Number(m[1]), away: Number(m[2]) }
    : { home: null, away: null }
}

function winnerOf(
  short: string,
  goals: { home: number | null; away: number | null },
  penalty: { home: number | null; away: number | null },
): { home: boolean | null; away: boolean | null } {
  if (!FINISHED_SHORTS.includes(short)) return { home: null, away: null }

  let h = goals.home
  let a = goals.away
  if (h !== null && a !== null && h === a) {
    h = penalty.home
    a = penalty.away
  }
  if (h === null || a === null || h === a) return { home: null, away: null }
  return { home: h > a, away: a > h }
}

export function mapTeam(team: HlTeamBasic): FootballTeamRef {
  return { externalId: team.id, name: team.name, logo: team.logo ?? null }
}

export function mapMatch(raw: HlMatch | HlMatchDetail): FootballFixture {
  const short = mapStatusShort(raw.state.description)
  const goals = parseScore(raw.state.score.current)
  const penalty = parseScore(raw.state.score.penalties)
  const winner = winnerOf(short, goals, penalty)
  const detail = raw as HlMatchDetail
  const capacity = Number(detail.venue?.capacity)

  return {
    externalId: raw.id,
    date: raw.date,
    timestamp: Math.floor(new Date(raw.date).getTime() / 1000),
    timezone: 'UTC',
    referee: detail.referee?.name ?? null,
    venue: detail.venue?.name
      ? {
          externalId: null,
          name: detail.venue.name,
          city: detail.venue.city ?? null,
          capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
        }
      : null,
    status: {
      short,
      long: raw.state.description,
      elapsed: raw.state.clock ?? null,
    },
    league: {
      externalId: raw.league.id,
      season: raw.league.season,
      round: raw.round,
    },
    home: { ...mapTeam(raw.homeTeam), winner: winner.home },
    away: { ...mapTeam(raw.awayTeam), winner: winner.away },
    goals,
    penalty,
  }
}

// --- Eventos ---

export function parseEventTime(time: string): {
  minute: number
  extra: number | null
} {
  const m = /^(\d+)(?:\s*\+\s*(\d+))?/.exec(time ?? '')
  if (!m) return { minute: 0, extra: null }
  return { minute: Number(m[1]), extra: m[2] ? Number(m[2]) : null }
}

const VAR_DETAILS: Record<string, string> = {
  'var goal confirmed': 'Goal confirmed',
  'var goal cancelled': 'Goal cancelled',
  'var penalty': 'Penalty confirmed',
  'var penalty cancelled': 'Penalty cancelled',
  'var goal cancelled - offside': 'Goal Disallowed - offside',
}

function playerRef(
  id: number | null | undefined,
  name: string | null | undefined,
): FootballPlayerRef | null {
  if (id === null || id === undefined) {
    return name ? { externalId: null, name } : null
  }
  return { externalId: id, name: name ?? 'Unknown' }
}

/**
 * Convierte los eventos al vocabulario `type / detail` de API-Football
 * (`Goal / Normal Goal`, `Card / Yellow Card`, `subst / Substitution 1`…).
 */
export function mapEvents(raw: HlEvent[]): FootballEvent[] {
  const subsByTeam = new Map<number, number>()

  return raw.map((e) => {
    const { minute, extra } = parseEventTime(e.time)
    const key = e.type.trim().toLowerCase()
    let type = e.type
    let detail: string | null = null
    let assist = playerRef(e.assistingPlayerId, e.assist)

    switch (key) {
      case 'goal':
        type = 'Goal'
        detail = 'Normal Goal'
        break
      case 'own goal':
        type = 'Goal'
        detail = 'Own Goal'
        break
      case 'penalty':
        type = 'Goal'
        detail = 'Penalty'
        break
      case 'missed penalty':
        type = 'Goal'
        detail = 'Missed Penalty'
        break
      case 'yellow card':
      case 'red card':
        type = 'Card'
        detail = e.type
        break
      case 'substitution': {
        const n = (subsByTeam.get(e.team.id) ?? 0) + 1
        subsByTeam.set(e.team.id, n)
        type = 'subst'
        detail = `Substitution ${n}`
        // `player` es el que sale y `substituted` el que entra.
        assist = playerRef(e.assistingPlayerId, e.substituted)
        break
      }
      default:
        if (key in VAR_DETAILS) {
          type = 'Var'
          detail = VAR_DETAILS[key]
        }
    }

    return {
      minute,
      extraMinute: extra,
      type,
      detail,
      team: mapTeam(e.team),
      player: playerRef(e.playerId, e.player),
      assist,
    }
  })
}

// --- Alineaciones ---

const POSITION_SHORT: Record<string, string> = {
  goalkeeper: 'G',
  defender: 'D',
  midfielder: 'M',
  forward: 'F',
}

function lineupPlayer(
  p: HlLineupPlayer,
  grid: string | null,
): FootballLineupPlayer | null {
  if (p.id === undefined || p.id === null) return null
  return {
    externalId: p.id,
    name: p.name,
    number: p.number ?? null,
    position: p.position
      ? (POSITION_SHORT[p.position.toLowerCase()] ?? p.position)
      : null,
    grid,
  }
}

function mapLineupTeam(t: HlLineupTeam): FootballLineup {
  const startXI: FootballLineupPlayer[] = []
  ;(t.initialLineup ?? []).forEach((row, r) => {
    row.forEach((p, c) => {
      // grid "fila:columna" con el arquero en la fila 1, como API-Football.
      const mapped = lineupPlayer(p, `${r + 1}:${c + 1}`)
      if (mapped) startXI.push(mapped)
    })
  })

  const substitutes = (t.substitutes ?? [])
    .map((p) => lineupPlayer(p, null))
    .filter((p): p is FootballLineupPlayer => p !== null)

  return {
    team: mapTeam(t),
    formation: t.formation ?? null,
    coachName: null,
    startXI,
    substitutes,
  }
}

export function mapLineups(
  raw: HlLineups | null | undefined,
): FootballLineup[] {
  if (!raw?.homeTeam || !raw?.awayTeam) return []
  return [mapLineupTeam(raw.homeTeam), mapLineupTeam(raw.awayTeam)]
}

// --- Estadísticas de partido ---

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const pct = (value: number | null) =>
  value === null ? null : `${Math.round(value * 100)}%`

/**
 * Devuelve las claves que lee el front (las de API-Football en snake_case) en
 * un orden fijo, así `StatsSyncCron` puede comparar con `JSON.stringify`.
 */
export function mapStatistics(raw: HlTeamStatistics): FootballTeamStatistics {
  const byName = new Map<string, number | string | null>()
  for (const s of raw.statistics ?? []) {
    byName.set(s.displayName.trim().toLowerCase(), s.value)
  }
  const get = (name: string) => num(byName.get(name))

  const on = get('shots on target')
  const off = get('shots off target')
  const blocked = get('blocked shots')
  const successful = get('successful passes')
  const total = get('total passes')
  const xg = get('expected goals')

  const parts = [on, off, blocked]
  const totalShots = parts.every((p) => p === null)
    ? null
    : parts.reduce<number>((acc, p) => acc + (p ?? 0), 0)

  return {
    team: mapTeam(raw.team),
    statistics: {
      shots_on_goal: on,
      shots_off_goal: off,
      total_shots: totalShots,
      blocked_shots: blocked,
      shots_insidebox: get('shots within penalty area'),
      shots_outsidebox: get('shots outside penalty area'),
      fouls: get('fouls'),
      corner_kicks: get('corners'),
      offsides: get('offsides'),
      ball_possession: pct(get('possession')),
      yellow_cards: get('yellow cards'),
      red_cards: get('red cards'),
      goalkeeper_saves: get('goalkeeper saves'),
      total_passes: total,
      passes_accurate: successful,
      'passes_%': successful !== null && total ? pct(successful / total) : null,
      expected_goals: xg === null ? null : xg.toFixed(2),
    },
  }
}

// --- Tabla de posiciones ---

export function mapStandingRow(
  group: string,
  raw: HlStandingRow,
): FootballStandingRow {
  return {
    rank: raw.position,
    team: mapTeam(raw.team),
    points: raw.points,
    goalsDiff: raw.total.scoredGoals - raw.total.receivedGoals,
    group,
    form: '',
    description: null,
    played: raw.total.games,
    wins: raw.total.wins,
    draws: raw.total.draws,
    losses: raw.total.loses,
    goalsFor: raw.total.scoredGoals,
    goalsAgainst: raw.total.receivedGoals,
  }
}
