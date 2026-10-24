import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  BracketChangeAction,
  BracketSlot,
  Prisma,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { CompetitionContext } from 'src/competitions/competitions.service'
import { normalizeName } from 'src/football/linking/name-match'
import { slotsInRound } from './bracket-builder'
import { BracketService } from './bracket.service'
import { CorrectSlotDto } from './dto/bracket-admin.dto'

interface Actor {
  id: string
  username: string
}

type Tx = Prisma.TransactionClient

/**
 * Carga del sorteo y corrección de llaves (ERS RF-B05, RF-B12). Solo el
 * presidente (`@Roles(PRESIDENT)` en el controller y verificado acá contra la
 * base), y todo queda en `BracketChangeLog` (RNF-S04). Una carga inválida se
 * rechaza entera (RNF-S05).
 *
 * Toda escritura corre dentro del bloqueo por temporada de `BracketService`:
 * el rearmado borra y recrea las llaves, así que no puede correr en el medio.
 */
@Injectable()
export class BracketAdminService {
  private readonly logger = new Logger(BracketAdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly bracket: BracketService,
  ) {}

  /**
   * Guarda el orden oficial de la primera ronda y rearma el cuadro. Las
   * correcciones anteriores se quitan (auditado): estaban hechas sobre otro
   * orden y quedarían en lugares que ya no corresponden.
   */
  async loadDraw(
    actorId: string,
    competition: CompetitionContext,
    firstRound: string[][],
  ) {
    const actor = await this.assertPresident(actorId)
    const { seasonId, rounds } = await this.bracketSeason(competition)
    const pairs = await this.validateDraw(competition, rounds, firstRound)

    const cleared = await this.bracket.runExclusive(seasonId, async () => {
      const count = await this.prisma.$transaction(async (tx) => {
        const previous = await tx.bracketDraw.findUnique({
          where: { competition_season_id: seasonId },
          select: { pairs: true },
        })
        await tx.bracketDraw.upsert({
          where: { competition_season_id: seasonId },
          create: { competition_season_id: seasonId, pairs },
          update: { pairs },
        })
        await this.log(tx, actor, seasonId, {
          action: BracketChangeAction.LOAD_DRAW,
          before: previous?.pairs ?? Prisma.JsonNull,
          after: firstRound,
        })

        const corrections = await tx.bracketSlot.findMany({
          where: { competition_season_id: seasonId, manually_corrected: true },
        })
        for (const slot of corrections) {
          await tx.bracketSlot.update({
            where: { id: slot.id },
            data: { manually_corrected: false },
          })
          await this.log(tx, actor, seasonId, {
            action: BracketChangeAction.CLEAR_CORRECTION,
            round_order: slot.round_order,
            position: slot.position,
            before: this.snapshot(slot),
            after: Prisma.JsonNull,
            reason: 'Se cargó el sorteo: el cuadro toma su orden',
          })
        }
        return corrections.length
      })
      await this.bracket.rebuildInsideLock(seasonId)
      return count
    })

    this.logger.log(
      `Sorteo de ${competition.slug} ${competition.season} cargado por ${actor.username} (${cleared} correcciones quitadas)`,
    )
    return { pairs: pairs.length, clearedCorrections: cleared }
  }

  /** Corrige una llave. La sincronización ya no la pisa y su ganador avanza. */
  async correctSlot(
    actorId: string,
    competition: CompetitionContext,
    roundOrder: number,
    position: number,
    dto: CorrectSlotDto,
  ) {
    const actor = await this.assertPresident(actorId)
    const { seasonId } = await this.bracketSeason(competition)

    const next = await this.bracket.runExclusive(seasonId, async () => {
      const result = await this.prisma.$transaction(async (tx) => {
        const slot = await this.findSlot(tx, seasonId, roundOrder, position)
        const values = {
          home_team_id:
            dto.homeTeamId === undefined ? slot.home_team_id : dto.homeTeamId,
          away_team_id:
            dto.awayTeamId === undefined ? slot.away_team_id : dto.awayTeamId,
          winner_team_id:
            dto.winnerTeamId === undefined
              ? slot.winner_team_id
              : dto.winnerTeamId,
        }
        await this.validateCorrection(tx, competition, slot, values)

        await tx.bracketSlot.update({
          where: { id: slot.id },
          data: { ...values, manually_corrected: true },
        })
        await this.log(tx, actor, seasonId, {
          action: BracketChangeAction.CORRECT_SLOT,
          round_order: roundOrder,
          position,
          before: this.snapshot(slot),
          after: values,
          reason: dto.reason,
        })
        return values
      })
      await this.bracket.rebuildInsideLock(seasonId)
      return result
    })

    this.logger.log(
      `Llave ${roundOrder}:${position} de ${competition.slug} corregida por ${actor.username}`,
    )
    return { roundOrder, position, ...next }
  }

