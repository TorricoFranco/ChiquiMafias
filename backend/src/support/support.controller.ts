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
} from '@nestjs/swagger'
import { SupportService } from './support.service'
import { CreateReportDto } from './dto/create-report.dto'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { AllowBannedForAppeal } from 'src/auth/decorators/allow-banned.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Public } from 'src/auth/decorators/auth.decorator'
import { TicketStatus, TicketCategory, ReportStatus } from '@prisma/client'

@ApiTags('Support & Moderation (Soporte, Reportes y Moderación)')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) { }


  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async getSupportStats() {
    return this.supportService.getSupportStats();
  }

  @Post('report')
  @ApiOperation({
    summary: 'Crear un reporte contra otro usuario (User-to-User)',
  })
  @ApiResponse({ status: 201, description: 'Reporte registrado exitosamente.' })
  async createReport(
    @GetUser('id') reporterId: string,
    @Body() createReportDto: CreateReportDto,
  ) {
    return await this.supportService.createReport(reporterId, createReportDto)
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({ summary: 'Obtener todos los reportes con paginación y filtro (Solo Admins)' })
  async getReports(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ReportStatus,
  ) {
    return await this.supportService.getReports(
      Number(page),
      Number(limit),
      status,
    );
  }

  @Post('ticket')
  @ApiOperation({ summary: 'Abrir un nuevo ticket de soporte o apelación' })
  @ApiResponse({
    status: 201,
    description: 'Ticket e hilo conversacional inicial creados con éxito.',
  })
  async createTicket(
    @GetUser('id') userId: string,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return await this.supportService.createTicket(userId, createTicketDto)
  }

  @Post('ticket/:id/message')
  @AllowBannedForAppeal()
  @ApiOperation({
    summary:
      'Añadir una respuesta a un hilo de conversación de un ticket activo',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje añadido al hilo correctamente.',
  })
  async createTicketMessage(
    @Param('id') ticketId: string,
    @GetUser('id') senderId: string,
    @GetUser('role') role: SystemRole,
    @Body() createTicketMessageDto: CreateTicketMessageDto,
  ) {
    return await this.supportService.createTicketMessage(
      ticketId,
      senderId,
      role,
      createTicketMessageDto,
    )
  }

  @Post('report/:id/resolve')
  @Public()
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({ summary: 'Resolver un reporte (Acción de moderación)' })
  async resolveReport(
    @Param('id') reportId: string,
    @GetUser('id') adminId: string,
    @Body()
    body: {
      action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'
      durationHours?: number
      reason?: string
    },
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
    summary: 'Obtener todos los tickets con filtros y paginación',
  })
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
  @ApiOperation({ summary: 'Ver detalles de cualquier ticket (Solo Admin)' })
  async getAdminTicketDetails(@Param('id') ticketId: string) {
    return await this.supportService.getAdminTicketDetails(ticketId)
  }

  @Patch('ticket/:id/status')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  @ApiOperation({ summary: 'Cambiar el estado de un ticket (Admin)' })
  async updateTicketStatus(
    @Param('id') ticketId: string,
    @Body('status') status: TicketStatus,
  ) {
    return await this.supportService.updateTicketStatus(ticketId, status)
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Obtener mis tickets (Para el usuario normal)' })
  async getMyTickets(@GetUser('id') userId: string) {
    return await this.supportService.getMyTickets(userId)
  }

  @Get('my-tickets/:id')
  @ApiOperation({ summary: 'Ver un ticket específico y su hilo de mensajes' })
  async getMyTicketDetails(
    @Param('id') ticketId: string,
    @GetUser('id') userId: string,
  ) {
    return await this.supportService.getMyTicketDetails(ticketId, userId)
  }
}
