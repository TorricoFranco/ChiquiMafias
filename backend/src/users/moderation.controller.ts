// src/users/moderation.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common'
import { RedisService } from 'src/redis/redis.service'
import { TimeoutDto } from './dto/timeout.dto'
import { ChatGateway } from 'src/chat/chat.gateway'
import { SystemRole } from '../auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Public } from 'src/auth/decorators/auth.decorator'
import { PrismaService } from 'src/prisma/prisma.service'

@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly redisService: RedisService,
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Get('muted-users')
  async getMutedUsers() {
    const now = new Date()

    const mutedUsers = await this.prisma.user.findMany({
      where: {
        mutedUntil: {
          gt: now, // mutedUntil > now
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('timeout')
  async applyTimeout(@Body() dto: TimeoutDto) {
    const { userId, durationMinutes } = dto
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

    // 3. Emit al front
    this.chatGateway.server.emit('user-timeout', { userId, timeoutUntil })

    return {
      message: `Usuario ${userId} silenciado por ${durationMinutes} minutos.`,
      timeoutUntil: new Date(timeoutUntil),
    }
  }

  @Post('unmute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ADMIN)
  async removeTimeout(@Body() dto: { userId: string }) {
    await this.redisService.redis.del(`timeout:${dto.userId}`)

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { mutedUntil: null },
    })

    this.chatGateway.server.emit('user-unmuted', { userId: dto.userId })
    return { message: 'Usuario desmuteado correctamente.' }
  }

  @Get('status/:userId')
  @Public()
  async checkTimeout(@Param('userId') userId: string) {
    const isMuted = await this.redisService.redis.get(`timeout:${userId}`)
    if (!isMuted) return { isMuted: false }

    const ttl = await this.redisService.redis.ttl(`timeout:${userId}`)
    return {
      isMuted: true,
      timeoutUntil: Date.now() + ttl * 1000,
    }
  }
}