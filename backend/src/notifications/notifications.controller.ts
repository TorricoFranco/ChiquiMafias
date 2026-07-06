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

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getInbox(
    @GetUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getNotificationsInbox(userId, page, limit)
  }

  @Get('unread-count')
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId)
  }

  @Patch('read')
  async markAsRead(@GetUser('id') userId: string, @Body() body: MarkAsReadDto) {
    return this.notificationsService.markAsRead(userId, body.ids)
  }

  /**
   * Envía un anuncio masivo en tiempo real a toda la comunidad (Solo ADMIN)
   */
  @Post('global')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async sendGlobalNotification(@Body() dto: CreateAdminGlobalNotificationDto) {
    return this.notificationsService.createGlobalAnnouncementFromAdmin(dto)
  }

  /**
   * Envía una alerta dirigida con tracking a un usuario específico (Solo ADMIN)
   */
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
