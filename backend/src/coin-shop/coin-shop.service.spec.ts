import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CoinShopService } from './coin-shop.service'
import { PrismaService } from '../prisma/prisma.service'
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service'
import { WalletService } from '../wallet/wallet.service'

describe('CoinShopService', () => {
  let service: CoinShopService

  const pack = {
    id: 'pack-1',
    name: 'Pack Ascenso por decreto',
    coinsAmount: 20000,
    bonusCoins: 5000,
    priceARS: 10000,
    isActive: true,
  }

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    coinPack: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    coinOrder: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    processedPayment: { create: jest.fn(), findUnique: jest.fn() },
  }

  const mockMercadoPagoService = {
    getMercadoPagoConfig: jest.fn(),
    createPreference: jest.fn(),
  }

  const mockWalletService = {
    addCoins: jest.fn(),
    debitUpTo: jest.fn(),
    syncBalanceCache: jest.fn(),
  }

  const addCoinsCall = () =>
    mockWalletService.addCoins.mock.calls[0] as [
      Record<string, unknown>,
      unknown,
    ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinShopService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MercadoPagoService, useValue: mockMercadoPagoService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<CoinShopService>(CoinShopService)

    jest.clearAllMocks()
    mockPrisma.coinPack.findUnique.mockResolvedValue(pack)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'hincha@chiquimafias.test',
    })
    mockPrisma.coinOrder.create.mockResolvedValue({ id: 'order-1' })
    mockMercadoPagoService.getMercadoPagoConfig.mockReturnValue({
      FRONTEND_URL: 'http://localhost:3005',
      WEBHOOK_URL: 'http://localhost:3007/webhook',
    })
    mockMercadoPagoService.createPreference.mockResolvedValue({
      id: 'pref-1',
      init_point: 'https://mp/init',
      sandbox_init_point: 'https://mp/sandbox',
    })
  })

  describe('buyPack', () => {
    it('Debe lanzar BadRequestException si el pack no está disponible, sin crear la orden', async () => {
      mockPrisma.coinPack.findUnique.mockResolvedValue({
        ...pack,
        isActive: false,
      })

      await expect(service.buyPack('user-1', 'pack-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockPrisma.coinOrder.create).not.toHaveBeenCalled()
    })

    it('Debe crear la orden con monedas y bonus y la preferencia de MP', async () => {
      const result = await service.buyPack('user-1', 'pack-1')

      const [{ data: order }] = mockPrisma.coinOrder.create.mock.calls[0] as [
        { data: { coinsToCredit: number; finalPriceARS: number } },
      ]
      expect(order).toMatchObject({
        coinsToCredit: 25000,
        finalPriceARS: 10000,
      })
      expect(result.preferenceId).toBe('pref-1')
    })
  })

  describe('processPaymentWebhook', () => {
    const order = {
      id: 'order-1',
      userId: 'user-1',
      status: 'PENDING',
      coinsToCredit: 25000,
    }
    const approvedPayment = {
      id: 111,
      status: 'approved',
      external_reference: 'coin_order_order-1',
    }
    const uniqueViolation = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })

    beforeEach(() => {
      mockPrisma.coinOrder.findUnique.mockResolvedValue(order)
      mockPrisma.processedPayment.create.mockResolvedValue({})
      mockPrisma.processedPayment.findUnique.mockResolvedValue(null)
    })

    it('Debe aprobar la orden, registrar el pago que la acreditó y acreditar sin tope en la misma transacción', async () => {
      mockPrisma.coinOrder.updateMany.mockResolvedValue({ count: 1 })

      await service.processPaymentWebhook(approvedPayment)

      expect(mockPrisma.coinOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: { not: 'APPROVED' } },
        data: { status: 'APPROVED' },
      })
      expect(mockPrisma.processedPayment.create).toHaveBeenCalledWith({
        data: { paymentId: 'coin:111' },
      })
      expect(addCoinsCall()[0]).toMatchObject({
        userId: 'user-1',
        amount: 25000,
        type: 'MERCADO_PAGO_BUY',
        enforceCap: false,
      })
      expect(addCoinsCall()[1]).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
    })

    it('No debe acreditar dos veces si otro evento ya aprobó la orden', async () => {
      mockPrisma.coinOrder.updateMany.mockResolvedValue({ count: 0 })

      const result = await service.processPaymentWebhook(approvedPayment)

      expect(result).toBe(true)
      expect(mockPrisma.processedPayment.create).not.toHaveBeenCalled()
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })

    it('No debe volver a acreditar un pago que ya acreditó (handler en vuelo después de un reembolso)', async () => {
      mockPrisma.coinOrder.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.processedPayment.create.mockRejectedValue(uniqueViolation())

      const result = await service.processPaymentWebhook(approvedPayment)

      expect(result).toBe(true)
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })

    it('Debe ignorar un pago sin id', async () => {
      const result = await service.processPaymentWebhook({
        status: 'approved',
        external_reference: 'coin_order_order-1',
      })

      expect(result).toBe(false)
      expect(mockPrisma.coinOrder.findUnique).not.toHaveBeenCalled()
    })

    it('Un pago rechazado solo puede marcar como REJECTED una orden PENDING', async () => {
      mockPrisma.coinOrder.updateMany.mockResolvedValue({ count: 0 })

      await service.processPaymentWebhook({
        ...approvedPayment,
        status: 'rejected',
      })

      expect(mockPrisma.coinOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: { status: 'REJECTED' },
      })
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
    })

    it('Un reembolso del pago que acreditó revierte la orden y descuenta hasta donde alcance el saldo', async () => {
      mockPrisma.processedPayment.findUnique.mockResolvedValue({
        paymentId: 'coin:111',
      })
      mockWalletService.debitUpTo.mockResolvedValue({
        debited: 20000,
        shortfall: 5000,
      })

      const result = await service.processPaymentWebhook({
        ...approvedPayment,
        status: 'refunded',
      })

      expect(result).toBe(true)
      expect(mockPrisma.processedPayment.create).toHaveBeenCalledWith({
        data: { paymentId: 'coin:111:reversal' },
      })
      expect(mockPrisma.coinOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'APPROVED' },
        data: { status: 'REJECTED' },
      })
      const [debit, tx] = mockWalletService.debitUpTo.mock.calls[0] as [
        Record<string, unknown>,
        unknown,
      ]
      expect(debit).toMatchObject({
        userId: 'user-1',
        amount: 25000,
        type: 'MERCADO_PAGO_BUY',
      })
      expect(tx).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
    })

    it('El reembolso de un pago duplicado que no acreditó no descuenta nada', async () => {
      const result = await service.processPaymentWebhook({
        ...approvedPayment,
        id: 222,
        status: 'refunded',
      })

      expect(result).toBe(true)
      expect(mockPrisma.processedPayment.findUnique).toHaveBeenCalledWith({
        where: { paymentId: 'coin:222' },
      })
      expect(mockPrisma.coinOrder.updateMany).not.toHaveBeenCalled()
      expect(mockWalletService.debitUpTo).not.toHaveBeenCalled()
    })

    it('Un contracargo repetido no descuenta dos veces', async () => {
      mockPrisma.processedPayment.findUnique.mockResolvedValue({
        paymentId: 'coin:111',
      })
      mockPrisma.processedPayment.create.mockRejectedValue(uniqueViolation())

      const result = await service.processPaymentWebhook({
        ...approvedPayment,
        status: 'charged_back',
      })

      expect(result).toBe(true)
      expect(mockWalletService.debitUpTo).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })
  })
})
