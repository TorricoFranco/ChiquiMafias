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
          team: e.team?.id ? String(e.team.id) : 'Unknown',
        })),
      redCards: events
        .filter(
          (e) =>
            e.type === 'Card' &&
            (e.detail?.toLowerCase().includes('red card') ||
              e.detail?.toLowerCase().includes('roja')),
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
    hId: string,
    aId: string,
    hIdApi: string,
    aIdApi: string,
  ): PreMatchResponse {
    const { h2h, hForm, aForm, standings } = apiData

    return {
      history: this.formatH2H(h2h, hIdApi),
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

  static formatH2H(h2hMatches: any[], currentHomeId: string) {
    if (!Array.isArray(h2hMatches))
      return { homeWins: 0, awayWins: 0, draws: 0, total: 0, lastMatches: [] }

    const finishedMatches = h2hMatches.filter(
      (m) =>
        m.fixture.status.short === 'FT' || m.fixture.status.short === 'PEN',
    )

    const stats = finishedMatches.reduce(
      (acc, match) => {
        const homeTeam = match.teams.home
        const awayTeam = match.teams.away

        if (homeTeam.winner === true) {
          if (String(homeTeam.id) === String(currentHomeId)) {
            acc.homeWins++
          } else {
            acc.awayWins++
          }
        } else if (awayTeam.winner === true) {
          if (String(awayTeam.id) === String(currentHomeId)) {
            acc.homeWins++
          } else {
            acc.awayWins++
          }
        } else {
          acc.draws++
        }

        return acc
      },
      { homeWins: 0, awayWins: 0, draws: 0 },
    )

    const lastMatches = finishedMatches.slice(0, 5).map((m) => ({
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
    standings:
      | {
          apertura?: { tournament: string; groups: Record<string, any[]> }
          clausura?: { tournament: string; groups: Record<string, any[]> }
          annual?: any[]
          averages?: any[]
        }
      | null
      | undefined,
    homeId: string,
    awayId: string,
  ) {
    if (!standings) {
      return {
        activeTournament: 'apertura' as const,
        tournament: { home: [], away: [] },
        annual: { home: [], away: [] },
        averages: { home: [], away: [] },
      }
    }

    const isClausuraActive = Boolean(
      standings.clausura?.groups &&
      Object.values(standings.clausura.groups).some(
        (group) =>
          Array.isArray(group) && group.some((team) => team.played > 0),
      ),
    )

    const activeTournamentKey: 'clausura' | 'apertura' = isClausuraActive
      ? 'clausura'
      : 'apertura'

    const currentTournament = standings[activeTournamentKey]

    const tournamentTables: any[][] = currentTournament?.groups
      ? Object.values(currentTournament.groups).map((group) =>
          Array.isArray(group)
            ? group.map((t, i) => ({ ...t, position: t.position ?? i + 1 }))
            : [],
        )
      : []

    const annualTable = Array.isArray(standings.annual)
      ? standings.annual.map((t, i) => ({
          ...t,
          position: t.position ?? i + 1,
        }))
      : []

    const averagesTable = Array.isArray(standings.averages)
      ? standings.averages.map((t, i) => ({
          ...t,
          position: t.position ?? i + 1,
        }))
      : []

    return {
      activeTournament: activeTournamentKey,
      tournament: {
        home: this.extractNeighborhoodDynamic(tournamentTables, homeId),
        away: this.extractNeighborhoodDynamic(tournamentTables, awayId),
      },
      annual: {
        home: annualTable.length
          ? this.getNeighborhood(annualTable, homeId, 1, 'Annual Home')
          : [],
        away: annualTable.length
          ? this.getNeighborhood(annualTable, awayId, 1, 'Annual Away')
          : [],
      },
      averages: {
        home: averagesTable.length
          ? this.getNeighborhood(averagesTable, homeId, 1, 'Averages Home')
          : [],
        away: averagesTable.length
          ? this.getNeighborhood(averagesTable, awayId, 1, 'Averages Away')
          : [],
      },
    }
  }

  static getNeighborhood(
    table: any[],
    targetId: string | number,
    margin = 1,
    context = 'Desconocido',
  ): any[] {
    if (!Array.isArray(table)) return []

    const index = table.findIndex((item) => {
      const currentId = String(
        item.teamId ?? item.team_id ?? item.id ?? item.team?.id,
      )
      return currentId === String(targetId)
    })

    if (index === -1) return []

    let start = index - margin
    let end = index + margin

    if (start < 0) {
      const diff = 0 - start
      start = 0
      end += diff
    }

    if (end >= table.length) {
      const diff = end - (table.length - 1)
      end = table.length - 1
      start -= diff

      if (start < 0) start = 0
    }

    return table.slice(start, end + 1)
  }

  static extractNeighborhoodDynamic(
    tables: any[][],
    targetId: string | number,
  ): any[] {
    if (!Array.isArray(tables)) return []

    for (const table of tables) {
      if (!Array.isArray(table)) continue
      const neighborhood = this.getNeighborhood(
        table,
        targetId,
        1,
        'Tournament',
      )
      if (neighborhood.length > 0) return neighborhood
    }
    return []
  }
}
