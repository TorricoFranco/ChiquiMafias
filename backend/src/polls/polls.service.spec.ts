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
    vote: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    poll: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    pollReaction: { groupBy: jest.fn() },
    userInventory: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    storeItem: { findFirst: jest.fn(), findMany: jest.fn() },
    comment: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    commentReaction: { groupBy: jest.fn() },
    user: { findUnique: jest.fn() },
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

  describe('comentarios', () => {
    const vipAuthor = {
      id: 'user-vip',
      username: 'palquista',
      activeSubscriptionTier: 'TIER_3',
      activeNameColorId: 'item-color-boca',
      team: { badgeUrl: 'https://res.cloudinary.com/escudo-boca.png' },
    }
    const plainAuthor = {
      id: 'user-comun',
      username: 'hincha',
      activeSubscriptionTier: null,
      activeNameColorId: null,
      team: null,
    }

    beforeEach(() => {
      mockPrisma.poll.findUnique.mockResolvedValue({
        id: 'poll-1',
        commentsEnabled: true,
      })
      mockPrisma.commentReaction.groupBy.mockResolvedValue([])
      mockPrisma.storeItem.findMany.mockResolvedValue([
        { id: 'item-color-boca', assetId: 'color_boca' },
      ])
    })

    it('Debe mandar el autor con escudo, plan y color de nombre, sin nombre ni correo', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([
        {
          id: 'c-1',
          text: 'Vamos',
          createdAt: new Date('2026-10-24T12:00:00Z'),
          isPremium: true,
          user: vipAuthor,
          reactions: [],
        },
        {
          id: 'c-2',
          text: 'Dale',
          createdAt: new Date('2026-10-24T11:00:00Z'),
          isPremium: false,
          user: plainAuthor,
          reactions: [],
        },
      ])
      mockPrisma.comment.count.mockResolvedValue(2)

      const result = await service.getPollComments('poll-1', 1, 20)

      expect(result.data[0].user).toEqual({
        id: 'user-vip',
        username: 'palquista',
        badgeUrl: 'https://res.cloudinary.com/escudo-boca.png',
        tier: 'TIER_3',
        nameColor: 'color_boca',
      })
      expect(result.data[1].user).toEqual({
        id: 'user-comun',
        username: 'hincha',
        badgeUrl: null,
        tier: null,
        nameColor: null,
      })
      // El recorte del autor nunca pide el nombre ni el correo.
      const { select } = (
        mockPrisma.comment.findMany.mock.calls[0] as [
          { select: { user: { select: Record<string, unknown> } } },
        ]
      )[0]
      expect(select.user.select).not.toHaveProperty('name')
      expect(select.user.select).not.toHaveProperty('email')
      // Por el plan actual (PALCO VIP primero, sin plan al final) y después por fecha.
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            {
              user: {
                activeSubscriptionTier: { sort: 'desc', nulls: 'last' },
              },
            },
            { createdAt: 'desc' },
          ],
        }),
      )
      // Un solo pedido a la tienda para traducir los colores de la página.
      expect(mockPrisma.storeItem.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.storeItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-color-boca'] } },
        select: { id: true, assetId: true },
      })
    })

    it('No debe consultar la tienda si nadie tiene un color equipado', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([
        {
          id: 'c-2',
          text: 'Dale',
          createdAt: new Date(),
          isPremium: false,
          user: plainAuthor,
          reactions: [],
        },
      ])
      mockPrisma.comment.count.mockResolvedValue(1)

      await service.getPollComments('poll-1', 1, 20)

      expect(mockPrisma.storeItem.findMany).not.toHaveBeenCalled()
    })

    it('Debe devolver el comentario nuevo con la misma forma que el listado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        activeSubscriptionTier: 'TIER_3',
      })
      mockPrisma.comment.create.mockResolvedValue({
        id: 'c-nuevo',
        text: 'Hola',
        pollId: 'poll-1',
        userId: 'user-vip',
        isPremium: true,
        isDeleted: false,
        createdAt: new Date(),
        user: vipAuthor,
      })

      const result = await service.addComment('poll-1', 'user-vip', {
        text: 'Hola',
      })

      expect(mockPrisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPremium: true }) as unknown,
        }),
      )
      expect(result.user).toEqual({
        id: 'user-vip',
        username: 'palquista',
        badgeUrl: 'https://res.cloudinary.com/escudo-boca.png',
        tier: 'TIER_3',
        nameColor: 'color_boca',
      })
      expect(result).toMatchObject({
        likesCount: 0,
        dislikesCount: 0,
        userReaction: null,
      })
    })
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
    const author = {
      id: 'user-autor',
      name: 'Juan Tribunero',
      username: 'tribunero',
      activeNameColorId: null,
      activeBannerId: null,
      activeChatBubbleId: null,
      activeSubscriptionTier: 'TIER_2',
      team: {
        id: 'team-1',
        name: 'Boca Juniors',
        badgeUrl: '/escudos/boca.webp',
      },
    }

    const activePoll = (
      votes: { optionId: number }[] = [],
      overrides: Record<string, unknown> = {},
    ) => ({
      id: 'poll-1',
      title: '¿Quién gana?',
      options: [
        { id: 1, label: 'Boca' },
        { id: 2, label: 'River' },
      ],
      type: 'CLASSIC',
      config: null,
      commentsEnabled: true,
      status: 'ACTIVE',
      createdAt: new Date(),
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 86_400_000),
      icon: 'FOOTBALL',
      description: null,
      isOfficial: false,
      user: author,
      createdByAdmin: null,
      _count: { comments: 0, reactions: 0 },
      votes,
      reactions: [],
      ...overrides,
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

    it('Debe devolver al autor de una encuesta de la comunidad con su equipo y su tier', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([activePoll()])

      const [poll] = await service.getActivePolls('user-1')

      expect(poll.isOfficial).toBe(false)
      expect(poll.user).toMatchObject({
        name: 'Juan Tribunero',
        username: 'tribunero',
        activeSubscriptionTier: 'TIER_2',
        team: { badgeUrl: '/escudos/boca.webp' },
      })
    })

    it('Debe ocultar al moderador que publicó una encuesta oficial', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], {
          isOfficial: true,
          user: null,
          createdByAdmin: { id: 'mod-1', name: 'Mod', username: 'mod' },
        }),
      ])

      const [poll] = await service.getActivePolls('user-1')

      expect(poll.user).toBeNull()
      expect(poll).not.toHaveProperty('createdByAdmin')
    })

    it('Debe mostrarle a la moderación quién publicó la encuesta oficial', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], {
          isOfficial: true,
          user: null,
          createdByAdmin: { id: 'mod-1', name: 'Mod', username: 'mod' },
        }),
      ])

      const [poll] = await service.getActivePolls('mod-1', true)

      expect(poll.createdByAdmin).toMatchObject({ username: 'mod' })
    })

    it('Debe nunca exponer al autor de una encuesta oficial que quedó con userId', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], { isOfficial: true }),
      ])

      const [poll] = await service.getActivePolls('user-1')

      expect(poll.user).toBeNull()
    })

    it('Debe ordenar primero las que el usuario no votó y, dentro de cada grupo, las más votadas', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([{ optionId: 1 }], { id: 'votada-popular' }),
        activePoll([], { id: 'nueva-tranquila' }),
        activePoll([], { id: 'nueva-popular' }),
      ])
      mockRedis.hgetall.mockImplementation((key: string) => {
        if (key.includes('votada-popular')) return { '1': '40' }
        if (key.includes('nueva-popular')) return { '1': '10' }
        return { '1': '2' }
      })

      const polls = await service.getActivePolls('user-1')

      expect(polls.map((poll) => poll.id)).toEqual([
        'nueva-popular',
        'nueva-tranquila',
        'votada-popular',
      ])
    })

    it('Debe dejar atrás una encuesta que todavía no abrió', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], {
          id: 'programada',
          startsAt: new Date(Date.now() + 86_400_000),
        }),
        activePoll([], { id: 'abierta' }),
      ])
      mockRedis.hgetall.mockImplementation((key: string) =>
        key.includes('programada') ? { '1': '99' } : { '1': '1' },
      )

      const polls = await service.getActivePolls('user-1')

      expect(polls.map((poll) => poll.id)).toEqual(['abierta', 'programada'])
    })

    it('Debe dejar atrás una encuesta que el cron todavía no cerró', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], {
          id: 'vencida',
          endsAt: new Date(Date.now() - 60_000),
        }),
        activePoll([], { id: 'abierta' }),
      ])
      mockRedis.hgetall.mockImplementation((key: string) =>
        key.includes('vencida') ? { '1': '99' } : { '1': '1' },
      )

      const polls = await service.getActivePolls('user-1')

      expect(polls.map((poll) => poll.id)).toEqual(['abierta', 'vencida'])
    })

    it('Debe dejar las placas informativas detrás de lo que todavía se puede votar', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        activePoll([], { id: 'placa', type: 'INFO', options: [] }),
        activePoll([], { id: 'votable' }),
      ])
      mockRedis.hgetall.mockImplementation((key: string) =>
        key.includes('placa') ? { '1': '99' } : { '1': '1' },
      )

      const polls = await service.getActivePolls('user-1')

      expect(polls.map((poll) => poll.id)).toEqual(['votable', 'placa'])
    })
  })

  describe('createPoll', () => {
    it('Debe marcarla como oficial y guardar al moderador que la publicó', async () => {
      const poll = await service.createPoll(
        {
          title: 'Encuesta de la casa',
          options: [{ label: 'Sí' }, { label: 'No' }],
          endsAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
        'mod-1',
      )

      expect(poll).toMatchObject({
        isOfficial: true,
        createdByAdminId: 'mod-1',
        ticketCost: 0,
        status: 'ACTIVE',
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'poll.created',
        expect.objectContaining({ id: 'poll-1' }),
      )
    })

    it('Debe rechazar un tipo que exige fecha de cierre sin endsAt', async () => {
      await expect(
        service.createPoll(
          { title: 'Sin cierre', options: [{ label: 'Sí' }, { label: 'No' }] },
          'mod-1',
        ),
      ).rejects.toThrow(BadRequestException)
      expect(mockPrisma.poll.create).not.toHaveBeenCalled()
    })
  })

  describe('getPendingPolls', () => {
    it('Debe traer al proponente y ocultar al moderador de una oficial programada', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        {
          id: 'propuesta',
          isOfficial: false,
          user: { id: 'user-1', name: 'Juan', username: 'juan' },
          createdByAdmin: null,
        },
        {
          id: 'programada',
          isOfficial: true,
          user: { id: 'mod-1', name: 'Mod', username: 'mod' },
          createdByAdmin: { id: 'mod-1', name: 'Mod', username: 'mod' },
        },
      ])

      const [propuesta, programada] = await service.getPendingPolls()

      expect(propuesta.user).toMatchObject({ username: 'juan' })
      expect(programada.user).toBeNull()
      expect(programada.createdByAdmin).toMatchObject({ username: 'mod' })
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
      // Un claim simultáneo ya se llevó uno de los tres votos; cada voto paga 10 monedas
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
        amount: 20,
      })
      expect(addCoinsCall()[1]).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
      expect(result).toMatchObject({ claimedCount: 2, coinsAwarded: 20 })
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

  describe('getPendingRewardsCount', () => {
    it('Debe calcular las monedas pendientes a 10 por cada voto sin reclamar', async () => {
      mockPrisma.vote.count.mockResolvedValue(3)

      const result = await service.getPendingRewardsCount('user-1')

      expect(mockPrisma.vote.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', rewardClaimed: false },
      })
      expect(result).toEqual({ count: 3, potentialCoins: 30 })
    })

    it('Debe devolver cero monedas si no hay votos sin reclamar', async () => {
      mockPrisma.vote.count.mockResolvedValue(0)

      const result = await service.getPendingRewardsCount('user-1')

      expect(result).toEqual({ count: 0, potentialCoins: 0 })
    })
  })

  describe('getClosedPolls', () => {
    const NOW = new Date('2026-11-03T12:00:00.000Z')
    const CLOSED_WHERE = {
      OR: [{ status: 'CLOSED' }, { endsAt: { lt: NOW } }],
    }

    const closedPoll = (over: Record<string, unknown> = {}) => ({
      id: 'poll-1',
      title: '¿Quién gana el clásico?',
      description: null,
      icon: 'USER',
      endsAt: new Date('2026-11-01T12:00:00.000Z'),
      options: [
        { id: 1, label: 'Boca' },
        { id: 2, label: 'River' },
        { id: 3, label: 'Empate' },
      ],
      type: 'CLASSIC',
      config: null,
      isOfficial: true,
      user: null,
      ...over,
    })

    /** Una fila del `groupBy` de votos: cuántos votos tiene esa opción (y ese podio). */
    const voteGroup = (
      pollId: string,
      optionId: number,
      count: number,
      ranking: number[] = [],
    ) => ({ pollId, optionId, ranking, _count: { _all: count } })

    type FindManyArg = { select: Record<string, unknown> }
    const pollsQuery = () =>
      (mockPrisma.poll.findMany.mock.calls as FindManyArg[][])[0][0]

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW })
      mockPrisma.poll.findMany.mockResolvedValue([closedPoll()])
      mockPrisma.poll.count.mockResolvedValue(1)
      mockPrisma.vote.groupBy.mockResolvedValue([])
      mockPrisma.vote.findMany.mockResolvedValue([])
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('Debe contar los votos en la base en vez de traer una fila por votante', async () => {
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 40),
        voteGroup('poll-1', 2, 25),
      ])

      const { data } = await service.getClosedPolls(1, 10, 'user-1')

      expect(mockPrisma.vote.groupBy).toHaveBeenCalledTimes(1)
      expect(mockPrisma.vote.groupBy).toHaveBeenCalledWith({
        by: ['pollId', 'optionId', 'ranking'],
        where: { pollId: { in: ['poll-1'] } },
        _count: { _all: true },
      })
      expect(pollsQuery().select).not.toHaveProperty('votes')
      expect(data[0].options).toEqual([
        { id: 1, label: 'Boca', votes: 40 },
        { id: 2, label: 'River', votes: 25 },
        { id: 3, label: 'Empate', votes: 0 },
      ])
      expect(data[0].totalVotes).toBe(65)
      expect(data[0].rankingResults).toBeNull()
    })

    it('Debe contar en el total los votos de opciones que ya no existen', async () => {
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 2),
        voteGroup('poll-1', 9, 3),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].options.map((option) => option.votes)).toEqual([2, 0, 0])
      expect(data[0].totalVotes).toBe(5)
    })

    it('Debe dejar en cero una encuesta que nadie votó', async () => {
      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].totalVotes).toBe(0)
      expect(data[0].options.every((option) => option.votes === 0)).toBe(true)
    })

    it('Debe sumar cada opción de cada encuesta por separado', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        closedPoll(),
        closedPoll({ id: 'poll-2' }),
      ])
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 4),
        voteGroup('poll-2', 1, 7),
        voteGroup('poll-2', 3, 1),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(mockPrisma.vote.groupBy).toHaveBeenCalledTimes(1)
      expect(data.map((poll) => poll.totalVotes)).toEqual([4, 8])
      expect(data[1].options.map((option) => option.votes)).toEqual([7, 0, 1])
    })

    it('Debe sumar los grupos de una misma opción, como los votos viejos con ranking NULL y con ranking vacío', async () => {
      // Postgres agrupa NULL y '{}' por separado: la misma opción llega en dos filas.
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 2),
        voteGroup('poll-1', 1, 3),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].options.map((option) => option.votes)).toEqual([5, 0, 0])
      expect(data[0].totalVotes).toBe(5)
    })

    it('Debe sumar los primeros puestos de podios distintos que comparten la opción ganadora', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        closedPoll({ type: 'RANKING', config: { picks: 3 } }),
      ])
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 2, [1, 2, 3]),
        voteGroup('poll-1', 1, 1, [1, 3, 2]),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].options.map((option) => option.votes)).toEqual([3, 0, 0])
      expect(data[0].totalVotes).toBe(3)
      expect(data[0].rankingResults).toEqual({
        '1': [3, 0, 0],
        '2': [0, 2, 1],
        '3': [0, 1, 2],
      })
    })

    it('Debe marcar hasVoted solo en las encuestas donde votó el usuario', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        closedPoll(),
        closedPoll({ id: 'poll-2' }),
      ])
      mockPrisma.vote.findMany.mockResolvedValue([{ pollId: 'poll-2' }])

      const { data } = await service.getClosedPolls(1, 10, 'user-1')

      expect(mockPrisma.vote.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', pollId: { in: ['poll-1', 'poll-2'] } },
        select: { pollId: true },
      })
      expect(data.map((poll) => poll.hasVoted)).toEqual([false, true])
    })

    it('Debe devolver hasVoted en false sin consultar votos si no hay sesión', async () => {
      const { data } = await service.getClosedPolls(1, 10)

      expect(mockPrisma.vote.findMany).not.toHaveBeenCalled()
      expect(data[0].hasVoted).toBe(false)
    })

    it('Debe armar el podio de RANKING con los podios agrupados', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        closedPoll({ type: 'RANKING', config: { picks: 3 } }),
      ])
      mockPrisma.vote.groupBy.mockResolvedValue([
        voteGroup('poll-1', 1, 2, [1, 2, 3]),
        voteGroup('poll-1', 2, 2, [2, 1, 3]),
        voteGroup('poll-1', 3, 1, [3, 1, 2]),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].rankingResults).toEqual({
        '1': [2, 3, 0],
        '2': [2, 2, 1],
        '3': [1, 0, 4],
      })
      // Cada opción cuenta los primeros puestos, y el total es la cantidad de votantes
      expect(data[0].options.map((option) => option.votes)).toEqual([2, 2, 1])
      expect(data[0].totalVotes).toBe(5)
    })

    it('Debe devolver el podio en cero si una encuesta de RANKING no tiene votos', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([
        closedPoll({ type: 'RANKING' }),
      ])

      const { data } = await service.getClosedPolls(1, 10)

      expect(data[0].rankingResults).toEqual({
        '1': [0, 0, 0],
        '2': [0, 0, 0],
        '3': [0, 0, 0],
      })
    })

    it('Debe devolver la página vacía sin consultar votos', async () => {
      mockPrisma.poll.findMany.mockResolvedValue([])
      mockPrisma.poll.count.mockResolvedValue(0)

      const result = await service.getClosedPolls(3, 10, 'user-1')

      expect(mockPrisma.vote.groupBy).not.toHaveBeenCalled()
      expect(mockPrisma.vote.findMany).not.toHaveBeenCalled()
      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 3, limit: 10, totalPages: 0 },
      })
    })

    it('Debe paginar las cerradas y mantener la forma de la respuesta', async () => {
      mockPrisma.poll.count.mockResolvedValue(23)

      const { data, meta } = await service.getClosedPolls(2, 10, 'user-1')

      expect(mockPrisma.poll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: CLOSED_WHERE,
          orderBy: { endsAt: 'desc' },
          skip: 10,
          take: 10,
        }),
      )
      expect(mockPrisma.poll.count).toHaveBeenCalledWith({
        where: CLOSED_WHERE,
      })
      expect(meta).toEqual({ total: 23, page: 2, limit: 10, totalPages: 3 })
      expect(Object.keys(data[0]).sort()).toEqual(
        [
          'config',
          'description',
          'endsAt',
          'hasVoted',
          'icon',
          'id',
          'isOfficial',
          'options',
          'rankingResults',
          'title',
          'totalVotes',
          'type',
          'user',
        ].sort(),
      )
    })
  })
})
