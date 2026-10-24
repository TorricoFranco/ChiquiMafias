import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { CompetitionContext } from 'src/competitions/competitions.service'
import {
  FIXTURES_SYNCED_EVENT,
  MATCH_FINISHED_EVENT,
} from 'src/football/football.events'
import type {
  FixturesSyncedEvent,
  MatchFinishedEvent,
} from 'src/football/football.events'
import { getFormatStrategy } from 'src/football/formats/format-registry'
import { LiveMatchData } from 'src/fixture/types/fixtures'
import {
  BracketSlotState,
  computeSlots,
  DrawPairs,
  KnockoutMatch,
  layoutFromDraw,
  layoutFromMatches,
} from './bracket-builder'
import { BracketResponseDto, BracketTeamDto } from './dto/bracket-response.dto'

const CACHE_TTL_SECONDS = 60
export const bracketCacheKey = (seasonId: string) => `bracket:v1:${seasonId}`

const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO']

const teamSelect = {
  select: { id: true, name: true, logo_url: true, api_team_id: true },
} as const

/**
 * Cuadro de las competiciones de eliminación directa (ERS §6.3, RF-B04 a
 * RF-B06). Se rearma desde los partidos cada vez que termina uno o se
 * sincroniza el fixture; las llaves corregidas a mano se respetan.
 */