  /** Quita una corrección: la llave vuelve a salir de los partidos. */
  async clearCorrection(
    actorId: string,
    competition: CompetitionContext,
    roundOrder: number,
    position: number,
    reason: string,
  ) {
    const actor = await this.assertPresident(actorId)
    const { seasonId } = await this.bracketSeason(competition)

    await this.bracket.runExclusive(seasonId, async () => {
      await this.prisma.$transaction(async (tx) => {
        const slot = await this.findSlot(tx, seasonId, roundOrder, position)
        if (!slot.manually_corrected) {
          throw new BadRequestException('Esa llave no tiene una corrección')
        }
        await tx.bracketSlot.update({
          where: { id: slot.id },
          data: { manually_corrected: false },
        })
        await this.log(tx, actor, seasonId, {
          action: BracketChangeAction.CLEAR_CORRECTION,
          round_order: roundOrder,
          position,
          before: this.snapshot(slot),
          after: Prisma.JsonNull,
          reason,
        })
      })
      await this.bracket.rebuildInsideLock(seasonId)
    })
    return { roundOrder, position }
  }

  /** Últimos 50 cambios del cuadro de la temporada actual. */
  async changes(actorId: string, competition: CompetitionContext) {
    await this.assertPresident(actorId)
    const { seasonId } = await this.bracketSeason(competition)
    return this.prisma.bracketChangeLog.findMany({
      where: { competition_season_id: seasonId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        round_order: true,
        position: true,
        before: true,
        after: true,
        reason: true,
        changedByUsername: true,
        createdAt: true,
      },
    })
  }

