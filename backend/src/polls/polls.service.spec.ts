import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { BadRequestException } from '@nestjs/common'
import { PollsService } from './polls.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { WalletService } from '../wallet/wallet.service'

describe('PollsService', () => {
  let service: PollsService

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    vote: { findMany: jest.fn(), updateMany: jest.fn() },
    poll: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pollReaction: { groupBy: jest.fn() },
    userInventory: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    storeItem: { findFirst: jest.fn() },
  }

  const mockEventEmitter = { emit: jest.fn() }

  const mockRedis = { hgetall: jest.fn() }

  const mockWalletService = {
    addCoins: jest.fn(),
    syncBalanceCache: jest.fn(),
  }

  /** Inventario con los tickets repartidos en las filas que se pasen. */
  const giveTickets = (...quantities: number[]) =>
    mockPrisma.userInventory.findMany.mockResolvedValue(
      quantities.map((quantity, index) => ({
        id: `inv-${index + 1}`,
        itemId: `item-${index + 1}`,
        quantity,
      })),
    )

  const addCoinsCall = () =>
    mockWalletService.addCoins.mock.calls[0] as [
      Record<string, unknown>,
      unknown,
    ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { redis: mockRedis } },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<PollsService>(PollsService)

    jest.clearAllMocks()
    mockPrisma.vote.findMany.mockResolvedValue([
      { id: 'vote-1' },
      { id: 'vote-2' },
      { id: 'vote-3' },
    ])
    mockPrisma.userInventory.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.poll.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.pollReaction.groupBy.mockResolvedValue([])
    mockRedis.hgetall.mockResolvedValue({ '1': '7', '2': '3' })
    mockPrisma.poll.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 'poll-1',
        ...data,
      }),
    )
  })

  describe('proposePoll', () => {
    it('Debe descontar 1 ticket y guardar el tipo en una encuesta clásica', async () => {
      giveTickets(3)

      const poll = await service.proposePoll('user-1', {
        title: '¿Quién gana?',
        options: ['Boca', 'River'],
      })

      expect(mockPrisma.userInventory.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      })
      expect(poll).toMatchObject({
        type: 'CLASSIC',
        ticketCost: 1,
        status: 'PENDING',
        options: [
          { id: 1, label: 'Boca' },
          { id: 2, label: 'River' },
        ],
      })
    })

    it('Debe descontar 2 tickets en una predicción de partido', async () => {
      giveTickets(5)

      const poll = await service.proposePoll('user-1', {
        title: 'Superclásico',
        type: 'MATCH',
        options: ['Boca', 'River'],
        optionTeamIds: ['451', '435'],
        config: { layout: 'VS' },
      })

      expect(mockPrisma.userInventory.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      })
      expect(poll).toMatchObject({ type: 'MATCH', ticketCost: 2 })
      // Queda anotado de qué ítem salieron, para devolver los mismos.
      expect(poll).toMatchObject({
        ticketRefund: [{ itemId: 'item-1', quantity: 2 }],
      })
    })

    it('Debe juntar el costo cuando el stock está repartido en varias filas', async () => {
      giveTickets(1, 1)

      await service.proposePoll('user-1', {
        title: 'Superclásico',
        type: 'MATCH',
        options: ['Boca', 'River'],
        optionTeamIds: ['451', '435'],
        config: { layout: 'VS' },
      })

      expect(mockPrisma.userInventory.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'inv-1', quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      })
      expect(mockPrisma.userInventory.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'inv-2', quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      })
      expect(mockPrisma.poll.create).toHaveBeenCalled()
    })

    it('Debe rechazar si el stock total no cubre el costo', async () => {
      giveTickets(1)

      await expect(
        service.proposePoll('user-1', {
          title: 'Superclásico',
          type: 'MATCH',
          options: ['Boca', 'River'],
          optionTeamIds: ['451', '435'],
          config: { layout: 'VS' },
        }),
      ).rejects.toThrow('cuesta 2 Tickets de Encuesta y tenés 1')
      expect(mockPrisma.poll.create).not.toHaveBeenCalled()
    })

    it('Debe abortar sin crear la encuesta si otra propuesta simultánea se llevó los tickets', async () => {
      giveTickets(2)
      mockPrisma.userInventory.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.proposePoll('user-1', {
          title: '¿Quién gana?',
          options: ['Boca', 'River'],
        }),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.poll.create).not.toHaveBeenCalled()
    })

    it('Debe rechazar los tipos que solo publica la moderación', async () => {
      giveTickets(5)

      await expect(
        service.proposePoll('user-1', {
          title: 'Se fue a Europa',
          type: 'NEWS',
          options: ['Buen pase', 'Mal pase'],
        }),
      ).rejects.toThrow('solo las publica la moderación')
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('No debe tocar el inventario si la forma de la encuesta es inválida', async () => {
      giveTickets(5)

      await expect(
        service.proposePoll('user-1', {
          title: '¿Quién gana?',
          options: ['Boca'],
        }),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('getActivePolls', () => {
    const activePoll = (votes: { optionId: number }[] = []) => ({
      id: 'poll-1',
      title: '¿Quién gana?',
      options: [
        { id: 1, label: 'Boca' },
        { id: 2, label: 'River' },
      ],
      type: 'CLASSIC',
      config: null,
      commentsEnabled: true,
      createdAt: new Date(),
      endsAt: new Date(),
      icon: 'FOOTBALL',
      description: null,
      user: { id: 'user-autor', username: 'tribunero' },
      _count: { comments: 0, reactions: 0 },
      votes,
      reactions: [],
    })

    it('Debe ocultar los votos por opción a quien todavía no votó, pero mostrar el total', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([activePoll()])

      const [poll] = await service.getActivePolls('user-1')

      expect(poll.options).toEqual([
        { id: 1, label: 'Boca', votes: 0 },
        { id: 2, label: 'River', votes: 0 },
      ])
      expect(poll.totalVotes).toBe(10)
      expect(poll.hasVoted).toBe(false)
    })

    it('Debe mostrar los votos por opción a quien ya votó', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([{ optionId: 2 }]),
      ])

      const [poll] = await service.getActivePolls('user-1')

      expect(poll.options).toEqual([
        { id: 1, label: 'Boca', votes: 7 },
        { id: 2, label: 'River', votes: 3 },
      ])
      expect(poll.hasVoted).toBe(true)
      expect(poll.userVotedOptionId).toBe(2)
    })

    it('Debe mostrar los votos a la moderación sin que haya votado', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([activePoll()])

      const [poll] = await service.getActivePolls('mod-1', true)

      expect(poll.options[0].votes).toBe(7)
      expect(poll.hasVoted).toBe(false)
    })

    it('Debe ocultar los votos a un visitante sin sesión', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([activePoll()])

      const [poll] = await service.getActivePolls()

      expect(poll.options[0].votes).toBe(0)
      expect(poll.totalVotes).toBe(10)
    })
  })

  describe('rejectPoll', () => {
    const pendingPoll = (ticketCost: number) => ({
      id: 'poll-1',
      title: 'Superclásico',
      status: 'PENDING',
      ticketCost,
      ticketRefund: null,
      userId: 'user-1',
    })

    it('Debe devolver los tickets al mismo ítem del que salieron', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        ...pendingPoll(3),
        ticketRefund: [
          { itemId: 'item-gold', quantity: 2 },
          { itemId: 'item-tienda', quantity: 1 },
        ],
      })

      await service.rejectPoll('poll-1')

      expect(mockPrisma.userInventory.upsert).toHaveBeenCalledWith({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-gold' } },
        update: { quantity: { increment: 2 } },
        create: { userId: 'user-1', itemId: 'item-gold', quantity: 2 },
      })
      expect(mockPrisma.userInventory.upsert).toHaveBeenCalledWith({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-tienda' } },
        update: { quantity: { increment: 1 } },
        create: { userId: 'user-1', itemId: 'item-tienda', quantity: 1 },
      })
      expect(mockPrisma.storeItem.findFirst).not.toHaveBeenCalled()
    })

    it('Debe caer al ítem comprable de la tienda si la encuesta no tiene desglose', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(pendingPoll(3))
      mockPrisma.storeItem.findFirst.mockResolvedValue({ id: 'item-tienda' })

      await service.rejectPoll('poll-1')

      expect(mockPrisma.storeItem.findFirst).toHaveBeenCalledWith({
        where: { type: 'CUSTOM_POLL', isPurchasable: true },
        orderBy: { createdAt: 'asc' },
      })
      expect(mockPrisma.userInventory.upsert).toHaveBeenCalledWith({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-tienda' } },
        update: { quantity: { increment: 3 } },
        create: { userId: 'user-1', itemId: 'item-tienda', quantity: 3 },
      })
    })

    it('No debe reembolsar dos veces si otro rechazo simultáneo se adelantó', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(pendingPoll(3))
      mockPrisma.poll.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.rejectPoll('poll-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockPrisma.userInventory.upsert).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('No debe reembolsar nada en una encuesta oficial, que no costó tickets', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(pendingPoll(0))

      await service.rejectPoll('poll-1')

      expect(mockPrisma.userInventory.upsert).not.toHaveBeenCalled()
    })

    it('Debe emitir poll.rejected recién con la transacción confirmada', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(pendingPoll(1))
      mockPrisma.storeItem.findFirst.mockResolvedValue({ id: 'item-1' })
      const emitOrder: string[] = []
      mockPrisma.$transaction.mockImplementationOnce(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const result = await callback(mockPrisma)
          emitOrder.push('commit')
          return result
        },
      )
      mockEventEmitter.emit.mockImplementation(() => emitOrder.push('emit'))

      await service.rejectPoll('poll-1')

      expect(emitOrder).toEqual(['commit', 'emit'])
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('poll.rejected', {
        userId: 'user-1',
        pollId: 'poll-1',
        pollTitle: 'Superclásico',
      })
    })

    it('Debe rechazar si la encuesta ya no está pendiente', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        ...pendingPoll(1),
        status: 'ACTIVE',
      })
      mockPrisma.poll.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.rejectPoll('poll-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockPrisma.userInventory.upsert).not.toHaveBeenCalled()
    })
  })

  describe('approvePoll', () => {
    const dto = {
      startsAt: '2026-10-11T18:00:00.000Z',
      endsAt: '2026-10-12T18:00:00.000Z',
    }

    it('Debe publicar la encuesta y avisarle al proponente', async () => {
      mockPrisma.poll.findUniqueOrThrow.mockResolvedValue({
        id: 'poll-1',
        title: 'Superclásico',
        userId: 'user-1',
      })

      await service.approvePoll('poll-1', dto)

      expect(mockPrisma.poll.updateMany).toHaveBeenCalledWith({
        where: { id: 'poll-1', status: 'PENDING' },
        data: {
          status: 'ACTIVE',
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
        },
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('poll.approved', {
        userId: 'user-1',
        pollId: 'poll-1',
        pollTitle: 'Superclásico',
      })
    })

    it('No debe publicarla si un rechazo simultáneo se adelantó', async () => {
      mockPrisma.poll.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.poll.findUnique.mockResolvedValue({ id: 'poll-1' })

      await expect(service.approvePoll('poll-1', dto)).rejects.toThrow(
        'Esta encuesta ya no está pendiente',
      )
      expect(mockPrisma.poll.findUniqueOrThrow).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('Debe lanzar NotFound si la encuesta no existe', async () => {
      mockPrisma.poll.updateMany.mockResolvedValue({ count: 0 })
      mockPrisma.poll.findUnique.mockResolvedValue(null)

      await expect(service.approvePoll('poll-1', dto)).rejects.toThrow(
        'La encuesta no existe',
      )
    })

    it('Debe validar que el cierre sea posterior al inicio', async () => {
      await expect(
        service.approvePoll('poll-1', {
          startsAt: dto.endsAt,
          endsAt: dto.startsAt,
        }),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.poll.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('claimAllPendingRewards', () => {
    it('Debe pagar solo los votos que este claim logró marcar, en la misma transacción', async () => {
      // Un claim simultáneo ya se llevó uno de los tres votos
      mockPrisma.vote.updateMany.mockResolvedValue({ count: 2 })

      const result = await service.claimAllPendingRewards('user-1')

      expect(mockPrisma.vote.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['vote-1', 'vote-2', 'vote-3'] },
          rewardClaimed: false,
        },
        data: { rewardClaimed: true },
      })
      expect(addCoinsCall()[0]).toMatchObject({
        userId: 'user-1',
        amount: 100,
      })
      expect(addCoinsCall()[1]).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
      expect(result).toMatchObject({ claimedCount: 2, coinsAwarded: 100 })
    })

    it('Debe lanzar BadRequestException si otro claim simultáneo ya marcó todos los votos', async () => {
      mockPrisma.vote.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.claimAllPendingRewards('user-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si no hay votos pendientes', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([])

      await expect(service.claimAllPendingRewards('user-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
