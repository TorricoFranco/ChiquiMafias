import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { WsException } from '@nestjs/websockets'
import { POLL_TYPE_RULES } from './constants/poll-types.constant'
import { parsePollOptions } from './utils/poll-shape.util'

@Injectable()
export class VoteService {
  private readonly logger = new Logger(VoteService.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async castVote(pollId: string, userId: string, optionId: number) {
    const cooldownKey = `limit:vote:${userId}`

    const acquired = await this.redisService.redis.set(
      cooldownKey,
      '1',
      'EX',
      2,
      'NX',
    )

    if (!acquired) {
      this.logger.warn(`Spam por parte del user: ${userId}`)
      throw new WsException('Demasiados intentos. Esperá unos segundos.')
    }

    // Se valida antes de reservar el cupo en el set de votantes: si no, un voto
    // inválido quemaría el único voto que el usuario tiene en esta encuesta.
    await this.assertVotable(pollId, optionId)

    const voterKey = `poll:${pollId}:voters`
    const resultsKey = `poll:${pollId}:results`
    const detailKey = `poll:${pollId}:details`

    const isNew = await this.redisService.redis.sadd(voterKey, userId)

    if (isNew === 0) {
      throw new WsException({
        status: 'error',
        code: 'ALREADY_VOTED',
        message: 'Ya votaste en esta encuesta',
      })
    }

    try {
      await this.prisma.vote.create({
        data: {
          pollId,
          userId,
          optionId,
        },
      })

      await this.redisService.redis
        .multi()
        .hincrby(resultsKey, optionId.toString(), 1)
        .hset(detailKey, userId, optionId.toString())
        .exec()

      return await this.redisService.redis.hgetall(resultsKey)
    } catch (error) {
      await this.redisService.redis.srem(voterKey, userId)

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

      this.logger.error(`Error persistiendo voto de ${userId}:`, error.message)
      throw new WsException(
        'Ocurrió un error al procesar tu voto, intentá de nuevo.',
      )
    }
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

  /** Verifica que la encuesta acepte este voto antes de registrarlo. */
  private async assertVotable(pollId: string, optionId: number): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        status: true,
        startsAt: true,
        endsAt: true,
        type: true,
        options: true,
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

    const exists = parsePollOptions(poll.options).some(
      (option) => option.id === optionId,
    )

    if (!exists) {
      throw new WsException('La opción elegida no existe en esta encuesta')
    }
  }
}
