import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

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
    const leagueId = '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7'
    const cacheKey = `standings:${leagueId}:${season}`

    const cached = await this.redis.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as FullStandingsResponseDto

    const result = await this.calculateFullStandings(leagueId, season)

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
      annual: await this.getAnnualTable(leagueId, season),
      averages: await this.getAverageStandings(leagueId, season),
      updated_at: new Date().toISOString(),
    }
  }

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
}
