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
  ) { }

  // ⏰ Cambiado a cada hora para cortar los beneficios apenas venza el plan en MP
  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionLifecycle() {
    this.logger.log(
      '🚀 Iniciando barrido horario del ciclo de vida de suscripciones...',
    )
    const now = new Date()

    try {
      // ---------------------------------------------------------------------------
      // CASO 1: Procesar CANCELLATION_PENDING o GRACE_PERIOD expirados (RF-04.4)
      // ---------------------------------------------------------------------------
      const expiredSubscriptions = await this.prisma.userSubscription.findMany({
        where: {
          status: {
            in: [
              SubscriptionStatus.CANCELLATION_PENDING,
              SubscriptionStatus.GRACE_PERIOD,
            ],
          },
          endsAt: { lte: now }, // Ya llegó o pasó la fecha de vencimiento
        },
        include: { user: true },
      })

      if (expiredSubscriptions.length > 0) {
        this.logger.log(
          `Se encontraron ${expiredSubscriptions.length} suscripciones expiradas para degradar.`,
        )

        await this.prisma.$transaction(async (tx) => {
          for (const sub of expiredSubscriptions) {
            // 1. Degradamos el registro de la suscripción
            await tx.userSubscription.update({
              where: { id: sub.id },
              data: { status: SubscriptionStatus.EXPIRED },
            })

            // 2. Limpiamos el caché comercial del usuario (Socio Free = null)
            await tx.user.update({
              where: { id: sub.userId },
              data: {
                activeSubscriptionTier: null, // 👈 Vuelve a null impecable
                activeNameColorId: null,
                activeBannerId: null,
              },
            })

            // 3. 🔥 Notificación por Sockets alineada con el Front
            this.chatGateway.server
              .to(`user:${sub.userId}`)
              .emit('subscription:expired', {
                message:
                  'Tu membresía de tribuna ha expirado, pa. Volvé a platea cuando quieras! ⚽',
                tier: null, // 👈 Enviamos null para sincronizar el estado del dropdown
              })

            this.logger.log(
              `[Cron] Usuario ${sub.user.name} (${sub.userId}) degradado a Free (null) con éxito.`,
            )
          }
        })
      }

      // ---------------------------------------------------------------------------
      // CASO 2: Control de seguridad para ACTIVE que vencen hoy (Safety Net)
      // ---------------------------------------------------------------------------
      const activeReachingEnd = await this.prisma.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: { lte: now },
          autoRenew: true, // Si es false, ya es CANCELLATION_PENDING y va por el CASO 1
        },
        include: { user: true },
      })

      if (activeReachingEnd.length > 0) {
        this.logger.log(
          `[Cron] Moviendo ${activeReachingEnd.length} planes activos vencidos a periodo de gracia...`,
        )

        await this.prisma.$transaction(async (tx) => {
          for (const sub of activeReachingEnd) {
            const graceEndDate = new Date()
            graceEndDate.setHours(graceEndDate.getHours() + 48)

            await tx.userSubscription.update({
              where: { id: sub.id },
              data: {
                status: SubscriptionStatus.GRACE_PERIOD,
                endsAt: graceEndDate,
              },
            })

            this.chatGateway.server
              .to(`user:${sub.userId}`)
              .emit('subscription:grace_period', {
                message:
                  'Tuvimos un problema con el cobro automático. Tenés 48hs de tolerancia, rey! 🚨',
                endsAt: graceEndDate,
              })
          }
        })
      }
    } catch (error) {
      this.logger.error(
        '❌ Error crítico ejecutando el Cron de suscripciones:',
        error,
      )
    }
  }
}
