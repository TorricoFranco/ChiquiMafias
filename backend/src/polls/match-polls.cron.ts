import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { MatchPollKind, Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  MATCH_POLLS_DURATION_MS,
  MATCH_POLLS_ICON,
  MATCH_POLLS_LOOKBACK_MS,
  PLAYED_MATCH_STATUSES,
} from './constants/match-polls.constant'
import {
  buildMatchReviewPoll,
  buildRefereePoll,
  MatchPollDraft,
  refereeDisplayName,
} from './utils/match-poll-builder.util'

// Partidos por corrida. En 12 horas terminan muchos menos.
const BATCH_SIZE = 50

/**
 * Cuando termina un partido le crea sus dos encuestas oficiales: la puntuación
 * del árbitro (si el partido tiene árbitro cargado) y "¿qué te pareció el
 * partido?". Cada una abre en el momento y dura 48 horas.
 *
 * Es un cron y no un listener de `match.finished`: ese evento no trae el id del
 * partido y vive en memoria, así que un reinicio entre el final y el evento lo
 * perdería. Acá se revisa lo terminado en las últimas 12 horas y el unique
 * `(matchId, matchKind)` de `Poll` hace que cada encuesta se cree una sola vez,
 * aunque dos corridas (u otra instancia del backend) se pisen.
 *
 * No emite `poll.created`: esa señal le manda un aviso a todo el chat y serían
 * dos por partido. Las encuestas aparecen al refrescar la lista de activas.
 */
@Injectable()
export class MatchPollsCron {
  private readonly logger = new Logger(MatchPollsCron.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleFinishedMatches() {
    try {
      await this.createMissingPolls(new Date())
    } catch (error) {
      this.logger.error(
        '[ENCUESTAS] Error al crear las encuestas de los partidos terminados',
        error instanceof Error ? error.stack : String(error),
      )
    }
  }

  private async createMissingPolls(now: Date) {
    this.logger.debug('[ENCUESTAS] Buscando partidos terminados sin encuestas')

    // Mismo criterio que el fixture: una temporada que no se sincroniza nunca
    // marca sus partidos como terminados.
    const seasons = await this.prisma.competitionSeason.findMany({
      where: { sync_enabled: true },
      select: { league_id: true, season: true },
    })

    if (seasons.length === 0) return

    const matches = await this.prisma.matches.findMany({
      where: {
        status_short: { in: PLAYED_MATCH_STATUSES },
        date: { gte: new Date(now.getTime() - MATCH_POLLS_LOOKBACK_MS) },
        AND: [
          {
            OR: seasons.map((season) => ({
              league_id: season.league_id,
              season: season.season,
            })),
          },
          {
            // Les falta alguna: la del partido, o la del árbitro si ya se conoce.
            OR: [
              { polls: { none: { matchKind: MatchPollKind.MATCH_REVIEW } } },
              {
                referee: { not: null },
                // El sync puede guardar '' en vez de null: sin nombre no hay encuesta.
                NOT: { referee: '' },
                polls: { none: { matchKind: MatchPollKind.REFEREE_RATING } },
              },
            ],
          },
        ],
      },
      orderBy: { date: 'asc' },
      take: BATCH_SIZE,
      select: {
        id: true,
        tournament: true,
        round: true,
        referee: true,
        home_goals: true,
        away_goals: true,
        home_penalty_goals: true,
        away_penalty_goals: true,
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
        league: { select: { name: true, short_name: true } },
        polls: {
          where: { matchKind: { not: null } },
          select: { matchKind: true },
        },
      },
    })

    for (const match of matches) {
      const existing = new Set(match.polls.map((poll) => poll.matchKind))
      const referee = refereeDisplayName(match.referee)

      if (referee && !existing.has(MatchPollKind.REFEREE_RATING)) {
        await this.createPoll(match.id, MatchPollKind.REFEREE_RATING, now, () =>
          buildRefereePoll(match, referee),
        )
      }

      if (!existing.has(MatchPollKind.MATCH_REVIEW)) {
        await this.createPoll(match.id, MatchPollKind.MATCH_REVIEW, now, () =>
          buildMatchReviewPoll(match),
        )
      }
    }
  }

  /**
   * Guarda una encuesta. Un error acá no corta las demás: la que falló se
   * reintenta en la próxima corrida mientras el partido siga en la ventana.
   */
  private async createPoll(
    matchId: string,
    kind: MatchPollKind,
    now: Date,
    build: () => MatchPollDraft,
  ) {
    try {
      const draft = build()

      await this.prisma.poll.create({
        data: {
          title: draft.title,
          description: draft.description,
          type: draft.type,
          options: draft.options as unknown as Prisma.InputJsonValue[],
          config: (draft.config ?? Prisma.DbNull) as Prisma.InputJsonValue,
          // La publica la plataforma: no consumió tickets de nadie.
          ticketCost: 0,
          // La del árbitro es sobre una persona con nombre y apellido, y un
          // comentario no se puede borrar ni cerrar después: nace sin comentarios.
          commentsEnabled: kind !== MatchPollKind.REFEREE_RATING,
          status: 'ACTIVE',
          startsAt: now,
          endsAt: new Date(now.getTime() + MATCH_POLLS_DURATION_MS),
          icon: MATCH_POLLS_ICON,
          // Oficial y sin autor: la tarjeta dice OFICIAL y no muestra a nadie.
          isOfficial: true,
          matchId,
          matchKind: kind,
        },
      })

      this.logger.log(
        `[ENCUESTAS] Encuesta creada: ${draft.title} [partido ${matchId} · ${kind}]`,
      )
    } catch (error) {
      // Otra corrida u otra instancia ya la creó: el unique hizo su trabajo.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `[ENCUESTAS] La encuesta ${kind} del partido ${matchId} ya existe; se saltea.`,
        )
        return
      }

      this.logger.error(
        `[ENCUESTAS] Error al crear la encuesta ${kind} del partido ${matchId}`,
        error instanceof Error ? error.stack : String(error),
      )
    }
  }
}
