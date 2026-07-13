import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { SubscriptionCheckoutService } from 'src/subscriptions/subscription-checkout.service'
import { MercadoPagoWebhookPayload } from 'src/subscriptions'

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)

  constructor(
    private readonly subscriptionCheckoutService: SubscriptionCheckoutService,
    private readonly configService: ConfigService,
  ) { }

  async processWebhook(
    payload: MercadoPagoWebhookPayload,
    xSignature: string,
    xRequestId: string,
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

    const dataId = payload.data?.id
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
      .createHmac('sha256', secret) // Ahora 'secret' es string garantizado
      .update(manifest)
      .digest('hex')

    if (hmac !== v1) {
      this.logger.error(
        `[Security] Firma de Webhook inválida. RequestID: ${xRequestId}, - ${secret}`,
      )
      throw new UnauthorizedException('Firma de webhook inválida')
    }

    try {
      this.logger.log(`Webhook validado. Delegando al SubscriptionService...`)
      return await this.subscriptionCheckoutService.processWebhook(payload)
    } catch (error) {
      this.logger.error(
        `[Webhook Error] Fallo al procesar webhook ${xRequestId}: ${error.message}`,
        error.stack,
      )

      //  NestJS va a devolver 500 a Mercado Pago
      throw new InternalServerErrorException(
        'Error al procesar el webhook, reintentando...',
      )
    }
  }
}
