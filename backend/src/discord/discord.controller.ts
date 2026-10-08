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
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { SupportService } from '../support/support.service'
import { Public } from 'src/auth/decorators/auth.decorator'
import { TicketStatus } from '@prisma/client'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { DiscordActionDto } from './dto/discord-action.dto'
import { DiscordTicketMessageDto } from './dto/discord-ticket-message.dto'
import { DiscordUpdateTicketStatusDto } from './dto/discord-update-ticket-status.dto'

@ApiTags('Discord Bot Webhooks (servicio a servicio)')
@ApiHeader({
  name: 'x-discord-bot-token',
  description:
    'Secreto compartido con el bot de Discord (DISCORD_INTERNAL_SECRET). Toda la autenticación de este controller pasa por este header, no por JWT.',
})
@Controller('api/discord/webhook')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name)

  constructor(
    private readonly supportService: SupportService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  @ApiOperation({
    summary: 'Resolver un reporte desde un comando del bot de Discord',
    description:
      'Aplica la misma acción de moderación que el panel admin (BAN/MUTE/WARN/UNBAN), disparada desde Discord.',
  })
  @ApiResponse({ status: 201, description: 'Reporte resuelto.' })
  @ApiResponse({
    status: 401,
    description: 'Header x-discord-bot-token inválido o ausente.',
  })
  @Post('action')
  @Public()
  async handleDiscordAction(
    @Headers('x-discord-bot-token') token: string,
    @Body() payload: DiscordActionDto,
  ) {
    this.logger.log(
      '🔴 INCOMING WEBHOOK DESDE DISCORD:',
      JSON.stringify(payload),
    )

    const internalSecret = this.configService.get<string>(
      'DISCORD_INTERNAL_SECRET',
      { infer: true },
    )

    if (token !== internalSecret) {
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

  @ApiOperation({
    summary: 'Añadir un mensaje de un admin al hilo de un ticket desde Discord',
  })
  @ApiResponse({ status: 201, description: 'Mensaje añadido al hilo.' })
  @ApiResponse({
    status: 401,
    description: 'Header x-discord-bot-token inválido o ausente.',
  })
  @Post('ticket/message')
  @Public()
  async handleDiscordMessage(
    @Headers('x-discord-bot-token') token: string,
    @Body() payload: DiscordTicketMessageDto,
  ) {
    this.validateToken(token)

    return await this.supportService.createTicketMessage(
      payload.ticketId,
      payload.senderId,
      SystemRole.ADMIN,
      { message: payload.message ?? '', screenshotUrl: payload.screenshotUrl },
      true,
    )
  }

  @ApiOperation({ summary: 'Cambiar el estado de un ticket desde Discord' })
  @ApiResponse({ status: 200, description: 'Estado del ticket actualizado.' })
  @ApiResponse({
    status: 401,
    description: 'Header x-discord-bot-token inválido o ausente.',
  })
  @Patch('ticket/status')
  @Public()
  async updateTicketStatus(
    @Headers('x-discord-bot-token') token: string,
    @Body() payload: DiscordUpdateTicketStatusDto,
  ) {
    this.validateToken(token)
    return await this.supportService.updateTicketStatus(
      payload.ticketId,
      payload.status,
    )
  }

  private validateToken(token: string) {
    const internalSecret = this.configService.get<string>(
      'DISCORD_INTERNAL_SECRET',
      { infer: true },
    )
    if (token !== internalSecret) {
      throw new UnauthorizedException('Token inválido')
    }
  }

  @ApiOperation({
    summary: 'Listar los primeros tickets abiertos para mostrar en Discord',
  })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiResponse({
    status: 200,
    description: 'Primera página de tickets (10 resultados).',
  })
  @ApiResponse({
    status: 401,
    description: 'Header x-discord-bot-token inválido o ausente.',
  })
  @Get('tickets')
  @Public()
  async getBotTickets(
    @Headers('x-discord-bot-token') token: string,
    @Query('status') status?: TicketStatus,
  ) {
    this.validateToken(token)
    return await this.supportService.getTickets(1, 10, status)
  }

  @ApiOperation({
    summary: 'Listar los primeros reportes pendientes para mostrar en Discord',
  })
  @ApiResponse({
    status: 200,
    description: 'Primera página de reportes (10 resultados).',
  })
  @ApiResponse({
    status: 401,
    description: 'Header x-discord-bot-token inválido o ausente.',
  })
  @Get('reports')
  @Public()
  async getBotReports(@Headers('x-discord-bot-token') token: string) {
    this.validateToken(token)
    const reports = await this.supportService.getReports(1, 10)
    return reports.data
  }
}
