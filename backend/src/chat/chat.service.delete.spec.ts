import { SystemRole } from 'src/auth/enums/roles.enum'
import { ChatService } from './chat.service'

describe('ChatService — borrar mensajes', () => {
  let service: ChatService
  const redis = { lrange: jest.fn(), lrem: jest.fn() }

  const stored = (messageId: string, userId: string) =>
    JSON.stringify({ messageId, userId, message: 'hola' })

  const user = { id: 'u1', role: SystemRole.USER }
  const other = { id: 'u2', role: SystemRole.USER }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ChatService(
      { redis } as any,
      {} as any,
      { emit: jest.fn() } as any,
    )
    redis.lrange.mockResolvedValue([stored('m1', 'u1'), stored('m2', 'u3')])
  })

  it('Debe dejar que el autor borre su propio mensaje global', async () => {
    const result = await service.deleteGlobalMessage('m1', user)

    expect(result).toBe('deleted')
    expect(redis.lrem).toHaveBeenCalledWith(
      'chat:global:history',
      1,
      stored('m1', 'u1'),
    )
  })

  it('Debe rechazar que un usuario común borre el mensaje de otro', async () => {
    const result = await service.deleteGlobalMessage('m1', other)

    expect(result).toBe('forbidden')
    expect(redis.lrem).not.toHaveBeenCalled()
  })

  it.each([SystemRole.MODERATOR, SystemRole.ADMIN, SystemRole.PRESIDENT])(
    'Debe dejar que %s borre el mensaje de otro',
    async (role) => {
      const result = await service.deleteGlobalMessage('m1', {
        id: 'u9',
        role,
      })

      expect(result).toBe('deleted')
      expect(redis.lrem).toHaveBeenCalledTimes(1)
    },
  )

  it('Debe devolver not_found si el mensaje no está en el historial', async () => {
    const result = await service.deleteGlobalMessage('nope', user)

    expect(result).toBe('not_found')
    expect(redis.lrem).not.toHaveBeenCalled()
  })

  it('Debe borrar de la lista del partido y respetar los mismos permisos', async () => {
    await expect(service.deleteMatchMessage('p1', 'm1', other)).resolves.toBe(
      'forbidden',
    )
    await expect(service.deleteMatchMessage('p1', 'm1', user)).resolves.toBe(
      'deleted',
    )

    expect(redis.lrange).toHaveBeenCalledWith('chat:match:p1:history', 0, -1)
    expect(redis.lrem).toHaveBeenCalledWith(
      'chat:match:p1:history',
      1,
      stored('m1', 'u1'),
    )
  })
})
