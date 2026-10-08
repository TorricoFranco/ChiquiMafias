import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { SubscriptionCheckoutService } from 'src/subscriptions/subscription-checkout.service'
import { CoinShopService } from 'src/coin-shop/coin-shop.service'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { MercadoPagoWebhookPayload } from 'src/subscriptions'

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)

  constructor(
    private readonly subscriptionCheckoutService: SubscriptionCheckoutService,
    private readonly coinShopService: CoinShopService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
  ) {}

  async processWebhook(
    payload: MercadoPagoWebhookPayload,
    xSignature: string,
    xRequestId: string,
    query?: any,
  ) {
    if (!xSignature || !xRequestId) {
      this.logger.warn('Intento de webhook sin headers de firma')
      throw new UnauthorizedException('Faltan headers de firma de Mercado Pago')
    }

    const signatureParts = xSignature.split(',')
    let ts = ''
    let v1 = ''

    for (const part of signatureParts) {
      const [key, value] = part.split('=')
      if (key === 'ts') ts = value
      if (key === 'v1') v1 = value
    }

    const dataId =
      query?.['data.id'] ?? query?.id ?? payload?.data?.id ?? undefined

    this.logger.debug(
      `[Webhook] dataId usado para firma: ${dataId} (query: ${query?.['data.id'] ?? query?.id}, body: ${payload?.data?.id})`,
    )

    // Eventos tipo topic_merchant_order_wh u otros sin ID no se validan
    // con la misma plantilla: se ignoran con 200 para no romper el endpoint.
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    const secret = this.configService.get<string>('MERCADO_PAGO_WEBHOOK_SECRET')

    if (!secret) {
      this.logger.error(
        'MP_WEBHOOK_SECRET no está definido en las variables de entorno',
      )
      throw new InternalServerErrorException(
        'Configuración de seguridad faltante',
      )
    }

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex')

    if (hmac !== v1) {
      // Eventos sin data.id (ej: topic_merchant_order_wh) no usan esta plantilla
      if (!dataId) {
        this.logger.warn(
          `[Webhook] Evento sin data.id recibido (type: ${payload?.type}). Ignorado con 200.`,
        )
        return {
          status: 'ignored',
          message: 'Evento sin data.id no procesable',
        }
      }
      this.logger.error(
        `[Security] Firma de Webhook inválida. RequestID: ${xRequestId}, type: ${payload?.type}, dataId: ${dataId}`,
      )
      throw new UnauthorizedException('Firma de webhook inválida')
    }

    try {
      if (payload.type === 'payment' && dataId) {
        this.logger.log(`Obteniendo detalles de pago para ID: ${dataId}...`)
        const paymentDetails = await this.mercadoPagoService.getPaymentDetails(
          dataId,
          'payment',
        )
        if (
          paymentDetails &&
          paymentDetails.external_reference?.startsWith('coin_order_')
        ) {
          this.logger.log(
            `Webhook de pago de pack de monedas detectado. Procesando...`,
          )
          await this.coinShopService.processPaymentWebhook(paymentDetails)
          return { status: 'success', message: 'Orden de monedas procesada' }
        }
      }

      // Los packs de monedas (checkout por preferencia) disparan eventos de
      // "órdenes de comercio" (topic_merchant_order_wh) en vez de "payment".
      // Hay que resolver la orden y procesar cada pago aprobado de ahí.
      if (
        (payload.type === 'topic_merchant_order_wh' ||
          payload.type === 'merchant_order') &&
        dataId
      ) {
        this.logger.log(
          `Evento de orden de comercio recibido (ID: ${dataId}). Resolviendo pagos...`,
        )
        const merchantOrder =
          await this.mercadoPagoService.getMerchantOrderDetails(dataId)

        if (!merchantOrder || !Array.isArray(merchantOrder.payments)) {
          this.logger.warn(
            `Orden de comercio ${dataId} no encontrada o sin pagos. Ignorado.`,
          )
          return { status: 'ignored', message: 'Orden de comercio sin pagos' }
        }

        let processed = 0

        for (const merchantPayment of merchantOrder.payments) {
          if (!merchantPayment?.id) continue
          // Solo procesar pagos aprobados/procesados/autorizados
          if (
            !['approved', 'processed', 'authorized'].includes(
              merchantPayment.status,
            )
          ) {
            continue
          }

          const paymentDetails =
            await this.mercadoPagoService.getPaymentDetails(
              merchantPayment.id,
              'payment',
            )

          if (
            paymentDetails &&
            (paymentDetails.external_reference?.startsWith('coin_order_') ||
              merchantOrder.external_reference?.startsWith('coin_order_')) &&
            ['approved', 'processed', 'authorized'].includes(
              paymentDetails.status,
            )
          ) {
            this.logger.log(
              `Pago de orden de monedas encontrado en orden de comercio ${dataId}. Procesando...`,
            )
            await this.coinShopService.processPaymentWebhook({
              ...paymentDetails,
              external_reference:
                paymentDetails.external_reference ??
                merchantOrder.external_reference,
            })
            processed++
          }
        }

        return {
          status: 'success',
          message:
            processed > 0
              ? 'Órdenes de monedas procesadas'
              : 'Sin órdenes de monedas procesables',
        }
      }

      this.logger.log(
        `Webhook validado. Delegando al SubscriptionCheckoutService...`,
      )
      return await this.subscriptionCheckoutService.processWebhook(payload)
    } catch (error) {
      this.logger.error(
        `[Webhook Error] Fallo al procesar webhook ${xRequestId}: ${error.message}`,
        error.stack,
      )
      throw new InternalServerErrorException(
        'Error al procesar el webhook, reintentando...',
      )
    }
  }
}
