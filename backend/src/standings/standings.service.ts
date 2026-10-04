import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service'

import { FullStandingsResponseDto } from './dto/response/full-standings.dto'

import legacyData from './data/legacy-stats.json'
import {
  FullStandings,
  StandingRow,
  TeamStatsWithTeam,
  TournamentData,
} from './types/standings'

@Injectable()
export class StandingsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) { }

  async getStandings(season: number): Promise<FullStandingsResponseDto> {

    const leagueDb = await this.prisma.leagues.findFirst({
      where: { api_league_id: 128 },
    })

    if (!leagueDb) {
      throw new Error('League not found')
    }

    const cacheKey = `standings:${leagueDb.id}:${season}`

    const cached = await this.redis.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as FullStandingsResponseDto


    const result = await this.calculateFullStandings(leagueDb.id, season)

    await this.redis.redis.set(cacheKey, JSON.stringify(result), 'EX', 600)

    return result
  }

  async calculateFullStandings(leagueId: string, season: number) {
    const allStats = await this.prisma.teamSeasonStats.findMany({
      where: {
        league_id: leagueId,
        season: season,
        stage: { in: ['APERTURA', 'CLAUSURA'] },
      },
      include: { team: true },
      orderBy: [{ position: 'asc' }],
    })

    return {
      apertura: this.getTournamentStats(allStats, 'APERTURA'),
      clausura: this.getTournamentStats(allStats, 'CLAUSURA'),
      annual: this.calculateAnnualTable(allStats),
      averages: this.calculateAverageStandings(allStats),
      updated_at: new Date().toISOString(),
    }
  }

  async getCachedFullStandings(leagueId: string, season: number) {
    const cacheKey = `standings:full:${leagueId}:${season}`

    const cached = await this.redis.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const allStats = await this.prisma.teamSeasonStats.findMany({
      where: {
        league_id: leagueId,
        season: season,
        stage: { in: ['APERTURA', 'CLAUSURA'] },
      },
      include: { team: true },
      orderBy: [{ position: 'asc' }],
    })

    const fullStandings = {
      apertura: this.getTournamentStats(allStats, 'APERTURA'),
      clausura: this.getTournamentStats(allStats, 'CLAUSURA'),
      annual: this.calculateAnnualTable(allStats),
      averages: this.calculateAverageStandings(allStats),
      updated_at: new Date().toISOString(),
    }

    await this.redis.redis.set(
      cacheKey,
      JSON.stringify(fullStandings),
      'EX',
      3600
    )

    return fullStandings
  }




  private calculateAnnualTable(allStats: TeamStatsWithTeam[]): StandingRow[] {
    const teamMap = new Map<string, {
      teamId: string
      teamName: string
      teamLogo: string | null
      points: number
      played: number
      won: number
      draw: number
      lost: number
      goalsFor: number
      goalsAgainst: number
      goalDiff: number
    }>()

    for (const stat of allStats) {
      const existing = teamMap.get(stat.team_id) || {
        teamId: stat.team_id,
        teamName: stat.team.name,
        teamLogo: stat.team.logo_url,
        points: 0,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      }

      existing.points += stat.points
      existing.played += stat.matches_played
      existing.won += stat.wins
      existing.draw += stat.draws
      existing.lost += stat.losses
      existing.goalsFor += stat.goals_for
      existing.goalsAgainst += stat.goals_against
      existing.goalDiff += stat.goal_diff

      teamMap.set(stat.team_id, existing)
    }

    const annualArray = Array.from(teamMap.values())

    annualArray.sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor
    )

    return annualArray.map((row, index) => ({
      position: index + 1,
      teamId: row.teamId,
      teamName: row.teamName,
      teamLogo: row.teamLogo,
      teamPhoto: row.teamLogo,
      points: row.points,
      played: row.played,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDiff: row.goalDiff,
      description: null,
    }))
  }

  private calculateAverageStandings(allStats: TeamStatsWithTeam[]) {
    const teamTotals = new Map<string, { points: number; played: number; team: any }>()

    for (const stat of allStats) {
      const current = teamTotals.get(stat.team_id) || {
        points: 0,
        played: 0,
        team: stat.team,
      }
      current.points += stat.points
      current.played += stat.matches_played
      teamTotals.set(stat.team_id, current)
    }

    const averageTable = Array.from(teamTotals.entries()).map(([teamId, totals]) => {
      const normalizedDbName = totals.team.name.trim().toLowerCase()
      const legacy = legacyData.find(
        (l) => l.team_name.trim().toLowerCase() === normalizedDbName,
      )

      const pts24 = legacy ? legacy.points_2024 : 0
      const pj24 = legacy ? legacy.played_2024 : 0

      const pts25 = legacy ? legacy.points_2025 : 0
      const pj25 = legacy ? legacy.played_2025 : 0

      const pts26 = totals.points
      const pj26 = totals.played

      const totalPoints = pts24 + pts25 + pts26
      const totalPlayed = pj24 + pj25 + pj26

      return {
        teamId: teamId,
        teamName: totals.team.name,
        teamLogo: totals.team.logo_url,
        description: null,
        stats2024: { pts: pts24, pj: pj24 },
        stats2025: { pts: pts25, pj: pj25 },
        stats2026: { pts: pts26, pj: pj26 },
        totalPoints: totalPoints,
        totalPlayed: totalPlayed,
        coefficient:
          totalPlayed > 0
            ? parseFloat((totalPoints / totalPlayed).toFixed(3))
            : 0,
      }
    })

    return averageTable.sort(
      (a, b) => b.coefficient - a.coefficient || b.totalPoints - a.totalPoints,
    )
  }

  private getTournamentStats(
    allStats: TeamStatsWithTeam[],
    tournament: 'APERTURA' | 'CLAUSURA',
  ): TournamentData {
    const stageStats = allStats.filter((s) => s.stage === tournament)

    return {
      tournament: tournament,
      groups: {
        A: this.mapStageRows(stageStats.filter((s) => s.group_name === 'A')),
        B: this.mapStageRows(stageStats.filter((s) => s.group_name === 'B')),
      },
    }
  }

  private mapStageRows(rows: TeamStatsWithTeam[]): StandingRow[] {
    return rows.map((r) => ({
      position: r.position || 0,
      teamId: r.team_id,
      teamName: r.team.name,
      teamLogo: r.team.logo_url,
      teamPhoto: r.team.logo_url || null,
      points: r.points,
      played: r.matches_played, // PJ
      won: r.wins, // G
      draw: r.draws, // E
      lost: r.losses, // P
      goalsFor: r.goals_for, // GF
      goalsAgainst: r.goals_against, // GC
      goalDiff: r.goal_diff, // DG
      description: r.description,
    }))
  }



  // ESTA SE USA EN E APERTURA PORQUE LOS HIJS DEMIL PUTA DE LA API DEVUEVLVEN LAS TBLAS QUE SE LES CANTA EL ORTO  Y EN EL CLAUSURA SE TINE QUE CAULCUALR A MANOPLA
  private async getAnnualTable(leagueId: string, season: number) {
    const rows = await this.prisma.teamSeasonStats.findMany({
      where: {
        league_id: leagueId,
        season: season,
        stage: 'ANNUAL',
      },
      include: { team: true },
      orderBy: { position: 'asc' },
    })

    return this.mapStageRows(rows)
  }

  private async getAverageStandings(leagueId: string, season: number) {
    const averagesFromDb = await this.prisma.teamSeasonStats.findMany({
      where: {
        league_id: leagueId,
        season: season,
        stage: 'AVERAGES',
      },
      include: { team: true },
    })

    const averageTable = averagesFromDb.map((avg) => {
      const normalizedDbName = avg.team.name.trim().toLowerCase()
      const legacy = legacyData.find(
        (l) => l.team_name.trim().toLowerCase() === normalizedDbName,
      )

      if (!legacy) {
        console.warn(
          `Legacy data not found for team: ${avg.team_id} (${avg.team.name})`,
        )
      }

      const pts24 = legacy ? legacy.points_2024 : 0
      const pj24 = legacy ? legacy.played_2024 : 0

      const pts25 = legacy ? legacy.points_2025 : 0
      const pj25 = legacy ? legacy.played_2025 : 0

      const totalPoints = avg.points
      const totalPlayed = avg.matches_played

      const pts26 = totalPoints - (pts24 + pts25)
      const pj26 = totalPlayed - (pj24 + pj25)

      return {
        teamId: avg.team_id,
        teamName: avg.team.name,
        teamLogo: avg.team.logo_url,
        description: avg.description,
        stats2024: { pts: pts24, pj: pj24 },
        stats2025: { pts: pts25, pj: pj25 },
        stats2026: { pts: Math.max(0, pts26), pj: Math.max(0, pj26) },
        totalPoints: totalPoints,
        totalPlayed: totalPlayed,
        coefficient:
          totalPlayed > 0
            ? parseFloat((totalPoints / totalPlayed).toFixed(3))
            : 0,
      }
    })

    return averageTable.sort(
      (a, b) => b.coefficient - a.coefficient || b.totalPoints - a.totalPoints,
    )
  }
}


