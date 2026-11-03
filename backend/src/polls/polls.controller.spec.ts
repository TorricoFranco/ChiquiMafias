import type { Server } from 'http'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { PollsController } from './polls.controller'
import { PollsService } from './polls.service'
import { RolesGuard } from '../auth/guards/roles.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

describe('PollsController', () => {
  let app: INestApplication

  const mockPollsService = { getClosedPolls: jest.fn() }

  const HISTORY = {
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }

  const getHistory = (query = '') =>
    request(app.getHttpServer() as Server).get(`/polls/history${query}`)

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PollsController],
      providers: [{ provide: PollsService, useValue: mockPollsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()

    // Lo que en la app hace el JwtAuthGuard global.
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: 'user-1' }
      next()
    })

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
    mockPollsService.getClosedPolls.mockResolvedValue(HISTORY)
  })

  describe('GET /polls/history', () => {
    it('Debe pedir la página 1 con 10 resultados para el usuario si no se manda nada', async () => {
      const res = await getHistory().expect(200)

      expect(res.body).toEqual(HISTORY)
      expect(mockPollsService.getClosedPolls).toHaveBeenCalledTimes(1)
      expect(mockPollsService.getClosedPolls).toHaveBeenCalledWith(
        1,
        10,
        'user-1',
      )
    })

    it('Debe pasar page y limit tal cual si están dentro del rango', async () => {
      await getHistory('?page=3&limit=25').expect(200)

      expect(mockPollsService.getClosedPolls).toHaveBeenCalledWith(
        3,
        25,
        'user-1',
      )
    })

    it.each([
      ['?limit=100000', 1, 50],
      ['?limit=51', 1, 50],
      ['?page=-1', 1, 10],
      ['?page=0&limit=0', 1, 1],
      ['?page=99999999999999999999&limit=-5', 1_000_000, 1],
    ])(
      'Debe acotar %s en vez de rechazarlo',
      async (query, expectedPage, expectedLimit) => {
        await getHistory(query).expect(200)

        expect(mockPollsService.getClosedPolls).toHaveBeenCalledWith(
          expectedPage,
          expectedLimit,
          'user-1',
        )
      },
    )

    it.each([
      ['?page=abc', 'La página debe ser un número entero'],
      ['?limit=1.5', 'El límite debe ser un número entero'],
      ['?limit=', 'El límite debe ser un número entero'],
      ['?page=1&page=2', 'La página debe ser un número entero'],
    ])(
      'Debe responder 400 con un mensaje en español y no consultar nada con %s',
      async (query, message) => {
        const res = await getHistory(query).expect(400)

        expect((res.body as { message: string[] }).message).toEqual([message])
        expect(mockPollsService.getClosedPolls).not.toHaveBeenCalled()
      },
    )

    it('Debe rechazar un parámetro que el DTO no declara, como ?foo=1', async () => {
      const res = await getHistory('?foo=1').expect(400)

      expect((res.body as { message: string[] }).message).toEqual([
        'property foo should not exist',
      ])
      expect(mockPollsService.getClosedPolls).not.toHaveBeenCalled()
    })
  })
})