  /**
   * Resuelve los nombres del sorteo a ids. Junta todos los errores y, si hay
   * alguno, rechaza la carga entera sin escribir nada (RNF-S05).
   */
  private async validateDraw(
    competition: CompetitionContext,
    rounds: readonly { round: string }[],
    firstRound: string[][],
  ): Promise<[string, string][]> {
    const invalidName = firstRound
      .flat()
      .find(
        (name) =>
          typeof name !== 'string' ||
          name.trim().length === 0 ||
          name.length > 100,
      )
    if (invalidName !== undefined) {
      throw new BadRequestException(
        'Cada equipo va por nombre, con hasta 100 caracteres',
      )
    }

    const errors: string[] = []
    const expected = slotsInRound(rounds.length, 1)
    if (firstRound.length !== expected) {
      errors.push(
        `Tienen que ser ${expected} cruces y llegaron ${firstRound.length}`,
      )
    }

    // Los nombres se resuelven entre los participantes de la temporada.
    const participants = await this.prisma.leagueTeams.findMany({
      where: { league_id: competition.leagueId, season: competition.season },
      select: { team: { select: { id: true, name: true } } },
    })
    const byName = new Map<string, { id: string; name: string }[]>()
    for (const { team } of participants) {
      const key = normalizeName(team.name)
      byName.set(key, [...(byName.get(key) ?? []), team])
    }
    const resolve = (name: string): string | null => {
      const found = byName.get(normalizeName(name)) ?? []
      if (found.length === 1) return found[0].id
      errors.push(
        found.length === 0
          ? `"${name}" no es un participante de la temporada`
          : `"${name}" es ambiguo: hay ${found.length} participantes con ese nombre`,
      )
      return null
    }
    const pairs = firstRound.map(
      ([home, away]) => [resolve(home), resolve(away)] as const,
    )

    const ids = pairs.flat().filter((id): id is string => id !== null)
    const repeated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    for (const id of repeated) {
      const name = participants.find((p) => p.team.id === id)?.team.name
      errors.push(`"${name}" aparece en más de un cruce`)
    }

    // Cada cruce tiene que ser un partido real de la primera ronda.
    const firstRoundMatches = await this.prisma.matches.findMany({
      where: {
        league_id: competition.leagueId,
        season: competition.season,
        round: rounds[0].round,
      },
      select: { home_team_id: true, away_team_id: true },
    })
    const played = new Set(
      firstRoundMatches.map((m) =>
        [m.home_team_id, m.away_team_id].sort().join('|'),
      ),
    )
    pairs.forEach(([home, away], i) => {
      if (!home || !away) return
      if (!played.has([home, away].sort().join('|'))) {
        errors.push(
          `El cruce ${i + 1} (${firstRound[i][0]} vs ${firstRound[i][1]}) no coincide con ningún partido de ${rounds[0].round}`,
        )
      }
    })

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'El sorteo no es válido: no se cargó nada',
        errors,
      })
    }
    return pairs as [string, string][]
  }

  private async validateCorrection(
    tx: Tx,
    competition: CompetitionContext,
    slot: BracketSlot,
    next: {
      home_team_id: string | null
      away_team_id: string | null
      winner_team_id: string | null
    },
  ) {
    if (next.home_team_id && next.home_team_id === next.away_team_id) {
      throw new BadRequestException('Un equipo no puede jugar contra sí mismo')
    }
    if (
      next.winner_team_id &&
      next.winner_team_id !== next.home_team_id &&
      next.winner_team_id !== next.away_team_id
    ) {
      throw new BadRequestException(
        'El ganador tiene que ser uno de los dos equipos de la llave',
      )
    }

    const teamIds = [next.home_team_id, next.away_team_id].filter(
      (id): id is string => !!id,
    )
    if (teamIds.length === 0) return

    const participants = await tx.leagueTeams.count({
      where: {
        league_id: competition.leagueId,
        season: competition.season,
        team_id: { in: teamIds },
      },
    })
    if (participants !== teamIds.length) {
      throw new BadRequestException(
        'Los equipos tienen que ser participantes de la temporada',
      )
    }

    // Un equipo juega una sola llave por ronda.
    const elsewhere = await tx.bracketSlot.findFirst({
      where: {
        competition_season_id: slot.competition_season_id,
        round_order: slot.round_order,
        position: { not: slot.position },
        OR: [
          { home_team_id: { in: teamIds } },
          { away_team_id: { in: teamIds } },
        ],
      },
      select: { position: true },
    })
    if (elsewhere) {
      throw new BadRequestException(
        `Ese equipo ya juega la llave ${elsewhere.position} de esta ronda`,
      )
    }
  }

  private async bracketSeason(competition: CompetitionContext) {
    const rounds = competition.strategy?.bracketRounds
    if (!rounds) {
      throw new NotFoundException('Esta competición no tiene cuadro')
    }
    const season = await this.prisma.competitionSeason.findUniqueOrThrow({
      where: {
        league_id_season: {
          league_id: competition.leagueId,
          season: competition.season,
        },
      },
      select: { id: true },
    })
    return { seasonId: season.id, rounds }
  }

  private async findSlot(
    tx: Tx,
    seasonId: string,
    roundOrder: number,
    position: number,
  ) {
    const slot = await tx.bracketSlot.findUnique({
      where: {
        competition_season_id_round_order_position: {
          competition_season_id: seasonId,
          round_order: roundOrder,
          position,
        },
      },
    })
    if (!slot) throw new NotFoundException('La llave no existe')
    return slot
  }

  private snapshot(slot: BracketSlot) {
    return {
      home_team_id: slot.home_team_id,
      away_team_id: slot.away_team_id,
      winner_team_id: slot.winner_team_id,
      match_id: slot.match_id,
      manually_corrected: slot.manually_corrected,
    }
  }

  private log(
    tx: Tx,
    actor: Actor,
    seasonId: string,
    change: Omit<
      Prisma.BracketChangeLogUncheckedCreateInput,
      'competition_season_id' | 'changedById' | 'changedByUsername'
    >,
  ) {
    return tx.bracketChangeLog.create({
      data: {
        ...change,
        competition_season_id: seasonId,
        changedById: actor.id,
        changedByUsername: actor.username,
      },
    })
  }

  /** El JWT puede ser viejo: el rol se confirma en la base, como en precios. */
  private async assertPresident(actorId: string): Promise<Actor> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, username: true, role: true, status: true },
    })
    if (
      !actor ||
      actor.status !== UserStatus.ACTIVE ||
      actor.role !== SystemRole.PRESIDENT
    ) {
      this.logger.warn(
        `[Cuadro] Cambio rechazado: el usuario ${actorId} no es PRESIDENT activo en la DB`,
      )
      throw new ForbiddenException(
        'Solo el presidente puede cargar el sorteo o corregir el cuadro.',
      )
    }
    return { id: actor.id, username: actor.username ?? actor.id }
  }
}
