import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { BadRequestException } from '@nestjs/common'
import { Prisma, TransactionType } from '@prisma/client'
import { WalletService } from './wallet.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { ChatGateway } from '../chat/chat.gateway'
import { MAX_COIN_BALANCE } from './constants/wallet.constants'

describe('WalletService', () => {
  let service: WalletService

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    $queryRaw: jest.fn(),
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    coinTransaction: {
      create: jest.fn(),
    },
  }
  const tx = mockPrisma as unknown as Prisma.TransactionClient

  const mockRedisService = {
    redis: {
      set: jest.fn(),
    },
  }

  const operation = {
    userId: 'user-1',
    amount: 300,
    type: TransactionType.STREAK_REWARD,
    description: 'Premio diario por racha del Día 7',
  }

  const lockedBalance = (balance: number | null) =>
    mockPrisma.$queryRaw.mockResolvedValue(
      balance === null ? [] : [{ balance }],
    )

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ChatGateway, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile()

    service = module.get<WalletService>(WalletService)

    jest.clearAllMocks()
    const walletWith = ({ data }: { data: { balance: number } }) =>
      Promise.resolve({
        id: 'wallet-1',
        userId: 'user-1',
        balance: data.balance,
      })
    mockPrisma.wallet.update.mockImplementation(walletWith)
    mockPrisma.wallet.create.mockImplementation(walletWith)
  })

  const createdTransaction = () =>
    (
      mockPrisma.coinTransaction.create.mock.calls[0] as [
        { data: { walletId: string; amount: number } },
      ]
    )[0].data

  describe('addCoins', () => {
    it('Debe bloquear la fila, sumar el monto, registrar la transacción y sincronizar Redis', async () => {
      lockedBalance(1000)

      const wallet = await service.addCoins(operation)

      const [sql, userId] = mockPrisma.$queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        string,
      ]
      expect(sql.join('?')).toContain('FOR UPDATE')
      expect(userId).toBe('user-1')
      expect(wallet.balance).toBe(1300)
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: 1300 },
      })
      expect(createdTransaction()).toMatchObject({
        walletId: 'wallet-1',
        amount: 300,
      })
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        'wallet:user-1:balance',
        1300,
      )
    })

    it('Debe recortar en el tope y registrar solo lo acreditado', async () => {
      lockedBalance(MAX_COIN_BALANCE - 100)

      const wallet = await service.addCoins(operation)

      expect(wallet.balance).toBe(MAX_COIN_BALANCE)
      expect(createdTransaction()).toMatchObject({ amount: 100 })
    })

    it('No debe bajar un saldo que ya estaba arriba del tope', async () => {
      lockedBalance(MAX_COIN_BALANCE + 5000)

      const wallet = await service.addCoins(operation)

      expect(wallet.balance).toBe(MAX_COIN_BALANCE + 5000)
      expect(mockPrisma.coinTransaction.create).not.toHaveBeenCalled()
    })

    it('No debe recortar lo que llega con enforceCap: false (compras pagas)', async () => {
      lockedBalance(MAX_COIN_BALANCE - 100)

      const wallet = await service.addCoins({
        ...operation,
        amount: 25000,
        type: TransactionType.MERCADO_PAGO_BUY,
        enforceCap: false,
      })

      expect(wallet.balance).toBe(MAX_COIN_BALANCE - 100 + 25000)
      expect(createdTransaction()).toMatchObject({ amount: 25000 })
    })

    it('Debe crear la wallet con el regalo inicial si el usuario no tiene una', async () => {
      lockedBalance(null)

      const wallet = await service.addCoins(operation)

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', balance: 1300 },
      })
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled()
      expect(wallet.balance).toBe(1300)
      expect(createdTransaction()).toMatchObject({ amount: 300 })
    })

    it('Con una transacción externa debe usarla y no tocar Redis', async () => {
      lockedBalance(1000)

      const wallet = await service.addCoins(operation, tx)

      expect(wallet.balance).toBe(1300)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
      expect(mockRedisService.redis.set).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si el monto es menor o igual a cero', async () => {
      await expect(
        service.addCoins({ ...operation, amount: 0 }),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('subtractCoins', () => {
    const purchase = {
      ...operation,
      type: TransactionType.STORE_PURCHASE,
      description: 'Compra en tienda',
    }

    beforeEach(() => {
      mockPrisma.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balance: 700,
      })
    })

    it('Debe descontar con update condicional y sincronizar Redis después de su transacción', async () => {
      await service.subtractCoins(purchase)

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1', balance: { gte: 300 } },
        data: { balance: { decrement: 300 } },
      })
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        'wallet:user-1:balance',
        700,
      )
    })

    it('Con una transacción externa no debe tocar Redis', async () => {
      await service.subtractCoins(purchase, tx)

      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
      expect(mockRedisService.redis.set).not.toHaveBeenCalled()
    })
  })

  describe('debitUpTo', () => {
    const reversal = {
      ...operation,
      amount: 25000,
      type: TransactionType.MERCADO_PAGO_BUY,
      description: 'Reversa de Pack de Monedas por reembolso',
    }

    it('Debe descontar solo lo que alcanza el saldo y devolver lo que falta', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { id: 'wallet-1', balance: 20000 },
      ])

      const result = await service.debitUpTo(reversal, tx)

      expect(result).toEqual({ debited: 20000, shortfall: 5000 })
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: { decrement: 20000 } },
      })
      expect(createdTransaction()).toMatchObject({
        walletId: 'wallet-1',
        amount: -20000,
      })
      expect(mockRedisService.redis.set).not.toHaveBeenCalled()
    })

    it('No debe tocar la wallet si el saldo es cero', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'wallet-1', balance: 0 }])

      const result = await service.debitUpTo(reversal, tx)

      expect(result).toEqual({ debited: 0, shortfall: 25000 })
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled()
      expect(mockPrisma.coinTransaction.create).not.toHaveBeenCalled()
    })
  })

  describe('syncBalanceCache', () => {
    it('Debe leer el saldo confirmado de la DB si no se lo pasan', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 4200 })

      await service.syncBalanceCache('user-1')

      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        'wallet:user-1:balance',
        4200,
      )
    })
  })
})
