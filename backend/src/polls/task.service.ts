import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // DETECTAR CUANDO UNA POLL DEBE PASAR A ACTIVE O  CLOSE

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handlePollStatus() {
    const now = new Date()

    //  ACTIVAR: Pasar de PENDING a ACTIVE
    this.logger.log(`NOW: ${now.toISOString()}`)
    const toActivate = await this.prisma.poll.updateMany({
      where: {
        status: 'PENDING',
        startsAt: { lte: now }, // Si startsAt es menor o igual a "ahora"
      },
      data: { status: 'ACTIVE' },
    })

    if (toActivate.count > 0) {
      this.logger.log(`🚀 Se activo ${toActivate.count} encuesta.`)
    }

    // CERRAR: Pasar de ACTIVE a CLOSED
    // Primero buscamos cuáles vamos a cerrar para aplicar el TTL en Redis
    const pollsToClose = await this.prisma.poll.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: now },
      },
    })

    if (pollsToClose.length > 0) {
      for (const poll of pollsToClose) {
        // Actualizamos en Postgres
        await this.prisma.poll.update({
          where: { id: poll.id },
          data: { status: 'CLOSED' },
        })

        // TTL en Redis
        // Les damos 24 horas de vida antes de que se borren solas
        const expiry = 60 * 60 * 24
        await this.redisService.redis.expire(`poll:${poll.id}:results`, expiry)
        await this.redisService.redis.expire(`poll:${poll.id}:voters`, expiry)

        this.logger.log(
          `Encuesta cerrada y programada para limpieza: ${poll.id}`,
        )
      }
    }
  }

  // PUSHEAR LOS VOTOS DE UNA POLL ACTIVA DE REDIS A POSTGRE
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncVotesToDatabase() {
    const activePolls = await this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
    })

    for (const poll of activePolls) {
      const detailKey = `poll:${poll.id}:details`
      // Obtenemos todos los votos nuevos de Redis
      const allVotes = await this.redisService.redis.hgetall(detailKey)

      if (Object.keys(allVotes).length === 0) continue

      const voteData = Object.entries(allVotes).map(([userId, optionId]) => ({
        pollId: poll.id,
        userId: userId,
        optionId: parseInt(optionId),
      }))

      // no falla si ya existen
      await this.prisma.vote.createMany({
        data: voteData,
        skipDuplicates: true,
      })
    }
  }
}
