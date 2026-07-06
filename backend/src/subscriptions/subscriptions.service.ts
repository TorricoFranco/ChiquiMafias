import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Logger,
  HttpException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import {
  SubscriptionTier,
  SubscriptionStatus,
  TransactionType,
  UserSubscription,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import {
  WEEKEND_DISCOUNT_PERCENTAGE,
  SUBSCRIPTION_CYCLE_DAYS,
  GRACE_PERIOD_HOURS,
  MERCADO_PAGO_CONFIG,
  COINS_PER_DAY_UPGRADE,
} from './constants/subscription.constants'

import {
  MercadoPagoPreapprovalPayload,
  MercadoPagoPreapprovalResponse,
  MercadoPagoWebhookPayload,
  MercadoPagoPaymentDetails,
  SubscriptionPricingModel,
} from './interfaces/mercado-pago.interface'

import { SubscriptionDetailResponseDto } from './dto/subscription-response.dto'

import { firstValueFrom } from 'rxjs'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly wallet: WalletService,
    private readonly redis: RedisService,
  ) {}

  /**
   * ============================================================================
   * CÁLCULO DE PRECIOS DINÁMICOS REFACTORIZADO
   * ============================================================================
   * Recibe el plan directo de la DB para evitar llamadas redundantes en bucles.
   */
  private calculateCurrentPrice(
    // plan: SubscriptionPlan,
    plan: any,
  ): SubscriptionPricingModel {
    const basePrice = plan.basePriceARS

    const now = new Date()
    const dayOfWeek = now.getDay()

    // Verificar si es fin de semana (viernes 5, sábado 6, domingo 0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    const hasActivePromotion = false

    const shouldApplyDiscount = isWeekend || hasActivePromotion
    const discountPercentage = shouldApplyDiscount
      ? WEEKEND_DISCOUNT_PERCENTAGE
      : 0

    const discountAmount = (basePrice * discountPercentage) / 100
    const finalPrice = Math.ceil(basePrice - discountAmount)

    return {
      basePriceARS: basePrice,
      discountedPriceARS: finalPrice,
      discountPercentage,
      isWeekend,
      currency: MERCADO_PAGO_CONFIG.CURRENCY,
      appliedAt: now,
    }
  }

  /**
   * ============================================================================
   * OBTENER GRILLA DE PLANES (INFORMATIVO FRONTEND)
   * ============================================================================
   * Trae todos los planes activos de la DB, les calcula el precio dinámico hoy
   * y les inyecta los beneficios del inventario más el estado del usuario.
   */
  async getPlans(currentUserTier: SubscriptionTier | null) {
    try {
      const activePlans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { basePriceARS: 'asc' },
      })

      return activePlans.map((plan) => {
        const pricing = this.calculateCurrentPrice(plan)

        return {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          benefits: plan.benefits, // 👈 Ahora viene directo de la DB
          pricing,
          isCurrent: currentUserTier === plan.tier,
        }
      })
    } catch (error) {
      this.logger.error(`[GetPlans Error] ${error.message}`, error.stack)
      throw new InternalServerErrorException(
        'Error al recuperar la grilla de planes',
      )
    }
  }

  /**
   * ============================================================================
   * CHECKOUT / ALTA DE SUSCRIPCIÓN (RF-01)
   * ============================================================================
   * Inicia el flujo de compra generando un link de Preapproval en Mercado Pago
   */
  // 💡 Agregamos isUpgrade = false por defecto
  async startCheckout(
    userId: string,
    tier: SubscriptionTier,
    isUpgrade = false,
  ) {
    try {
      // 1. 🛑 Validar activo SÓLO si NO es un upgrade
      if (!isUpgrade) {
        const existingActive = await this.prisma.userSubscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
          },
        })

        if (existingActive) {
          throw new ConflictException(
            'El usuario ya posee una suscripción activa. Upgradea o cancelá la actual.',
          )
        }
      }

      // 2. Obtener datos del usuario
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new BadRequestException('Usuario no encontrado')
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier },
      })

      if (!plan || !plan.isActive) {
        throw new BadRequestException('El plan seleccionado no está disponible')
      }

      if (plan.basePriceARS === 0) {
        throw new BadRequestException(
          'El plan Popular es gratuito, no requiere checkout de Mercado Pago',
        )
      }

      const pricing = this.calculateCurrentPrice(plan)

      // 4. Generar referencias internas
      const mpExternalRef = randomUUID()

      // 5. Preparar payload para Mercado Pago
      const now = new Date()
      const futureStartDate = new Date(now.getTime() + 5 * 60 * 1000)
      const startDate = futureStartDate.toISOString()

      const endDate = new Date(
        now.getTime() + SUBSCRIPTION_CYCLE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString()

      const backUrl = MERCADO_PAGO_CONFIG.FRONTEND_SUCCESS_URL

      const mpPayload: MercadoPagoPreapprovalPayload = {
        reason: `Suscripción ${tier} - ERS Chiquimafías`,
        external_reference: mpExternalRef,
        payer_email: user.email,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: pricing.discountedPriceARS,
          currency_id: MERCADO_PAGO_CONFIG.CURRENCY,
          start_date: startDate,
        },
      }

      // 6. Llamar a Mercado Pago API
      this.logger.debug(
        `[MP Request] Preapproval para usuario ${user.email} tier ${tier}`,
      )

      const response = await firstValueFrom(
        this.http.post<MercadoPagoPreapprovalResponse>(
          `${MERCADO_PAGO_CONFIG.API_BASE_URL}${MERCADO_PAGO_CONFIG.PREAPPROVAL_ENDPOINT}`,
          mpPayload,
          {
            headers: {
              Authorization: `Bearer ${MERCADO_PAGO_CONFIG.ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      )

      const mpInitPoint = response.data.init_point
      const mpPreapprovalId = response.data.id

      // 7. Guardar en base de datos (estado temporal PENDING)
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

      // 8. Guardar en Redis para idempotencia futura
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
      if (error instanceof HttpException) {
        throw error
      }

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
      throw error
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

      // 1. Filtrar por los tipos reales que te manda MP para suscripciones
      if (
        payload.type !== 'payment' &&
        payload.type !== 'preapproval_payment' &&
        payload.type !== 'subscription_preapproval' && // 👈 Agregado
        payload.type !== 'subscription_authorized_payment' // 👈 Agregado
      ) {
        this.logger.warn(`[Webhook] Evento no procesable: ${payload.type}`)
        return { status: 'ignored', message: 'Evento no aplicable' }
      }

      // El data.id en 'subscription_authorized_payment' es el ID del cobro recurrente.
      const paymentId = payload.data?.id
      if (!paymentId) {
        throw new BadRequestException(
          'No se encontró ID de datos en el webhook',
        )
      }

      // 🛑 🔥 NUEVO: INTERCEPTAR CAMBIOS DE ESTADO DE LA SUSCRIPCIÓN DESDE MP
      if (payload.type === 'subscription_preapproval') {
        this.logger.log(
          `[Webhook MP] Procesando actualización externa de suscripción: ${paymentId}`,
        )

        // 1. Buscamos los detalles de la preapproval en MP para saber su estado real
        const preapprovalDetails = await this.getPaymentDetails(
          paymentId,
          payload.type,
        )
        // (Asumo que tu getPaymentDetails le pega a /preapproval/${id} cuando el tipo es ese)

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

      // 2. Protección contra Replay Attacks (Acá sigue tu código de siempre para los PAGOS)
      const redisKey = `payment:processed:${paymentId}`
      const isAlreadyProcessed = await this.redis.redis.get(redisKey)

      if (isAlreadyProcessed) {
        this.logger.warn(
          `[Webhook Replay Prevention] Pago ${paymentId} ya fue procesado`,
        )
        return { status: 'idempotent', message: 'Pago ya fue procesado' }
      }

      // 3. Obtener detalles del pago
      const paymentDetails = await this.getPaymentDetails(
        paymentId,
        payload.type,
      )
      if (!paymentDetails) {
        throw new InternalServerErrorException(
          'No se pudo obtener detalles del pago',
        )
      }

      // 4. Validar estado aprobado
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

      // 5. Buscar la nueva suscripción (la que se acaba de pagar)
      const subscription = await this.prisma.userSubscription.findFirst({
        where: { mpExternalRef: paymentDetails.external_reference },
        include: {
          user: true,
          // Asumiendo que tenés la relación al plan en tu modelo UserSubscription,
          // o podés buscarlo directamente abajo por el tier.
        },
      })

      if (!subscription) {
        throw new BadRequestException(
          `No existe suscripción con external_reference ${paymentDetails.external_reference}`,
        )
      }

      // 6. 💡 VERIFICAR SI ESTE PAGO CORRESPONDE A UN UPGRADE
      const upgradeOldSubId = await this.redis.redis.get(
        `subscription:upgrade:${paymentDetails.external_reference}`,
      )

      let oldPreapprovalIdToCancel: string | null = null

      // 7. TRANSACCIÓN ATÓMICA
      const result = await this.prisma.$transaction(async (tx) => {
        // Bloquear ID de pago en Redis
        await this.redis.redis.set(redisKey, 'true', 'EX', 7 * 24 * 3600)

        // Activar la nueva suscripción
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
            const now = new Date()
            const msRemaining = oldSub.endsAt.getTime() - now.getTime()
            const daysRemaining = Math.max(
              0,
              Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
            )

            // Calcular y otorgar monedas de regalo
            const bonusCoins = daysRemaining * COINS_PER_DAY_UPGRADE

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
          await this.cancelPreapprovalInMercadoPago(oldPreapprovalIdToCancel)
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
   * OBTENER DETALLES DE PAGO DESDE MERCADO PAGO
   * ============================================================================
   */
  private async getPaymentDetails(
    id: string | number,
    webhookType: string,
  ): Promise<any> {
    try {
      // Por defecto asumimos que es un pago normal
      let endpoint = `/v1/payments/${id}`

      // Si el evento es de la suscripción global, el endpoint cambia
      if (webhookType === 'subscription_preapproval') {
        endpoint = `/preapproval/${id}`
      } else if (webhookType === 'subscription_authorized_payment') {
        endpoint = `/authorized_payments/${id}`
      }

      const response = await firstValueFrom(
        this.http.get(`${MERCADO_PAGO_CONFIG.API_BASE_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${MERCADO_PAGO_CONFIG.ACCESS_TOKEN}`,
          },
        }),
      )

      return response.data
    } catch (error) {
      this.logger.error(
        `[MP API Error] No se pudieron obtener detalles para el ID ${id} (${webhookType})`,
        error.response?.data || error.message,
      )
      return null
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
      // 1. 🔥 Traemos la suscripción ACTIVE, pero ordenada por la más nueva (desc)
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
          await this.cancelPreapprovalInMercadoPago(
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
   * CANCELAR PREAPPROVAL EN MERCADO PAGO
   * ============================================================================
   */
  private async cancelPreapprovalInMercadoPago(preapprovalId: string) {
    try {
      const response = await firstValueFrom(
        this.http.put(
          `${MERCADO_PAGO_CONFIG.API_BASE_URL}/preapproval/${preapprovalId}`,
          { status: 'cancelled' },
          {
            headers: {
              Authorization: `Bearer ${MERCADO_PAGO_CONFIG.ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      )

      this.logger.log(`[MP Cancel] Preapproval ${preapprovalId} cancelada`)
      return response.data
    } catch (error) {
      this.logger.error(
        `[MP API Error] Fallo cancelando preapproval ${preapprovalId}`,
        error.response?.data || error.message,
      )
      throw error
    }
  }

  /**
   * ============================================================================
   * UPGRADE DE PLAN (RF-03) - CORREGIDO CON ESTIMACIÓN PARA EL DTO
   * ============================================================================
   */
  async upgradeSubscription(userId: string, newTier: SubscriptionTier) {
    try {
      // 1. Validar que el usuario tenga una suscripción ACTIVE actual
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

      const currentTierValue = this.getTierValue(currentSubscription.tier)
      const newTierValue = this.getTierValue(newTier)

      if (newTierValue <= currentTierValue) {
        throw new BadRequestException(
          'Solo se permite upgrade a un tier superior',
        )
      }

      // 💡 2. CALCULAMOS LAS MONEDAS ESTIMADAS SÓLO PARA DEVOLVER AL FRONT
      const now = new Date()
      const msRemaining = currentSubscription.endsAt.getTime() - now.getTime()
      const daysRemaining = Math.max(
        0,
        Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
      )
      const estimatedBonusCoins = daysRemaining * COINS_PER_DAY_UPGRADE

      // 3. 🔥 Iniciamos el checkout pasando "true" como tercer parámetro (isUpgrade)
      const checkoutResult = await this.startCheckout(userId, newTier, true)

      // 4. Guardamos el puente en Redis para el Webhook
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
   * ============================================================================
   * OBTENER DETALLES DE SUSCRIPCIÓN ACTUAL
   * ============================================================================
   */
  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionDetailResponseDto> {
    // 1. Buscamos el usuario para saber su tier real e impactado actualmente
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true },
    })

    // 2. Buscamos primero si tiene algo corriendo (ACTIVE o CANCELLATION_PENDING)
    let subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELLATION_PENDING,
          ],
        },
      },
    })

    if (!subscription) {
      subscription = await this.prisma.userSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!subscription) {
      return {
        currentActualTier: user?.activeSubscriptionTier || null,
        id: null,
        tier: null,
        status: null,
        startsAt: null,
        endsAt: null,
        autoRenew: null,
      }
    }

    return {
      currentActualTier: user?.activeSubscriptionTier || null,
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      autoRenew: subscription.autoRenew,
      mpPreapprovalId: subscription.mpPreapprovalId ?? undefined,
      mpExternalRef: subscription.mpExternalRef ?? undefined,
    }
  }

  /**
   * ============================================================================
   * UTILIDADES PRIVADAS
   * ============================================================================
   */

  /**
   * Obtener valor numérico del tier para comparaciones
   */
  private getTierValue(tier: SubscriptionTier): number {
    const tierMap: Record<SubscriptionTier, number> = {
      TIER_1: 1,
      TIER_2: 2,
      TIER_3: 3,
    }
    return tierMap[tier]
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

  /**
   * ============================================================================
   * ACTUALIZAR PRECIO BASE DE UN PLAN (ADMIN ONLY)
   * ============================================================================
   */
  async updatePlanPrice(tier: SubscriptionTier, basePriceARS: number) {
    try {
      // Verificamos si el plan existe antes de actualizar
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier },
      })

      if (!plan) {
        throw new BadRequestException(
          `No se encontró el plan para el tier ${tier}`,
        )
      }

      // Actualizamos el precio
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { tier },
        data: { basePriceARS },
      })

      this.logger.log(
        `[Admin] Precio del plan ${tier} actualizado a $${basePriceARS} ARS`,
      )

      return {
        message: `Precio del plan ${tier} actualizado con éxito.`,
        plan: updatedPlan,
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error

      this.logger.error(`[UpdatePlanPrice Error] ${error.message}`, error.stack)
      throw new InternalServerErrorException(
        'Error al actualizar el precio del plan',
      )
    }
  }
}
