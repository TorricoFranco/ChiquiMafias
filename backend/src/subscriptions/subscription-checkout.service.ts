import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  HttpException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  SubscriptionTier,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import {
  SUBSCRIPTION_CYCLE_DAYS,
  GRACE_PERIOD_HOURS,
  MERCADO_PAGO_CONSTANTS,
  UPGRADE_LINK_TTL_SECONDS,
} from './constants/subscription.constants'

import { SUBSCRIPTION_GIFTS } from './constants/subscription-rewards.constant'

import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

import {
  MercadoPagoPreapprovalPayload,
  MercadoPagoWebhookPayload,
} from './interfaces/mercado-pago.interface'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'

import { RedisService } from '../redis/redis.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SubscriptionRewardsService } from './Subscription-rewards.service'
import { WalletService } from '../wallet/wallet.service'

// Lo que se usa de /preapproval, /authorized_payments y /v1/payments de Mercado Pago
interface MpChargeDetails {
  status?: string
  external_reference?: string
  payment?: { status?: string }
}

@Injectable()
export class SubscriptionCheckoutService {
  private readonly logger = new Logger(SubscriptionCheckoutService.name)

  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly subscriptionRewardsService: SubscriptionRewardsService,
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly eventEmitter: EventEmitter2,
    private readonly walletService: WalletService,
  ) {}

  // private getMercadoPagoConfig() {
  //   const frontendUrl = this.configService.get<string>('FRONTEND_URL', {
  //     infer: true,
  //   })

  //   return {
  //     API_BASE_URL: this.configService.get<string>('MERCADO_PAGO_API_URL', {
  //       infer: true,
  //     }),
  //     ACCESS_TOKEN: this.configService.get<string>(
  //       'MERCADO_PAGO_ACCESS_TOKEN',
  //       { infer: true },
  //     ),
  //     WEBHOOK_URL: this.configService.get<string>('MERCADO_PAGO_WEBHOOK_URL', {
  //       infer: true,
  //     }),
  //     FRONTEND_SUCCESS_URL: `${frontendUrl}/${this.configService.get<string>('FRONTEND_SUCCESS_URL', { infer: true })}`,
  //     ...MERCADO_PAGO_CONSTANTS,
  //   }
  // }

  /**
   * CHECKOUT / ALTA O UPGRADE DE SUSCRIPCIÓN
   */
  async startCheckout(
    userId: string,
    tier: SubscriptionTier,
    isUpgrade = false,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new BadRequestException('Usuario no encontrado')

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier },
      })
      if (!plan || !plan.isActive)
        throw new BadRequestException('El plan seleccionado no está disponible')
      if (plan.basePriceARS === 0)
        throw new BadRequestException(
          'El plan Popular es gratuito, no requiere checkout',
        )

      if (!isUpgrade) {
        const existingActive = await this.prisma.userSubscription.findFirst({
          where: { userId, status: SubscriptionStatus.ACTIVE },
        })

        if (existingActive) {
          throw new ConflictException(
            'Ya posees una suscripción activa. Usa el flujo de Upgrade o cancela la actual.',
          )
        }
      } else {
        const existingActive = await this.prisma.userSubscription.findFirst({
          where: { userId, status: SubscriptionStatus.ACTIVE },
        })

        if (!existingActive) {
          throw new ConflictException(
            'No tienes ninguna suscripción activa para hacer upgrade.',
          )
        }

        if (existingActive.tier === tier) {
          throw new ConflictException(`Ya estás suscripto al plan ${tier}.`)
        }
      }

      const pricing = this.pricingService.calculateCurrentPrice(plan)
      const mpExternalRef = randomUUID()
      const mpConfig = this.mercadoPagoService.getMercadoPagoConfig()

      const now = new Date()
      const futureStartDate = new Date(now.getTime() + 5 * 60 * 1000)
      const startDate = futureStartDate.toISOString()
      const endDate = new Date(
        now.getTime() + SUBSCRIPTION_CYCLE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString()

      // Cambiamos dinámicamente el título en Mercado Pagox
      const reasonText = isUpgrade
        ? `Upgrade a ${tier} - ERS Chiquimafías`
        : `Suscripción ${tier} - ERS Chiquimafías`

      const mpPayload: MercadoPagoPreapprovalPayload = {
        reason: reasonText,
        external_reference: mpExternalRef,
        payer_email: user.email,
        back_url: mpConfig.FRONTEND_SUCCESS_URL,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: pricing.discountedPriceARS,
          currency_id: mpConfig.CURRENCY,
          start_date: startDate,
        },
      }

      this.logger.debug(
        `[MP Request] Preapproval para usuario ${user.email} tier ${tier} (Upgrade: ${isUpgrade})`,
      )

      const mpResponse =
        await this.mercadoPagoService.createPreapproval(mpPayload)

      const mpInitPoint = mpResponse.init_point
      const mpPreapprovalId = mpResponse.id

      //  GUARDAR EN BD Y REDIS (Se guarda como PENDING)
      const subscription = await this.prisma.userSubscription.create({
        data: {
          userId,
          tier,
          status: SubscriptionStatus.PENDING,
          startsAt: now,
          endsAt: endDate,
          autoRenew: true,
          mpExternalRef,
          mpPreapprovalId,
        },
      })

      await this.redis.redis.set(
        `subscription:checkout:${mpExternalRef}`,
        subscription.id,
        'EX',
        3600,
      )

      this.logger.log(
        `[Checkout OK] User ${userId} iniciando pago tier ${tier} - MP ID: ${mpPreapprovalId}`,
      )

      return {
        init_point: mpInitPoint,
        external_reference: mpExternalRef,
        subscription_id: subscription.id,
        tier,
      }
    } catch (error: any) {
      if (error instanceof HttpException) throw error

      if (error?.response?.status) {
        this.logger.error(
          `[Checkout Error] Mercado Pago responded with ${error.response.status}`,
          JSON.stringify(error.response.data),
        )
      } else {
        this.logger.error(
          `[Checkout Error] ${error?.message || 'Unknown error'}`,
          error?.stack,
        )
      }
      throw new InternalServerErrorException(
        'Error al procesar el checkout con Mercado Pago',
      )
    }
  }

  /**
   * ============================================================================
   * WEBHOOK - PROCESAMIENTO DE PAGOS (RF-01.2, RF-01.3, RNF-01)
   * ============================================================================
   */
  async processWebhook(payload: MercadoPagoWebhookPayload) {
    try {
      this.logger.log(
        `[Webhook] Evento recibido: ${payload.type} - Action: ${payload.action}`,
      )

      if (
        payload.type !== 'payment' &&
        payload.type !== 'preapproval_payment' &&
        payload.type !== 'subscription_preapproval' &&
        payload.type !== 'subscription_authorized_payment'
      ) {
        this.logger.warn(`[Webhook] Evento no procesable: ${payload.type}`)
        return { status: 'ignored', message: 'Evento no aplicable' }
      }

      if (payload.type === 'payment') {
        this.logger.log(
          `[Webhook] Ignorando evento 'payment' aislado. Se espera el evento de suscripción.`,
        )
        return {
          status: 'ignored',
          message: 'Evento payment ignorado en flujo de suscripciones',
        }
      }

      const paymentId = payload.data?.id
      if (!paymentId) {
        throw new BadRequestException(
          'No se encontró ID de datos en el webhook',
        )
      }

      if (payload.type === 'subscription_preapproval') {
        this.logger.log(
          `[Webhook MP] Procesando actualización externa de suscripción: ${paymentId}`,
        )

        const preapprovalDetails =
          (await this.mercadoPagoService.getPaymentDetails(
            paymentId,
            payload.type,
          )) as MpChargeDetails | null

        if (preapprovalDetails?.status === 'cancelled') {
          // suscripción en DB local
          const localSub = await this.prisma.userSubscription.findFirst({
            where: {
              mpPreapprovalId: paymentId,
              status: SubscriptionStatus.ACTIVE,
            },
          })

          if (localSub) {
            await this.prisma.userSubscription.update({
              where: { id: localSub.id },
              data: {
                status: SubscriptionStatus.CANCELLATION_PENDING,
                autoRenew: false,
              },
            })

            this.logger.log(
              `[Webhook MP OK] Suscripción ${localSub.id} cancelada externamente desde Mercado Pago.`,
            )
            return {
              status: 'success',
              message: 'Suscripción externa cancelada correctamente.',
            }
          }

          return {
            status: 'ignored',
            message: 'Suscripción no encontrada o ya procesada.',
          }
        }

        // La autorización del débito no es un cobro: el alta, los regalos y el bono
        // salen con el primer cobro aprobado (subscription_authorized_payment).
        this.logger.log(
          `[Webhook MP] Preapproval ${paymentId} en estado ${preapprovalDetails?.status}: se espera el cobro para activar.`,
        )
        return {
          status: 'ignored',
          message:
            'Autorización registrada: la suscripción se activa con el primer cobro.',
        }
      }

      const isAlreadyProcessed = await this.prisma.processedPayment.findUnique({
        where: { paymentId: String(paymentId) },
      })

      if (isAlreadyProcessed) {
        this.logger.warn(
          `[Webhook Replay Prevention] Pago ${paymentId} ya fue procesado`,
        )
        return { status: 'idempotent', message: 'Pago ya fue procesado' }
      }

      const paymentDetails = (await this.mercadoPagoService.getPaymentDetails(
        paymentId,
        payload.type,
      )) as MpChargeDetails | null
      if (!paymentDetails) {
        throw new InternalServerErrorException(
          'No se pudo obtener detalles del pago',
        )
      }

      // Sin referencia no se puede saber de qué suscripción es: con un where en
      // undefined, Prisma tocaría cualquier suscripción (o todas).
      const externalRef = paymentDetails.external_reference
      if (!externalRef) {
        this.logger.warn(
          `[Webhook] Pago ${paymentId} (${payload.type}) sin external_reference. Ignorado.`,
        )
        return {
          status: 'ignored',
          message: 'Pago sin referencia de suscripción',
        }
      }

      // Un authorized_payment "processed" trae el resultado del cobro en payment.status.
      // Los estados intermedios (scheduled, pending, in_process) no son ni cobro ni
      // fallo: MP avisa la factura al crearla, a veces días antes del débito.
      const chargeStatus = paymentDetails.status
      const isAuthorizedPayment =
        payload.type === 'subscription_authorized_payment'
      const isApprovedCharge = isAuthorizedPayment
        ? chargeStatus === 'processed' &&
          (paymentDetails.payment?.status ?? 'approved') === 'approved'
        : chargeStatus === 'approved'
      const isFailedCharge = isAuthorizedPayment
        ? chargeStatus === 'recycling' ||
          chargeStatus === 'cancelled' ||
          (chargeStatus === 'processed' && !isApprovedCharge)
        : chargeStatus === 'rejected' || chargeStatus === 'cancelled'

      if (isFailedCharge) {
        this.logger.warn(
          `[Webhook] Pago ${paymentId} no aprobado. Status: ${chargeStatus}`,
        )
        await this.handlePaymentFailure(externalRef)
        return {
          status: 'failed',
          message: `Pago en estado ${chargeStatus}`,
        }
      }

      if (!isApprovedCharge) {
        this.logger.log(
          `[Webhook] Pago ${paymentId} en estado ${chargeStatus}: se espera el resultado del cobro.`,
        )
        return {
          status: 'ignored',
          message: `Pago en estado ${chargeStatus}`,
        }
      }

      //  Buscar la nueva suscripción (la que se acaba de pagar)
      const subscription = await this.prisma.userSubscription.findFirst({
        where: { mpExternalRef: externalRef },
        include: {
          user: true,
        },
      })

      if (!subscription) {
        throw new BadRequestException(
          `No existe suscripción con external_reference ${externalRef}`,
        )
      }

      const upgradeOldSubId = await this.redis.redis.get(
        `subscription:upgrade:${externalRef}`,
      )

      // Débitos automáticos a dar de baja en MP afuera del bloque transaccional
      const preapprovalsToCancel: string[] = []

      // TRANSACCIÓN ATÓMICA
      const result = await this.prisma.$transaction(async (tx) => {
        // Registrar el ID del pago en la base de datos para asegurar idempotencia
        try {
          await tx.processedPayment.create({
            data: { paymentId: paymentId },
          })
        } catch (e) {
          if (e.code === 'P2002') {
            throw new Error('DUPLICATE_WEBHOOK')
          }
          throw e
        }

        const now = new Date()
        const nextBillingDate = new Date(
          now.getTime() + SUBSCRIPTION_CYCLE_DAYS * 24 * 60 * 60 * 1000,
        )

        // MP manda más de un evento por alta (preapproval autorizado + primer cobro) y uno
        // por cada renovación: solo el que pasa la suscripción de PENDING a ACTIVE es el alta.
        const activation = await tx.userSubscription.updateMany({
          where: { id: subscription.id, status: SubscriptionStatus.PENDING },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startsAt: now,
            endsAt: nextBillingDate,
          },
        })
        const isFirstActivation = activation.count === 1

        let isActive = isFirstActivation
        if (!isFirstActivation) {
          // Una en GRACE_PERIOD o una EXPIRED con autoRenew (venció por falta de pago: el
          // cron no toca autoRenew) siguen vivas en MP y se reactivan con un reintento,
          // salvo que el usuario ya tenga otra ACTIVE. La vieja de un upgrade y las
          // canceladas tienen autoRenew: false.
          const otherActive = await tx.userSubscription.count({
            where: {
              userId: subscription.userId,
              id: { not: subscription.id },
              status: SubscriptionStatus.ACTIVE,
            },
          })

          // Renovación (o segundo evento del alta): solo extiende el período, sin regalos
          const renewal = await tx.userSubscription.updateMany({
            where: {
              id: subscription.id,
              OR: [
                { status: SubscriptionStatus.ACTIVE },
                ...(otherActive === 0
                  ? [
                      { status: SubscriptionStatus.GRACE_PERIOD },
                      { status: SubscriptionStatus.EXPIRED, autoRenew: true },
                    ]
                  : []),
              ],
            },
            data: {
              status: SubscriptionStatus.ACTIVE,
              endsAt: nextBillingDate,
            },
          })
          isActive = renewal.count === 1

          if (!isActive) {
            // Si no se reactiva, MP la seguiría cobrando cada mes: se da de baja
            if (subscription.mpPreapprovalId) {
              preapprovalsToCancel.push(subscription.mpPreapprovalId)
            }
            this.logger.error(
              `[Webhook] Pago ${paymentId} sobre la suscripción ${subscription.id} en estado ${subscription.status}: no se reactiva y se cancela su débito en MP. Revisar si corresponde reintegro.`,
            )
          }
        }

        if (isActive) {
          // Sincronizar el nuevo tier en el usuario
          await tx.user.update({
            where: { id: subscription.userId },
            data: { activeSubscriptionTier: subscription.tier },
          })
        }

        // La wallet se crea con el primer crédito: un usuario que nunca recibió
        // monedas no tiene, y el registro del pago la necesita
        const wallet = await tx.wallet.upsert({
          where: { userId: subscription.userId },
          update: {},
          create: { userId: subscription.userId },
          select: { id: true },
        })

        // Registrar transacción base de Mercado Pago
        await tx.coinTransaction.create({
          data: {
            walletId: wallet.id,
            amount: 0,
            type: TransactionType.MERCADO_PAGO_BUY,
            description: `Suscripción ${subscription.tier} - Pago MP ${paymentId}`,
            referenceId: externalRef,
          },
        })

        if (isFirstActivation) {
          // Una sola suscripción vigente por usuario: al activar la nueva se vencen y se dan
          // de baja en MP las otras que MP todavía puede cobrar (la vieja de un upgrade,
          // aunque su key de Redis haya vencido, una en GRACE_PERIOD que el usuario
          // reemplazó, o una EXPIRED por falta de pago con el débito vivo)
          const otherSubs = await tx.userSubscription.findMany({
            where: {
              userId: subscription.userId,
              id: { not: subscription.id },
              OR: [
                {
                  status: {
                    in: [
                      SubscriptionStatus.ACTIVE,
                      SubscriptionStatus.GRACE_PERIOD,
                    ],
                  },
                },
                { status: SubscriptionStatus.EXPIRED, autoRenew: true },
              ],
            },
          })

          for (const oldSub of otherSubs) {
            // Lock optimista: si dos altas vencen la misma suscripción, el bono se paga una vez
            const expired = await tx.userSubscription.updateMany({
              where: {
                id: oldSub.id,
                status: oldSub.status,
                autoRenew: oldSub.autoRenew,
              },
              data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
            })
            if (expired.count === 0) continue

            if (oldSub.mpPreapprovalId) {
              preapprovalsToCancel.push(oldSub.mpPreapprovalId)
            }

            // El bono es solo para el upgrade pedido desde una suscripción al día
            if (
              oldSub.id !== upgradeOldSubId ||
              oldSub.status !== SubscriptionStatus.ACTIVE
            ) {
              continue
            }

            const oldPlan = await tx.subscriptionPlan.findUnique({
              where: { tier: oldSub.tier },
            })

            const { daysRemaining, bonusCoins, coinsPerDay } =
              this.pricingService.calculateUpgradeBonus(
                oldSub.endsAt,
                oldPlan?.basePriceARS ?? 0,
              )

            if (bonusCoins > 0) {
              // Devuelve en monedas lo que se pagó y no se usó: no se recorta al tope
              await this.walletService.addCoins(
                {
                  userId: subscription.userId,
                  amount: bonusCoins,
                  type: TransactionType.ADMIN_GIFT,
                  description: `Bono de upgrade: ${daysRemaining} días restantes × ${coinsPerDay} coins`,
                  referenceId: oldSub.id,
                  enforceCap: false,
                },
                tx,
              )
            }
          }
        }

        if (isFirstActivation) {
          await this.subscriptionRewardsService.grantRewards(
            subscription.userId,
            subscription.tier,
            tx,
          )
        }

        const updatedSubscription = await tx.userSubscription.findUnique({
          where: { id: subscription.id },
        })

        return {
          subscription: updatedSubscription,
          isFirstActivation,
          isActive,
        }
      })

      // Redis recién después del commit: si la transacción hace rollback no quedan
      // saldos ni upgrades a medio aplicar
      if (result.isFirstActivation) {
        if (upgradeOldSubId) {
          await this.redis.redis.del(`subscription:upgrade:${externalRef}`)
        }
        await this.walletService.syncBalanceCache(subscription.userId)
      }

      // Dar de baja los débitos automáticos que ya no corresponden en Mercado Pago
      for (const preapprovalId of preapprovalsToCancel) {
        try {
          await this.mercadoPagoService.cancelPreapprovalInMercadoPago(
            preapprovalId,
          )
          this.logger.log(
            `[Webhook] Suscripción MP ${preapprovalId} cancelada con éxito.`,
          )
        } catch (mpError) {
          // Si MP falla acá no pasa nada grave, el usuario ya tiene su estado perfecto en la DB local.
          // Queda registrado en logs para revisarlo manualmente si hiciera falta.
          this.logger.error(
            `[Webhook Warning] No se pudo cancelar en MP la suscripción ${preapprovalId}. Requiere cancelación manual.`,
            mpError.stack,
          )
        }
      }

      this.logger.log(
        `[Webhook OK] Proceso completado para suscripción ${subscription.id} (alta: ${result.isFirstActivation})`,
      )

      if (result.isFirstActivation) {
        const giftData = SUBSCRIPTION_GIFTS[subscription.tier]

        this.eventEmitter.emit('subscription.purchased', {
          userId: subscription.userId,
          tier: subscription.tier,
          giftData: giftData,
        })
      }

      let message = 'Pago registrado sin reactivar la suscripción.'
      if (result.isFirstActivation) {
        message = 'Pago procesado y beneficios aplicados correctamente.'
      } else if (result.isActive) {
        message = 'Pago procesado: período renovado.'
      }

      return {
        status: 'success',
        message,
        subscription: result.subscription,
      }
    } catch (error: any) {
      if (error.message === 'DUPLICATE_WEBHOOK') {
        this.logger.warn(
          `[Webhook] Intento de procesamiento duplicado para ${payload.data?.id}, ignorando.`,
        )
        return { status: 'idempotent', message: 'Pago ya fue procesado' }
      }

      this.logger.error(`[Webhook Error] ${error.message}`, error.stack)
      throw error
    }
  }

  /**
   * ============================================================================
   * CANCELACIÓN DE SUSCRIPCIÓN (RF-02)
   * ============================================================================
   * Pausa la suscripción en Mercado Pago y cambia estado a CANCELLATION_PENDING
   * Los beneficios se mantienen hasta la fecha de vencimiento
   */
  async cancelSubscription(userId: string, reason?: string) {
    try {
      //  Traemos la suscripción ACTIVE, pero ordenada por la más nueva (desc)
      // por si quedó algún residuo viejo en ACTIVE en la DB
      const subscription = await this.prisma.userSubscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { user: true },
      })

      if (!subscription) {
        throw new BadRequestException(
          'El usuario no tiene suscripción activa para cancelar',
        )
      }

      if (subscription.mpPreapprovalId) {
        try {
          await this.mercadoPagoService.cancelPreapprovalInMercadoPago(
            subscription.mpPreapprovalId,
          )
        } catch (mpError: any) {
          //  SI MERCADO PAGO DICE QUE YA ESTÁ CANCELADA, NO ROMPEMOS EL FLUJO.
          // Aprovechamos el error para limpiar nuestra base de datos local.
          const isAlreadyCancelled =
            mpError?.response?.data?.message?.includes(
              'cancelled preapproval',
            ) || mpError?.response?.status === 400

          if (isAlreadyCancelled) {
            this.logger.warn(
              `[Cancel MP Warning] La suscripción ${subscription.mpPreapprovalId} ya estaba cancelada en MP. Procediendo a sincronizar DB local.`,
            )
          } else {
            // Si es otro tipo de error de red o de token de MP, lo relanzamos
            throw mpError
          }
        }
      }

      //  Actualizar en base de datos local (Pasa a CANCELLATION_PENDING)
      const updated = await this.prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLATION_PENDING,
          autoRenew: false,
        },
      })

      this.logger.log(
        `[Cancel OK] Suscripción ${subscription.id} marcada como CANCELLATION_PENDING`,
      )

      return {
        message: 'Suscripción cancelada correctamente',
        subscription: updated,
        benefitsActiveUntil: updated.endsAt,
      }
    } catch (error) {
      this.logger.error(`[Cancel Error] ${error.message}`, error.stack)
      throw error
    }
  }

  /**
   * ============================================================================
   * UPGRADE DE PLAN (RF-03)
   * ============================================================================
   */
  async upgradeSubscription(userId: string, newTier: SubscriptionTier) {
    try {
      const currentSubscription = await this.prisma.userSubscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
      })

      if (!currentSubscription) {
        throw new BadRequestException(
          'El usuario no tiene una suscripción activa para upgradear',
        )
      }

      const currentTierValue = this.pricingService.getTierValue(
        currentSubscription.tier,
      )
      const newTierValue = this.pricingService.getTierValue(newTier)

      if (newTierValue <= currentTierValue) {
        throw new BadRequestException(
          'Solo se permite upgrade a un tier superior',
        )
      }

      const currentPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier: currentSubscription.tier },
      })

      const { bonusCoins: estimatedBonusCoins } =
        this.pricingService.calculateUpgradeBonus(
          currentSubscription.endsAt,
          currentPlan?.basePriceARS ?? 0,
        )

      const checkoutResult = await this.startCheckout(userId, newTier, true)

      // Se lee recién con el primer cobro aprobado, que MP puede reintentar durante días
      await this.redis.redis.set(
        `subscription:upgrade:${checkoutResult.external_reference}`,
        currentSubscription.id,
        'EX',
        UPGRADE_LINK_TTL_SECONDS,
      )

      this.logger.log(
        `[Upgrade Init] User ${userId} solicitó pasar de ${currentSubscription.tier} a ${newTier}. Esperando pago...`,
      )

      return {
        init_point: checkoutResult.init_point,
        external_reference: checkoutResult.external_reference,
        new_tier: newTier,
        bonus_coins: estimatedBonusCoins,
        message: `Solicitud de upgrade a ${newTier} generada. Las ${estimatedBonusCoins} Chiqui-coins se acreditarán automáticamente cuando completes el pago.`,
      }
    } catch (error) {
      this.logger.error(`[Upgrade Error] ${error.message}`, error.stack)
      throw error
    }
  }

  /**
   * Manejar fallo de pago moviendo a GRACE_PERIOD.
   * Solo aplica a una suscripción ACTIVE (falló una renovación): una PENDING nunca
   * tuvo beneficios, y si pasara a GRACE_PERIOD el alta posterior no la reconocería.
   */
  private async handlePaymentFailure(externalReference: string) {
    // Con undefined, Prisma ignora el filtro y pasaría todas las ACTIVE a GRACE_PERIOD
    if (!externalReference) return

    const graceEndDate = new Date()
    graceEndDate.setHours(graceEndDate.getHours() + GRACE_PERIOD_HOURS)

    const { count } = await this.prisma.userSubscription.updateMany({
      where: {
        mpExternalRef: externalReference,
        status: SubscriptionStatus.ACTIVE,
      },
      data: {
        status: SubscriptionStatus.GRACE_PERIOD,
        endsAt: graceEndDate,
      },
    })

    if (count > 0) {
      this.logger.warn(
        `[Payment Failure] Suscripción con ref ${externalReference} movida a GRACE_PERIOD`,
      )
    }
  }
}
