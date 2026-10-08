import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChatGateway } from 'src/chat/chat.gateway'
import { SubscriptionStatus } from '@prisma/client'

@Injectable()
export class SubscriptionsCronService {
  private readonly logger = new Logger(SubscriptionsCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionLifecycle() {
    this.logger.log(
      '🚀 Iniciando barrido horario del ciclo de vida de suscripciones...',
    )
    const now = new Date()

    try {
      // ---------------------------------------------------------------------------
      // CASO 1: Procesar CANCELLATION_PENDING o GRACE_PERIOD expirados EN LOTES
      // ---------------------------------------------------------------------------
      let hasMoreExpired = true
      let expiredCount = 0

      while (hasMoreExpired) {
        // Pedimos de a 50 registros para no saturar la memoria
        const batch = await this.prisma.userSubscription.findMany({
          where: {
            status: {
              in: [
                SubscriptionStatus.CANCELLATION_PENDING,
                SubscriptionStatus.GRACE_PERIOD,
              ],
            },
            endsAt: { lte: now },
          },
          take: 50,
          include: { user: true },
        })

        if (batch.length === 0) {
          hasMoreExpired = false
          break
        }

        for (const sub of batch) {
          // Update condicional: si un cobro renovó la suscripción entre el findMany y
          // acá, no se pisa el mes pagado
          const outcome = await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.userSubscription.updateMany({
              where: { id: sub.id, status: sub.status, endsAt: { lte: now } },
              data: { status: SubscriptionStatus.EXPIRED },
            })
            if (count === 0) return 'skipped'

            // Si el usuario ya tiene otra vigente (por ejemplo, canceló y se volvió a
            // suscribir), conserva el tier y los cosméticos de esa
            const otherCurrent = await tx.userSubscription.count({
              where: {
                userId: sub.userId,
                id: { not: sub.id },
                status: {
                  in: [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.GRACE_PERIOD,
                  ],
                },
              },
            })
            if (otherCurrent > 0) return 'superseded'

            await tx.user.update({
              where: { id: sub.userId },
              data: {
                activeSubscriptionTier: null,
                activeNameColorId: null,
                activeBannerId: null,
              },
            })
            return 'expired'
          })

          if (outcome === 'skipped') continue
          expiredCount++
          if (outcome === 'superseded') continue

          this.chatGateway.server
            .to(`user:${sub.userId}`)
            .emit('subscription:expired', {
              message:
                'Tu membresía de tribuna ha expirado, pa. Volvé a platea cuando quieras! ⚽',
              tier: null,
            })
        }
      }

      if (expiredCount > 0) {
        this.logger.log(
          `✅ [Cron] Se degradaron ${expiredCount} suscripciones a Free.`,
        )
      }

      // ---------------------------------------------------------------------------
      // CASO 2: Control de seguridad para ACTIVE que vencen hoy EN LOTES
      // ---------------------------------------------------------------------------
      let hasMoreActive = true
      let activeCount = 0

      while (hasMoreActive) {
        const batch = await this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endsAt: { lte: now },
            autoRenew: true,
          },
          take: 50,
          include: { user: true },
        })

        if (batch.length === 0) {
          hasMoreActive = false
          break
        }

        for (const sub of batch) {
          const graceEndDate = new Date()
          graceEndDate.setHours(graceEndDate.getHours() + 48)

          // Condicional: un cobro que renovó entre el findMany y acá ya extendió endsAt
          const { count } = await this.prisma.userSubscription.updateMany({
            where: {
              id: sub.id,
              status: SubscriptionStatus.ACTIVE,
              endsAt: { lte: now },
            },
            data: {
              status: SubscriptionStatus.GRACE_PERIOD,
              endsAt: graceEndDate,
            },
          })
          if (count === 0) continue
          activeCount++

          this.chatGateway.server
            .to(`user:${sub.userId}`)
            .emit('subscription:grace_period', {
              message:
                'Tuvimos un problema con el cobro automático. Tenés 48hs de tolerancia, rey! 🚨',
              endsAt: graceEndDate,
            })
        }
      }

      if (activeCount > 0) {
        this.logger.log(
          `✅ [Cron] Se movieron ${activeCount} planes a periodo de gracia.`,
        )
      }
    } catch (error) {
      this.logger.error(
        '❌ Error crítico ejecutando el Cron de suscripciones:',
        error,
      )
    }
  }
}
