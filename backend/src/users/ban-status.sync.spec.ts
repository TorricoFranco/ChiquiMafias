import { Test, TestingModule } from '@nestjs/testing'
import { BanStatusSync } from './ban-status.sync'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

describe('BanStatusSync', () => {
  let sync: BanStatusSync

  const pipeline = { set: jest.fn(), exec: jest.fn() }
  const mockRedis = {
    pipeline: jest.fn(() => pipeline),
    scan: jest.fn(),
    del: jest.fn(),
  }
  const mockPrisma = { user: { findMany: jest.fn() } }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanStatusSync,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { redis: mockRedis } },
      ],
    }).compile()

    sync = module.get(BanStatusSync)
    jest.clearAllMocks()
  })

  it('Debe escribir la key de cada baneado y borrar las de usuarios que ya no lo están', async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([{ id: 'baneado' }])
      .mockResolvedValueOnce([])
    mockRedis.scan
      .mockResolvedValueOnce(['7', ['user:banned:baneado']])
      .mockResolvedValueOnce(['0', ['user:banned:desbaneado']])

    await sync.sync()

    expect(pipeline.set).toHaveBeenCalledWith('user:banned:baneado', 'true')
    expect(pipeline.exec).toHaveBeenCalled()
    expect(mockPrisma.user.findMany).toHaveBeenLastCalledWith({
      where: { id: { in: ['desbaneado'] }, status: 'BANNED' },
      select: { id: true },
    })
    expect(mockRedis.del).toHaveBeenCalledWith('user:banned:desbaneado')
  })

  it('No debe borrar la key de alguien que fue baneado mientras se escaneaba', async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'recien-baneado' }])
    mockRedis.scan.mockResolvedValueOnce(['0', ['user:banned:recien-baneado']])

    await sync.sync()

    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('No debe tocar Redis de más si no hay baneados ni keys', async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([])
    mockRedis.scan.mockResolvedValueOnce(['0', []])

    await sync.sync()

    expect(mockRedis.pipeline).not.toHaveBeenCalled()
    expect(mockRedis.del).not.toHaveBeenCalled()
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1)
  })

  it('Si la sincronización falla al arrancar, loguea y no tumba la app', async () => {
    mockPrisma.user.findMany.mockRejectedValueOnce(new Error('DB caída'))

    await expect(sync.onApplicationBootstrap()).resolves.toBeUndefined()
  })
})
