// src/notifications/listeners/notifications.listener.ts
import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { NotificationsService } from './notifications.service'
import { NotifyType } from '@prisma/client'
import { ChatGateway } from 'src/chat/chat.gateway'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
  ) { }

  @OnEvent('bet.settled')
  async handleBetSettled(payload: {
    userId: string
    status: 'WON' | 'LOST' | 'REFUND'
    coins: number
    matchTitle: string
  }) {
    let type: NotifyType = NotifyType.BET_LOST
    let title = 'Apuesta Errada ❌'
    let message = `Tu apuesta en el partido "${payload.matchTitle}" no resultó ganadora. ¡La próxima fecha habrá revancha!`

    if (payload.status === 'WON') {
      type = NotifyType.BET_WON
      title = '¡Apuesta Ganada! 💰🥳'
      message = `¡Pegaste el resultado! Sumaste ${payload.coins} monedas en el partido "${payload.matchTitle}".`
    } else if (payload.status === 'REFUND') {
      type = NotifyType.BET_REFUND
      title = 'Apuesta Reembolsada 🔄'
      message = `Se canceló o modificó el partido "${payload.matchTitle}". Se te devolvieron tus monedas.`
    }

    await this.notificationsService.createPersonalNotification({
      userId: payload.userId,
      title,
      message,
      type,
      metadata: { coins: payload.coins },
    })

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: payload.userId },
    })

    if (wallet) {
      this.chatGateway.sendWalletUpdate(payload.userId, wallet.balance)
    }
  }

  @OnEvent('match.starting')
  async handleMatchStarting(payload: {
    userId: string
    matchTitle: string
    matchId: string
  }) {
    await this.notificationsService.createPersonalNotification({
      userId: payload.userId,
      title: '⚽ ¡Partido por arrancar!',
      message: `El encuentro "${payload.matchTitle}" está a minutos de comenzar. ¿Ya dejaste tu pronóstico?`,
      type: NotifyType.MATCH_STARTING,
      referenceId: payload.matchId,
    })
  }
  @OnEvent('poll.approved')
  async handlePollApproved(payload: {
    userId: string
    pollId: string
    pollTitle: string
  }) {
    await this.notificationsService.createPersonalNotification({
      userId: payload.userId,
      title: '✅ ¡Tu encuesta fue aprobada!',
      message: `¡Buenas noticias! Tu propuesta "${payload.pollTitle}" fue aceptada por los moderadores y ya se encuentra activa para votación.`,
      type: NotifyType.POLL_APPROVED,
      referenceId: payload.pollId,
    })
  }

  @OnEvent('poll.rejected')
  async handlePollRejected(payload: {
    userId: string
    pollId: string
    pollTitle: string
  }) {
    await this.notificationsService.createPersonalNotification({
      userId: payload.userId,
      title: '❌ Propuesta de encuesta rechazada',
      message: `Tu propuesta "${payload.pollTitle}" fue rechazada por la moderación. Se te ha reembolsado el Ticket de Encuesta a tu inventario.`,
      type: NotifyType.POLL_REJECTED,
      referenceId: payload.pollId,
    })
  }

  @OnEvent('report.resolved')
  async handleSupportResolution(payload: {
    reportId: string
    targetUserId: string
    action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'
    durationHours?: number
    reason: string
  }) {
    let type: NotifyType
    let title: string
    let message: string

    switch (payload.action) {
      case 'MUTE':
        type = NotifyType.SUPPORT_MODERATION_MUTE
        title = '🔇 Restricción de Chat'
        message = `Tu cuenta ha sido silenciada por ${payload.durationHours} horas.\nMotivo: ${payload.reason}`
        break

      case 'WARN':
        type = NotifyType.SUPPORT_MODERATION_WARN
        title = '⚠️ Aviso de Moderación'
        message = `Has recibido una advertencia.\nMotivo: ${payload.reason}\nTen cuidado, comportamientos reiterados pueden derivar en un baneo.`
        break

      case 'UNBAN':
        type = NotifyType.SUPPORT_MODERATION_UNBAN
        title = '✅ Cuenta Rehabilitada'
        message = `Tu cuenta ha sido desbaneada. Esperamos que disfrutes de la comunidad cumpliendo las normas.`
        break

      default:
        return
    }

    await this.notificationsService.createPersonalNotification({
      userId: payload.targetUserId,
      title,
      message,
      type,
      referenceId: payload.reportId,
    })
  }
}
