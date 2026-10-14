import { Test, TestingModule } from '@nestjs/testing'
import { Socket } from 'socket.io'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { AuthService } from 'src/auth/auth.service'
import { RedisService } from '../redis/redis.service'

describe('ChatGateway', () => {
  let gateway: ChatGateway

  const mockChatService = {
    onClientConnected: jest.fn(),
    onClientDisconnected: jest.fn(),
    getConnectedClients: jest.fn(() => []),
  }

  const mockAuthService = {
    authenticateSocket: jest.fn(),
  }

  const mockRedis = {
    get: jest.fn(),
    del: jest.fn(),
    lrange: jest.fn(),
  }

  const serverEmit = jest.fn()

  /** Socket falso, con lo que se le emitió, si lo desconectaron y su `data` a la vista. */
  const buildSocket = (token?: string) => {
    const emit = jest.fn()
    const disconnect = jest.fn()
    const join = jest.fn()
    const data: { user?: { id: string } } = {}
    const socket = {
      id: 'socket-1',
      handshake: { auth: token ? { token } : {} },
      data,
      emit,
      disconnect,
      join,
    } as unknown as Socket

    return { socket, emit, disconnect, join, data }
  }

  const history = [
    { messageId: 'm-1', message: 'Vamos que se gana' },
    { messageId: 'm-2', message: 'Dale campeón' },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: { redis: mockRedis } },
      ],
    }).compile()

    gateway = module.get<ChatGateway>(ChatGateway)
    gateway.server = { emit: serverEmit } as never

    jest.clearAllMocks()
    mockRedis.lrange.mockResolvedValue(history.map((m) => JSON.stringify(m)))
    mockRedis.get.mockResolvedValue(null)
    mockChatService.getConnectedClients.mockReturnValue([])
  })

  describe('handleConnection', () => {
    it('Debe mandarle el historial del chat a un visitante sin token', async () => {
      const { socket, emit, disconnect } = buildSocket()

      await gateway.handleConnection(socket)

      expect(mockRedis.lrange).toHaveBeenCalledWith(
        'chat:global:history',
        0,
        -1,
      )
      expect(emit).toHaveBeenCalledWith('global_chat_history', history)
      expect(disconnect).not.toHaveBeenCalled()
      expect(serverEmit).not.toHaveBeenCalledWith(
        'on-clients-changed',
        expect.anything(),
      )
    })

    it('No debe cortar la conexión del visitante si Redis falla', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('redis caído'))
      const { socket, emit, disconnect } = buildSocket()

      await gateway.handleConnection(socket)

      expect(disconnect).not.toHaveBeenCalled()
      expect(emit).not.toHaveBeenCalledWith(
        'global_chat_history',
        expect.anything(),
      )
    })

    it('Debe saltear un mensaje corrupto y entregar el resto del historial', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify(history[0]),
        '{ roto',
        JSON.stringify(history[1]),
      ])
      const { socket, emit, disconnect } = buildSocket()

      await gateway.handleConnection(socket)

      expect(emit).toHaveBeenCalledWith('global_chat_history', history)
      expect(disconnect).not.toHaveBeenCalled()
    })

    it('No debe tratar al visitante como un usuario conectado ni autenticarlo', async () => {
      const { socket, join, data } = buildSocket()

      await gateway.handleConnection(socket)

      expect(mockAuthService.authenticateSocket).not.toHaveBeenCalled()
      expect(mockChatService.onClientConnected).not.toHaveBeenCalled()
      expect(join).not.toHaveBeenCalled()
      expect(data.user).toBeUndefined()
    })

    it('Debe mandarle el historial y la bienvenida a un usuario autenticado', async () => {
      mockAuthService.authenticateSocket.mockResolvedValue({
        id: 'user-1',
        username: 'elmasgrande',
        tier: 'NONE',
        role: 'USER',
      })
      const { socket, emit, join } = buildSocket('token-valido')

      await gateway.handleConnection(socket)

      expect(emit).toHaveBeenCalledWith('global_chat_history', history)
      expect(emit).toHaveBeenCalledWith(
        'welcome-message',
        expect.stringContaining('tribuna'),
      )
      expect(join).toHaveBeenCalledWith('user:user-1')
      expect(mockChatService.onClientConnected).toHaveBeenCalled()
    })

    it('Debe cortar la conexión si el token no es válido', async () => {
      mockAuthService.authenticateSocket.mockResolvedValue(null)
      const { socket, emit, disconnect } = buildSocket('token-vencido')

      await gateway.handleConnection(socket)

      expect(disconnect).toHaveBeenCalled()
      expect(emit).not.toHaveBeenCalledWith(
        'global_chat_history',
        expect.anything(),
      )
    })
  })
})
