import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SystemRole, TicketCategory, TicketStatus } from '@prisma/client'
import { SupportService } from './support.service'
import { PrismaService } from '../prisma/prisma.service'

describe('SupportService (apelaciones de usuarios baneados)', () => {
  let service: SupportService

  const USER_ID = 'user-baneado'

  const mockPrisma = {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    ticket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    ticketMessage: { create: jest.fn() },
  }

  const mockEventEmitter = { emit: jest.fn() }

  const appealDto = {
    category: TicketCategory.APPEAL,
    subject: 'Apelación de suspensión',
    message: 'Creo que me suspendieron por error, no insulté a nadie.',
  }

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
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
    )
    mockPrisma.ticket.create.mockResolvedValue({ id: 'ticket-1', messages: [] })
  })

  describe('createTicket', () => {
    it('Debe dejar que un usuario baneado abra una apelación si no tiene otra en curso', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null)

      await service.createTicket(USER_ID, appealDto, true)

      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          category: TicketCategory.APPEAL,
          status: { in: [TicketStatus.OPEN, TicketStatus.UNDER_REVIEW] },
        },
        select: { id: true },
      })
      expect(mockPrisma.ticket.create).toHaveBeenCalled()
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'ticket.created',
        expect.anything(),
      )
    })

    it('Debe tomar el lock de apelaciones del usuario antes de chequear si tiene una en curso', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null)

      await service.createTicket(USER_ID, appealDto, true)

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
      const [sql, lockKey] = mockPrisma.$executeRaw.mock.calls[0] as [
        TemplateStringsArray,
        string,
      ]
      expect(sql.join('?')).toContain('pg_advisory_xact_lock')
      expect(lockKey).toBe(`appeal:${USER_ID}`)
      expect(mockPrisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        mockPrisma.ticket.findFirst.mock.invocationCallOrder[0],
      )
    })

    it('Debe emitir ticket.created recién después de la transacción', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const result = await cb(mockPrisma)
          expect(mockEventEmitter.emit).not.toHaveBeenCalled()
          return result
        },
      )

      await service.createTicket(USER_ID, appealDto, true)

      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1)
    })

    it('Debe lanzar ForbiddenException si un usuario baneado intenta abrir un ticket que no es apelación, sin crearlo', async () => {
      await expect(
        service.createTicket(
          USER_ID,
          { ...appealDto, category: TicketCategory.SUPPORT },
          true,
        ),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.ticket.create).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si el usuario baneado ya tiene una apelación en curso, sin crear otra', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: 'apelacion-abierta' })

      await expect(
        service.createTicket(USER_ID, appealDto, true),
      ).rejects.toThrow(BadRequestException)

      expect(mockPrisma.ticket.create).not.toHaveBeenCalled()
    })

    it('Debe crear tickets de cualquier categoría para un usuario no baneado sin consultar apelaciones', async () => {
      await service.createTicket(USER_ID, {
        ...appealDto,
        category: TicketCategory.SUPPORT,
      })

      expect(mockPrisma.ticket.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
      expect(mockPrisma.ticket.create).toHaveBeenCalled()
    })
  })

  describe('createTicketMessage', () => {
    const ticketOf = (
      category: TicketCategory,
      overrides: { userId?: string; status?: TicketStatus } = {},
    ) => ({
      id: 'ticket-1',
      userId: USER_ID,
      status: TicketStatus.OPEN,
      category,
      discordThreadId: null,
      ...overrides,
    })

    it('Debe permitir que un usuario baneado responda en su apelación', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(
        ticketOf(TicketCategory.APPEAL),
      )

      await service.createTicketMessage(
        'ticket-1',
        USER_ID,
        SystemRole.USER,
        { message: 'Adjunto más contexto' },
        false,
        true,
      )

      expect(mockPrisma.ticketMessage.create).toHaveBeenCalled()
    })

    it('Debe lanzar ForbiddenException si un usuario baneado responde en un ticket que no es apelación, sin guardar el mensaje', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(
        ticketOf(TicketCategory.SUPPORT),
      )

      await expect(
        service.createTicketMessage(
          'ticket-1',
          USER_ID,
          SystemRole.USER,
          { message: 'Hola' },
          false,
          true,
        ),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.ticketMessage.create).not.toHaveBeenCalled()
    })

    it('Debe lanzar ForbiddenException si un moderador baneado responde en la apelación de otro usuario, sin guardar el mensaje', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(
        ticketOf(TicketCategory.APPEAL, { userId: 'otro-usuario' }),
      )

      await expect(
        service.createTicketMessage(
          'ticket-1',
          USER_ID,
          SystemRole.MODERATOR,
          { message: 'Soy del staff' },
          false,
          true,
        ),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.ticketMessage.create).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si un usuario baneado responde en una apelación ya resuelta, sin guardar el mensaje', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(
        ticketOf(TicketCategory.APPEAL, { status: TicketStatus.RESOLVED }),
      )

      await expect(
        service.createTicketMessage(
          'ticket-1',
          USER_ID,
          SystemRole.USER,
          { message: 'Insisto' },
          false,
          true,
        ),
      ).rejects.toThrow(BadRequestException)

      expect(mockPrisma.ticketMessage.create).not.toHaveBeenCalled()
    })

    it('Debe dejar que un moderador no baneado responda en un ticket ajeno', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(
        ticketOf(TicketCategory.APPEAL, { userId: 'otro-usuario' }),
      )

      await service.createTicketMessage(
        'ticket-1',
        USER_ID,
        SystemRole.MODERATOR,
        { message: 'Lo revisamos' },
      )

      expect(mockPrisma.ticketMessage.create).toHaveBeenCalled()
    })
  })

  describe('tickets propios de un usuario baneado', () => {
    it('Debe listar solo sus apelaciones', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([])

      await service.getMyTickets(USER_ID, true)

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, category: TicketCategory.APPEAL },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('Debe listar todos los tickets de un usuario no baneado', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([])

      await service.getMyTickets(USER_ID)

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('Debe buscar el detalle restringido a apelaciones', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        messages: [],
      })

      await service.getMyTicketDetails('ticket-1', USER_ID, true)

      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'ticket-1',
            userId: USER_ID,
            category: TicketCategory.APPEAL,
          },
        }),
      )
    })
  })
})
