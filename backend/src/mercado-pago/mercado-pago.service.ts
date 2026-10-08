import { Injectable, Logger } from '@nestjs/common'
import { MERCADO_PAGO_CONSTANTS } from 'src/subscriptions/constants/subscription.constants'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom, throwError, timer } from 'rxjs'
import { retry } from 'rxjs/operators'
import { AxiosResponse } from 'axios'
import { MercadoPagoPreapprovalPayload } from 'src/subscriptions'
import { MercadoPagoPreapprovalResponse } from 'src/subscriptions'

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name)

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) { }

  getMercadoPagoConfig() {
    return {
      FRONTEND_URL: this.configService.get<string>('FRONTEND_URL', { infer: true }) || 'https://chiquimafias.com',
      BACKEND_URL: this.configService.get<string>('API_BACKEND_URL', { infer: true }) || 'https://api.chiquimafias.com',
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
      FRONTEND_SUCCESS_URL: `${this.configService.get<string>('FRONTEND_URL', { infer: true })?.replace(/^\//, '') || ''}`,
      ...MERCADO_PAGO_CONSTANTS,
    }
  } 

  private get retryStrategy() {
    return retry({
      count: 3,
      delay: (error, retryCount) => {
        const status = error?.response?.status
        if (status && status >= 400 && status < 500) {
          return throwError(() => error)
        }
        this.logger.warn(
          `[MP API] Falla de red, reintentando request (intento ${retryCount})...`,
        )
        return timer(Math.pow(2, retryCount - 1) * 1000)
      },
    })
  }

  public async cancelPreapprovalInMercadoPago(preapprovalId: string) {
    try {
      const mpConfig = this.getMercadoPagoConfig()

      const response = (await firstValueFrom(
        this.http
          .put(
            `${mpConfig.API_BASE_URL}/preapproval/${preapprovalId}`,
            { status: 'cancelled' },
            {
              headers: {
                Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(this.retryStrategy),
      )) as AxiosResponse<any>

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

  public async getPaymentDetails(
    id: string | number,
    webhookType: string,
  ): Promise<any> {
    try {
      let endpoint = `/v1/payments/${id}`
      const mpConfig = this.getMercadoPagoConfig()

      if (webhookType === 'subscription_preapproval') {
        endpoint = `/preapproval/${id}`
      } else if (webhookType === 'subscription_authorized_payment') {
        endpoint = `/authorized_payments/${id}`
      }

      const response = (await firstValueFrom(
        this.http
          .get(`${mpConfig.API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}` },
          })
          .pipe(this.retryStrategy),
      )) as AxiosResponse<any>

      return response.data
    } catch (error) {
      const status = error.response?.status
      this.logger.error(
        `[MP API Error] No se pudieron obtener detalles para el ID ${id} (${webhookType})`,
        error.response?.data || error.message,
      )

      if (status && status >= 400 && status < 500) {
        return null
      }

      throw error
    }
  }

  public async getMerchantOrderDetails(id: string | number): Promise<any> {
    try {
      const mpConfig = this.getMercadoPagoConfig()

      const response = (await firstValueFrom(
        this.http
          .get(`${mpConfig.API_BASE_URL}/merchant_orders/${id}`, {
            headers: { Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}` },
          })
          .pipe(this.retryStrategy),
      )) as AxiosResponse<any>

      return response.data
    } catch (error) {
      const status = error.response?.status
      this.logger.error(
        `[MP API Error] No se pudieron obtener detalles de la orden de comercio ${id}`,
        error.response?.data || error.message,
      )

      if (status && status >= 400 && status < 500) {
        return null
      }

      throw error
    }
  }

  public async createPreapproval(payload: MercadoPagoPreapprovalPayload) {
    const mpConfig = this.getMercadoPagoConfig()

    const response = (await firstValueFrom(
      this.http
        .post<MercadoPagoPreapprovalResponse>(
          `${mpConfig.API_BASE_URL}${mpConfig.PREAPPROVAL_ENDPOINT}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(this.retryStrategy),
    )) as AxiosResponse<MercadoPagoPreapprovalResponse>

    return response.data
  }

  public async createPreference(payload: any) {
    const mpConfig = this.getMercadoPagoConfig();
    const response = (await firstValueFrom(
      this.http
        .post(`${mpConfig.API_BASE_URL}/checkout/preferences`, payload, {
          headers: {
            Authorization: `Bearer ${mpConfig.ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(this.retryStrategy),
    )) as AxiosResponse<any>;
    return response.data;
  }
}