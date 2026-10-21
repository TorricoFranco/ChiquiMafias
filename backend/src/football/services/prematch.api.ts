import { Injectable } from '@nestjs/common'
import { FootballDataProvider } from '../football-data.provider'
import { FootballFixture } from '../football.types'

@Injectable()
export class PrematchServiceApi {
  constructor(private readonly provider: FootballDataProvider) {}

  async getH2H(homeExternalId: string, awayExternalId: string) {
    const fixtures = await this.provider.getHeadToHead(
      Number(homeExternalId),
      Number(awayExternalId),
      5,
    )
    return fixtures.filter(
      (m) => m.status.short === 'FT' || m.status.short === 'PEN',
    )
  }

  /** Forma reciente como string de resultados: `W`, `D`, `L` (más reciente primero). */
  async getLatestResults(teamExternalId: string): Promise<string> {
    const fixtures = await this.provider.getRecentFinishedFixtures(
      Number(teamExternalId),
      5,
    )

    return fixtures
      .map((match) => this.resultFor(match, teamExternalId))
      .join('')
  }

  private resultFor(match: FootballFixture, teamExternalId: string): string {
    const isHome = String(match.home.externalId) === teamExternalId
    const isAway = String(match.away.externalId) === teamExternalId

    if (match.home.winner === null) return 'D'

    if (isHome && match.home.winner === true) return 'W'

    if (isAway && match.away.winner === true) return 'W'

    return 'L'
  }
}
