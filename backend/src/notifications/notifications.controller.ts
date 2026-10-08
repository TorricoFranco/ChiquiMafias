import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Post,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { MarkAsReadDto } from './dto/mark-as-read.dto'
import {
  CreateAdminGlobalNotificationDto,
  CreateAdminPersonalNotificationDto,
} from './dto/admin-notification.dto'
import { SystemRole } from '../auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Notifications (Notificaciones)')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    summary: 'Bandeja de notificaciones paginada del usuario logueado',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Resultados por página (default 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de notificaciones.',
  })
  @Get()
  async getInbox(
    @GetUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getNotificationsInbox(userId, page, limit)
  }

  @ApiOperation({
    summary: 'Cantidad de notificaciones sin leer del usuario logueado',
  })
  @ApiResponse({
    status: 200,
    description: 'Cantidad de notificaciones no leídas.',
  })
  @Get('unread-count')
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId)
  }

  @ApiOperation({ summary: 'Marcar notificaciones como leídas' })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones marcadas como leídas.',
  })
  @Patch('read')
  async markAsRead(@GetUser('id') userId: string, @Body() body: MarkAsReadDto) {
    return this.notificationsService.markAsRead(userId, body.ids)
  }

  @ApiOperation({
    summary:
      'Enviar un anuncio masivo en tiempo real a toda la comunidad (Solo ADMIN)',
  })
  @ApiResponse({ status: 201, description: 'Anuncio global enviado.' })
  @Post('global')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async sendGlobalNotification(@Body() dto: CreateAdminGlobalNotificationDto) {
    return this.notificationsService.createGlobalAnnouncementFromAdmin(dto)
  }

  @ApiOperation({
    summary:
      'Enviar una alerta dirigida con tracking a un usuario específico (Solo ADMIN)',
  })
  @ApiResponse({ status: 201, description: 'Notificación personal enviada.' })
  @ApiResponse({
    status: 404,
    description: 'El usuario destinatario no existe.',
  })
  @Post('personal')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async sendPersonalNotification(
    @Body() dto: CreateAdminPersonalNotificationDto,
  ) {
    return this.notificationsService.createPersonalNotification({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      referenceId: dto.referenceId,
      metadata: dto.metadata,
    })
  }
}
