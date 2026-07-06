import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { EmailService } from './email.service'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class EmailListener {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('report.resolved')
  async handleReportResolvedEmail(payload: {
    targetUserId: string
    action: string
    reason: string
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.targetUserId },
    })
    if (!user || !user.email) return

    if (payload.action === 'BAN') {
      await this.emailService.sendBanNotification(
        user.email,
        user.name,
        payload.reason,
      )
    }
  }
}
