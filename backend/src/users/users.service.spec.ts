import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, ForbiddenException } from '@nestjs/common'
import { SystemRole } from '@prisma/client'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { ChatService } from '../chat/chat.service'
import { RedisService } from '../redis/redis.service'
import { CURRENT_TERMS_VERSION } from './terms.constants'
import type { ActiveUser } from '../auth/interfaces/active-user.interface'

describe('UsersService (ban / unban)', () => {
  let service: UsersService

  const roles: Record<string, SystemRole> = {
    'mod-1': SystemRole.MODERATOR,
    'admin-1': SystemRole.ADMIN,
    'user-1': SystemRole.USER,
    'ex-mod': SystemRole.USER, // degradado: en la DB ya es USER
  }

  const mockPrisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(roles[where.id] ? { role: roles[where.id] } : null),
      ),
      update: jest.fn().mockResolvedValue({ name: 'Juan' }),
    },
  }

  const mockRedisService = {
    redis: { set: jest.fn(), del: jest.fn() },
  }

  const actor = (id: string): ActiveUser =>
    ({ id, role: roles[id] }) as ActiveUser

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatService, useValue: {} },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)

    jest.clearAllMocks()
  })

  it('Debe banear a un USER si quien banea es MODERATOR', async () => {
    await service.banUser(actor('mod-1'), 'user-1')

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'BANNED' },
    })
    expect(mockRedisService.redis.set).toHaveBeenCalledWith(
      'user:banned:user-1',
      'true',
    )
  })

  it('Debe lanzar ForbiddenException si un MODERATOR intenta banear a un ADMIN, sin tocar la DB ni Redis', async () => {
    await expect(service.banUser(actor('mod-1'), 'admin-1')).rejects.toThrow(
      ForbiddenException,
    )

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockRedisService.redis.set).not.toHaveBeenCalled()
  })

  it('Debe lanzar ForbiddenException si un MODERATOR intenta desbanear a un ADMIN', async () => {
    await expect(service.unbanUser(actor('mod-1'), 'admin-1')).rejects.toThrow(
      ForbiddenException,
    )

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockRedisService.redis.del).not.toHaveBeenCalled()
  })

  it('updateRole: Debe usar el rol de la DB y no el del JWT (ex-moderador con token vigente)', async () => {
    // El JWT todavía dice MODERATOR, pero en la DB ya es USER
    const staleActor = {
      id: 'ex-mod',
      role: SystemRole.MODERATOR,
    } as ActiveUser

    await expect(
      service.updateRole(staleActor, 'user-1', SystemRole.MODERATOR),
    ).rejects.toThrow(ForbiddenException)

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('Debe aplicar el BAN de report.resolved sin volver a chequear jerarquía', async () => {
    await service.handleReportResolved({
      action: 'BAN',
      targetUserId: 'admin-1',
    })

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { status: 'BANNED' },
    })
  })
})

describe('UsersService (aceptación de términos)', () => {
  let service: UsersService

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    footballTeam: {
      findUnique: jest.fn().mockResolvedValue({ id: 'team-1' }),
    },
  }

  const mockChatService = { updateActiveUserProfile: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatService, useValue: mockChatService },
        { provide: RedisService, useValue: {} },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)

    jest.clearAllMocks()
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue({ isFirstLogin: true })
    mockPrisma.footballTeam.findUnique.mockResolvedValue({ id: 'team-1' })
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      username: 'messi_10',
      team: null,
    })
  })

  it('completeProfile: Debe registrar la aceptación y la versión de los términos', async () => {
    await service.completeProfile('user-1', {
      username: 'messi_10',
      teamId: 'team-1',
      acceptTerms: true,
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isFirstLogin: false,
          termsAcceptedAt: expect.any(Date),
          termsVersion: CURRENT_TERMS_VERSION,
        }),
      }),
    )
  })

  it('completeProfile: No debe pisar la aceptación si el perfil ya fue completado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isFirstLogin: false })

    await expect(
      service.completeProfile('user-1', {
        username: 'otro_nombre',
        teamId: 'team-1',
        acceptTerms: true,
      }),
    ).rejects.toThrow(ConflictException)

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('acceptTerms: No debe sobrescribir la fecha si ya aceptó la versión vigente', async () => {
    const stored = {
      termsAcceptedAt: new Date('2026-10-01T10:00:00.000Z'),
      termsVersion: CURRENT_TERMS_VERSION,
    }
    mockPrisma.user.findUnique.mockResolvedValue(stored)

    const result = await service.acceptTerms('user-1')

    expect(result).toEqual(stored)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('acceptTerms: Debe guardar fecha y versión solo del usuario logueado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      termsAcceptedAt: null,
      termsVersion: null,
    })
    const accepted = {
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    }
    mockPrisma.user.update.mockResolvedValue(accepted)

    const result = await service.acceptTerms('user-1')

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        termsAcceptedAt: expect.any(Date),
        termsVersion: CURRENT_TERMS_VERSION,
      },
      select: { termsAcceptedAt: true, termsVersion: true },
    })
    expect(result).toEqual(accepted)
  })
})
