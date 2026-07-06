import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateReportDto } from './dto/create-report.dto'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ReportResolvedPayload } from './interfaces/report-resolved.interface'
import { TicketCategory, TicketStatus } from '@prisma/client/wasm'

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (reporterId === dto.reportedId) {
      throw new BadRequestException('No puedes reportarte a ti mismo, rey.')
    }

    const reportedUser = await this.prisma.user.findUnique({
      where: { id: dto.reportedId },
    })
    if (!reportedUser) {
      throw new NotFoundException('El usuario reportado no existe.')
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedId,
        reason: dto.reason,
        details: dto.details,
      },
    })

    this.eventEmitter.emit('report.created', report)

    return report
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        userId,
        category: dto.category,
        subject: dto.subject,
        messages: {
          create: {
            senderId: userId,
            message: dto.message,
            screenshotUrl: dto.screenshotUrl || null,
          },
        },
      },
      include: { messages: true },
    })

    this.eventEmitter.emit('ticket.created', ticket)

    return ticket
  }

  async createTicketMessage(
    ticketIdOrThreadId: string,
    senderId: string,
    role: SystemRole,
    dto: CreateTicketMessageDto,
    fromDiscord: boolean = false,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { id: ticketIdOrThreadId },
          { discordThreadId: ticketIdOrThreadId },
        ],
      },
      select: { id: true, userId: true, status: true, discordThreadId: true },
    })

    if (!ticket) throw new NotFoundException('El ticket no existe.')
    if (ticket.status === 'CLOSED')
      throw new BadRequestException('Este ticket ya está cerrado.')

    // Si viene de Discord, salteamos esta validación porque el rol ya viene forzado como ADMIN
    if (
      !fromDiscord &&
      ticket.userId !== senderId &&
      role !== SystemRole.ADMIN
    ) {
      throw new ForbiddenException('No podés responder en un ticket ajeno.')
    }

    // --- RESOLUCIÓN DEL SENDER ID RELACIONAL ---
    let dbSenderId = senderId

    if (fromDiscord) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: senderId },
      })

      if (!userExists) {
        const systemAdmin = await this.prisma.user.findFirst({
          where: {
            role: SystemRole.ADMIN,
          },
        })

        if (!systemAdmin) {
          throw new NotFoundException(
            'No se encontró un usuario Administrador en la DB para vincular el mensaje de Discord.',
          )
        }

        dbSenderId = systemAdmin.id
      }
    }

    // Guardamos el mensaje usando un ID que la base de datos sí reconozca
    const newMessage = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: dbSenderId, // <-- ID de la DB garantizado
        message: dto.message,
        screenshotUrl: dto.screenshotUrl || null,
        fromDiscord,
      },
    })

    if (!fromDiscord && ticket.discordThreadId) {
      this.eventEmitter.emit('ticket.message.created', {
        discordThreadId: ticket.discordThreadId,
        message: dto.message,
        screenshotUrl: dto.screenshotUrl,
      })
    }

    return newMessage
  }

  async getReports() {
    return await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, email: true } },
        reported: { select: { id: true, username: true, email: true } },
      },
    })
  }

  async getTickets(
    page: number,
    limit: number,
    status?: TicketStatus,
    category?: TicketCategory,
  ) {
    const skip = (page - 1) * limit

    const whereCondition: any = {}
    if (status) whereCondition.status = status
    if (category) whereCondition.category = category

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Los más nuevos primero
        include: { user: { select: { id: true, username: true } } },
      }),
      this.prisma.ticket.count({ where: whereCondition }),
    ])

    return {
      data: tickets,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    }
  }

  async resolveReport(
    reportId: string,
    adminIdentifier: string,
    action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN',
    durationHours?: number,
    reason?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    })

    if (!report) throw new NotFoundException('Reporte no encontrado')
    if (report.status === 'RESOLVED')
      throw new BadRequestException('El reporte ya fue resuelto')

    const isFromWebAdmin = adminIdentifier.length === 36

    const resolvedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolvedById: isFromWebAdmin ? adminIdentifier : null,
      },
    })

    this.eventEmitter.emit('report.resolved', {
      reportId: resolvedReport.id,
      targetUserId: report.reportedId,
      action,
      durationHours,
      reason,
    } as ReportResolvedPayload)

    return resolvedReport
  }

  async getMyTickets(userId: string) {
    return await this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    })
    if (!ticket) throw new NotFoundException('Ticket no encontrado')

    return await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    })
  }

  async getMyTicketDetails(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, userId: userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, username: true } } },
        },
      },
    })

    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    return ticket
  }

  async getAdminTicketDetails(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, username: true } },
          },
        },
      },
    })

    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    return ticket
  }
}
