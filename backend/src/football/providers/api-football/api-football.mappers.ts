import {
  FootballEvent,
  FootballFixture,
  FootballLeague,
  FootballLineup,
  FootballLineupPlayer,
  FootballPlayerRef,
  FootballStandingRow,
  FootballTeamDetail,
  FootballTeamRef,
  FootballTeamStatistics,
} from '../../football.types'
import {
  ApiEventRaw,
  ApiFixtureRaw,
  ApiLeagueRaw,
  ApiLineupPlayerRaw,
  ApiLineupRaw,
  ApiStandingRowRaw,
  ApiStatisticsRaw,
  ApiTeamBasic,
  ApiTeamResponseRaw,
} from './raw/api-football.raw'

// API-Football ya usa el vocabulario canónico de estados, eventos y estadísticas,
// así que el mapeo es estructural: renombrar campos y normalizar nulos.

export function mapTeam(team: ApiTeamBasic): FootballTeamRef {
  return {
    externalId: team.id,
    name: team.name,
    logo: team.logo ?? null,
    code: team.code ?? null,
    country: team.country ?? null,
    founded: team.founded ?? null,
  }
}

export function mapFixture(raw: ApiFixtureRaw): FootballFixture {
  const venue = raw.fixture.venue
  return {
    externalId: raw.fixture.id,
    date: raw.fixture.date,
    timestamp: raw.fixture.timestamp,
    timezone: raw.fixture.timezone,
    referee: raw.fixture.referee ?? null,
    venue: venue
      ? {
          externalId: venue.id,
          name: venue.name,
          city: venue.city,
          capacity: null,
          surface: null,
          image: null,
        }
      : null,
    status: {
      short: raw.fixture.status.short,
      long: raw.fixture.status.long,
      elapsed: raw.fixture.status.elapsed ?? null,
    },
    league: {
      externalId: raw.league.id,
      season: raw.league.season,
      round: raw.league.round,
    },
    home: { ...mapTeam(raw.teams.home), winner: raw.teams.home.winner ?? null },
    away: { ...mapTeam(raw.teams.away), winner: raw.teams.away.winner ?? null },
    goals: { home: raw.goals.home, away: raw.goals.away },
    penalty: {
      home: raw.score?.penalty?.home ?? null,
      away: raw.score?.penalty?.away ?? null,
    },
  }
}

function mapPlayerRef(
  player: { id: number | null; name: string | null } | null | undefined,
): FootballPlayerRef | null {
  if (!player) return null
  const hasId = player.id !== null && player.id !== undefined
  if (!hasId && !player.name) return null
  return { externalId: player.id ?? null, name: player.name ?? 'Unknown' }
}

export function mapEvent(raw: ApiEventRaw): FootballEvent {
  return {
    minute: raw.time.elapsed,
    extraMinute: raw.time.extra ?? null,
    type: raw.type,
    detail: raw.detail ?? null,
    team: raw.team ? mapTeam(raw.team) : null,
    player: mapPlayerRef(raw.player),
    assist: mapPlayerRef(raw.assist),
  }
}

function mapLineupPlayer(entry: ApiLineupPlayerRaw): FootballLineupPlayer {
  const p = entry.player
  return {
    externalId: p.id,
    name: p.name,
    number: p.number ?? null,
    position: p.pos ?? null,
    grid: p.grid ?? null,
  }
}

export function mapLineup(raw: ApiLineupRaw): FootballLineup {
  return {
    team: mapTeam(raw.team),
    formation: raw.formation ?? null,
    coachName: raw.coach?.name ?? null,
    kitColors: raw.team.colors ?? null,
    startXI: (raw.startXI ?? []).map(mapLineupPlayer),
    substitutes: (raw.substitutes ?? []).map(mapLineupPlayer),
  }
}

export function mapStatistics(raw: ApiStatisticsRaw): FootballTeamStatistics {
  const statistics: Record<string, number | string | null> = {}
  for (const stat of raw.statistics ?? []) {
    if (stat.type) {
      statistics[stat.type.toLowerCase().replace(/\s+/g, '_')] = stat.value
    }
  }
  return { team: mapTeam(raw.team), statistics }
}

export function mapStandingRow(raw: ApiStandingRowRaw): FootballStandingRow {
  return {
    rank: raw.rank,
    team: mapTeam(raw.team),
    points: raw.points,
    goalsDiff: raw.goalsDiff,
    group: raw.group,
    form: raw.form,
    description: raw.description ?? null,
    played: raw.all.played,
    wins: raw.all.win,
    draws: raw.all.draw,
    losses: raw.all.lose,
    goalsFor: raw.all.goals.for,
    goalsAgainst: raw.all.goals.against,
  }
}

export function mapTeamDetail(raw: ApiTeamResponseRaw): FootballTeamDetail {
  const venue = raw.venue
  return {
    team: mapTeam(raw.team),
    venue: venue
      ? {
          externalId: venue.id,
          name: venue.name,
          city: venue.city ?? null,
          capacity: venue.capacity ?? null,
          surface: venue.surface ?? null,
          image: venue.image ?? null,
        }
      : null,
  }
}

export function mapLeague(raw: ApiLeagueRaw): FootballLeague {
  return {
    externalId: raw.league.id,
    name: raw.league.name,
    logo: raw.league.logo ?? null,
    country: raw.league.country ?? null,
    type: raw.league.type ?? null,
  }
}
