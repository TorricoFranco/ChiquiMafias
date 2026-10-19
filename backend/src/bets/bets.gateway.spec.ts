import type { Namespace, Socket } from 'socket.io'
import { BetsGateway } from './bets.gateway'
import type { AuthService } from '../auth/auth.service'

type Middleware = (socket: Socket, next: (err?: Error) => void) => void

interface FakeSocket {
  id: string
  handshake: { auth: { token?: string }; headers: Record<string, string> }
  data: { user?: unknown }
}

describe('BetsGateway (auth en middleware)', () => {
  const mockAuthService = { authenticateSocket: jest.fn() }

  // Inicializa el gateway y devuelve el middleware que registra en el namespace
  const getMiddleware = (): Middleware => {
    const gateway = new BetsGateway(mockAuthService as unknown as AuthService)
    let middleware: Middleware | undefined
    const namespace = {
      use: (fn: Middleware) => {
        middleware = fn
      },
    }
    gateway.afterInit(namespace as unknown as Namespace)
    if (!middleware) throw new Error('afterInit no registró el middleware')
    return middleware
  }

  const buildSocket = (token?: string): FakeSocket => ({
    id: 'socket-1',
    handshake: { auth: token ? { token } : {}, headers: {} },
    data: {},
  })

  // El middleware es asíncrono: esperamos a que llame a next
  const runMiddleware = (socket: FakeSocket) =>
    new Promise<Error | undefined>((resolve) => {
      getMiddleware()(socket as unknown as Socket, resolve)
    })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Debe rechazar la conexión sin token, sin consultar la DB', async () => {
    const error = await runMiddleware(buildSocket())

    expect(error).toBeInstanceOf(Error)
    expect(mockAuthService.authenticateSocket).not.toHaveBeenCalled()
  })

  it('Debe rechazar la conexión si el token es inválido o el usuario está baneado', async () => {
    mockAuthService.authenticateSocket.mockResolvedValue(null)

    const socket = buildSocket('token-invalido')
    const error = await runMiddleware(socket)

    expect(error).toBeInstanceOf(Error)
    expect(socket.data.user).toBeUndefined()
  })

  it('Debe cargar el usuario en socket.data antes de dejar pasar la conexión', async () => {
    const user = { id: 'user-1', role: 'USER' }
    mockAuthService.authenticateSocket.mockResolvedValue(user)

    const socket = buildSocket('token-valido')
    const error = await runMiddleware(socket)

    expect(error).toBeUndefined()
    expect(mockAuthService.authenticateSocket).toHaveBeenCalledWith(
      'token-valido',
    )
    expect(socket.data.user).toEqual(user)
  })
})
