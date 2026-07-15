import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { PrismaService } from 'src/prisma/prisma.service'

@Processor('bets-queue')
export class BetsProcessor extends WorkerHost {
  private readonly logger = new Logger(BetsProcessor.name)

  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'persist-bet') {
      const { betId, userId, optionId, stake, timestamp } = job.data

      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Guardar la apuesta
          await tx.bet.create({
            data: {
              id: betId,
              userId: userId,
              optionId: optionId,
              stake: stake,
              status: 'PENDING',
              createdAt: new Date(timestamp),
            },
          })

          const wallet = await tx.wallet.update({
            where: { userId: userId },
            data: {
              balance: { decrement: stake },
            },
          })

          await tx.coinTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -stake,
              type: 'BET_STAKE',
              description: 'Apuesta realizada',
              referenceId: betId,
              createdAt: new Date(timestamp),
            },
          })

          await tx.marketOption.update({
            where: { id: optionId },
            data: {
              totalStaked: { increment: stake },
            },
          })
        })

        this.logger.debug(
          `Apuesta ${betId} y transacciones guardadas en Postgres exitosamente.`,
        )
      } catch (error) {
        this.logger.error(
          `Error guardando apuesta ${betId} en Postgres:`,
          error,
        )
        throw error
      }
    }
  }
}
