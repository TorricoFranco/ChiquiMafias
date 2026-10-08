import {
  Get,
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { SupportService } from './support.service'
import { CreateReportDto } from './dto/create-report.dto'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { ResolveReportDto } from './dto/resolve-report.dto'
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { AllowBannedForAppeal } from 'src/auth/decorators/allow-banned.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { TicketStatus, TicketCategory, ReportStatus } from '@prisma/client'
import { Throttle } from '@nestjs/throttler'

@ApiTags('Support & Moderation (Soporte, Reportes y Moderación)')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({
    summary: 'Contadores globales del panel de soporte (Solo MODERATOR+)',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas de soporte.' })
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async getSupportStats() {
    return this.supportService.getSupportStats()
  }

  @Post('report')
  @ApiOperation({
    summary: 'Crear un reporte contra otro usuario (User-to-User)',
  })
  @ApiResponse({ status: 201, description: 'Reporte registrado exitosamente.' })
  @ApiResponse({
    status: 400,
    description: 'El usuario reportado no existe o datos inválidos.',
  })
  async createReport(
    @GetUser('id') reporterId: string,
    @Body() createReportDto: CreateReportDto,
  ) {
    return await this.supportService.createReport(reporterId, createReportDto)
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary:
      'Obtener todos los reportes con paginación y filtro (Solo MODERATOR+)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página (default 10)',
  })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  @ApiResponse({ status: 200, description: 'Lista paginada de reportes.' })
  async getReports(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ReportStatus,
  ) {
    return await this.supportService.getReports(
      Number(page),
      Number(limit),
      status,
    )
  }

  // Cada ticket abre un hilo en el canal de staff de Discord: límite propio contra spam.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('ticket')
  @AllowBannedForAppeal()
  @ApiOperation({
    summary:
      'Abrir un nuevo ticket de soporte o apelación (un usuario baneado solo puede abrir una apelación)',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket e hilo conversacional inicial creados con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Un usuario baneado solo puede abrir una apelación por vez.',
  })
  async createTicket(
    @GetUser('id') userId: string,
    @GetUser('isBanned') isBanned: boolean,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return await this.supportService.createTicket(
      userId,
      createTicketDto,
      isBanned === true,
    )
  }

  // Cada mensaje se reenvía al hilo de Discord del ticket.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('ticket/:id/message')
  @AllowBannedForAppeal()
  @ApiOperation({
    summary:
      'Añadir una respuesta a un hilo de conversación de un ticket activo',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiResponse({
    status: 201,
    description: 'Mensaje añadido al hilo correctamente.',
  })
  @ApiResponse({ status: 404, description: 'El ticket no existe.' })
  async createTicketMessage(
    @Param('id') ticketId: string,
    @GetUser('id') senderId: string,
    @GetUser('role') role: SystemRole,
    @GetUser('isBanned') isBanned: boolean,
    @Body() createTicketMessageDto: CreateTicketMessageDto,
  ) {
    return await this.supportService.createTicketMessage(
      ticketId,
      senderId,
      role,
      createTicketMessageDto,
      false,
      isBanned === true,
    )
  }

  @Post('report/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary:
      'Resolver un reporte aplicando una acción de moderación (Solo MODERATOR+)',
    description:
      'Acciones posibles: BAN (bloquea al usuario), MUTE (timeout en chat), WARN (advertencia sin sanción) o UNBAN. `durationHours` aplica a BAN y MUTE.',
  })
  @ApiParam({ name: 'id', description: 'ID del reporte a resolver' })
  @ApiResponse({
    status: 200,
    description: 'Reporte resuelto y acción de moderación aplicada.',
  })
  @ApiResponse({
    status: 403,
    description: 'El actor no puede sancionar al usuario reportado.',
  })
  @ApiResponse({ status: 404, description: 'El reporte no existe.' })
  async resolveReport(
    @Param('id') reportId: string,
    @GetUser('id') adminId: string,
    @Body() body: ResolveReportDto,
  ) {
    return await this.supportService.resolveReport(
      reportId,
      adminId,
      body.action,
      body.durationHours,
      body.reason,
    )
  }

  @Get('tickets')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary:
      'Obtener todos los tickets con filtros y paginación (Solo MODERATOR+)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página (default 10)',
  })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'category', required: false, enum: TicketCategory })
  @ApiResponse({ status: 200, description: 'Lista paginada de tickets.' })
  async getTickets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: TicketStatus,
    @Query('category') category?: TicketCategory,
  ) {
    return await this.supportService.getTickets(
      Number(page),
      Number(limit),
      status,
      category,
    )
  }

  @Get('ticket/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({
    summary: 'Ver detalles de cualquier ticket (Solo MODERATOR+)',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del ticket con su hilo de mensajes.',
  })
  @ApiResponse({ status: 404, description: 'El ticket no existe.' })
  async getAdminTicketDetails(@Param('id') ticketId: string) {
    return await this.supportService.getAdminTicketDetails(ticketId)
  }

  @Patch('ticket/:id/status')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({ summary: 'Cambiar el estado de un ticket (Solo MODERATOR+)' })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiResponse({ status: 200, description: 'Estado del ticket actualizado.' })
  @ApiResponse({ status: 404, description: 'El ticket no existe.' })
  async updateTicketStatus(
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return await this.supportService.updateTicketStatus(ticketId, dto.status)
  }

  @Get('my-tickets')
  @AllowBannedForAppeal()
  @ApiOperation({
    summary: 'Obtener mis tickets (un usuario baneado solo ve sus apelaciones)',
  })
  @ApiResponse({ status: 200, description: 'Lista de tickets del usuario.' })
  async getMyTickets(
    @GetUser('id') userId: string,
    @GetUser('isBanned') isBanned: boolean,
  ) {
    return await this.supportService.getMyTickets(userId, isBanned === true)
  }

  @Get('my-tickets/:id')
  @AllowBannedForAppeal()
  @ApiOperation({ summary: 'Ver un ticket específico y su hilo de mensajes' })
  @ApiParam({
    name: 'id',
    description: 'ID del ticket (debe pertenecer al usuario autenticado)',
  })
  @ApiResponse({ status: 200, description: 'Detalle del ticket.' })
  @ApiResponse({
    status: 404,
    description: 'El ticket no existe o no pertenece al usuario.',
  })
  async getMyTicketDetails(
    @Param('id') ticketId: string,
    @GetUser('id') userId: string,
    @GetUser('isBanned') isBanned: boolean,
  ) {
    return await this.supportService.getMyTicketDetails(
      ticketId,
      userId,
      isBanned === true,
    )
  }
}
