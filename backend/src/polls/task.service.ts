import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { PollsService } from './polls.service'

/**
 * Abre y cierra las encuestas según su horario. Los votos no pasan por acá:
 * `VoteService` crea el `Vote` en el momento de votar, así que volcarlos de
 * nuevo desde Redis cada 5 minutos solo repetía escrituras que ya existían.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private prisma: PrismaService,
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
}
