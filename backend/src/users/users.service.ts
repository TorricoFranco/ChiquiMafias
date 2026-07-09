import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { ChatService } from 'src/chat/chat.service'
import { RedisService } from 'src/redis/redis.service'

import { SubscriptionTier } from '@prisma/client'
import { OnEvent } from '@nestjs/event-emitter/dist/decorators/on-event.decorator'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) { }

  @OnEvent('report.resolved')
  async handleReportResolved(payload: {
    action: string
    targetUserId: string
  }) {
    switch (payload.action) {
      case 'BAN':
        await this.banUser(payload.targetUserId)
        break
      case 'UNBAN':
        await this.unbanUser(payload.targetUserId)
        break
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isFirstLogin: true,
        team: true,
        role: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async updateRole(userId: string, role: SystemRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isFirstLogin: true,
        team: true,
        role: true,
      },
    })
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const usernameExists = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: dto.username,
          mode: 'insensitive',
        },
      },
    })

    if (usernameExists) {
      throw new ConflictException('El nombre de usuario ya está en uso')
    }

    const teamExists = await this.prisma.footballTeam.findUnique({
      where: { id: dto.teamId },
    })

    if (!teamExists) {
      throw new BadRequestException('El club seleccionado no existe')
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
        teamId: dto.teamId,
        isFirstLogin: false,
      },
      include: {
        team: true,
      },
    })

    this.chatService.updateActiveUserProfile(updatedUser.id, {
      username: updatedUser.username,
      teamName: updatedUser.team?.name || null,
      badgeUrl: updatedUser.team?.badgeUrl || null,
    })

    return updatedUser
  }

  async updateProfile(userId: string, dto: Partial<CompleteProfileDto>) {
    // Si no mandó nada en el body, tiramos un aviso rápido
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'No se proporcionaron datos para actualizar',
      )
    }

    if (dto.username) {
      const usernameExists = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: dto.username,
            mode: 'insensitive',
          },
          id: { not: userId },
        },
      })

      if (usernameExists) {
        throw new ConflictException('El nombre de usuario ya está en uso')
      }
    }

    if (dto.teamId) {
      const teamExists = await this.prisma.footballTeam.findUnique({
        where: { id: dto.teamId },
      })

      if (!teamExists) {
        throw new BadRequestException('El club seleccionado no existe')
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
        teamId: dto.teamId,
      },
      include: {
        team: true,
      },
    })

    this.chatService.updateActiveUserProfile(updatedUser.id, {
      username: updatedUser.username || updatedUser.name,
      teamName: updatedUser.team?.name || null,
      badgeUrl: updatedUser.team?.badgeUrl || null,
    })

    return updatedUser
  }

  async banUser(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED' },
    })

    const redisKey = `user:banned:${userId}`
    await this.redisService.redis.set(redisKey, 'true')

    return {
      message: `Usuario ${user.name} baneado correctamente de la plataforma.`,
    }
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    const redisKey = `user:banned:${userId}`
    await this.redisService.redis.del(redisKey)

    return { message: `Usuario ${user.name} desbaneado correctamente.` }
  }

  // PRUEBA

  async getAllUsersBalances(): Promise<UserBalanceResponse[]> {
    this.logger.log(
      '[WALLET] Consultando el saldo de todos los usuarios de la app',
    )

    return this.prisma.wallet.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        balance: 'desc', // Los más "millonarios" van a aparecer primero
      },
    })
  }
}

export interface UserBalanceResponse {
  id: string
  userId: string
  balance: number
  updatedAt: Date
  user: {
    name: string
    email: string
    username: string | null
  }
}
