import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { WsException } from '@nestjs/websockets'
import { POLL_TYPE_RULES, RANKING_PICKS } from './constants/poll-types.constant'
import { parsePollConfig, parsePollOptions } from './utils/poll-shape.util'
import {
  RankingMatrix,
  buildRankingMatrix,
  rankingField,
} from './utils/poll-ranking.util'

/** Resultado de un voto: los conteos por opción y, en RANKING, la matriz de posiciones. */
export interface VoteResult {
  results: Record<string, string>
  ranking: RankingMatrix | null
}

interface VotablePoll {
  type: Prisma.PollGetPayload<{ select: { type: true } }>['type']
  options: Prisma.JsonValue
  config: Prisma.JsonValue
}

@Injectable()
export class VoteService {
  private readonly logger = new Logger(VoteService.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** Voto de una sola opción: clásica, duelo, predicción, facto y puntuación. */
  async castVote(
    pollId: string,
    userId: string,
    optionId: number,
  ): Promise<VoteResult> {
    await this.assertCooldown(userId)

    // Se valida antes de reservar el cupo en el set de votantes: si no, un voto
    // inválido quemaría el único voto que el usuario tiene en esta encuesta.
    const poll = await this.loadVotablePoll(pollId)

    if (poll.type === 'RANKING') {
      throw new WsException('Esta encuesta se vota armando un podio')
    }

    const optionIds = this.optionIds(poll)

    if (!Number.isInteger(optionId) || !optionIds.includes(optionId)) {
      throw new WsException('La opción elegida no existe en esta encuesta')
    }

    return this.persistVote(pollId, userId, poll, optionId, [])
  }

  /** Voto del podio: el usuario manda sus elecciones en orden. */
  async castRankingVote(
    pollId: string,
    userId: string,
    ranking: number[],
  ): Promise<VoteResult> {
    await this.assertCooldown(userId)

    const poll = await this.loadVotablePoll(pollId)

    if (poll.type !== 'RANKING') {
      throw new WsException('Esta encuesta se vota eligiendo una opción')
    }

    const picks = parsePollConfig(poll.config).picks ?? RANKING_PICKS
    const optionIds = this.optionIds(poll)

    if (ranking.length !== picks) {
      throw new WsException(`Tenés que elegir ${picks} opciones en orden`)
    }

    if (new Set(ranking).size !== ranking.length) {
      throw new WsException('No podés elegir la misma opción dos veces')
    }

    if (ranking.some((optionId) => !optionIds.includes(optionId))) {
      throw new WsException('Alguna de las opciones elegidas no existe')
    }

    return this.persistVote(pollId, userId, poll, ranking[0], ranking)
  }

  /**
   * Si el usuario ya votó esta encuesta. Primero el set de votantes en Redis y,
   * si ahí no está, la tabla `Vote`: el set se puede haber perdido en un
   * reinicio y quien votó tiene que seguir viendo los resultados.
   */
  async hasVoted(pollId: string, userId: string): Promise<boolean> {
    const isMember = await this.redisService.redis.sismember(
      `poll:${pollId}:voters`,
      userId,
    )

    if (isMember === 1) return true

    const vote = await this.prisma.vote.findUnique({
      where: { pollId_userId: { pollId, userId } },
      select: { id: true },
    })

    return Boolean(vote)
  }

  /** Anti-spam: un voto cada 2 segundos por usuario. */
  private async assertCooldown(userId: string): Promise<void> {
    const acquired = await this.redisService.redis.set(
      `limit:vote:${userId}`,
      '1',
      'EX',
      2,
      'NX',
    )

    if (!acquired) {
      this.logger.warn(`Spam por parte del user: ${userId}`)
      throw new WsException('Demasiados intentos. Esperá unos segundos.')
    }
  }

  /** Verifica que la encuesta exista y esté aceptando votos. */
  private async loadVotablePoll(pollId: string): Promise<VotablePoll> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        status: true,
        startsAt: true,
        endsAt: true,
        type: true,
        options: true,
        config: true,
      },
    })

    if (!poll) {
      throw new WsException('La encuesta no existe')
    }

    if (!POLL_TYPE_RULES[poll.type]?.votable) {
      throw new WsException('Esta publicación no se vota')
    }

    if (poll.status !== 'ACTIVE') {
      throw new WsException('Esta encuesta no está abierta')
    }

    if (poll.startsAt && poll.startsAt.getTime() > Date.now()) {
      throw new WsException('Esta encuesta todavía no abrió')
    }

    if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) {
      throw new WsException('Esta encuesta ya cerró')
    }

    return poll
  }

  private optionIds(poll: VotablePoll): number[] {
    return parsePollOptions(poll.options).map((option) => option.id)
  }

  /**
   * Reserva el cupo del usuario, persiste el voto y actualiza los contadores.
   * En RANKING, `poll:<id>:results` cuenta las veces que cada opción quedó
   * primera (así la suma sigue siendo la cantidad de votantes) y la matriz
   * completa de posiciones vive en `poll:<id>:ranking`.
   */
  private async persistVote(
    pollId: string,
    userId: string,
    poll: VotablePoll,
    optionId: number,
    ranking: number[],
  ): Promise<VoteResult> {
    const redis = this.redisService.redis
    const voterKey = `poll:${pollId}:voters`
    const resultsKey = `poll:${pollId}:results`
    const detailKey = `poll:${pollId}:details`
    const rankingKey = `poll:${pollId}:ranking`

    const isNew = await redis.sadd(voterKey, userId)

    if (isNew === 0) {
      throw new WsException({
        status: 'error',
        code: 'ALREADY_VOTED',
        message: 'Ya votaste en esta encuesta',
      })
    }

    try {
      await this.prisma.vote.create({
        data: { pollId, userId, optionId, ranking },
      })

      const multi = redis
        .multi()
        .hincrby(resultsKey, optionId.toString(), 1)
        .hset(
          detailKey,
          userId,
          ranking.length > 0 ? ranking.join(',') : optionId.toString(),
        )

      ranking.forEach((chosenId, index) => {
        multi.hincrby(rankingKey, rankingField(chosenId, index + 1), 1)
      })

      await multi.exec()

      const results = await redis.hgetall(resultsKey)

      if (ranking.length === 0) return { results, ranking: null }

      const picks = parsePollConfig(poll.config).picks ?? RANKING_PICKS
      const rawMatrix = await redis.hgetall(rankingKey)

      return {
        results,
        ranking: buildRankingMatrix(rawMatrix, this.optionIds(poll), picks),
      }
    } catch (error) {
      await redis.srem(voterKey, userId)

      // El unique (pollId, userId) ya tenía el voto: el set de Redis se había
      // perdido, pero el voto existe.
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new WsException({
            status: 'error',
            code: 'ALREADY_VOTED',
            message: 'Ya votaste en esta encuesta',
          })
        }
      }

      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Error persistiendo voto de ${userId}:`, reason)
      throw new WsException(
        'Ocurrió un error al procesar tu voto, intentá de nuevo.',
      )
    }
  }
}
