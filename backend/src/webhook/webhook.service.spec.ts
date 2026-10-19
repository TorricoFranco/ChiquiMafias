import { Test, TestingModule } from '@nestjs/testing'
import { WebhookService } from './webhook.service'
import { SubscriptionCheckoutService } from 'src/subscriptions/subscription-checkout.service'
import { CoinShopService } from 'src/coin-shop/coin-shop.service'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { MercadoPagoWebhookPayload } from 'src/subscriptions/interfaces/mercado-pago.interface'
import { ConfigService } from '@nestjs/config'
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common'
import * as crypto from 'crypto'
import { safeEqual } from 'src/common/safe-equal'

// Se envuelve (no se reemplaza) para poder afirmar que la firma se decide con safeEqual.
jest.mock('src/common/safe-equal', () => {
  const actual = jest.requireActual<typeof import('src/common/safe-equal')>(
    'src/common/safe-equal',
  )
  return { safeEqual: jest.fn(actual.safeEqual) }
})

describe('WebhookService', () => {
  let service: WebhookService
  let mockCheckoutService: { processWebhook: jest.Mock }
  let mockCoinShopService: { processPaymentWebhook: jest.Mock }
  let mockMercadoPagoService: {
    getPaymentDetails: jest.Mock
    getMerchantOrderDetails: jest.Mock
  }
  let mockConfigService: { get: jest.Mock }

  const TEST_SECRET = 'super-secret-key'
  const MOCK_PAYLOAD = {
    type: 'subscription_authorized_payment',
    data: { id: '12345' },
  } as MercadoPagoWebhookPayload
  const X_REQUEST_ID = 'req-abc-999'
  const TS = '1715623000'

  beforeEach(async () => {
    ;(safeEqual as jest.Mock).mockClear()

    mockCheckoutService = {
      processWebhook: jest.fn().mockResolvedValue({ success: true }),
    }

    mockCoinShopService = {
      processPaymentWebhook: jest.fn().mockResolvedValue(true),
    }

    mockMercadoPagoService = {
      getPaymentDetails: jest.fn(),
      getMerchantOrderDetails: jest.fn(),
    }

    mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_SECRET),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: SubscriptionCheckoutService, useValue: mockCheckoutService },
        { provide: CoinShopService, useValue: mockCoinShopService },
        { provide: MercadoPagoService, useValue: mockMercadoPagoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<WebhookService>(WebhookService)
  })

  const generateSignature = (
    ts: string,
    dataId: string,
    requestId: string,
    secret: string,
  ) => {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const v1 = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex')
    return `ts=${ts},v1=${v1}`
  }

  it('debería lanzar UnauthorizedException si faltan los headers', async () => {
    await expect(service.processWebhook(MOCK_PAYLOAD, '', '')).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('debería lanzar UnauthorizedException si la firma es inválida', async () => {
    const signature = 'ts=123,v1=firma-falsa-que-no-coincide'
    await expect(
      service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('decide la firma con safeEqual (tiempo constante) y no con !==', async () => {
    const signature = generateSignature(
      TS,
      MOCK_PAYLOAD.data.id,
      X_REQUEST_ID,
      TEST_SECRET,
    )
    const v1 = signature.split('v1=')[1]

    await service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID)

    expect(safeEqual).toHaveBeenCalledWith(v1, v1)
  })

  it('debería rechazar si safeEqual dice que no coincide, aunque la firma sea válida', async () => {
    const signature = generateSignature(
      TS,
      MOCK_PAYLOAD.data.id,
      X_REQUEST_ID,
      TEST_SECRET,
    )
    ;(safeEqual as jest.Mock).mockReturnValueOnce(false)

    await expect(
      service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID),
    ).rejects.toThrow(UnauthorizedException)
    expect(mockCheckoutService.processWebhook).not.toHaveBeenCalled()
  })

  it('debería ignorar con 200 un evento sin data.id cuya firma no coincide, sin procesar nada', async () => {
    const payload = {
      type: 'topic_merchant_order_wh',
    } as MercadoPagoWebhookPayload

    const result = await service.processWebhook(
      payload,
      `ts=${TS},v1=firma-falsa`,
      X_REQUEST_ID,
    )

    expect(result).toEqual({
      status: 'ignored',
      message: 'Evento sin data.id no procesable',
    })
    expect(mockCheckoutService.processWebhook).not.toHaveBeenCalled()
    expect(mockCoinShopService.processPaymentWebhook).not.toHaveBeenCalled()
    expect(
      mockMercadoPagoService.getMerchantOrderDetails,
    ).not.toHaveBeenCalled()
  })

  it('debería rechazar una firma sin v1 aunque traiga ts', async () => {
    await expect(
      service.processWebhook(MOCK_PAYLOAD, `ts=${TS}`, X_REQUEST_ID),
    ).rejects.toThrow(UnauthorizedException)
    expect(mockCheckoutService.processWebhook).not.toHaveBeenCalled()
  })

  it('debería rechazar una v1 de otro largo, o que sea la correcta con un carácter cambiado', async () => {
    const valid = generateSignature(
      TS,
      MOCK_PAYLOAD.data.id,
      X_REQUEST_ID,
      TEST_SECRET,
    )
    const v1 = valid.split('v1=')[1]
    const lastChar = v1.endsWith('0') ? '1' : '0'
    const tampered = `ts=${TS},v1=${v1.slice(0, -1)}${lastChar}`
    const truncated = `ts=${TS},v1=${v1.slice(0, -2)}`

    for (const signature of [tampered, truncated]) {
      await expect(
        service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID),
      ).rejects.toThrow(UnauthorizedException)
    }
    expect(mockCheckoutService.processWebhook).not.toHaveBeenCalled()
  })

  it('debería rechazar una firma válida para otro request-id', async () => {
    const signature = generateSignature(
      TS,
      MOCK_PAYLOAD.data.id,
      'otro-request-id',
      TEST_SECRET,
    )
    await expect(
      service.processWebhook(MOCK_PAYLOAD, signature, X_REQUEST_ID),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('debería procesar el webhook correctamente si la firma es válida', async () => {
    const signature = generateSignature(
      TS,
      MOCK_PAYLOAD.data.id,
      X_REQUEST_ID,
      TEST_SECRET,
    )

    const result = await service.processWebhook(
      MOCK_PAYLOAD,
      signature,
      X_REQUEST_ID,
    )

    expect(result).toEqual({ success: true })
    expect(mockCheckoutService.processWebhook).toHaveBeenCalledWith(
      MOCK_PAYLOAD,
    )
  })

  it('debería mandar el pago de un pack de monedas al CoinShopService y no al checkout de suscripciones', async () => {
    const payload = {
      type: 'payment',
      data: { id: '777' },
    } as MercadoPagoWebhookPayload
    const paymentDetails = {
      status: 'approved',
      external_reference: 'coin_order_abc',
    }
    mockMercadoPagoService.getPaymentDetails.mockResolvedValue(paymentDetails)
    const signature = generateSignature(TS, '777', X_REQUEST_ID, TEST_SECRET)

    const result = await service.processWebhook(
      payload,
      signature,
      X_REQUEST_ID,
    )

    expect(result).toEqual({
      status: 'success',
      message: 'Orden de monedas procesada',
    })
    expect(mockCoinShopService.processPaymentWebhook).toHaveBeenCalledWith(
      paymentDetails,
    )
    expect(mockCheckoutService.processWebhook).not.toHaveBeenCalled()
  })

  it('debería mandar a CoinShopService el reembolso de un pack que llega por merchant_order', async () => {
    const payload = {
      type: 'merchant_order',
      data: { id: '888' },
    } as MercadoPagoWebhookPayload
    const refundedPayment = {
      id: 9,
      status: 'refunded',
      external_reference: 'coin_order_abc',
    }
    mockMercadoPagoService.getMerchantOrderDetails.mockResolvedValue({
      external_reference: 'coin_order_abc',
      payments: [{ id: 9, status: 'refunded' }],
    })
    mockMercadoPagoService.getPaymentDetails.mockResolvedValue(refundedPayment)
    const signature = generateSignature(TS, '888', X_REQUEST_ID, TEST_SECRET)

    await service.processWebhook(payload, signature, X_REQUEST_ID)

    expect(mockCoinShopService.processPaymentWebhook).toHaveBeenCalledWith(
      refundedPayment,
    )
  })

  it('debería lanzar InternalServerErrorException si el secret no está configurado', async () => {
    mockConfigService.get.mockReturnValueOnce(undefined)

    await expect(
      service.processWebhook(MOCK_PAYLOAD, 'cualquier-firma', X_REQUEST_ID),
    ).rejects.toThrow(InternalServerErrorException)
  })
})
