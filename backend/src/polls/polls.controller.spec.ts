import type { Server } from 'http'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { PollsController } from './polls.controller'
import { PollsService } from './polls.service'
import { RolesGuard } from '../auth/guards/roles.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IS_OPTIONAL_KEY } from '../auth/decorators/auth.decorator'

describe('PollsController', () => {
  let app: INestApplication

  const mockPollsService = {
    getClosedPolls: jest.fn(),
    getPollComments: jest.fn(),
  }

  const HISTORY = {
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  }

  const COMMENTS = {
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  }

  // Quien hace el pedido; `undefined` es un visitante sin sesión.
  let currentUser: { id: string } | undefined

  const getHistory = (query = '') =>
    request(app.getHttpServer() as Server).get(`/polls/history${query}`)

  const getComments = (query = '', pollId = 'poll-1') =>
    request(app.getHttpServer() as Server).get(
      `/polls/${pollId}/comments${query}`,
    )

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
      if (currentUser) req.user = currentUser
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
    currentUser = { id: 'user-1' }
    mockPollsService.getClosedPolls.mockResolvedValue(HISTORY)
    mockPollsService.getPollComments.mockResolvedValue(COMMENTS)
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

  describe('GET /polls/:id/comments', () => {
    it('Debe pedir la página 1 con 20 comentarios de la encuesta para el usuario si no se manda nada', async () => {
      const res = await getComments().expect(200)

      expect(res.body).toEqual(COMMENTS)
      expect(mockPollsService.getPollComments).toHaveBeenCalledTimes(1)
      expect(mockPollsService.getPollComments).toHaveBeenCalledWith(
        'poll-1',
        1,
        20,
        'user-1',
      )
    })

    it('Debe pasar page y limit tal cual si están dentro del rango, como los manda el front', async () => {
      await getComments('?page=1&limit=20', 'poll-7').expect(200)
      await getComments('?page=3&limit=25', 'poll-7').expect(200)

      expect(mockPollsService.getPollComments.mock.calls).toEqual([
        ['poll-7', 1, 20, 'user-1'],
        ['poll-7', 3, 25, 'user-1'],
      ])
    })

    it('Debe tener la sesión opcional (@OptionalAuth): sin la marca, el guard global rechaza a los visitantes', () => {
      // Este módulo de test no monta el guard global, así que los demás tests de
      // la ruta no notarían que se la saquen.
      const handler = (
        PollsController.prototype as unknown as Record<string, object>
      ).getComments

      expect(Reflect.getMetadata(IS_OPTIONAL_KEY, handler) as boolean).toBe(
        true,
      )
    })

    it('Debe responder a un visitante sin sesión y pasar el usuario en null', async () => {
      currentUser = undefined

      await getComments().expect(200)

      expect(mockPollsService.getPollComments).toHaveBeenCalledWith(
        'poll-1',
        1,
        20,
        null,
      )
    })

    it('Debe acotar el límite aunque quien pide no tenga sesión', async () => {
      currentUser = undefined

      await getComments('?limit=100000').expect(200)

      expect(mockPollsService.getPollComments).toHaveBeenCalledWith(
        'poll-1',
        1,
        50,
        null,
      )
    })

    it.each([
      ['?limit=100000', 1, 50],
      ['?limit=51', 1, 50],
      ['?page=-1', 1, 20],
      ['?page=0', 1, 20],
      ['?page=0&limit=0', 1, 1],
      ['?page=99999999999999999999&limit=-5', 1_000_000, 1],
    ])(
      'Debe acotar %s en vez de rechazarlo',
      async (query, expectedPage, expectedLimit) => {
        await getComments(query).expect(200)

        expect(mockPollsService.getPollComments).toHaveBeenCalledWith(
          'poll-1',
          expectedPage,
          expectedLimit,
          'user-1',
        )
      },
    )

    it.each([
      ['?page=abc', 'La página debe ser un número entero'],
      ['?page=', 'La página debe ser un número entero'],
      ['?limit=1.5', 'El límite debe ser un número entero'],
      ['?limit=', 'El límite debe ser un número entero'],
      ['?page=1&page=2', 'La página debe ser un número entero'],
    ])(
      'Debe responder 400 con un mensaje en español y no consultar nada con %s',
      async (query, message) => {
        const res = await getComments(query).expect(400)

        expect((res.body as { message: string[] }).message).toEqual([message])
        expect(mockPollsService.getPollComments).not.toHaveBeenCalled()
      },
    )

    it('Debe rechazar un parámetro que el DTO no declara, como ?foo=1', async () => {
      const res = await getComments('?foo=1').expect(400)

      expect((res.body as { message: string[] }).message).toEqual([
        'property foo should not exist',
      ])
      expect(mockPollsService.getPollComments).not.toHaveBeenCalled()
    })
  })
})
