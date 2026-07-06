import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
  Patch,
  Get,
  Query,
} from '@nestjs/common'
import { SupportService } from '../support/support.service'
import { Public } from 'src/auth/decorators/auth.decorator'
import { TicketStatus } from '@prisma/client'
import { SystemRole } from 'src/auth/enums/roles.enum'

@Controller('api/discord/webhook')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name)

  constructor(private readonly supportService: SupportService) { }

  @Post('action')
  @Public()
  async handleDiscordAction(
    @Headers('x-discord-bot-token') token: string,
    @Body()
    payload: {
      reportId: string
      adminDiscordId: string
      action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'
      durationHours?: number
      reason?: string
    },
  ) {
    this.logger.log(
      '🔴 INCOMING WEBHOOK DESDE DISCORD:',
      JSON.stringify(payload),
    )

    if (token !== process.env.DISCORD_INTERNAL_SECRET) {
      this.logger.error('❌ Token inválido o no enviado')
      throw new UnauthorizedException('Intento de acceso no autorizado')
    }

    try {
      const result = await this.supportService.resolveReport(
        payload.reportId,
        payload.adminDiscordId,
        payload.action,
        payload.durationHours,
        payload.reason,
      )

      this.logger.log(`🟢 REPORTE ${payload.reportId} RESUELTO CON ÉXITO`)
      return result
    } catch (error) {
      this.logger.error('❌ ERROR AL RESOLVER EL REPORTE:', error.message)
      this.logger.error(error.stack)
      throw error
    }
  }

  @Post('ticket/message')
  @Public()
  async handleDiscordMessage(
    @Headers('x-discord-bot-token') token: string,
    @Body()
    payload: {
      ticketId: string
      senderId: string
      message: string
      screenshotUrl?: string
    },
  ) {
    this.validateToken(token)

    return await this.supportService.createTicketMessage(
      payload.ticketId,
      payload.senderId,
      SystemRole.ADMIN,
      { message: payload.message, screenshotUrl: payload.screenshotUrl },
      true,
    )
  }

  @Patch('ticket/status')
  @Public()
  async updateTicketStatus(
    @Headers('x-discord-bot-token') token: string,
    @Body() payload: { ticketId: string; status: TicketStatus },
  ) {
    this.validateToken(token)
    return await this.supportService.updateTicketStatus(
      payload.ticketId,
      payload.status,
    )
  }

  private validateToken(token: string) {
    if (token !== process.env.DISCORD_INTERNAL_SECRET) {
      throw new UnauthorizedException('Token inválido')
    }
  }

  @Get('tickets')
  @Public()
  async getBotTickets(
    @Headers('x-discord-bot-token') token: string,
    @Query('status') status?: TicketStatus,
  ) {
    this.validateToken(token)
    return await this.supportService.getTickets(1, 10, status)
  }

  @Get('reports')
  @Public()
  async getBotReports(@Headers('x-discord-bot-token') token: string) {
    this.validateToken(token)
    const reports = await this.supportService.getReports()
    return reports.slice(0, 10)
  }
}
