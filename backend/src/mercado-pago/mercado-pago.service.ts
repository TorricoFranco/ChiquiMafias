import { Injectable, Logger } from '@nestjs/common'
import { MERCADO_PAGO_CONSTANTS } from 'src/subscriptions/constants/subscription.constants'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { MercadoPagoPreapprovalPayload } from 'src/subscriptions'
import { MercadoPagoPreapprovalResponse } from 'src/subscriptions'

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name)

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  getMercadoPagoConfig() {
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
   * CANCELAR PREAPPROVAL EN MERCADO PAGO
   */
  public async cancelPreapprovalInMercadoPago(preapprovalId: string) {
    try {
      const mpConfig = this.getMercadoPagoConfig()

      const response = await firstValueFrom(
        this.http.put(
          `${mpConfig.API_BASE_URL}/preapproval/${preapprovalId}`,
          { status: 'cancelled' },
          {
            headers: {
              Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
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
   * OBTENER DETALLES DE PAGO DESDE MERCADO PAGO
   * ============================================================================
   */
  public async getPaymentDetails(
    id: string | number,
    webhookType: string,
  ): Promise<any> {
    try {
      // Por defecto asumimos que es un pago normal
      let endpoint = `/v1/payments/${id}`
      const mpConfig = this.getMercadoPagoConfig()

      // Si el evento es de la suscripción global, el endpoint cambia
      if (webhookType === 'subscription_preapproval') {
        endpoint = `/preapproval/${id}`
      } else if (webhookType === 'subscription_authorized_payment') {
        endpoint = `/authorized_payments/${id}`
      }

      const response = await firstValueFrom(
        this.http.get(`${mpConfig.API_BASE_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
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

  public async createPreapproval(payload: MercadoPagoPreapprovalPayload) {
    const mpConfig = this.getMercadoPagoConfig()

    const response = await firstValueFrom(
      this.http.post<MercadoPagoPreapprovalResponse>(
        `${mpConfig.API_BASE_URL}${mpConfig.PREAPPROVAL_ENDPOINT}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    return response.data // TypeScript ahora reconocerá el tipo aquí
  }
}
