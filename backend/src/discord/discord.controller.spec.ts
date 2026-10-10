import { Test, TestingModule } from '@nestjs/testing'
import { Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PATH_METADATA } from '@nestjs/common/constants'
import { DiscordController } from './discord.controller'
import { SupportService } from '../support/support.service'

// Todas las rutas de este controller son @Public() y pueden banear usuarios:
// el único control es el header x-discord-bot-token. El test recorre todos los
// handlers con ruta, así que una ruta nueva sin validateToken lo rompe.

type RouteHandler = (
  token: string | undefined,
  arg?: unknown,
) => Promise<unknown>

const routeHandlers = Object.getOwnPropertyNames(
  DiscordController.prototype,
).filter(
  (name) =>
    name !== 'constructor' &&
    Reflect.getMetadata(
      PATH_METADATA,
      DiscordController.prototype[name as keyof DiscordController],
    ) !== undefined,
)

describe('DiscordController (token del bot)', () => {
  let controller: DiscordController

  const BOT_SECRET = 'secret-del-bot'

  const mockSupportService = {
    resolveReport: jest.fn(),
    createTicketMessage: jest.fn(),
    updateTicketStatus: jest.fn(),
    getTickets: jest.fn(),
    getReports: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'DISCORD_INTERNAL_SECRET' ? BOT_SECRET : undefined,
    ),
  }

  // Se llama como método del controller para que conserve el this
  const callRoute = (name: string, token: string | undefined) =>
    (controller as unknown as Record<string, RouteHandler>)[name](token, {})

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscordController],
      providers: [
        { provide: SupportService, useValue: mockSupportService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    controller = module.get<DiscordController>(DiscordController)

    jest.clearAllMocks()
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Debe encontrar todas las rutas del controller', () => {
    expect(routeHandlers).toEqual(
      expect.arrayContaining([
        'handleDiscordAction',
        'handleDiscordMessage',
        'updateTicketStatus',
        'getBotTickets',
        'getBotReports',
      ]),
    )
  })

  describe.each(routeHandlers)('%s', (name) => {
    it('Debe rechazar con 401 sin el header, sin llamar a SupportService', async () => {
      await expect(callRoute(name, undefined)).rejects.toThrow(
        UnauthorizedException,
      )
      Object.values(mockSupportService).forEach((fn) =>
        expect(fn).not.toHaveBeenCalled(),
      )
    })

    it('Debe rechazar con 401 un token incorrecto, sin llamar a SupportService', async () => {
      await expect(callRoute(name, 'token-trucho')).rejects.toThrow(
        UnauthorizedException,
      )
      Object.values(mockSupportService).forEach((fn) =>
        expect(fn).not.toHaveBeenCalled(),
      )
    })
  })

  it('Con el token correcto, action debe resolver el reporte con los datos del bot', async () => {
    mockSupportService.resolveReport.mockResolvedValue({ status: 'ok' })

    await controller.handleDiscordAction(BOT_SECRET, {
      reportId: 'report-1',
      adminDiscordId: 'discord-admin-1',
      action: 'MUTE',
      durationHours: 2,
      reason: 'Spam en el chat',
    })

    expect(mockSupportService.resolveReport).toHaveBeenCalledWith(
      'report-1',
      'discord-admin-1',
      'MUTE',
      2,
      'Spam en el chat',
    )
  })
})
