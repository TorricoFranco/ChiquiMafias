import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { PollsService } from './polls.service'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private pollsService: PollsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePollStatus() {
    const now = new Date()

    // Pasar de PENDING a ACTIVE
    this.logger.log(`NOW: ${now.toISOString()}`)
    const toActivate = await this.prisma.poll.updateMany({
      where: {
        status: 'PENDING',
        startsAt: { lte: now },
      },
      data: { status: 'ACTIVE' },
    })

    if (toActivate.count > 0) {
      this.logger.log(`1Se activo ${toActivate.count} encuesta.`)
    }

    // Pasar de ACTIVE a CLOSED
    const pollsToClose = await this.prisma.poll.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: now },
      },
    })

    if (pollsToClose.length > 0) {
      for (const poll of pollsToClose) {
        await this.pollsService.executePollClosure(poll.id)
        this.logger.log(
          `Encuesta cerrada automáticamente y programada para limpieza: ${poll.id}`,
        )
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncVotesToDatabase() {
    const activePolls = await this.prisma.poll.findMany({
      where: { status: 'ACTIVE' },
    })

    for (const poll of activePolls) {
      const detailKey = `poll:${poll.id}:details`
      const allVotes = await this.redisService.redis.hgetall(detailKey)

      if (Object.keys(allVotes).length === 0) continue

      // En RANKING el detalle es el podio en CSV ("5,2,7"); en el resto, un id suelto.
      const voteData = Object.entries(allVotes).map(([userId, detail]) => {
        const ranking = detail.includes(',')
          ? detail
              .split(',')
              .map((id) => parseInt(id, 10))
              .filter((id) => Number.isInteger(id))
          : []

        return {
          pollId: poll.id,
          userId: userId,
          optionId: ranking.length > 0 ? ranking[0] : parseInt(detail, 10),
          ranking,
        }
      })

      await this.prisma.vote.createMany({
        data: voteData,
        skipDuplicates: true,
      })
    }
  }
}
