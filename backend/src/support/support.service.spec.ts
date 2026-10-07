import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SystemRole } from '@prisma/client'
import { SupportService } from './support.service'
import { PrismaService } from '../prisma/prisma.service'

describe('SupportService (resolveReport)', () => {
  let service: SupportService

  // UUIDs de 36 caracteres: así resolveReport los toma como admin web
  const MOD_ID = '11111111-1111-4111-8111-111111111111'
  const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
  const USER_ID = '33333333-3333-4333-8333-333333333333'
  // Snowflake de Discord: no es UUID, así que se toma como acción del bot
  const DISCORD_ID = '987654321098765432'

  const roles: Record<string, SystemRole> = {
    [MOD_ID]: SystemRole.MODERATOR,
    [ADMIN_ID]: SystemRole.ADMIN,
    [USER_ID]: SystemRole.USER,
  }

  const mockPrisma = {
    report: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(roles[where.id] ? { role: roles[where.id] } : null),
      ),
    },
  }

  const mockEventEmitter = { emit: jest.fn() }

  const pendingReportAgainst = (reportedId: string) => ({
    id: 'report-1',
    reportedId,
    status: 'PENDING',
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile()

    service = module.get<SupportService>(SupportService)

    jest.clearAllMocks()
    mockPrisma.report.updateMany.mockResolvedValue({ count: 1 })
  })

  it('Debe resolver y emitir report.resolved si el MODERATOR supera al reportado', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(USER_ID),
    )

    await service.resolveReport('report-1', MOD_ID, 'BAN')

    expect(mockPrisma.report.updateMany).toHaveBeenCalledWith({
      where: { id: 'report-1', status: { not: 'RESOLVED' } },
      data: { status: 'RESOLVED', resolvedById: MOD_ID },
    })
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'report.resolved',
      expect.objectContaining({ targetUserId: USER_ID, action: 'BAN' }),
    )
  })

  it('Debe lanzar ForbiddenException si un MODERATOR intenta sancionar a un ADMIN desde la web, sin resolver ni emitir', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(ADMIN_ID),
    )

    await expect(
      service.resolveReport('report-1', MOD_ID, 'BAN'),
    ).rejects.toThrow(ForbiddenException)

    expect(mockPrisma.report.updateMany).not.toHaveBeenCalled()
    expect(mockEventEmitter.emit).not.toHaveBeenCalled()
  })

  it('Debe permitir que un MODERATOR resuelva con WARN un reporte contra un ADMIN (WARN no exige jerarquía)', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(ADMIN_ID),
    )

    await service.resolveReport('report-1', MOD_ID, 'WARN')

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'report.resolved',
      expect.objectContaining({ targetUserId: ADMIN_ID, action: 'WARN' }),
    )
  })

  it('Debe lanzar ForbiddenException si alguien resuelve desde la web un reporte contra sí mismo, aunque sea WARN', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(pendingReportAgainst(MOD_ID))

    await expect(
      service.resolveReport('report-1', MOD_ID, 'WARN'),
    ).rejects.toThrow(ForbiddenException)

    expect(mockPrisma.report.updateMany).not.toHaveBeenCalled()
  })

  it('Discord: Debe permitir BAN si el reportado es USER', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(USER_ID),
    )

    await service.resolveReport('report-1', DISCORD_ID, 'BAN')

    expect(mockPrisma.report.updateMany).toHaveBeenCalledWith({
      where: { id: 'report-1', status: { not: 'RESOLVED' } },
      data: { status: 'RESOLVED', resolvedById: null },
    })
    expect(mockEventEmitter.emit).toHaveBeenCalled()
  })

  it('Discord: Debe lanzar ForbiddenException si intenta BAN, MUTE o UNBAN a un miembro del staff, sin resolver ni emitir', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(pendingReportAgainst(MOD_ID))

    for (const action of ['BAN', 'MUTE', 'UNBAN'] as const) {
      await expect(
        service.resolveReport('report-1', DISCORD_ID, action),
      ).rejects.toThrow(ForbiddenException)
    }

    expect(mockPrisma.report.updateMany).not.toHaveBeenCalled()
    expect(mockEventEmitter.emit).not.toHaveBeenCalled()
  })

  it('Discord: Debe permitir WARN a un miembro del staff', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(ADMIN_ID),
    )

    await service.resolveReport('report-1', DISCORD_ID, 'WARN')

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockEventEmitter.emit).toHaveBeenCalled()
  })

  it('Debe lanzar BadRequestException y no emitir si otra resolución ganó la carrera (Concurrencia simulada)', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(
      pendingReportAgainst(USER_ID),
    )
    // Leyó PENDING, pero otro proceso lo resolvió antes del update
    mockPrisma.report.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      service.resolveReport('report-1', MOD_ID, 'BAN'),
    ).rejects.toThrow(BadRequestException)

    expect(mockEventEmitter.emit).not.toHaveBeenCalled()
  })
})
