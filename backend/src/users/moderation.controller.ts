import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RedisService } from 'src/redis/redis.service'
import { TimeoutDto } from './dto/timeout.dto'
import { UnmuteUserDto } from './dto/unmute-user.dto'
import { ChatGateway } from 'src/chat/chat.gateway'
import { SystemRole } from '../auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChatService } from 'src/chat/chat.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { assertCanSanction } from 'src/auth/utils/assert-can-sanction'

@ApiTags('Moderation (Moderación)')
@ApiBearerAuth()
@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly redisService: RedisService,
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  @ApiOperation({
    summary: 'Listar usuarios actualmente muteados (solo ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios muteados con minutos restantes.',
  })
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Get('muted-users')
  async getMutedUsers() {
    const now = new Date()

    const mutedUsers = await this.prisma.user.findMany({
      where: {
        mutedUntil: {
          gt: now,
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        mutedUntil: true,
      },
    })

    return mutedUsers.map((user) => {
      const remainingMs = user.mutedUntil!.getTime() - Date.now()
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        mutedUntil: user.mutedUntil,
        remainingMinutes: Math.ceil(remainingMs / 1000 / 60),
      }
    })
  }
  @ApiOperation({
    summary: 'Silenciar (timeout) a un usuario en el chat (solo ADMIN)',
    description:
      'El actor no puede sancionar a un usuario de igual o mayor jerarquía (ver `assertCanSanction`). Emite el evento de socket `user-timeout`.',
  })
  @ApiResponse({ status: 201, description: 'Usuario silenciado.' })
  @ApiResponse({
    status: 403,
    description: 'El actor no puede sancionar al usuario objetivo.',
  })
  @Post('timeout')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async applyTimeout(@Body() dto: TimeoutDto, @GetUser('id') actorId: string) {
    const { userId, durationMinutes } = dto
    await assertCanSanction(this.prisma, actorId, userId)
    const seconds = durationMinutes * 60
    const timeoutUntil = Date.now() + seconds * 1000

    await this.redisService.redis.set(
      `timeout:${userId}`,
      'true',
      'EX',
      seconds,
    )

    await this.prisma.user.update({
      where: { id: userId },
      data: { mutedUntil: new Date(timeoutUntil) },
    })

    this.chatGateway.server.emit('user-timeout', { userId, timeoutUntil })

    return {
      message: `Usuario ${userId} silenciado por ${durationMinutes} minutos.`,
      timeoutUntil: new Date(timeoutUntil),
    }
  }

  @ApiOperation({
    summary: 'Levantar el timeout de un usuario (solo ADMIN)',
    description: 'Emite el evento de socket `user-unmuted`.',
  })
  @ApiResponse({ status: 201, description: 'Usuario desmuteado.' })
  @ApiResponse({
    status: 403,
    description: 'El actor no puede sancionar al usuario objetivo.',
  })
  @Post('unmute')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async removeTimeout(
    @Body() dto: UnmuteUserDto,
    @GetUser('id') actorId: string,
  ) {
    await assertCanSanction(this.prisma, actorId, dto.userId)
    await this.redisService.redis.del(`timeout:${dto.userId}`)

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { mutedUntil: null },
    })

    this.chatGateway.server.emit('user-unmuted', { userId: dto.userId })
    return { message: 'Usuario desmuteado correctamente.' }
  }

  @ApiOperation({
    summary:
      'Consultar si un usuario está muteado y cuánto le queda (solo ADMIN)',
  })
  @ApiParam({ name: 'userId', description: 'ID del usuario a consultar' })
  @ApiResponse({ status: 200, description: 'Estado del timeout.' })
  @Get('status/:userId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async checkTimeout(@Param('userId') userId: string) {
    const isMuted = await this.redisService.redis.get(`timeout:${userId}`)
    if (!isMuted) return { isMuted: false }

    const ttl = await this.redisService.redis.ttl(`timeout:${userId}`)
    return {
      isMuted: true,
      timeoutUntil: Date.now() + ttl * 1000,
    }
  }

  @ApiOperation({
    summary:
      'Contadores globales para el panel de moderación (solo MODERATOR+)',
    description:
      'Encuestas pendientes, mercados abiertos, tickets abiertos, reportes pendientes y usuarios online.',
  })
  @ApiResponse({ status: 200, description: 'Contadores del panel.' })
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.MODERATOR)
  async getAdminStats() {
    const [pendingPolls, openMarkets, openTickets, pendingReports] =
      await Promise.all([
        this.prisma.poll.count({ where: { status: 'PENDING' } }),
        this.prisma.market.count({ where: { status: 'OPEN' } }),
        this.prisma.ticket.count({ where: { status: 'OPEN' } }),
        this.prisma.report.count({ where: { status: 'PENDING' } }),
      ])

    const onlineUsersCount = this.chatService.getConnectedClients().length

    return {
      pendingPolls,
      openMarkets,
      openTickets,
      pendingReports,
      onlineUsers: onlineUsersCount,
    }
  }
}
