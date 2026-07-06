import { FORM_TRANSLATIONS } from 'src/api-football/mappers/formTranslations'
import { PreMatchResponse, MatchHistoryItem } from './matches.interfaces'

export class MatchesMappers {
  static formatSummaryFromEvents(events: any[]) {
    if (!events || events.length === 0) {
      return {
        goals: [],
        redCards: [],
        lastUpdate: new Date().toISOString(),
      }
    }

    return {
      goals: events
        .filter((e) => e.type === 'Goal')
        .map((e) => ({
          min: e.minute ?? 0,
          player: e.player?.name || 'Unknown',
          team: e.team?.id ? String(e.team.id) : 'Unknown', // <-- Mapeo seguro del objeto team
        })),
      redCards: events
        .filter(
          (e) =>
            e.type === 'Card' &&
            (e.detail?.toLowerCase().includes('red card') ||
              e.detail?.toLowerCase().includes('roja')), // Por las dudas si cambia el idioma
        )
        .map((e) => ({
          min: e.minute ?? 0,
          player: e.player?.name || 'Unknown',
          team: e.team?.id ? String(e.team.id) : 'Unknown',
        })),
      lastUpdate: new Date().toISOString(),
    }
  }

  static toPreMatchResponse(
    apiData: any,
    hId: number,
    aId: number,
  ): PreMatchResponse {
    const { h2h, hForm, aForm, standings } = apiData

    return {
      history: this.formatH2H(h2h, hId),
      form: {
        home: this.translateForm(hForm),
        away: this.translateForm(aForm),
      },
      miniTable: this.formatMiniTable(standings, hId, aId),
    }
  }

  static translateForm(formString: string): string {
    if (!formString) return ''
    return formString
      .split('')
      .map((char) => FORM_TRANSLATIONS[char] || char)
      .join('')
  }

  static formatH2H(h2hMatches: any[], currentHomeId: number) {
    if (!Array.isArray(h2hMatches))
      return { homeWins: 0, awayWins: 0, draws: 0, total: 0, lastMatches: [] }

    const finishedMatches = h2hMatches.filter(
      (m) =>
        m.fixture.status.short === 'FT' || m.fixture.status.short === 'PEN',
    )

    const stats = finishedMatches.reduce(
      (acc, match) => {
        const homeGoals = match.goals.home ?? 0
        const awayGoals = match.goals.away ?? 0

        if (homeGoals === awayGoals) {
          acc.draws++
        } else {
          const winnerId =
            homeGoals > awayGoals ? match.teams.home.id : match.teams.away.id
          if (winnerId === currentHomeId) {
            acc.homeWins++
          } else {
            acc.awayWins++
          }
        }
        return acc
      },
      { homeWins: 0, awayWins: 0, draws: 0 },
    )

    // Mapeamos para cumplir estrictamente con MatchHistoryItem
    const lastMatches: MatchHistoryItem[] = finishedMatches
      .slice(0, 5)
      .map((m) => ({
        fixture: {
          id: m.fixture.id,
          date: m.fixture.date,
          venue: {
            name: m.fixture.venue.name,
            city: m.fixture.venue.city,
          },
          status: { short: m.fixture.status.short },
        },
        teams: {
          home: {
            id: m.teams.home.id,
            name: m.teams.home.name,
            logo: m.teams.home.logo,
          },
          away: {
            id: m.teams.away.id,
            name: m.teams.away.name,
            logo: m.teams.away.logo,
          },
        },
        goals: {
          home: m.goals.home ?? 0,
          away: m.goals.away ?? 0,
        },
      }))

    return {
      ...stats,
      total: finishedMatches.length,
      lastMatches,
    }
  }

  static formatMiniTable(
    apiStandings: any[][],
    homeId: number,
    awayId: number,
  ) {
    const tournamentTables = apiStandings.filter(
      (t) =>
        t[0]?.group.toLowerCase().includes('apertura') ||
        t[0]?.group.toLowerCase().includes('clausura'),
    )
    const annualTable = apiStandings.find((t) =>
      t[0]?.group.toLowerCase().includes('anual'),
    )
    const averagesTable = apiStandings.find((t) =>
      t[0]?.group.toLowerCase().includes('promedios'),
    )

    return {
      tournament: {
        home: this.extractNeighborhoodDynamic(tournamentTables, homeId),
        away: this.extractNeighborhoodDynamic(tournamentTables, awayId),
      },
      annual: {
        home: annualTable ? this.getNeighborhood(annualTable, homeId) : [],
        away: annualTable ? this.getNeighborhood(annualTable, awayId) : [],
      },
      averages: {
        home: averagesTable ? this.getNeighborhood(averagesTable, homeId) : [],
        away: averagesTable ? this.getNeighborhood(averagesTable, awayId) : [],
      },
    }
  }

  private static extractNeighborhoodDynamic(tables: any[][], teamId: number) {
    for (const table of tables) {
      const neighborhood = this.getNeighborhood(table, teamId)
      if (neighborhood.length > 0) return neighborhood
    }
    return []
  }

  private static getNeighborhood(table: any[], teamId: number) {
    const index = table.findIndex((item) => item.team.id === teamId)
    if (index === -1) return []

    const start = Math.max(0, index - 1)
    const end = index + 2

    return table.slice(start, end).map((item) => ({
      rank: item.rank,
      teamId: item.team.id,
      name: item.team.name,
      logo: item.team.logo,
      points: item.points,
      played: item.all.played,
      goalsDiff: item.goalsDiff,
      isTarget: item.team.id === teamId,
    }))
  }
}