@Injectable()
export class BracketService {
  private readonly logger = new Logger(BracketService.name)
  // Una sincronización por temporada a la vez: dos al mismo tiempo chocarían
  // en el borrado e inserción de las llaves.
  private readonly running = new Map<string, Promise<void>>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(MATCH_FINISHED_EVENT)
  async onMatchFinished({ leagueDbId, season }: MatchFinishedEvent) {
    try {
      const competitionSeason = await this.prisma.competitionSeason.findUnique({
        where: { league_id_season: { league_id: leagueDbId, season } },
        select: { id: true },
      })
      if (competitionSeason) await this.syncSeason(competitionSeason.id)
    } catch (error) {
      this.logger.error(
        `Error actualizando el cuadro tras el partido: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  @OnEvent(FIXTURES_SYNCED_EVENT)
  async onFixturesSynced({ seasonId }: FixturesSyncedEvent) {
    try {
      await this.syncSeason(seasonId)
    } catch (error) {
      this.logger.error(
        `Error actualizando el cuadro tras sincronizar el fixture: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /** Rearma y guarda el cuadro de una temporada. No hace nada si el formato no tiene cuadro. */
  async syncSeason(seasonId: string): Promise<void> {
    await this.runExclusive(seasonId, () => this.rebuildInsideLock(seasonId))
  }

  /**
   * Corre `fn` sin que se pise con otro rearmado o corrección de la misma
   * temporada: el rearmado borra y recrea las llaves, así que nada puede
   * escribirlas en el medio.
   */
  async runExclusive<T>(seasonId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.running.get(seasonId) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(fn)
    const done = next.then(
      () => undefined,
      () => undefined,
    )
    this.running.set(seasonId, done)
    try {
      return await next
    } finally {
      if (this.running.get(seasonId) === done) this.running.delete(seasonId)
    }
  }

  /** Rearma el cuadro. Llamar solo dentro de `runExclusive`. */
  async rebuildInsideLock(seasonId: string): Promise<void> {
    const season = await this.prisma.competitionSeason.findUnique({
      where: { id: seasonId },
      select: { id: true, league_id: true, season: true, format: true },
    })
    const strategy = season ? getFormatStrategy(season.format) : null
    const rounds = strategy?.bracketRounds
    if (!season || !strategy || !rounds) return

    const correctedRows = await this.prisma.bracketSlot.findMany({
      where: { competition_season_id: seasonId, manually_corrected: true },
    })
    const corrected = new Map<string, BracketSlotState>(
      correctedRows.map((s) => [
        `${s.round_order}:${s.position}`,
        {
          roundOrder: s.round_order,
          position: s.position,
          matchId: s.match_id,
          homeTeamId: s.home_team_id,
          awayTeamId: s.away_team_id,
          winnerTeamId: s.winner_team_id,
        },
      ]),
    )
    const pinnedMatches = new Set(
      correctedRows.flatMap((s) => (s.match_id ? [s.match_id] : [])),
    )

    const orderOfRound = new Map(rounds.map((r, i) => [r.round, i + 1]))
    const rows = await this.prisma.matches.findMany({
      where: {
        league_id: season.league_id,
        season: season.season,
        tournament: { in: [...strategy.stages] },
      },
      select: {
        id: true,
        round: true,
        date: true,
        home_team_id: true,
        away_team_id: true,
        status_short: true,
        home_goals: true,
        away_goals: true,
        home_penalty_goals: true,
        away_penalty_goals: true,
      },
    })
    const allMatches: KnockoutMatch[] = rows.flatMap((m) => {
      const roundOrder = orderOfRound.get(m.round)
      if (!roundOrder) return []
      return [
        {
          id: m.id,
          roundOrder,
          date: m.date,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          statusShort: m.status_short,
          homeGoals: m.home_goals,
          awayGoals: m.away_goals,
          homePenalties: m.home_penalty_goals,
          awayPenalties: m.away_penalty_goals,
        },
      ]
    })

    // Una llave corregida antes de que existiera su partido lo toma cuando
    // aparece uno con los mismos equipos: así muestra marcador y ganador.
    const attached = new Map<string, string>()
    const sameTeams = (a: (string | null)[], b: string[]) =>
      a.every((t) => t !== null) &&
      [...a].sort().join('|') === [...b].sort().join('|')
    for (const [key, slot] of corrected) {
      if (slot.matchId) continue
      const match = allMatches.find(
        (m) =>
          m.roundOrder === slot.roundOrder &&
          !pinnedMatches.has(m.id) &&
          sameTeams(
            [slot.homeTeamId, slot.awayTeamId],
            [m.homeTeamId, m.awayTeamId],
          ),
      )
      if (!match) continue
      corrected.set(key, { ...slot, matchId: match.id })
      attached.set(key, match.id)
      pinnedMatches.add(match.id)
    }
    const matches = allMatches.filter((m) => !pinnedMatches.has(m.id))

    // Con sorteo cargado, el orden sale de él; si no, se reconstruye de lo jugado.
    const draw = await this.prisma.bracketDraw.findUnique({
      where: { competition_season_id: seasonId },
      select: { pairs: true },
    })
    const pairs = draw ? (draw.pairs as unknown as DrawPairs) : undefined
    const { positions, unplaced } = pairs
      ? layoutFromDraw(matches, rounds.length, pairs, corrected)
      : layoutFromMatches(matches, rounds.length, corrected)
    for (const m of unplaced) {
      this.logger.warn(
        `El partido ${m.id} no entra en ningún lugar del cuadro de la temporada ${seasonId}`,
      )
    }
    const slots = computeSlots(
      positions,
      rounds.length,
      corrected,
      pairs,
    ).filter((s) => !corrected.has(`${s.roundOrder}:${s.position}`))

    await this.prisma.$transaction(async (tx) => {
      for (const [key, matchId] of attached) {
        const [round_order, position] = key.split(':').map(Number)
        await tx.bracketSlot.update({
          where: {
            competition_season_id_round_order_position: {
              competition_season_id: seasonId,
              round_order,
              position,
            },
          },
          data: { match_id: matchId },
        })
      }
      await tx.bracketSlot.deleteMany({
        where: { competition_season_id: seasonId, manually_corrected: false },
      })
      await tx.bracketSlot.createMany({
        data: slots.map((s) => ({
          competition_season_id: seasonId,
          round_order: s.roundOrder,
          position: s.position,
          match_id: s.matchId,
          home_team_id: s.homeTeamId,
          away_team_id: s.awayTeamId,
          winner_team_id: s.winnerTeamId,
        })),
      })
    })
    await this.redis.redis.del(bracketCacheKey(seasonId))
    this.logger.debug(`Cuadro de la temporada ${seasonId} actualizado`)
  }

  /** Cuadro de la temporada actual con los marcadores en vivo. */
  async getBracket(
    competition: CompetitionContext,
  ): Promise<BracketResponseDto> {
    const rounds = competition.strategy?.bracketRounds ?? []
    const season = await this.prisma.competitionSeason.findUniqueOrThrow({
      where: {
        league_id_season: {
          league_id: competition.leagueId,
          season: competition.season,
        },
      },
      select: { id: true },
    })

    const key = bracketCacheKey(season.id)
    const cached = await this.redis.redis.get(key)
    let bracket: BracketResponseDto
    if (cached) {
      bracket = JSON.parse(cached) as BracketResponseDto
    } else {
      let slots = await this.loadSlots(season.id)
      if (slots.length === 0) {
        // Todavía no se armó (temporada recién activada): se arma ahora.
        await this.syncSeason(season.id)
        slots = await this.loadSlots(season.id)
      }
      bracket = {
        rounds: rounds.map((r, i) => ({
          order: i + 1,
          key: r.key,
          name: r.round,
          slots: slots
            .filter((s) => s.round_order === i + 1)
            .sort((a, b) => a.position - b.position)
            .map((s) => ({
              position: s.position,
              matchId: s.match_id,
              date: s.match?.date ?? null,
              status: s.match?.status_short ?? null,
              isLive: false,
              homeGoals: s.match?.home_goals ?? null,
              awayGoals: s.match?.away_goals ?? null,
              homePenalties: s.match?.home_penalty_goals ?? null,
              awayPenalties: s.match?.away_penalty_goals ?? null,
              home: this.team(s.home_team),
              away: this.team(s.away_team),
              winnerTeamId: s.winner_team_id,
            })),
        })),
      }
      await this.redis.redis.set(
        key,
        JSON.stringify(bracket),
        'EX',
        CACHE_TTL_SECONDS,
      )
    }

    return this.withLiveScores(bracket, competition)
  }

  private loadSlots(seasonId: string) {
    return this.prisma.bracketSlot.findMany({
      where: { competition_season_id: seasonId },
      include: {
        match: {
          select: {
            date: true,
            status_short: true,
            home_goals: true,
            away_goals: true,
            home_penalty_goals: true,
            away_penalty_goals: true,
          },
        },
        home_team: teamSelect,
        away_team: teamSelect,
      },
    })
  }

  private team(
    t: {
      id: string
      name: string
      logo_url: string | null
      api_team_id: number | null
    } | null,
  ): BracketTeamDto | null {
    return t
      ? {
          id: t.id,
          name: t.name,
          logoUrl: t.logo_url,
          apiTeamId: t.api_team_id,
        }
      : null
  }

  private async withLiveScores(
    bracket: BracketResponseDto,
    competition: CompetitionContext,
  ): Promise<BracketResponseDto> {
    const live = await this.redis.redis.hgetall(
      `live_scores:league:${competition.cacheKey}`,
    )
    if (!live || Object.keys(live).length === 0) return bracket

    return {
      rounds: bracket.rounds.map((round) => ({
        ...round,
        slots: round.slots.map((slot) => {
          const raw = slot.matchId ? live[slot.matchId] : undefined
          if (!raw) return slot
          const data = JSON.parse(raw) as LiveMatchData
          return {
            ...slot,
            status: data.status_short,
            isLive: !FINISHED.includes(data.status_short),
            homeGoals: data.home_goals,
            awayGoals: data.away_goals,
            homePenalties: data.home_penalty_goals,
            awayPenalties: data.away_penalty_goals,
          }
        }),
      })),
    }
  }
}
