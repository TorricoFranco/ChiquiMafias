import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

import { GetYearlyCalendarResponseDto } from './dto/response/year-calender.dto'
import { GetFixtureMatchdayResponseDto } from './dto/response/fixture-matchday.dto'
import { GetPendingFixturesResponseDto } from 'src/fixture/dto/response/pending-match.dto'

import { formatMatch, isPlayoffRound } from './utils/match-format'

import { StandingRow } from 'src/standings/types/standings'
import { BracketMatch } from './types/fixtures'
import { LiveMatchData } from './types/fixtures'
import { GetLiveScoresResponseDto } from './dto/response/live-score.dto'
import {
  TournamentBracketsResponseDto,
  BracketsRoundsDto,
} from './dto/response/tournament-bracket.dto'
import { AvailableStagesResponseDto } from './dto/response/available-stages.dto'

@Injectable()
export class FixtureService {
  private readonly logger = new Logger(FixtureService.name)
  private readonly LEAGUE_API_ID = 128

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) { }

  async getFixtureByMatchday(
    season: string,
    tournament: string,
    matchday: number | string,
  ): Promise<GetFixtureMatchdayResponseDto> {
    let matchdayKey = ''
    let dbSearchTerm = ''

    if (typeof matchday === 'number' || !isNaN(Number(matchday))) {
      matchdayKey = `fecha:${matchday}`
      dbSearchTerm = ` - ${matchday}`
    } else {
      const normalized = matchday.toLowerCase().trim()
      matchdayKey = normalized
      dbSearchTerm = normalized
    }

    const cacheKey = `fixtures:128:${season}:${tournament.toUpperCase()}:${matchdayKey}`

    this.logger.debug(`Extrayendo cache: ${cacheKey}`)

    const cached = await this.redisService.redis.get(cacheKey)
    let matches

    if (cached) {
      matches = JSON.parse(cached)
    } else {
      matches = await this.prisma.matches.findMany({
        where: {
          season: Number(season),
          tournament: tournament.toUpperCase() as any,
          round: {
            contains: dbSearchTerm,
            mode: 'insensitive',
          },
        },
        include: {
          home_team: { select: { name: true, logo_url: true } },
          away_team: { select: { name: true, logo_url: true } },
        },
        orderBy: { date: 'asc' },
      })

      if (matches.length > 0) {
        await this.redisService.redis.set(
          cacheKey,
          JSON.stringify(matches),
          'EX',
          86400,
        )
      }
    }

    const liveScores = await this.redisService.redis.hgetall(
      `live_scores:league:${this.LEAGUE_API_ID}`,
    )

    const mergedMatches = matches.map((m) => {
      const liveRaw = liveScores?.[m.id]
      const live = liveRaw ? (JSON.parse(liveRaw) as LiveMatchData) : undefined
      return formatMatch(m, live)
    })

    return {
      tournament,
      season,
      current_matchday: matchday.toString(),
      matches: mergedMatches,
    }
  }

  async getYearlyCalendar(
    season: string,
  ): Promise<GetYearlyCalendarResponseDto> {
    const cacheKey = `calendar:128:${season}:full`

    // 1. Intentamos sacar el calendario completo del cache
    const cached = await this.redisService.redis.get(cacheKey)
    let allMatches

    if (cached) {
      allMatches = JSON.parse(cached)
    } else {
      // 2. Si no hay cache, traemos TODO (Apertura + Clausura + Playoffs)
      allMatches = await this.prisma.matches.findMany({
        where: {
          season: Number(season),
        },
        include: {
          home_team: { select: { name: true, logo_url: true } },
          away_team: { select: { name: true, logo_url: true } },
        },
        orderBy: { date: 'asc' },
      })

      // Guardamos en Redis por 30 min (1800 segundos)
      if (allMatches.length > 0) {
        await this.redisService.redis.set(
          cacheKey,
          JSON.stringify(allMatches),
          'EX',
          1800,
        )
      }
    }

    const liveScores = await this.redisService.redis.hgetall(
      `live_scores:league:${this.LEAGUE_API_ID}`,
    )

    const calendar = allMatches.reduce((acc, m) => {
      const liveRaw = liveScores?.[m.id]
      const live = liveRaw ? (JSON.parse(liveRaw) as LiveMatchData) : undefined
      const formatted = formatMatch(m, live)

      const dateUtc = new Date(m.date)

      const argentinaTime = new Date(dateUtc.getTime() - 3 * 60 * 60 * 1000)
      const dateKey = argentinaTime.toISOString().split('T')[0]

      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(formatted)
      return acc
    }, {})

    return {
      season,
      // Devolvemos el objeto agrupado y una lista de días con partidos para las flechitas
      availableDays: Object.keys(calendar).sort(),
      calendar,
    }
  }

  async getActiveMatchdayInfo(
    season: string,
    tournament: string,
  ): Promise<string | number> {
    const allMatches = await this.prisma.matches.findMany({
      where: { season: Number(season), tournament: tournament as any },
      select: { date: true, status_short: true, round: true },
    })

    if (allMatches.length === 0) return 1

    const matchdaysMap = new Map<string, any[]>()

    allMatches.forEach((m) => {
      if (!m.round) return
      const parts = m.round.split(' - ')
      const roundKey = parts.length >= 2 ? parts[1] : parts[0]

      if (!matchdaysMap.has(roundKey)) matchdaysMap.set(roundKey, [])
      matchdaysMap.get(roundKey)!.push(m)
    })

    const sortedMatchdays = Array.from(matchdaysMap.entries())
      .map(([matchday, matches]) => ({ matchday, matches }))
      .sort((a, b) => {
        const numA = parseInt(a.matchday)
        const numB = parseInt(b.matchday)

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }

        return a.matchday.localeCompare(b.matchday)
      })

    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime()

    // Partidos en vivo
    const liveMatchday = sortedMatchdays.find((md) =>
      md.matches.some((m) =>
        ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(m.status_short),
      ),
    )
    if (liveMatchday) return liveMatchday.matchday

    // Próximos partidos
    const upcomingMatchday = sortedMatchdays.find((md) =>
      md.matches.some((m) => new Date(m.date).getTime() >= todayStart),
    )
    if (upcomingMatchday) return upcomingMatchday.matchday

    // última fecha
    return sortedMatchdays[sortedMatchdays.length - 1]?.matchday || 1
  }

  async getLiveLeagueScores(): Promise<GetLiveScoresResponseDto[]> {
    const liveScores = await this.redisService.redis.hgetall(
      `live_scores:league:${this.LEAGUE_API_ID}`,
    )

    if (!liveScores || Object.keys(liveScores).length === 0) return []

    return Object.entries(liveScores).map(([matchId, data]) => {
      const live = JSON.parse(data) as LiveMatchData

      return {
        matchId,
        h: live.home_goals,
        a: live.away_goals,
        hp: live.home_penalty_goals,
        ap: live.away_penalty_goals,
        homeTeamId: live.home_team_id,
        awayTeamId: live.away_team_id,
        status: live.status_short,
        isLive: true,
        isPlayoff: isPlayoffRound(live.round || ''),
      }
    })
  }

  async getPendingFixtures(
    season: number,
    tournament: 'APERTURA' | 'CLAUSURA',
  ): Promise<GetPendingFixturesResponseDto[]> {
    const leagueId = '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7'

    const matches = await this.prisma.matches.findMany({
      where: {
        league_id: leagueId,
        season: season,
        tournament: tournament,
        status_short: 'NS',
      },
      include: {
        home_team: true,
        away_team: true,
      },
      orderBy: [{ date: 'asc' }],
    })

    const playoffKeywords = ['octavos', 'cuartos', 'semifinal', 'final']

    const grouped = matches.reduce(
      (acc, match) => {
        const roundLower = match.round ? match.round.toLowerCase() : ''

        // 1. Detectar si es playoff y extraer la palabra clave
        const playoffMatch = playoffKeywords.find((keyword) =>
          roundLower.includes(keyword),
        )

        let groupKey = ''
        let isPlayoff = false

        if (playoffMatch) {
          groupKey = playoffMatch
          isPlayoff = true
        } else {
          // Extrae solo los números.
          const numericMatchday = roundLower.replace(/\D/g, '')
          groupKey = numericMatchday || '0'
          isPlayoff = false
        }

        if (!acc[groupKey]) {
          acc[groupKey] = {
            matchday: groupKey,
            is_playoff: isPlayoff,
            matches: [],
          }
        }

        acc[groupKey].matches.push({
          id: match.id,
          date: match.date,
          status_short: match.status_short,
          tournament: match.tournament,
          is_playoff: isPlayoff,
          home_team: {
            id: match.home_team_id,
            name: match.home_team.name,
            short_code: match.home_team.short_code,
            logo_url: match.home_team.logo_url,
          },
          away_team: {
            id: match.away_team_id,
            name: match.away_team.name,
            short_code: match.away_team.short_code,
            logo_url: match.away_team.logo_url,
          },
        })

        return acc
      },
      {} as Record<string, any>,
    )

    const getSortWeight = (item: any) => {
      if (item.is_playoff) {
        const weights: Record<string, number> = {
          octavos: 101,
          cuartos: 102,
          semifinal: 103,
          final: 104,
        }
        return weights[item.matchday] || 200
      }
      return parseInt(item.matchday, 10) || 0
    }

    return Object.values(grouped).sort(
      (a: any, b: any) => getSortWeight(a) - getSortWeight(b),
    )
  }

  async getAvailableStages(
    season: string,
    tournament: string,
  ): Promise<AvailableStagesResponseDto> {
    const matches = await this.prisma.matches.findMany({
      where: {
        season: Number(season),
        tournament: tournament.toUpperCase() as any,
      },
      select: { round: true },
      distinct: ['round'],
    })

    const stages = matches.map((m) => m.round)

    const numericStages = stages
      .filter((s) => s?.includes(' - '))
      .map((s) => parseInt(s.split(' - ')[1]))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b)

    const playoffKeywords = ['octavos', 'cuartos', 'semifinal', 'final']
    const availablePlayoffs = playoffKeywords.filter((keyword) =>
      stages.some((s) => s?.toLowerCase().includes(keyword)),
    )

    return {
      regular: numericStages,
      playoffs: availablePlayoffs,
    }
  }

  async getTournamentBrackets(
    season: string,
    tournament: string,
  ): Promise<TournamentBracketsResponseDto> {
    const leagueId = '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7'
    const tournamentLower = tournament.toLowerCase()

    const octavosCacheKey = `brackets:octavos:${leagueId}:${season}:${tournamentLower}`
    let octavosRaw: any[]

    const cachedOctavos = await this.redisService.redis.get(octavosCacheKey)
    if (cachedOctavos) {
      octavosRaw = JSON.parse(cachedOctavos)
    } else {
      const standingsCache = await this.redisService.redis.get(
        `standings:${leagueId}:${season}`,
      )
      if (standingsCache) {
        const data = JSON.parse(standingsCache)
        octavosRaw = this.generateOctavos(data[tournamentLower].groups)
        await this.redisService.redis.set(
          octavosCacheKey,
          JSON.stringify(octavosRaw),
          'EX',
          86400,
        )
      } else {
        octavosRaw = []
      }
    }

    const [playoffDbMatches, liveScores] = await Promise.all([
      this.prisma.matches.findMany({
        where: {
          season: Number(season),
          tournament: tournament as any,
          OR: [
            { round: { contains: 'octavos', mode: 'insensitive' } },
            { round: { contains: 'cuartos', mode: 'insensitive' } },
            { round: { contains: 'semifinal', mode: 'insensitive' } },
            { round: { contains: 'final', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          round: true,
          home_goals: true,
          away_goals: true,
          home_penalty_goals: true,
          away_penalty_goals: true,
          status_short: true,
          date: true,
          home_team: { select: { name: true, logo_url: true } },
          away_team: { select: { name: true, logo_url: true } },
        },
      }),
      this.redisService.redis.hgetall(
        `live_scores:league:${this.LEAGUE_API_ID}`,
      ),
    ])

    const enrichedOctavos = octavosRaw.map((oct) => {
      const matchInDb = playoffDbMatches.find(
        (dbM) =>
          dbM.round?.toLowerCase().includes('octavos') &&
          ((dbM.home_team.name === oct.home_team.name &&
            dbM.away_team.name === oct.away_team.name) ||
            (dbM.home_team.name === oct.away_team.name &&
              dbM.away_team.name === oct.home_team.name)),
      )

      if (!matchInDb) {
        return {
          ...oct,
          id: oct.id || `tbd-octavos-${oct.side}-${oct.position}`,
          home_goals: null,
          away_goals: null,
          is_live: false,
          is_playoff: true,
        }
      }

      const live = liveScores?.[matchInDb.id]
        ? (JSON.parse(liveScores[matchInDb.id]) as LiveMatchData)
        : undefined

      return {
        ...this.formatBracketMatch(matchInDb, live),
        side: oct.side,
        position: oct.position,
      }
    })

    const brackets: BracketsRoundsDto = {
      octavos: enrichedOctavos,
      cuartos: [],
      semifinal: [],
      final: [],
    }

    const rounds = [
      { key: 'cuartos', dbLabel: 'cuartos', expected: 4 },
      { key: 'semifinal', dbLabel: 'semifinal', expected: 2 },
      { key: 'final', dbLabel: 'final', expected: 1 },
    ]

    rounds.forEach((round) => {
      const roundBrackets: any[] = []

      const matchesInDb = playoffDbMatches.filter((m) => {
        if (!m.round) return false
        const regex = new RegExp(`\\b${round.dbLabel}\\b`, 'i')
        return regex.test(m.round)
      })

      for (let i = 0; i < round.expected; i++) {
        const side =
          round.key === 'final'
            ? 'center'
            : i < round.expected / 2
              ? 'left'
              : 'right'

        const pos = round.key === 'final' ? 0 : i % (round.expected / 2)

        // Validamos la posición exacta en el árbol de brackets
        const match = matchesInDb.find((dbM) =>
          this.isMatchInBracketPosition(
            dbM,
            round.key,
            side,
            pos,
            enrichedOctavos,
          ),
        )

        if (match) {
          const live = liveScores?.[match.id]
            ? (JSON.parse(liveScores[match.id]) as LiveMatchData)
            : undefined

          roundBrackets.push({
            ...this.formatBracketMatch(match, live),
            side: side,
            position: pos,
          })
        } else {
          roundBrackets.push({
            id: `tbd-${round.key}-${side}-${pos}`,
            side: side,
            position: pos,
            home_team: { name: 'A confirmar', logo_url: null },
            away_team: { name: 'A confirmar', logo_url: null },
            status_short: 'NS',
            round: `Regular Season - ${round.dbLabel}`,
            date: null,
            home_goals: null,
            away_goals: null,
            home_penalty_goals: null,
            away_penalty_goals: null,
            is_live: false,
            is_playoff: true,
          })
        }
      }
      brackets[round.key] = roundBrackets
    })

    return { tournament, season, brackets }
  }

  private formatBracketMatch(match: any, live?: LiveMatchData) {
    return {
      id: match.id,
      date: match.date,
      status_short: live ? live.status_short : match.status_short,
      round: match.round,
      home_goals: live ? live.home_goals : match.home_goals,
      away_goals: live ? live.away_goals : match.away_goals,
      home_penalty_goals: live
        ? live.home_penalty_goals
        : match.home_penalty_goals,
      away_penalty_goals: live
        ? live.away_penalty_goals
        : match.away_penalty_goals,
      is_live: !!live,
      is_playoff: true,
      home_team: {
        name: match.home_team.name,
        logo_url: match.home_team.logo_url,
      },
      away_team: {
        name: match.away_team.name,
        logo_url: match.away_team.logo_url,
      },
    }
  }

  private isMatchInBracketPosition(
    dbMatch: any,
    roundKey: string,
    side: string,
    pos: number,
    octavos: any[],
  ): boolean {
    const dbRoundLower = dbMatch.round?.toLowerCase() || ''
    if (!dbRoundLower.includes(roundKey)) {
      return false
    }

    const dbTeams = [dbMatch.home_team.name, dbMatch.away_team.name]

    let factor = 1
    if (roundKey === 'cuartos') factor = 2
    if (roundKey === 'semifinal') factor = 4
    if (roundKey === 'final') factor = 8

    const startRange = pos * factor
    const endRange = startRange + factor - 1

    const possibleTeams = octavos
      .filter((o) => {
        const sideMatch = roundKey === 'final' ? true : o.side === side
        return sideMatch && o.position >= startRange && o.position <= endRange
      })
      .flatMap((o) => [o.home_team.name, o.away_team.name])

    return dbTeams.some((team) => possibleTeams.includes(team))
  }

  generateOctavos(groups: {
    A: StandingRow[]
    B: StandingRow[]
  }): BracketMatch[] {
    const { A, B } = groups

    const matchDefinitions: any[] = [
      { side: 'left', pos: 0, home: { g: 'A', p: 1 }, away: { g: 'B', p: 8 } },
      { side: 'left', pos: 1, home: { g: 'B', p: 4 }, away: { g: 'A', p: 5 } },
      { side: 'left', pos: 2, home: { g: 'B', p: 2 }, away: { g: 'A', p: 7 } },
      { side: 'left', pos: 3, home: { g: 'A', p: 3 }, away: { g: 'B', p: 6 } },

      { side: 'right', pos: 0, home: { g: 'B', p: 1 }, away: { g: 'A', p: 8 } },
      { side: 'right', pos: 1, home: { g: 'A', p: 4 }, away: { g: 'B', p: 5 } },
      { side: 'right', pos: 2, home: { g: 'A', p: 2 }, away: { g: 'B', p: 7 } },
      { side: 'right', pos: 3, home: { g: 'B', p: 3 }, away: { g: 'A', p: 6 } },
    ]

    return matchDefinitions.map((def, index) => {
      const home = groups[def.home.g].find((t) => t.position === def.home.p)
      const away = groups[def.away.g].find((t) => t.position === def.away.p)

      return {
        id: `m-oct-${index + 1}`,
        position: def.pos,
        side: def.side,
        round: 'octavos',
        home_team: {
          name: home?.teamName || `Por definir (${def.home.p}${def.home.g})`,
          logo_url: home?.teamLogo || null,
        },
        away_team: {
          name: away?.teamName || `Por definir (${def.away.p}${def.away.g})`,
          logo_url: away?.teamLogo || null,
        },
        home_goals: null,
        away_goals: null,
        home_penalty_goals: null,
        away_penalty_goals: null,
        status_short: 'NS',
      }
    })
  }
}
