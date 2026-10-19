import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Job } from 'bullmq'
import { BetsProcessor } from './bets.processor'
import { PrismaService } from '../prisma/prisma.service'

describe('BetsProcessor', () => {
  let processor: BetsProcessor
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    bet: { create: jest.fn() },
    wallet: { update: jest.fn() },
    coinTransaction: { create: jest.fn() },
    marketOption: { update: jest.fn() },
    userStats: { upsert: jest.fn() },
  }

  const jobData = {
    betId: 'bet-1',
    userId: 'user-1',
    optionId: 'opt-1',
    marketId: 'market-1',
    stake: 200,
    timestamp: 1700000000000,
  }

  const buildJob = (name: string, data: Record<string, unknown> = jobData) =>
    ({ id: 'job-1', name, data }) as unknown as Job

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetsProcessor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    processor = module.get<BetsProcessor>(BetsProcessor)

    jest.clearAllMocks()
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined)
    mockPrisma.wallet.update.mockResolvedValue({ id: 'wallet-1', balance: 800 })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Debe persistir la apuesta, descontar el stake y registrar el movimiento en una sola transacción', async () => {
    await processor.process(buildJob('persist-bet'))

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.bet.create).toHaveBeenCalledWith({
      data: {
        id: 'bet-1',
        userId: 'user-1',
        optionId: 'opt-1',
        stake: 200,
        status: 'PENDING',
        createdAt: new Date(jobData.timestamp),
      },
    })
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { balance: { decrement: 200 } },
    })
    const [movement] = mockPrisma.coinTransaction.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ]
    expect(movement.data).toMatchObject({
      walletId: 'wallet-1',
      amount: -200,
      type: 'BET_STAKE',
      referenceId: 'bet-1',
    })
    expect(mockPrisma.marketOption.update).toHaveBeenCalledWith({
      where: { id: 'opt-1' },
      data: { totalStaked: { increment: 200 } },
    })
    expect(mockPrisma.userStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    )
  })

  it('Un reintento de una apuesta ya guardada (P2002) debe relanzar sin volver a descontar', async () => {
    mockPrisma.bet.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )

    await expect(processor.process(buildJob('persist-bet'))).rejects.toThrow(
      Prisma.PrismaClientKnownRequestError,
    )

    expect(mockPrisma.wallet.update).not.toHaveBeenCalled()
    expect(mockPrisma.coinTransaction.create).not.toHaveBeenCalled()
    expect(mockPrisma.marketOption.update).not.toHaveBeenCalled()
  })

  it('Debe relanzar un error de la DB para que BullMQ marque el job como fallido', async () => {
    mockPrisma.coinTransaction.create.mockRejectedValueOnce(
      new Error('DB caída'),
    )

    await expect(processor.process(buildJob('persist-bet'))).rejects.toThrow(
      'DB caída',
    )
    expect(errorSpy).toHaveBeenCalled()
  })

  it('Debe loguear un job desconocido sin tocar la DB', async () => {
    await processor.process(buildJob('otro-job'))

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('otro-job'))
  })
})
