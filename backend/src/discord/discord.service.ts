// src/discord/discord.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from 'src/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import type { Prisma, Report } from '@prisma/client'

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name)
  private readonly botBaseUrl: string
  private readonly discordSecret: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    this.botBaseUrl =
      this.configService.get<string>('DISCORD_BOT_URL', { infer: true }) || ''

    this.discordSecret =
      this.configService.get<string>('DISCORD_INTERNAL_SECRET', {
        infer: true,
      }) || ''
  }

  @OnEvent('report.created', { async: true })
  async handleReportCreatedEvent(report: Report) {
    this.logger.log(`Avisando al bot sobre reporte ID: ${report.id}`)
    try {
      await fetch(`${this.botBaseUrl}/alerts/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-discord-bot-token': this.discordSecret,
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
  async handleTicketCreatedEvent(
    ticket: Prisma.TicketGetPayload<{ include: { messages: true } }>,
  ) {
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
          'x-discord-bot-token': this.discordSecret,
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
      } else {
        // Sin hilo, las respuestas posteriores del usuario no llegan al staff.
        this.logger.error(
          `❌ El bot no creó el hilo del Ticket ${ticket.id} (HTTP ${response.status})`,
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
      const response = await fetch(
        `${this.botBaseUrl}/tickets/forward-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-discord-bot-token': this.discordSecret,
          },
          body: JSON.stringify({
            threadId: payload.discordThreadId,
            message: payload.message,
            screenshotUrl: payload.screenshotUrl,
          }),
        },
      )

      if (!response.ok) {
        this.logger.error(
          `❌ El bot no reenvió el mensaje al hilo ${payload.discordThreadId} (HTTP ${response.status})`,
        )
      }
    } catch (error) {
      this.logger.error('❌ Error reenviando mensaje al bot:', error.message)
    }
  }
}
