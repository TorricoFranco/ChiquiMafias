// src/discord/discord.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from 'src/prisma/prisma.service'
import type { Report, Ticket } from '@prisma/client'

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name)
  private readonly botBaseUrl = 'http://discord_bot:3001/api'

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('report.created', { async: true })
  async handleReportCreatedEvent(report: Report) {
    this.logger.log(`Avisando al bot sobre reporte ID: ${report.id}`)
    try {
      await fetch(`${this.botBaseUrl}/alerts/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET || '',
        },
        body: JSON.stringify({
          reportId: report.id,
          reason: report.reason,
          details: report.details,
        }),
      })
    } catch (error) {
      this.logger.error('❌ Error enviando reporte al bot:', error.message)
    }
  }

  @OnEvent('ticket.created', { async: true })
  async handleTicketCreatedEvent(ticket: any) {
    this.logger.log(
      `Solicitando creación de Hilo en Discord para Ticket ID: ${ticket.id}`,
    )
    try {
      const firstMessage =
        ticket.messages && ticket.messages.length > 0
          ? ticket.messages[0]
          : null

      const response = await fetch(`${this.botBaseUrl}/tickets/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET || '',
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          userId: ticket.userId,
          subject: ticket.subject,
          category: ticket.category,
          message: firstMessage?.message || '',
          screenshotUrl: firstMessage?.screenshotUrl || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { discordThreadId: data.threadId },
        })
        this.logger.log(
          `🟢 ThreadId ${data.threadId} vinculado al Ticket ${ticket.id}`,
        )
      }
    } catch (error) {
      this.logger.error(
        '❌ Error creando hilo de ticket en bot:',
        error.message,
      )
    }
  }

  @OnEvent('ticket.message.created', { async: true })
  async handleTicketMessageCreatedEvent(payload: {
    discordThreadId: string
    message: string
    screenshotUrl?: string
  }) {
    this.logger.log(
      `Reenviando mensaje web al hilo de Discord: ${payload.discordThreadId}`,
    )
    try {
      await fetch(`${this.botBaseUrl}/tickets/forward-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-discord-bot-token': process.env.DISCORD_INTERNAL_SECRET || '',
        },
        body: JSON.stringify({
          threadId: payload.discordThreadId,
          message: payload.message,
          screenshotUrl: payload.screenshotUrl,
        }),
      })
    } catch (error) {
      this.logger.error('❌ Error reenviando mensaje al bot:', error.message)
    }
  }
}
