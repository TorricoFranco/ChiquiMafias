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
import { assertCanSanction } from 'src/auth/utils/assert-can-sanction'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ReportResolvedPayload } from './interfaces/report-resolved.interface'
import {
  Prisma,
  TicketCategory,
  TicketStatus,
  ReportStatus,
} from '@prisma/client'

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSupportStats() {
    const [openTickets, pendingReports] = await Promise.all([
      this.prisma.ticket.count({
        where: { status: TicketStatus.OPEN },
      }),
      this.prisma.report.count({
        where: { status: ReportStatus.PENDING },
      }),
    ])

    return {
      openTickets,
      pendingReports,
    }
  }

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

    if (dto.commentId) {
      const comment = await this.prisma.comment.findUnique({
        where: { id: dto.commentId },
      })
      if (!comment)
        throw new NotFoundException(
          'El comentario que intentas reportar no existe.',
        )
    }

    if (dto.pollId) {
      const poll = await this.prisma.poll.findUnique({
        where: { id: dto.pollId },
      })
      if (!poll)
        throw new NotFoundException(
          'La encuesta que intentas reportar no existe.',
        )
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedId,
        reason: dto.reason,
        details: dto.details,
        commentId: dto.commentId,
        pollId: dto.pollId,
      },
    })

    this.eventEmitter.emit('report.created', report)

    return report
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

    // WARN no exige jerarquía: así se pueden cerrar reportes contra staff.
    const requiresHierarchy = action !== 'WARN'

    if (isFromWebAdmin) {
      if (adminIdentifier === report.reportedId) {
        throw new ForbiddenException(
          'No podés resolver un reporte contra vos mismo.',
        )
      }
      if (requiresHierarchy) {
        await assertCanSanction(this.prisma, adminIdentifier, report.reportedId)
      }
    } else if (requiresHierarchy) {
      // Desde Discord no sabemos qué usuario de la app actúa: solo puede
      // sancionar a USERs. Al staff se lo sanciona desde el panel web.
      const reported = await this.prisma.user.findUnique({
        where: { id: report.reportedId },
        select: { role: true },
      })
      if (reported?.role !== SystemRole.USER) {
        throw new ForbiddenException(
          'Las sanciones a miembros del staff se resuelven desde el panel web.',
        )
      }
    }

    // Update condicional: si dos resoluciones llegan juntas (web + Discord o
    // doble click), solo una pasa y se emite un único report.resolved.
    const resolvedById = isFromWebAdmin ? adminIdentifier : null
    const { count } = await this.prisma.report.updateMany({
      where: { id: reportId, status: { not: 'RESOLVED' } },
      data: { status: 'RESOLVED', resolvedById },
    })

    if (count === 0) throw new BadRequestException('El reporte ya fue resuelto')

    const resolvedReport = {
      ...report,
      status: 'RESOLVED' as const,
      resolvedById,
    }

    this.eventEmitter.emit('report.resolved', {
      reportId: resolvedReport.id,
      targetUserId: report.reportedId,
      action,
      durationHours,
      reason,
    })

    return resolvedReport
  }

  async getReports(
    page: number = 1,
    limit: number = 10,
    status?: ReportStatus,
  ) {
    const skip = (page - 1) * limit

    const whereCondition: any = {}
    if (status) {
      whereCondition.status = status
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              username: true,
            },
          },
          comment: {
            select: {
              id: true,
              text: true,
              createdAt: true,
            },
          },
          poll: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where: whereCondition }),
    ])

    return {
      data: reports,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    }
  }

  async createTicket(userId: string, dto: CreateTicketDto, isBanned = false) {
    const ticket = await this.prisma.$transaction(async (tx) => {
      if (isBanned) {
        // Serializa las apelaciones de un mismo usuario: dos requests en paralelo
        // no pueden pasar las dos el chequeo de "apelación en curso".
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`appeal:${userId}`}))`
        await this.assertCanOpenAppeal(tx, userId, dto.category)
      }

      return tx.ticket.create({
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
    })

    // Fuera de la transacción: si hiciera rollback, el evento ya habría salido.
    this.eventEmitter.emit('ticket.created', ticket)

    return ticket
  }

  // Con la cuenta suspendida solo se puede abrir una apelación, y de a una por vez.
  private async assertCanOpenAppeal(
    tx: Prisma.TransactionClient,
    userId: string,
    category: TicketCategory,
  ) {
    if (category !== TicketCategory.APPEAL) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Con la cuenta suspendida solo podés abrir una apelación.',
        code: 'USER_BANNED',
      })
    }

    const openAppeal = await tx.ticket.findFirst({
      where: {
        userId,
        category: TicketCategory.APPEAL,
        status: { in: [TicketStatus.OPEN, TicketStatus.UNDER_REVIEW] },
      },
      select: { id: true },
    })

    if (openAppeal) {
      throw new BadRequestException(
        'Ya tenés una apelación en curso. Seguí la conversación en ese ticket.',
      )
    }
  }

  async createTicketMessage(
    ticketIdOrThreadId: string,
    senderId: string,
    role: SystemRole,
    dto: CreateTicketMessageDto,
    fromDiscord: boolean = false,
    senderIsBanned: boolean = false,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { id: ticketIdOrThreadId },
          { discordThreadId: ticketIdOrThreadId },
        ],
      },
      select: {
        id: true,
        userId: true,
        status: true,
        category: true,
        discordThreadId: true,
      },
    })

    if (!ticket) throw new NotFoundException('El ticket no existe.')
    if (ticket.status === 'CLOSED')
      throw new BadRequestException('Este ticket ya está cerrado.')

    // Una cuenta suspendida no conserva poderes de staff: aunque sea MODERATOR o ADMIN,
    // solo puede escribir en su propia apelación en curso.
    if (senderIsBanned) {
      if (
        ticket.category !== TicketCategory.APPEAL ||
        ticket.userId !== senderId
      ) {
        throw new ForbiddenException({
          statusCode: 403,
          message:
            'Con la cuenta suspendida solo podés responder en tu apelación.',
          code: 'USER_BANNED',
        })
      }
      if (
        ticket.status !== TicketStatus.OPEN &&
        ticket.status !== TicketStatus.UNDER_REVIEW
      ) {
        throw new BadRequestException(
          'Esta apelación ya fue resuelta. Si querés, abrí una nueva.',
        )
      }
    }

    // Si viene de Discord, salteamos esta validación porque el rol ya viene forzado como admin
    if (
      !fromDiscord &&
      ticket.userId !== senderId &&
      role !== SystemRole.ADMIN &&
      role !== SystemRole.MODERATOR &&
      role !== SystemRole.PRESIDENT
    ) {
      throw new ForbiddenException('No podés responder en un ticket ajeno.')
    }

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

    const newMessage = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: dbSenderId,
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
        orderBy: { createdAt: 'desc' },
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

  async getMyTickets(userId: string, isBanned = false) {
    return await this.prisma.ticket.findMany({
      where: {
        userId,
        ...(isBanned && { category: TicketCategory.APPEAL }),
      },
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

  async getMyTicketDetails(ticketId: string, userId: string, isBanned = false) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId: userId,
        ...(isBanned && { category: TicketCategory.APPEAL }),
      },
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
        user: { select: { id: true, username: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    return ticket
  }
}
