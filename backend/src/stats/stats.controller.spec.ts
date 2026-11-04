import type { Server } from 'http'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { UserStreakService } from './statsUserStreak.service'
import { ChatLeaderboardService } from './ChatLeaderboard.service'

describe('StatsController', () => {
  let app: INestApplication

  const mockStatsService = {
    getTopEarners: jest.fn(),
    getTopStreaks: jest.fn(),
    getHighestMultipliers: jest.fn(),
    getMostActive: jest.fn(),
    getTopStakers: jest.fn(),
  }
  const mockUserStreakService = { getTopActiveStreaks: jest.fn() }
  const mockChatLeaderboardService = { getTopChatters: jest.fn() }

  const RANKING = [
    { id: 'stats-1', userId: 'user-1', user: { username: 'el_rey' } },
  ]

  const get = (path: string) => request(app.getHttpServer() as Server).get(path)

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: StatsService, useValue: mockStatsService },
        { provide: UserStreakService, useValue: mockUserStreakService },
        {
          provide: ChatLeaderboardService,
          useValue: mockChatLeaderboardService,
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()

    // Mismas opciones que el ValidationPipe global (main.ts).
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    Object.values(mockStatsService).forEach((method) =>
      method.mockResolvedValue(RANKING),
    )
    mockUserStreakService.getTopActiveStreaks.mockResolvedValue(RANKING)
    mockChatLeaderboardService.getTopChatters.mockResolvedValue(RANKING)
  })

  describe.each([
    ['top-earners', 'getTopEarners'],
    ['top-streaks', 'getTopStreaks'],
    ['highest-multipliers', 'getHighestMultipliers'],
    ['most-active', 'getMostActive'],
    ['top-stakers', 'getTopStakers'],
  ] as const)('GET /stats/%s', (route, method) => {
    const path = `/stats/${route}`

    it('Debe pedir 10 resultados y devolver el ranking si no se manda limit', async () => {
      const res = await get(path).expect(200)

      expect(res.body).toEqual(RANKING)
      expect(mockStatsService[method]).toHaveBeenCalledTimes(1)
      expect(mockStatsService[method]).toHaveBeenCalledWith(10)
    })

    it.each([
      ['?limit=5', 5],
      ['?limit=25', 25],
      ['?limit=50', 50],
    ])('Debe pasar limit tal cual con %s', async (query, expectedLimit) => {
      await get(`${path}${query}`).expect(200)

      expect(mockStatsService[method]).toHaveBeenCalledWith(expectedLimit)
    })

    it.each([
      ['?limit=51', 50],
      ['?limit=100000', 50],
      ['?limit=99999999999999999999', 50],
      ['?limit=0', 1],
      ['?limit=-5', 1],
    ])(
      'Debe acotar %s a %i en vez de rechazarlo',
      async (query, expectedLimit) => {
        await get(`${path}${query}`).expect(200)

        expect(mockStatsService[method]).toHaveBeenCalledTimes(1)
        expect(mockStatsService[method]).toHaveBeenCalledWith(expectedLimit)
      },
    )

    it('Debe acotar a 50 un limit de más de 308 dígitos en vez de rechazarlo', async () => {
      await get(`${path}?limit=${'9'.repeat(400)}`).expect(200)

      expect(mockStatsService[method]).toHaveBeenCalledWith(50)
    })

    it.each(['?limit=abc', '?limit=1.5', '?limit=', '?limit=5&limit=6'])(
      'Debe responder 400 con un mensaje en español y no consultar nada con %s',
      async (query) => {
        const res = await get(`${path}${query}`).expect(400)

        expect((res.body as { message: string[] }).message).toEqual([
          'El límite debe ser un número entero',
        ])
        expect(mockStatsService[method]).not.toHaveBeenCalled()
      },
    )

    it('Debe rechazar un parámetro que el DTO no declara, como ?foo=1', async () => {
      const res = await get(`${path}?foo=1`).expect(400)

      expect((res.body as { message: string[] }).message).toEqual([
        'property foo should not exist',
      ])
      expect(mockStatsService[method]).not.toHaveBeenCalled()
    })
  })

  // El front pide estas dos rutas con ?limit=N (statsApi.ts) aunque el backend
  // no lo use: si algún día toman un DTO sin `limit`, el ValidationPipe global
  // las rompería con un 400.
  describe.each([
    ['top-active', mockUserStreakService.getTopActiveStreaks],
    ['top-chatters', mockChatLeaderboardService.getTopChatters],
  ])('GET /stats/%s', (route, serviceMethod) => {
    it('Debe devolver el ranking e ignorar el limit que manda el front', async () => {
      const res = await get(`/stats/${route}?limit=10`).expect(200)

      expect(res.body).toEqual(RANKING)
      expect(serviceMethod).toHaveBeenCalledTimes(1)
      expect(serviceMethod).toHaveBeenCalledWith()
    })
  })
})
