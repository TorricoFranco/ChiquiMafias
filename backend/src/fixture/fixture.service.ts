import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

import { GetYearlyCalendarResponseDto } from './dto/response/year-calender.dto'
import { GetFixtureMatchdayResponseDto } from './dto/response/fixture-matchday.dto'
import { GetPendingFixturesResponseDto } from 'src/fixture/dto/response/pending-match.dto'

import {
  formatMatch,
  isPlayoffRound,
  matchdaySortWeight,
} from './utils/match-format'

import { StandingRow } from 'src/standings/types/standings'
import { StandingsService } from 'src/standings/standings.service'
import { BracketMatch } from './types/fixtures'
import { LiveMatchData } from './types/fixtures'
import { GetLiveScoresResponseDto } from './dto/response/live-score.dto'
import {
  TournamentBracketsResponseDto,
  BracketsRoundsDto,
} from './dto/response/tournament-bracket.dto'
import { AvailableStagesResponseDto } from './dto/response/available-stages.dto'
import { CompetitionContext } from 'src/competitions/competitions.service'
import { CompetitionMatchesResponseDto } from './dto/response/competition-matches.dto'

// Partidos por página y rango máximo de fechas de `getMatches` (ERS RNF-S02).
export const MATCHES_PAGE_SIZE = 50
export const MATCHES_MAX_RANGE_DAYS = 31
const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class FixtureService {
  private readonly logger = new Logger(FixtureService.name)

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private standingsService: StandingsService,
  ) {}

  async getFixtureByMatchday(
    competition: CompetitionContext,
    tournament: string,
    matchday: number | string,
  ): Promise<GetFixtureMatchdayResponseDto> {
    const season = String(competition.season)
    let matchdayKey = ''
    let dbSearchTerm = ''
    const isNumbered = typeof matchday === 'number' || !isNaN(Number(matchday))

    if (isNumbered) {
      matchdayKey = `fecha:${matchday}`
      dbSearchTerm = ` - ${matchday}`
    } else {
      const normalized = matchday.toLowerCase().trim()
      matchdayKey = normalized
      dbSearchTerm = normalized
    }

    const cacheKey = `fixtures:${competition.cacheKey}:${season}:${tournament.toUpperCase()}:${matchdayKey}`

    this.logger.debug(`Extrayendo cache: ${cacheKey}`)

    const cached = await this.redisService.redis.get(cacheKey)
    let matches

    if (cached) {
      // Una caché de antes de buscar la fecha exacta puede traer otras fechas.
      matches = (JSON.parse(cached) as { round: string | null }[]).filter(
        (m) => !isNumbered || m.round?.endsWith(dbSearchTerm),
      )
    } else {
      const whereClause: any = {
        league_id: competition.leagueId,
        season: competition.season,
        tournament: tournament.toUpperCase() as any,
        // La fecha numerada va exacta: `contains ' - 1'` traía también de la 10 a la 16.
        round: isNumbered
          ? { endsWith: dbSearchTerm }
          : { contains: dbSearchTerm, mode: 'insensitive' },
      }

      if (dbSearchTerm === 'final') {
        whereClause.NOT = {
          round: {
            contains: 'semi',
            mode: 'insensitive',
          },
        }
      }

      matches = await this.prisma.matches.findMany({
        where: whereClause,
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
      `live_scores:league:${competition.cacheKey}`,
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
    competition: CompetitionContext,
  ): Promise<GetYearlyCalendarResponseDto> {
    const season = String(competition.season)
    const cacheKey = `calendar:${competition.cacheKey}:${season}:full`

    const cached = await this.redisService.redis.get(cacheKey)
    let allMatches

    if (cached) {
      allMatches = JSON.parse(cached)
    } else {
      allMatches = await this.prisma.matches.findMany({
        where: {
          league_id: competition.leagueId,
          season: competition.season,
        },
        include: {
          home_team: { select: { name: true, logo_url: true } },
          away_team: { select: { name: true, logo_url: true } },
        },
        orderBy: { date: 'asc' },
      })

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
      `live_scores:league:${competition.cacheKey}`,
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
      availableDays: Object.keys(calendar).sort(),
      calendar,
    }
  }

  /**
   * Partidos de la temporada actual con su marcador en vivo, de a
   * `MATCHES_PAGE_SIZE` y en un rango de hasta `MATCHES_MAX_RANGE_DAYS` días
   * (ERS RNF-S02). Sin fechas ni ronda: de una semana atrás a dos adelante.
   */
  async getMatches(
    competition: CompetitionContext,
    filters: { from?: string; to?: string; round?: string; page?: number },
  ): Promise<CompetitionMatchesResponseDto> {
    const page = filters.page ?? 1
    const { from, to } = this.matchesRange(filters)

    const where = {
      league_id: competition.leagueId,
      season: competition.season,
      ...(filters.round ? { round: filters.round } : {}),
      ...(from || to
        ? {
            date: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) },
          }
        : {}),
    }

    const [total, matches, liveScores] = await Promise.all([
      this.prisma.matches.count({ where }),
      this.prisma.matches.findMany({
        where,
        include: {
          home_team: { select: { name: true, logo_url: true } },
          away_team: { select: { name: true, logo_url: true } },
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * MATCHES_PAGE_SIZE,
        take: MATCHES_PAGE_SIZE,
      }),
      this.redisService.redis.hgetall(
        `live_scores:league:${competition.cacheKey}`,
      ),
    ])

    return {
      page,
      pageSize: MATCHES_PAGE_SIZE,
      total,
      matches: matches.map((m) => {
        const liveRaw = liveScores?.[m.id]
        const live = liveRaw
          ? (JSON.parse(liveRaw) as LiveMatchData)
          : undefined
        return formatMatch(m, live)
      }),
    }
  }

  /** Rango de `getMatches`: [from, to) en UTC. 400 si es inválido o muy largo. */
  private matchesRange(filters: {
    from?: string
    to?: string
    round?: string
  }): { from?: Date; to?: Date } {
    const day = (value: string) => new Date(`${value}T00:00:00.000Z`)

    if (!filters.from && !filters.to) {
      if (filters.round) return {}
      const today = day(new Date().toISOString().slice(0, 10))
      return {
        from: new Date(today.getTime() - 7 * DAY_MS),
        to: new Date(today.getTime() + 15 * DAY_MS),
      }
    }
    if (!filters.from || !filters.to) {
      throw new BadRequestException('Mandá "from" y "to" juntos')
    }

    const from = day(filters.from)
    // `to` es inclusive: se busca hasta el comienzo del día siguiente.
    const to = new Date(day(filters.to).getTime() + DAY_MS)
    const days = (to.getTime() - from.getTime()) / DAY_MS
    if (days <= 0) {
      throw new BadRequestException('"to" no puede ser anterior a "from"')
    }
    if (days > MATCHES_MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `El rango no puede superar ${MATCHES_MAX_RANGE_DAYS} días`,
      )
    }
    return { from, to }
  }

  async getActiveMatchdayInfo(
    competition: CompetitionContext,
    tournament: string,
  ): Promise<string | number> {
    const allMatches = await this.prisma.matches.findMany({
      where: {
        league_id: competition.leagueId,
        season: competition.season,
        tournament,
      },
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

    // Los playoffs en orden de cuadro: por orden alfabético la final quedaba
    // antes que los octavos y la semifinal, la última.
    const sortedMatchdays = Array.from(matchdaysMap.entries())
      .map(([matchday, matches]) => ({ matchday, matches }))
      .sort(
        (a, b) =>
          matchdaySortWeight(a.matchday) - matchdaySortWeight(b.matchday),
      )

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

  async getLiveLeagueScores(
    competition: CompetitionContext,
  ): Promise<GetLiveScoresResponseDto[]> {
    const liveScores = await this.redisService.redis.hgetall(
      `live_scores:league:${competition.cacheKey}`,
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
        elapsed: live.elapsed,
        status: live.status_short,
        isLive: true,
        isPlayoff: isPlayoffRound(live.round || ''),
      }
    })
  }

  async getPendingFixtures(
    competition: CompetitionContext,
    tournament: string,
  ): Promise<GetPendingFixturesResponseDto[]> {
    const matches = await this.prisma.matches.findMany({
      where: {
        league_id: competition.leagueId,
        season: competition.season,
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

    return Object.values(grouped).sort(
      (a: { matchday: string }, b: { matchday: string }) =>
        matchdaySortWeight(a.matchday) - matchdaySortWeight(b.matchday),
    )
  }

  async getAvailableStages(
    competition: CompetitionContext,
    tournament: string,
  ): Promise<AvailableStagesResponseDto> {
    const matches = await this.prisma.matches.findMany({
      where: {
        league_id: competition.leagueId,
        season: competition.season,
        tournament: tournament.toUpperCase(),
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
    competition: CompetitionContext,
    tournament: string,
  ): Promise<TournamentBracketsResponseDto> {
    const leagueId = competition.leagueId
    const season = String(competition.season)

    // Los cruces se proyectan con la tabla de cada momento, sin caché propia: una
    // de 24 h dejaba los cruces de antes de la última fecha.
    const standings = await this.standingsService.getStandings(competition)
    const stageStandings =
      tournament.toUpperCase() === 'CLAUSURA'
        ? standings.clausura
        : standings.apertura
    const octavosRaw = stageStandings
      ? this.generateOctavos(stageStandings.groups)
      : []

    const [playoffDbMatches, liveScores] = await Promise.all([
      this.prisma.matches.findMany({
        where: {
          league_id: leagueId,
          season: competition.season,
          tournament,
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
        orderBy: { date: 'asc' },
      }),
      this.redisService.redis.hgetall(
        `live_scores:league:${competition.cacheKey}`,
      ),
    ])

    const placedOctavos = this.placeOctavos(
      octavosRaw,
      playoffDbMatches.filter((m) =>
        m.round?.toLowerCase().includes('octavos'),
      ),
    )

    const enrichedOctavos = octavosRaw.map((oct, index) => {
      const matchInDb = placedOctavos[index]

      if (!matchInDb) {
        return {
          ...oct,
          id: oct.id || `tbd-octavos-${oct.side}-${oct.position}`,
          // Como los cruces sin partido de cuartos en adelante.
          date: null,
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
        const roundLower = m.round.toLowerCase()

        if (round.key === 'final' && roundLower.includes('semi')) {
          return false
        }

        return roundLower.includes(round.dbLabel.toLowerCase())
      })

      for (let i = 0; i < round.expected; i++) {
        const side =
          round.key === 'final'
            ? 'center'
            : i < round.expected / 2
              ? 'left'
              : 'right'

        const pos = round.key === 'final' ? 0 : i % (round.expected / 2)

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

  /**
   * Partido real de cada cruce proyectado con la tabla, en el mismo orden. Si la
   * tabla del proveedor desempata distinto que la AFA, el cruce real no tiene
   * los dos equipos de la proyección: se ubica por el que comparte, primero en
   * el mismo papel (local el mejor ubicado). Los que no comparten ninguno van
   * a los cruces libres por fecha, para que ningún partido real quede afuera.
   */
  private placeOctavos<
    T extends {
      id: string
      home_team: { name: string }
      away_team: { name: string }
    },
  >(projected: BracketMatch[], octavos: T[]): (T | undefined)[] {
    const sameTeams = (p: BracketMatch, m: T) =>
      (m.home_team.name === p.home_team.name &&
        m.away_team.name === p.away_team.name) ||
      (m.home_team.name === p.away_team.name &&
        m.away_team.name === p.home_team.name)
    const sameRole = (p: BracketMatch, m: T) =>
      m.home_team.name === p.home_team.name ||
      m.away_team.name === p.away_team.name
    const sharesTeam = (p: BracketMatch, m: T) =>
      [m.home_team.name, m.away_team.name].some(
        (name) => name === p.home_team.name || name === p.away_team.name,
      )
    const anySlot = () => true

    const placed: (T | undefined)[] = projected.map(() => undefined)
    const used = new Set<string>()

    for (const fits of [sameTeams, sameRole, sharesTeam, anySlot]) {
      projected.forEach((p, index) => {
        if (placed[index]) return
        const match = octavos.find((m) => !used.has(m.id) && fits(p, m))
        if (!match) return
        placed[index] = match
        used.add(match.id)
      })
    }

    return placed
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

    if (roundKey === 'final' && dbRoundLower.includes('semi')) {
      return false
    }

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
