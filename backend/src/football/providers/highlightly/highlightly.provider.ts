import { Injectable, Logger } from '@nestjs/common'
import { FootballDataProvider } from '../../football-data.provider'
import {
  FootballEvent,
  FootballFixture,
  FootballLeague,
  FootballLineup,
  FootballStandingRow,
  FootballTeamDetail,
  FootballTeamStatistics,
} from '../../football.types'
import { HighlightlyHttp } from './highlightly.http'
import {
  NOT_STARTED_SHORTS,
  mapEvents,
  mapLineups,
  mapMatch,
  mapStandingRow,
  mapStatistics,
} from './highlightly.mappers'
import {
  HlEvent,
  HlLeague,
  HlLineups,
  HlMatch,
  HlMatchDetail,
  HlPaged,
  HlStandings,
  HlTeamStatistics,
} from './raw/highlightly.raw'

const PAGE_SIZE = 100
const MAX_PAGES = 10
// Tope de pedidos de detalle (estadio y árbitro) por consulta de fixtures.
const MAX_DETAIL_FETCHES = 20

@Injectable()
export class HighlightlyProvider extends FootballDataProvider {
  readonly name = 'highlightly' as const
  // `/matches` y `/events` se refrescan cada ~1 minuto.
  readonly liveRefreshMs = 60_000

  private readonly logger = new Logger(HighlightlyProvider.name)
  // El estadio y el árbitro solo vienen en `/matches/{id}`; se piden una vez.
  private readonly detailCache = new Map<
    number,
    Pick<HlMatchDetail, 'venue' | 'referee'>
  >()

  constructor(private readonly http: HighlightlyHttp) {
    super()
  }

  /** GET que devuelve null ante un 404 y lanza ante cualquier otro error. */
  private async fetch<T>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<T | null> {
    const res = await this.http.get<T>(url, params)
    if (res.status === 404) return null
    if (res.status >= 400) {
      throw new Error(`Highlightly respondió ${res.status} en ${url}`)
    }
    return res.data
  }

  private async fetchAllMatches(
    params: Record<string, unknown>,
  ): Promise<HlMatch[]> {
    const all: HlMatch[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await this.fetch<HlPaged<HlMatch>>('/matches', {
        ...params,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      if (!res) break
      all.push(...res.data)
      if (all.length >= res.pagination.totalCount || res.data.length === 0)
        break
    }
    return all
  }

  private async withDetails(matches: HlMatch[]): Promise<FootballFixture[]> {
    let fetched = 0
    for (const m of matches) {
      if (this.detailCache.has(m.id) || fetched >= MAX_DETAIL_FETCHES) continue
      fetched += 1
      try {
        const detail = await this.fetch<HlMatchDetail[]>(`/matches/${m.id}`)
        const d = detail?.[0]
        if (d)
          this.detailCache.set(m.id, { venue: d.venue, referee: d.referee })
      } catch (error) {
        this.logger.warn(
          `No se pudo traer el detalle del partido ${m.id}: ${(error as Error).message}`,
        )
      }
    }
    return matches.map((m) => mapMatch({ ...m, ...this.detailCache.get(m.id) }))
  }

  async getFixtures(params: {
    leagueExternalId: number
    season: number
    from: string
    to: string
  }): Promise<FootballFixture[]> {
    // No hay filtro por rango: se trae la temporada paginada y se recorta acá.
    const all = await this.fetchAllMatches({
      leagueId: params.leagueExternalId,
      season: params.season,
    })
    const inRange = all.filter((m) => {
      const day = m.date.slice(0, 10)
      return day >= params.from && day <= params.to
    })
    return this.withDetails(inRange)
  }

  async getLiveFixtures(leagueExternalId: number): Promise<FootballFixture[]> {
    // No hay filtro "en vivo": se piden los partidos del día (UTC) y se devuelven
    // los que ya empezaron, terminados incluidos, así el cron los cierra solo.
    const now = new Date()
    const days = [now.toISOString().slice(0, 10)]
    if (now.getUTCHours() < 6) {
      // Un partido nocturno puede cruzar la medianoche UTC.
      days.push(
        new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10),
      )
    }

    const matches: HlMatch[] = []
    for (const date of days) {
      matches.push(
        ...(await this.fetchAllMatches({ leagueId: leagueExternalId, date })),
      )
    }

    const unique = [...new Map(matches.map((m) => [m.id, m])).values()]

    return unique
      .map((m) => mapMatch({ ...m, ...this.detailCache.get(m.id) }))
      .filter((f) => !NOT_STARTED_SHORTS.includes(f.status.short))
  }

  async getFixture(externalId: number): Promise<FootballFixture | null> {
    const res = await this.fetch<HlMatchDetail[]>(`/matches/${externalId}`)
    const detail = res?.[0]
    return detail ? mapMatch(detail) : null
  }

  async getEvents(fixtureExternalId: number): Promise<FootballEvent[]> {
    const res = await this.fetch<HlEvent[]>(`/events/${fixtureExternalId}`)
    return mapEvents(res ?? [])
  }

  async getLineups(fixtureExternalId: number): Promise<FootballLineup[]> {
    const res = await this.fetch<HlLineups>(`/lineups/${fixtureExternalId}`)
    return mapLineups(res).filter((l) => l.startXI.length > 0)
  }

  async getMatchStatistics(
    fixtureExternalId: number,
  ): Promise<FootballTeamStatistics[]> {
    const res = await this.fetch<HlTeamStatistics[]>(
      `/statistics/${fixtureExternalId}`,
    )
    return (res ?? []).map(mapStatistics)
  }

  async getStandings(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballStandingRow[]> {
    const res = await this.fetch<HlStandings>('/standings', {
      leagueId: leagueExternalId,
      season,
    })
    return (res?.groups ?? []).flatMap((g) =>
      g.standings.map((row) => mapStandingRow(g.name, row)),
    )
  }

  async getTeams(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballTeamDetail[]> {
    // No hay endpoint de equipos por liga: salen de la tabla de posiciones.
    const rows = await this.getStandings(leagueExternalId, season)
    const seen = new Map<number, FootballTeamDetail>()
    for (const row of rows) {
      if (!seen.has(row.team.externalId)) {
        seen.set(row.team.externalId, { team: row.team, venue: null })
      }
    }
    return [...seen.values()]
  }

  async getLeague(leagueExternalId: number): Promise<FootballLeague | null> {
    const res = await this.fetch<HlLeague[] | HlLeague>(
      `/leagues/${leagueExternalId}`,
    )
    const league = Array.isArray(res) ? res[0] : res
    if (!league) return null
    return {
      externalId: league.id,
      name: league.name,
      logo: league.logo ?? null,
      country: league.country?.name ?? null,
      type: null,
    }
  }

  async getHeadToHead(
    teamAExternalId: number,
    teamBExternalId: number,
    last: number,
  ): Promise<FootballFixture[]> {
    const res = await this.fetch<HlMatch[]>('/head-2-head', {
      teamIdOne: teamAExternalId,
      teamIdTwo: teamBExternalId,
    })
    return (res ?? []).slice(0, last).map((m) => mapMatch(m))
  }

  async getRecentFinishedFixtures(
    teamExternalId: number,
    last: number,
  ): Promise<FootballFixture[]> {
    const res = await this.fetch<HlMatch[]>('/last-five-games', {
      teamId: teamExternalId,
    })
    return (res ?? []).slice(0, last).map((m) => mapMatch(m))
  }
}
