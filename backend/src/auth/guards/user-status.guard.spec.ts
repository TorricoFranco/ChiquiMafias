import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserStatusGuard } from './user-status.guard'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'

describe('UserStatusGuard', () => {
  const mockRedis = { status: 'ready', get: jest.fn() }
  const redisService = { redis: mockRedis } as unknown as RedisService
  const mockPrisma = { user: { findUnique: jest.fn() } }
  const reflector = { getAllAndOverride: jest.fn() }

  let guard: UserStatusGuard

  const contextFor = (user: Record<string, unknown> | undefined) => {
    const request = { user }
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext
    return { context, request }
  }

  beforeEach(() => {
    // reset (no clear): cada test define sus respuestas sin heredar las del anterior.
    jest.resetAllMocks()
    mockRedis.status = 'ready'
    reflector.getAllAndOverride.mockReturnValue(false)
    guard = new UserStatusGuard(
      reflector as unknown as Reflector,
      redisService,
      mockPrisma as unknown as PrismaService,
    )
  })

  it('Debe dejar pasar una request sin usuario sin consultar Redis', async () => {
    const { context } = contextFor(undefined)

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(mockRedis.get).not.toHaveBeenCalled()
  })

  it('Debe lanzar ForbiddenException USER_BANNED si Redis y la DB dicen baneado aunque el token diga que no', async () => {
    mockRedis.get.mockResolvedValue('true')
    mockPrisma.user.findUnique.mockResolvedValue({ status: 'BANNED' })
    const { context, request } = contextFor({ id: 'user-1', isBanned: false })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
    expect(mockRedis.get).toHaveBeenCalledWith('user:banned:user-1')
    expect(request.user?.isBanned).toBe(true)
  })

  it('Debe bloquear sin consultar la DB si la key y el token coinciden en baneado', async () => {
    mockRedis.get.mockResolvedValue('true')
    const { context } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('Debe dejar pasar si quedó una key vieja (falló el DEL del unban) y la DB dice activo', async () => {
    mockRedis.get.mockResolvedValue('true')
    mockPrisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' })
    const { context, request } = contextFor({ id: 'user-1', isBanned: false })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user?.isBanned).toBe(false)
  })

  it('Debe bloquear (fail closed) si la key y el token difieren y la DB no responde', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB caída'))
    const { context } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
  })

  it('Debe dejar pasar a un usuario sin key ni ban en el token sin consultar la DB', async () => {
    mockRedis.get.mockResolvedValue(null)
    const { context } = contextFor({ id: 'user-1', isBanned: false })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('Debe dejar pasar a un usuario desbaneado con un token viejo si la DB lo confirma activo', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' })
    const { context, request } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user?.isBanned).toBe(false)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { status: true },
    })
  })

  it('Debe bloquear si falta la key pero el token y la DB dicen baneado (la key no se llegó a escribir)', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue({ status: 'BANNED' })
    const { context } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
  })

  it('Debe dejar pasar a un baneado en una ruta @AllowBannedForAppeal con isBanned en true', async () => {
    mockRedis.get.mockResolvedValue('true')
    mockPrisma.user.findUnique.mockResolvedValue({ status: 'BANNED' })
    reflector.getAllAndOverride.mockReturnValue(true)
    const { context, request } = contextFor({ id: 'user-1', isBanned: false })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user?.isBanned).toBe(true)
  })

  it('Debe usar el claim del token sin consultar Redis si la conexión no está lista', async () => {
    mockRedis.status = 'reconnecting'
    const { context } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
    expect(mockRedis.get).not.toHaveBeenCalled()
  })

  it('Debe usar el claim del token si Redis falla', async () => {
    mockRedis.get.mockRejectedValue(new Error('Connection is closed.'))
    const { context } = contextFor({ id: 'user-1', isBanned: false })

    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('No debe colgar la request si Redis no responde', async () => {
    mockRedis.get.mockReturnValue(new Promise(() => {}))
    const { context } = contextFor({ id: 'user-1', isBanned: true })

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })
})
