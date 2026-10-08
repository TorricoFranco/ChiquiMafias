import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { ChatService } from 'src/chat/chat.service'
import { RedisService } from 'src/redis/redis.service'
import { OnEvent } from '@nestjs/event-emitter/dist/decorators/on-event.decorator'
import { UserEntity } from './entities/user.entity'
import { GetUsersQueryDto } from './dto/get-users-query.dto'
import { ROLE_HIERARCHY } from 'src/auth/enums/roles.enum'
import { CURRENT_TERMS_VERSION } from './terms.constants'
import { assertCanSanction } from 'src/auth/utils/assert-can-sanction'
import type { ActiveUser } from 'src/auth/interfaces/active-user.interface'

export interface PaginatedUsersResponse {
  data: UserEntity[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  @OnEvent('report.resolved')
  async handleReportResolved(payload: {
    action: string
    targetUserId: string
  }) {
    switch (payload.action) {
      case 'BAN':
        await this.applyBan(payload.targetUserId)
        break
      case 'UNBAN':
        await this.applyUnban(payload.targetUserId)
        break
    }
  }

  async findAll(query: GetUsersQueryDto): Promise<PaginatedUsersResponse> {
    const { page = 1, limit = 10, search } = query
    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          team: true,
          wallet: {
            select: {
              balance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: users.map((user) => new UserEntity(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateRole(
    currentUser: ActiveUser,
    targetUserId: string,
    newRole: SystemRole,
  ): Promise<UserEntity> {
    // REGLA 1: No se puede cambiar el rol a uno mismo
    const currentUserId = currentUser.id || (currentUser as any).sub
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('No podés modificar tu propio rol, pa.')
    }

    // El rol del actor sale de la DB y no del JWT: un moderador degradado
    // no conserva el poder hasta que venza su token.
    const [actor, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId as string },
        select: { role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
      }),
    ])

    if (!targetUser) {
      throw new NotFoundException('El usuario objetivo no existe.')
    }

    if (!actor) {
      throw new ForbiddenException('No tenés permisos para modificar roles.')
    }

    const currentUserPower = ROLE_HIERARCHY.indexOf(actor.role)
    const targetUserPower = ROLE_HIERARCHY.indexOf(targetUser.role)
    const newRolePower = ROLE_HIERARCHY.indexOf(newRole)

    // REGLA 2: No se puede modificar a alguien con igual o mayor jerarquia
    if (targetUserPower >= currentUserPower) {
      throw new ForbiddenException(
        'No tenés permisos para modificar a un usuario de igual o mayor jerarquía.',
      )
    }

    // REGLA 3: No se puede dar un rol mayor al que se tiene
    if (newRolePower > currentUserPower) {
      throw new ForbiddenException(
        `No se puede asignar un rol superior al tuyo (${actor.role}).`,
      )
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      include: { team: true },
    })

    return new UserEntity(updatedUser)
  }
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    // Solo se completa una vez: después el perfil se edita con update-profile y
    // la fecha de aceptación de términos no se vuelve a escribir.
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isFirstLogin: true },
    })

    if (!current) {
      throw new NotFoundException('Usuario no encontrado')
    }

    if (!current.isFirstLogin) {
      throw new ConflictException('El perfil ya fue completado')
    }

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
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      },
      include: { team: true },
    })

    this.chatService.updateActiveUserProfile(updatedUser.id, {
      username: updatedUser.username,
      teamName: updatedUser.team?.name || null,
      badgeUrl: updatedUser.team?.badgeUrl || null,
    })

    return new UserEntity(updatedUser)
  }

  // Para usuarios que ya existían antes de que se pidiera la aceptación.
  async acceptTerms(userId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { termsAcceptedAt: true, termsVersion: true },
    })

    // Si ya aceptó la versión vigente se conserva la fecha original.
    if (
      current?.termsAcceptedAt &&
      current.termsVersion === CURRENT_TERMS_VERSION
    ) {
      return current
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      },
      select: { termsAcceptedAt: true, termsVersion: true },
    })

    return user
  }

  async updateProfile(userId: string, dto: Partial<CompleteProfileDto>) {
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

    // UserEntity aplica @Exclude a googleId y hashedRefreshToken.
    return new UserEntity(updatedUser)
  }

  async banUser(actor: ActiveUser, userId: string) {
    await assertCanSanction(this.prisma, actor.id, userId)
    return this.applyBan(userId)
  }

  async unbanUser(actor: ActiveUser, userId: string) {
    await assertCanSanction(this.prisma, actor.id, userId)
    return this.applyUnban(userId)
  }

  // Sin chequeo de jerarquía: lo usa report.resolved, que ya lo validó en
  // SupportService.resolveReport (o viene del bot de Discord).
  private async applyBan(userId: string) {
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

  private async applyUnban(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    const redisKey = `user:banned:${userId}`
    await this.redisService.redis.del(redisKey)

    return { message: `Usuario ${user.name} desbaneado correctamente.` }
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        currentStreak: true,
        activeBannerId: true,
        team: {
          select: {
            name: true,
            badgeUrl: true,
          },
        },
        _count: {
          select: {
            inventory: true,
          },
        },
        userStats: {
          select: {
            currentWinStreak: true,
            longestWinStreak: true,
            highestMultiplier: true,
            totalBetsWon: true,
          },
        },
      },
    })

    if (!profile) {
      throw new NotFoundException('Usuario no encontrado')
    }

    let bannerAssetId: string | null = await this.redisService.redis.get(
      `user:cosmetics:${userId}:banner`,
    )

    if (!bannerAssetId && profile.activeBannerId) {
      const bannerItem = await this.prisma.storeItem.findUnique({
        where: { id: profile.activeBannerId },
        select: { assetId: true },
      })
      bannerAssetId = bannerItem?.assetId || null

      if (bannerAssetId) {
        await this.redisService.redis.set(
          `user:cosmetics:${userId}:banner`,
          bannerAssetId,
          'EX',
          86400,
        )
      }
    }

    const score = await this.redisService.redis.zscore(
      'leaderboard:chat-messages',
      userId,
    )

    const messagesCount = score ? parseInt(score, 10) : 0

    return {
      id: profile.id,
      username: profile.username,
      createdAt: profile.createdAt,
      currentStreak: profile.currentStreak,
      team: profile.team,
      activeBannerId: bannerAssetId,
      cosmeticsCount: profile._count.inventory,
      totalMessages: messagesCount,

      bettingStats: profile.userStats || {
        currentWinStreak: 0,
        longestWinStreak: 0,
        highestMultiplier: 0,
        totalBetsWon: 0,
      },
    }
  }

  async getAllUsersBalances(): Promise<UserBalanceResponse[]> {
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
        balance: 'desc',
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
