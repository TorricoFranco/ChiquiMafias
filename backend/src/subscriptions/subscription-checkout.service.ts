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
  COINS_PER_DAY_UPGRADE,
  MERCADO_PAGO_CONSTANTS,
} from './constants/subscription.constants'

import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

import {
  MercadoPagoPreapprovalPayload,
  MercadoPagoWebhookPayload,
} from './interfaces/mercado-pago.interface'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'

import { RedisService } from '../redis/redis.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'

@Injectable()
export class SubscriptionCheckoutService {
  private readonly logger = new Logger(SubscriptionCheckoutService.name)

  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) { }

  private getMercadoPagoConfig() {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', {
      infer: true,
    })

    return {
      API_BASE_URL: this.configService.get<string>('MERCADO_PAGO_API_URL', {
        infer: true,
      }),
      ACCESS_TOKEN: this.configService.get<string>(
        'MERCADO_PAGO_ACCESS_TOKEN',
        { infer: true },
      ),
      WEBHOOK_URL: this.configService.get<string>('MERCADO_PAGO_WEBHOOK_URL', {
        infer: true,
      }),
      FRONTEND_SUCCESS_URL: `${frontendUrl}/${this.configService.get<string>('FRONTEND_SUCCESS_URL', { infer: true })}`,
      ...MERCADO_PAGO_CONSTANTS,
    }
  }

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

      // NUEVA COMPRA vs UPGRADE

      if (!isUpgrade) {
        // FLUJO NORMAL: Si es nueva, NO debe tener una suscripción activa
        const existingActive = await this.prisma.userSubscription.findFirst({
          where: { userId, status: SubscriptionStatus.ACTIVE },
        })

        if (existingActive) {
          throw new ConflictException(
            'Ya posees una suscripción activa. Usa el flujo de Upgrade o cancela la actual.',
          )
        }
      } else {
        // FLUJO UPGRADE: Si es upgrade, SÍ O SÍ debe tener una suscripción activa
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
      const mpConfig = this.getMercadoPagoConfig()

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
        payload.type !== 'subscription_preapproval' && // 👈 Agregado
        payload.type !== 'subscription_authorized_payment' // 👈 Agregado
      ) {
        this.logger.warn(`[Webhook] Evento no procesable: ${payload.type}`)
        return { status: 'ignored', message: 'Evento no aplicable' }
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
          await this.mercadoPagoService.getPaymentDetails(
            paymentId,
            payload.type,
          )

        if (preapprovalDetails?.status === 'cancelled') {
          // 2. Buscamos la suscripción en nuestra DB local
          const localSub = await this.prisma.userSubscription.findFirst({
            where: {
              mpPreapprovalId: paymentId,
              status: SubscriptionStatus.ACTIVE,
            },
          })

          if (localSub) {
            // 3. La pasamos a CANCELLATION_PENDING igual que si hubiera tocado el botón en tu app
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

        // Si viene en otro estado (ej: "authorized" al crearse), dejamos que siga el flujo normal
      }

      // Protección contra Replay Attacks (Acá sigue tu código de siempre para los PAGOS)
      const isAlreadyProcessed = await this.prisma.processedPayment.findUnique({
        where: { paymentId: String(paymentId) },
        // Nota: Asegurate de parsearlo a String o Number según cómo esté definido en tu schema.prisma
      })

      if (isAlreadyProcessed) {
        this.logger.warn(
          `[Webhook Replay Prevention] Pago ${paymentId} ya fue procesado`,
        )
        return { status: 'idempotent', message: 'Pago ya fue procesado' }
      }

      // Obtener detalles del pago
      const paymentDetails = await this.mercadoPagoService.getPaymentDetails(
        paymentId,
        payload.type,
      )
      if (!paymentDetails) {
        throw new InternalServerErrorException(
          'No se pudo obtener detalles del pago',
        )
      }

      // Validar estado aprobado
      if (
        paymentDetails.status !== 'approved' &&
        paymentDetails.status !== 'authorized' &&
        paymentDetails.status !== 'processed'
      ) {
        this.logger.warn(
          `[Webhook] Pago ${paymentId} no aprobado. Status: ${paymentDetails.status}`,
        )
        await this.handlePaymentFailure(paymentDetails.external_reference)
        return {
          status: 'failed',
          message: `Pago en estado ${paymentDetails.status}`,
        }
      }

      //  Buscar la nueva suscripción (la que se acaba de pagar)
      const subscription = await this.prisma.userSubscription.findFirst({
        where: { mpExternalRef: paymentDetails.external_reference },
        include: {
          user: true,
        },
      })

      if (!subscription) {
        throw new BadRequestException(
          `No existe suscripción con external_reference ${paymentDetails.external_reference}`,
        )
      }

      const upgradeOldSubId = await this.redis.redis.get(
        `subscription:upgrade:${paymentDetails.external_reference}`,
      )

      let oldPreapprovalIdToCancel: string | null = null

      // TRANSACCIÓN ATÓMICA
      const result = await this.prisma.$transaction(async (tx) => {
        // Registrar el ID del pago en la base de datos para asegurar idempotencia
        await tx.processedPayment.create({
          data: { paymentId: paymentId },
        })

        const updatedSubscription = await tx.userSubscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.ACTIVE },
        })

        // Sincronizar el nuevo tier en el usuario
        const updatedUser = await tx.user.update({
          where: { id: subscription.userId },
          data: { activeSubscriptionTier: subscription.tier },
          include: { wallet: true },
        })

        // Impactar ítems / beneficios de inventario
        const dbPlan = await tx.subscriptionPlan.findUnique({
          where: { tier: subscription.tier },
        })

        const benefits = dbPlan?.benefits || []

        for (const benefit of benefits) {
          await tx.userInventory.upsert({
            where: {
              userId_itemId: { userId: subscription.userId, itemId: benefit },
            },
            update: { quantity: { increment: 1 } },
            create: {
              userId: subscription.userId,
              itemId: benefit,
              quantity: 1,
            },
          })
        }

        // Registrar transacción base de Mercado Pago
        await tx.coinTransaction.create({
          data: {
            walletId: updatedUser.wallet?.id || '',
            amount: 0,
            type: TransactionType.MERCADO_PAGO_BUY,
            description: `Suscripción ${subscription.tier} - Pago MP ${paymentId}`,
            referenceId: paymentDetails.external_reference,
          },
        })

        // 💡 LÓGICA EXCLUSIVA DE UPGRADE (DENTRO DE LA TRANSACCIÓN)
        if (upgradeOldSubId) {
          const oldSub = await tx.userSubscription.findUnique({
            where: { id: upgradeOldSubId },
          })

          // Doble verificación: que exista y siga activa para evitar doble reclamo
          if (oldSub && oldSub.status === SubscriptionStatus.ACTIVE) {
            const { daysRemaining, bonusCoins } =
              this.pricingService.calculateUpgradeBonus(oldSub.endsAt)
            if (bonusCoins > 0) {
              const updatedWallet = await tx.wallet.update({
                where: { userId: subscription.userId },
                data: { balance: { increment: bonusCoins } },
              })

              await tx.coinTransaction.create({
                data: {
                  walletId: updatedWallet.id,
                  amount: bonusCoins,
                  type: TransactionType.ADMIN_GIFT,
                  description: `Bono de upgrade: ${daysRemaining} días restantes × ${COINS_PER_DAY_UPGRADE} coins`,
                  referenceId: oldSub.id,
                },
              })
            }

            // Pisamos el estado de la vieja a EXPIRED para que quede inactiva localmente
            await tx.userSubscription.update({
              where: { id: oldSub.id },
              data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
            })

            // Guardamos el ID de MP para destruirlo afuera del bloque transaccional
            if (oldSub.mpPreapprovalId) {
              oldPreapprovalIdToCancel = oldSub.mpPreapprovalId
            }
          }

          // Limpiar la referencia de upgrade en Redis
          await this.redis.redis.del(
            `subscription:upgrade:${paymentDetails.external_reference}`,
          )
        }

        return { subscription: updatedSubscription, user: updatedUser }
      })

      // 8. 💡 FUERA DE LA TRANSACCIÓN: Dar de baja el debito automático viejo en Mercado Pago
      if (oldPreapprovalIdToCancel) {
        try {
          await this.mercadoPagoService.cancelPreapprovalInMercadoPago(
            oldPreapprovalIdToCancel,
          )
          this.logger.log(
            `[Webhook Upgrade] Suscripción MP anterior ${oldPreapprovalIdToCancel} cancelada con éxito.`,
          )
        } catch (mpError) {
          // Si MP falla acá no pasa nada grave, el usuario ya tiene su estado perfecto en la DB local.
          // Queda registrado en logs para revisarlo manualmente si hiciera falta.
          this.logger.error(
            `[Webhook Upgrade Warning] No se pudo cancelar en MP la suscripción vieja ${oldPreapprovalIdToCancel}. Requiere cancelación manual.`,
            mpError.stack,
          )
        }
      }

      this.logger.log(
        `[Webhook OK] Proceso completado para suscripción ${subscription.id}`,
      )
      return {
        status: 'success',
        message: 'Pago procesado y beneficios aplicados correctamente.',
        subscription: result.subscription,
      }
    } catch (error) {
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
          createdAt: 'desc', // 👈 Nos asegura agarrar el Tier real actual
        },
        include: { user: true },
      })

      if (!subscription) {
        throw new BadRequestException(
          'El usuario no tiene suscripción activa para cancelar',
        )
      }

      // 2. Llamar a Mercado Pago para cancelar la preapproval
      if (subscription.mpPreapprovalId) {
        try {
          await this.mercadoPagoService.cancelPreapprovalInMercadoPago(
            subscription.mpPreapprovalId,
          )
        } catch (mpError: any) {
          // 💡 SI MERCADO PAGO DICE QUE YA ESTÁ CANCELADA, NO ROMPEMOS EL FLUJO.
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

      // 3. Actualizar en base de datos local (Pasa a CANCELLATION_PENDING)
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
      // Validar que el usuario tenga una suscripción ACTIVE actual
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

      const { bonusCoins: estimatedBonusCoins } =
        this.pricingService.calculateUpgradeBonus(currentSubscription.endsAt)

      // Iniciamos el checkout pasando "true" como tercer parámetro (isUpgrade)
      const checkoutResult = await this.startCheckout(userId, newTier, true)

      //  Guardamos el puente en Redis para el Webhook
      await this.redis.redis.set(
        `subscription:upgrade:${checkoutResult.external_reference}`,
        currentSubscription.id,
        'EX',
        3600,
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
   * Manejar fallo de pago moviendo a GRACE_PERIOD
   */
  private async handlePaymentFailure(externalReference: string) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { mpExternalRef: externalReference },
    })

    if (subscription) {
      const graceEndDate = new Date()
      graceEndDate.setHours(graceEndDate.getHours() + GRACE_PERIOD_HOURS)

      await this.prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.GRACE_PERIOD,
          endsAt: graceEndDate,
        },
      })

      this.logger.warn(
        `[Payment Failure] Suscripción ${subscription.id} movida a GRACE_PERIOD`,
      )
    }
  }
}
