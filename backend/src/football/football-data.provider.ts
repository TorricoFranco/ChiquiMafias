import {
  FootballEvent,
  FootballFixture,
  FootballLeague,
  FootballLineup,
  FootballStandingRow,
  FootballTeamDetail,
  FootballTeamStatistics,
} from './football.types'

export type FootballProviderName = 'api-football' | 'highlightly'

/**
 * Puerto de acceso a los datos de fútbol. Los crons y servicios inyectan esta
 * clase abstracta y no saben qué proveedor hay detrás. La implementación se
 * elige en `FootballModule` según `FOOTBALL_PROVIDER`.
 */
export abstract class FootballDataProvider {
  abstract readonly name: FootballProviderName

  /**
   * Cada cuántos ms el proveedor refresca el marcador en vivo. `LiveScoreCron`
   * corre cada 30 s y saltea ticks para no consultar más seguido que esto.
   */
  abstract readonly liveRefreshMs: number

  /** Partidos de una liga entre dos fechas (YYYY-MM-DD, ambas inclusive). */
  abstract getFixtures(params: {
    leagueExternalId: number
    season: number
    from: string
    to: string
  }): Promise<FootballFixture[]>

  /** Partidos de la liga que están en juego ahora. */
  abstract getLiveFixtures(leagueExternalId: number): Promise<FootballFixture[]>

  abstract getFixture(externalId: number): Promise<FootballFixture | null>

  abstract getEvents(fixtureExternalId: number): Promise<FootballEvent[]>

  /** Vacío mientras el proveedor no tenga alineaciones confirmadas. */
  abstract getLineups(fixtureExternalId: number): Promise<FootballLineup[]>

  abstract getMatchStatistics(
    fixtureExternalId: number,
  ): Promise<FootballTeamStatistics[]>

  /** Tabla de posiciones de la temporada, en una lista plana. */
  abstract getStandings(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballStandingRow[]>

  abstract getTeams(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballTeamDetail[]>

  abstract getLeague(
    leagueExternalId: number,
    season?: number,
  ): Promise<FootballLeague | null>

  /** Últimos cruces terminados entre dos equipos. */
  abstract getHeadToHead(
    teamAExternalId: number,
    teamBExternalId: number,
    last: number,
  ): Promise<FootballFixture[]>

  /** Últimos partidos terminados de un equipo, del más reciente al más viejo. */
  abstract getRecentFinishedFixtures(
    teamExternalId: number,
    last: number,
  ): Promise<FootballFixture[]>
}
