// src/notifications/services/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChatGateway } from 'src/chat/chat.gateway'
import { NotifyType } from '@prisma/client'
import { INotificationResponse } from './interfaces/notification-response.interface'
import { CreateAdminGlobalNotificationDto } from './dto/admin-notification.dto'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createPersonalNotification(payload: {
    userId: string
    title: string
    message: string
    type: NotifyType
    referenceId?: string
    metadata?: any
  }) {
    const notification = await this.prisma.notification.create({
      data: payload,
    })

    const responseDto: INotificationResponse = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isGlobal: false,
      readAt: null,
      createdAt: notification.createdAt,
      referenceId: notification.referenceId,
      metadata: notification.metadata,
    }

    this.chatGateway.sendNotificationToUser(payload.userId, responseDto)

    return notification
  }

  async createGlobalAnnouncementFromAdmin(
    dto: CreateAdminGlobalNotificationDto,
  ): Promise<INotificationResponse> {
    const announcement = await this.prisma.globalAnnouncement.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        metadata: dto.metadata || {},
      },
    })

    const responseDto: INotificationResponse = {
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      isGlobal: true,
      readAt: null,
      createdAt: announcement.createdAt,
      metadata: announcement.metadata,
    }

    this.chatGateway.broadcastNotification(responseDto)

    return responseDto
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const personalCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    })

    const globalCount = await this.prisma.globalAnnouncement.count({
      where: {
        createdAt: { gte: user.createdAt },
        readBy: { none: { userId } },
      },
    })

    return { unreadCount: personalCount + globalCount }
  }

  async getNotificationsInbox(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<INotificationResponse[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const skip = (page - 1) * limit

    const personalNotifs = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    })

    const globalNotifs = await this.prisma.globalAnnouncement.findMany({
      where: { createdAt: { gte: user.createdAt } },
      include: {
        readBy: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    })

    const normalizedPersonal: INotificationResponse[] = personalNotifs.map(
      (n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isGlobal: false,
        readAt: n.readAt,
        createdAt: n.createdAt,
        referenceId: n.referenceId,
        metadata: n.metadata,
      }),
    )

    const normalizedGlobal: INotificationResponse[] = globalNotifs.map((g) => ({
      id: g.id,
      title: g.title,
      message: g.message,
      type: g.type,
      isGlobal: true,
      readAt: g.readBy.length > 0 ? g.readBy[0].readAt : null,
      createdAt: g.createdAt,
      referenceId: g.referenceId,
      metadata: g.metadata,
    }))

    const combined = [...normalizedPersonal, ...normalizedGlobal].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )

    return combined.slice(skip, skip + limit)
  }

  async markAsRead(
    userId: string,
    ids: string[],
  ): Promise<{ success: boolean }> {
    await Promise.all([
      this.prisma.notification.updateMany({
        where: { id: { in: ids }, userId },
        data: { readAt: new Date() },
      }),

      ...ids.map(async (id) => {
        const isGlobal = await this.prisma.globalAnnouncement.findUnique({
          where: { id },
        })
        if (isGlobal) {
          await this.prisma.globalAnnouncementRead.upsert({
            where: { userId_announcementId: { userId, announcementId: id } },
            create: { userId, announcementId: id },
            update: {},
          })
        }
      }),
    ])

    return { success: true }
  }
}
