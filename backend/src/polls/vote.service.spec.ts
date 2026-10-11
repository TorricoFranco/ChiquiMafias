import { Test, TestingModule } from '@nestjs/testing'
import { Prisma } from '@prisma/client'
import { WsException } from '@nestjs/websockets'
import { VoteService } from './vote.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

describe('VoteService', () => {
  let service: VoteService

  const mockMulti = {
    hincrby: jest.fn().mockReturnThis(),
    hset: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }

  const mockRedis: Record<string, jest.Mock> = {
    set: jest.fn(),
    sismember: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    hgetall: jest.fn(),
    multi: jest.fn(() => mockMulti),
  }

  const mockPrisma = {
    poll: { findUnique: jest.fn() },
    vote: { create: jest.fn(), findUnique: jest.fn() },
  }

  const activePoll = (overrides: Record<string, unknown> = {}) => ({
    status: 'ACTIVE',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 60_000),
    type: 'CLASSIC',
    options: [
      { id: 1, label: 'Boca' },
      { id: 2, label: 'River' },
    ],
    ...overrides,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { redis: mockRedis } },
      ],
    }).compile()

    service = module.get<VoteService>(VoteService)

    jest.clearAllMocks()
    // El cooldown anti-spam se adquiere sin problemas por defecto.
    mockRedis.set.mockResolvedValue('OK')
    mockRedis.sadd.mockResolvedValue(1)
    mockRedis.hgetall.mockResolvedValue({ '1': '1' })
  })

  it('Debe registrar el voto y actualizar los contadores de Redis', async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(activePoll())

    const results = await service.castVote('poll-1', 'user-1', 1)

    expect(mockPrisma.vote.create).toHaveBeenCalledWith({
      data: { pollId: 'poll-1', userId: 'user-1', optionId: 1 },
    })
    expect(mockMulti.hincrby).toHaveBeenCalledWith(
      'poll:poll-1:results',
      '1',
      1,
    )
    expect(mockMulti.hset).toHaveBeenCalledWith(
      'poll:poll-1:details',
      'user-1',
      '1',
    )
    expect(results).toEqual({ '1': '1' })
  })

  it('Debe cortar por el cooldown anti-spam antes de consultar la encuesta', async () => {
    mockRedis.set.mockResolvedValue(null)

    await expect(service.castVote('poll-1', 'user-1', 1)).rejects.toThrow(
      WsException,
    )
    expect(mockPrisma.poll.findUnique).not.toHaveBeenCalled()
  })

  describe('validaciones previas al voto', () => {
    const cases: [string, Record<string, unknown> | null, number, string][] = [
      ['la encuesta no existe', null, 1, 'La encuesta no existe'],
      [
        'el tipo no se vota',
        { type: 'INFO', options: [] },
        1,
        'Esta publicación no se vota',
      ],
      [
        'la encuesta no está abierta',
        { status: 'PENDING' },
        1,
        'Esta encuesta no está abierta',
      ],
      [
        'la encuesta ya cerró',
        { endsAt: new Date(Date.now() - 60_000) },
        1,
        'Esta encuesta ya cerró',
      ],
      [
        'la encuesta todavía no abrió',
        { startsAt: new Date(Date.now() + 60_000) },
        1,
        'Esta encuesta todavía no abrió',
      ],
      [
        'la opción no pertenece a la encuesta',
        {},
        99,
        'La opción elegida no existe en esta encuesta',
      ],
    ]

    it.each(cases)(
      'Debe rechazar el voto si %s',
      async (_caso, overrides, optionId, message) => {
        mockPrisma.poll.findUnique.mockResolvedValue(
          overrides === null ? null : activePoll(overrides),
        )

        await expect(
          service.castVote('poll-1', 'user-1', optionId),
        ).rejects.toThrow(message)
        expect(mockPrisma.vote.create).not.toHaveBeenCalled()
      },
    )

    it('No debe quemar el cupo del usuario cuando el voto es inválido', async () => {
      mockPrisma.poll.findUnique.mockResolvedValue(activePoll())

      await expect(service.castVote('poll-1', 'user-1', 99)).rejects.toThrow(
        WsException,
      )
      expect(mockRedis.sadd).not.toHaveBeenCalled()
      expect(mockRedis.srem).not.toHaveBeenCalled()
    })
  })

  it('Debe avisar ALREADY_VOTED si el usuario ya está en el set de votantes', async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(activePoll())
    mockRedis.sadd.mockResolvedValue(0)

    await expect(service.castVote('poll-1', 'user-1', 1)).rejects.toThrow(
      WsException,
    )
    expect(mockPrisma.vote.create).not.toHaveBeenCalled()
  })

  describe('hasVoted', () => {
    it('Debe decir que sí con el set de votantes de Redis, sin tocar la DB', async () => {
      mockRedis.sismember = jest.fn().mockResolvedValue(1)

      await expect(service.hasVoted('poll-1', 'user-1')).resolves.toBe(true)
      expect(mockPrisma.vote.findUnique).not.toHaveBeenCalled()
    })

    it('Debe caer a la tabla Vote si el set de Redis se perdió', async () => {
      mockRedis.sismember = jest.fn().mockResolvedValue(0)
      mockPrisma.vote.findUnique.mockResolvedValue({ id: 'vote-1' })

      await expect(service.hasVoted('poll-1', 'user-1')).resolves.toBe(true)
      expect(mockPrisma.vote.findUnique).toHaveBeenCalledWith({
        where: { pollId_userId: { pollId: 'poll-1', userId: 'user-1' } },
        select: { id: true },
      })
    })

    it('Debe decir que no si no está en ninguno de los dos', async () => {
      mockRedis.sismember = jest.fn().mockResolvedValue(0)
      mockPrisma.vote.findUnique.mockResolvedValue(null)

      await expect(service.hasVoted('poll-1', 'user-1')).resolves.toBe(false)
    })
  })

  it('Debe devolver ALREADY_VOTED si el unique de la DB ya tenía el voto', async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(activePoll())
    mockPrisma.vote.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.0',
      }),
    )

    await expect(service.castVote('poll-1', 'user-1', 1)).rejects.toThrow(
      WsException,
    )
    expect(mockRedis.srem).toHaveBeenCalledWith('poll:poll-1:voters', 'user-1')
  })

  it('Debe liberar el cupo si falla la persistencia del voto', async () => {
    mockPrisma.poll.findUnique.mockResolvedValue(activePoll())
    mockPrisma.vote.create.mockRejectedValue(new Error('db caída'))

    await expect(service.castVote('poll-1', 'user-1', 1)).rejects.toThrow(
      WsException,
    )
    expect(mockRedis.srem).toHaveBeenCalledWith('poll:poll-1:voters', 'user-1')
  })
})
